package com.smartwaste.iot;

import com.smartwaste.dto.SensorDataDto;
import com.smartwaste.dto.DeviceReadingRequest;
import com.smartwaste.entity.Dustbin;
import com.smartwaste.entity.SensorReading;
import com.smartwaste.entity.Alert;
import com.smartwaste.repository.DustbinRepository;
import com.smartwaste.repository.SensorReadingRepository;
import com.smartwaste.repository.AlertRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.ZonedDateTime;
import java.util.List;
import com.smartwaste.service.NotificationService;
import com.smartwaste.service.FirebaseRealtimeService;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class IoTService {

    private final DustbinRepository dustbinRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final AlertRepository alertRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final FirebaseRealtimeService firebaseRealtimeService;

    public IoTService(DustbinRepository dustbinRepository, SensorReadingRepository sensorReadingRepository,
                      AlertRepository alertRepository, SimpMessagingTemplate messagingTemplate,
                      NotificationService notificationService,
                      FirebaseRealtimeService firebaseRealtimeService) {
        this.dustbinRepository = dustbinRepository;
        this.sensorReadingRepository = sensorReadingRepository;
        this.alertRepository = alertRepository;
        this.messagingTemplate = messagingTemplate;
        this.notificationService = notificationService;
        this.firebaseRealtimeService = firebaseRealtimeService;
    }

    @Transactional
    public Dustbin processSensorData(SensorDataDto data) {
        Dustbin dustbin = dustbinRepository.findByDeviceId(data.getDeviceId())
                .orElse(null);
        
        if (dustbin == null) {
            throw new RuntimeException("Device not found: " + data.getDeviceId());
        }

        // Safe null-handling and physical value clamping
        if (data.getFillLevel() != null) {
            dustbin.setFillLevel(clamp(data.getFillLevel(), 0.0, 100.0));
        }
        if (data.getTemperature() != null) {
            dustbin.setTemperature(clamp(data.getTemperature(), -40.0, 85.0));
        }
        if (data.getHumidity() != null) {
            dustbin.setHumidity(clamp(data.getHumidity(), 0.0, 100.0));
        }
        Double gas = data.getGasLevel() != null ? data.getGasLevel() : data.getAirQuality();
        if (gas != null) {
            dustbin.setAirQuality(Math.max(0.0, gas));
        }
        if (data.getMoisture() != null) {
            dustbin.setMoisture(clamp(data.getMoisture(), 0.0, 100.0));
        }
        if (data.getBatteryLevel() != null) {
            dustbin.setBatteryLevel(clamp(data.getBatteryLevel(), 0.0, 100.0));
        }
        dustbin.setLastSeen(ZonedDateTime.now());

        // Validate GPS coordinates: Ignore (0.0, 0.0) which occurs when GPS has no valid satellite fix
        if (isValidCoordinate(data.getLatitude(), data.getLongitude())) {
            dustbin.setLatitude(data.getLatitude());
            dustbin.setLongitude(data.getLongitude());
        }

        // Calculate Status (Available/Full based on 80% threshold, with null safety)
        if (dustbin.getFillLevel() != null && dustbin.getFillLevel() >= 80.0) {
            dustbin.setStatus("FULL");
        } else {
            dustbin.setStatus("AVAILABLE");
        }
        
        // Calculate Waste Type (based on moisture sensor)
        if (dustbin.getMoisture() != null) {
            if (dustbin.getMoisture() > 60.0) dustbin.setWasteType("WET");
            else if (dustbin.getMoisture() < 30.0) dustbin.setWasteType("DRY");
            else dustbin.setWasteType("MIXED");
        }

        Dustbin savedBin = dustbinRepository.save(dustbin);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        firebaseRealtimeService.publishLatest(savedBin)
                            .exceptionally(error -> {
                                System.err.println(
                                    "Firebase publish failed: " + error.getMessage()
                                );
                                return null;
                            });
                    }
                }
            );
        } else {
            firebaseRealtimeService.publishLatest(savedBin)
                .exceptionally(error -> {
                    System.err.println(
                        "Firebase publish failed: " + error.getMessage()
                    );
                    return null;
                });
        }

        // Save Historical Reading
        SensorReading reading = new SensorReading();
        reading.setDustbin(dustbin);
        reading.setFillLevel(dustbin.getFillLevel());
        reading.setTemperature(dustbin.getTemperature());
        reading.setHumidity(dustbin.getHumidity());
        reading.setAirQuality(dustbin.getAirQuality());
        reading.setMoisture(dustbin.getMoisture());
        reading.setBatteryLevel(dustbin.getBatteryLevel());
        sensorReadingRepository.save(reading);

        // Deduplicated Alert Evaluation
        checkAlerts(dustbin);

        // Broadcast to WebSocket Dashboard
        messagingTemplate.convertAndSend("/topic/dustbins", dustbin);
        return dustbin;
    }

    @Transactional
    public Dustbin processDeviceReading(Dustbin dustbin, DeviceReadingRequest request) {
        // 1. Calculate fill level from ultrasonic distance if provided
        Double fillLevel = request.getFillLevel();
        if (fillLevel == null && request.getDistance() != null) {
            double distance = request.getDistance();
            // Validate distance: HC-SR04 measures ~2cm to 400cm
            if (distance > 0.0 && distance <= 500.0) {
                double height = (request.getBinHeight() != null && request.getBinHeight() > 0) ? request.getBinHeight() : 100.0;
                double calculated = ((height - distance) / height) * 100.0;
                fillLevel = clamp(calculated, 0.0, 100.0);
            }
        }

        if (fillLevel != null) {
            dustbin.setFillLevel(Math.round(clamp(fillLevel, 0.0, 100.0) * 10.0) / 10.0);
        }

        // 2. Telemetry physical bounds validation
        if (request.getTemperature() != null) {
            dustbin.setTemperature(clamp(request.getTemperature(), -40.0, 85.0));
        }
        if (request.getHumidity() != null) {
            dustbin.setHumidity(clamp(request.getHumidity(), 0.0, 100.0));
        }

        Double gas = request.getGasLevel() != null ? request.getGasLevel() : request.getAirQuality();
        if (gas != null) {
            dustbin.setAirQuality(Math.max(0.0, gas));
        }
        if (request.getMoisture() != null) {
            dustbin.setMoisture(clamp(request.getMoisture(), 0.0, 100.0));
        }
        if (request.getBatteryLevel() != null) {
            dustbin.setBatteryLevel(clamp(request.getBatteryLevel(), 0.0, 100.0));
        }
        dustbin.setLastSeen(ZonedDateTime.now());

        // Validate GPS fix (reject 0.0, 0.0 when NEO-6M has no satellite lock)
        if (isValidCoordinate(request.getLatitude(), request.getLongitude())) {
            dustbin.setLatitude(request.getLatitude());
            dustbin.setLongitude(request.getLongitude());
        }

        // 3. Status determination
        if (dustbin.getFillLevel() != null && dustbin.getFillLevel() >= 80.0) {
            dustbin.setStatus("FULL");
        } else {
            dustbin.setStatus("AVAILABLE");
        }

        // 4. Waste classification
        if (dustbin.getMoisture() != null) {
            if (dustbin.getMoisture() > 60.0) dustbin.setWasteType("WET");
            else if (dustbin.getMoisture() < 30.0) dustbin.setWasteType("DRY");
            else dustbin.setWasteType("MIXED");
        }

        Dustbin savedBin = dustbinRepository.save(dustbin);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        firebaseRealtimeService.publishLatest(savedBin)
                            .exceptionally(error -> {
                                System.err.println(
                                    "Firebase publish failed: " + error.getMessage()
                                );
                                return null;
                            });
                    }
                }
            );
        } else {
            firebaseRealtimeService.publishLatest(savedBin)
                .exceptionally(error -> {
                    System.err.println(
                        "Firebase publish failed: " + error.getMessage()
                    );
                    return null;
                });
        }

        // 5. Save Historical Reading
        SensorReading reading = new SensorReading();
        reading.setDustbin(dustbin);
        reading.setFillLevel(dustbin.getFillLevel());
        reading.setTemperature(dustbin.getTemperature());
        reading.setHumidity(dustbin.getHumidity());
        reading.setAirQuality(dustbin.getAirQuality());
        reading.setMoisture(dustbin.getMoisture());
        reading.setBatteryLevel(dustbin.getBatteryLevel());
        sensorReadingRepository.save(reading);

        // 6. Deduplicated Alert Evaluation
        checkAlerts(dustbin);

        // 7. Broadcast to WebSocket Dashboard
        messagingTemplate.convertAndSend("/topic/dustbins", dustbin);
        return dustbin;
    }

    /**
     * Evaluates alert conditions and prevents duplicate alert spam while conditions persist.
     * Automatically resolves open alerts when conditions return to safe levels.
     */
    private void checkAlerts(Dustbin dustbin) {
        Long binId = dustbin.getId();

        // --- 1. BIN_FULL Alert ---
        boolean isFull = "FULL".equals(dustbin.getStatus()) || (dustbin.getFillLevel() != null && dustbin.getFillLevel() >= 80.0);
        if (isFull) {
            if (!alertRepository.existsByDustbinIdAndAlertTypeAndIsResolvedFalse(binId, "BIN_FULL")) {
                createAlert(dustbin, "BIN_FULL", "HIGH", "Dustbin is full (" + dustbin.getFillLevel() + "%)");
            }
        } else if (dustbin.getFillLevel() != null && dustbin.getFillLevel() < 75.0) {
            // Auto-resolve when bin has been emptied
            resolveAlerts(binId, "BIN_FULL");
        }

        // --- 2. AIR_QUALITY / GAS Alert ---
        // Handles both raw ADC readings (12-bit ADC 0-4095) and calibrated ppm (0-500 scale)
        boolean hazardousGas = false;
        if (dustbin.getAirQuality() != null) {
            double gasVal = dustbin.getAirQuality();
            if (gasVal >= 1000.0) {
                // Raw ADC value: clean air ~400-800, threshold > 2500 indicates smoke/gas presence
                hazardousGas = gasVal > 2500.0;
            } else {
                // Calibrated ppm / AQI scale: threshold > 200 indicates hazardous air
                hazardousGas = gasVal > 200.0;
            }
        }

        if (hazardousGas) {
            if (!alertRepository.existsByDustbinIdAndAlertTypeAndIsResolvedFalse(binId, "AIR_QUALITY")) {
                createAlert(dustbin, "AIR_QUALITY", "HIGH", "Hazardous gas reading detected (" + dustbin.getAirQuality() + ")");
            }
        } else if (dustbin.getAirQuality() != null && dustbin.getAirQuality() < 150.0) {
            resolveAlerts(binId, "AIR_QUALITY");
        }

        // --- 3. LOW_BATTERY Alert ---
        if (dustbin.getBatteryLevel() != null && dustbin.getBatteryLevel() < 15.0) {
            if (!alertRepository.existsByDustbinIdAndAlertTypeAndIsResolvedFalse(binId, "LOW_BATTERY")) {
                createAlert(dustbin, "LOW_BATTERY", "MEDIUM", "Device battery is critically low (" + dustbin.getBatteryLevel() + "%)");
            }
        } else if (dustbin.getBatteryLevel() != null && dustbin.getBatteryLevel() > 30.0) {
            resolveAlerts(binId, "LOW_BATTERY");
        }
    }

    private void resolveAlerts(Long binId, String alertType) {
        List<Alert> active = alertRepository.findByDustbinIdAndAlertTypeAndIsResolvedFalse(binId, alertType);
        for (Alert a : active) {
            a.setIsResolved(true);
            a.setResolvedAt(ZonedDateTime.now());
            alertRepository.save(a);
        }
    }

    private void createAlert(Dustbin dustbin, String type, String severity, String message) {
        Alert alert = new Alert();
        alert.setDustbin(dustbin);
        alert.setAlertType(type);
        alert.setSeverity(severity);
        alert.setMessage(message);
        alert.setIsResolved(false);
        alertRepository.save(alert);
        messagingTemplate.convertAndSend("/topic/alerts", alert);

        String title = "Alert: " + type;
        if ("BIN_FULL".equals(type)) {
            title = "Bin Full Warning";
        } else if ("AIR_QUALITY".equals(type)) {
            title = "Environmental Warning";
        } else if ("LOW_BATTERY".equals(type)) {
            title = "Battery Warning";
        }

        notificationService.createNotification(null, type, title, message + " (Bin: " + dustbin.getName() + ")", "Dustbin", dustbin.getId().toString());
    }

    private double clamp(double val, double min, double max) {
        return Math.max(min, Math.min(max, val));
    }

    private boolean isValidCoordinate(Double lat, Double lng) {
        if (lat == null || lng == null) return false;
        if (Double.isNaN(lat) || Double.isNaN(lng)) return false;
        // Check for (0.0, 0.0) which is commonly emitted by NEO-6M before lock
        if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
        return lat >= -90.0 && lat <= 90.0 && lng >= -180.0 && lng <= 180.0;
    }
}
