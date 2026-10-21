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
import com.smartwaste.service.NotificationService;

@Service
public class IoTService {

    private final DustbinRepository dustbinRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final AlertRepository alertRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final NotificationService notificationService;

    public IoTService(DustbinRepository dustbinRepository, SensorReadingRepository sensorReadingRepository,
                      AlertRepository alertRepository, SimpMessagingTemplate messagingTemplate,
                      NotificationService notificationService) {
        this.dustbinRepository = dustbinRepository;
        this.sensorReadingRepository = sensorReadingRepository;
        this.alertRepository = alertRepository;
        this.messagingTemplate = messagingTemplate;
        this.notificationService = notificationService;
    }

    @Transactional
    public Dustbin processSensorData(SensorDataDto data) {
        Dustbin dustbin = dustbinRepository.findByDeviceId(data.getDeviceId())
                .orElse(null);
        
        if (dustbin == null) {
            // Can optionally create auto-registration here if needed
            throw new RuntimeException("Device not found: " + data.getDeviceId());
        }

        // Update dustbin state
        dustbin.setFillLevel(data.getFillLevel());
        dustbin.setTemperature(data.getTemperature());
        dustbin.setHumidity(data.getHumidity());
        dustbin.setAirQuality(data.getGasLevel() != null ? data.getGasLevel() : data.getAirQuality());
        dustbin.setMoisture(data.getMoisture());
        dustbin.setBatteryLevel(data.getBatteryLevel());
        dustbin.setLastSeen(ZonedDateTime.now());
        if (data.getLatitude() != null && data.getLongitude() != null) {
            dustbin.setLatitude(data.getLatitude());
            dustbin.setLongitude(data.getLongitude());
        }

        // Calculate Status (Available/Full based on 80% threshold)
        if (data.getFillLevel() >= 80) dustbin.setStatus("FULL");
        else dustbin.setStatus("AVAILABLE");
        
        // Calculate Waste Type (simplistic algorithm based on moisture)
        if (data.getMoisture() != null) {
            if (data.getMoisture() > 60) dustbin.setWasteType("WET");
            else if (data.getMoisture() < 30) dustbin.setWasteType("DRY");
            else dustbin.setWasteType("MIXED");
        }

        dustbinRepository.save(dustbin);

        // Save History
        SensorReading reading = new SensorReading();
        reading.setDustbin(dustbin);
        reading.setFillLevel(data.getFillLevel());
        reading.setTemperature(data.getTemperature());
        reading.setHumidity(data.getHumidity());
        reading.setAirQuality(data.getAirQuality());
        reading.setMoisture(data.getMoisture());
        reading.setBatteryLevel(data.getBatteryLevel());
        sensorReadingRepository.save(reading);

        // Check Alerts
        checkAlerts(dustbin);

        // Broadcast to Dashboard
        messagingTemplate.convertAndSend("/topic/dustbins", dustbin);
        return dustbin;
    }

    @Transactional
    public Dustbin processDeviceReading(Dustbin dustbin, DeviceReadingRequest request) {
        // Compute fill level if raw distance is provided
        Double fillLevel = request.getFillLevel();
        if (fillLevel == null && request.getDistance() != null) {
            double height = (request.getBinHeight() != null && request.getBinHeight() > 0) ? request.getBinHeight() : 100.0;
            double calculated = ((height - request.getDistance()) / height) * 100.0;
            fillLevel = Math.max(0.0, Math.min(100.0, calculated));
        }

        if (fillLevel != null) {
            dustbin.setFillLevel(Math.round(Math.max(0.0, Math.min(100.0, fillLevel)) * 10.0) / 10.0);
        }

        if (request.getTemperature() != null) {
            dustbin.setTemperature(request.getTemperature());
        }
        if (request.getHumidity() != null) {
            dustbin.setHumidity(request.getHumidity());
        }

        Double gas = request.getGasLevel() != null ? request.getGasLevel() : request.getAirQuality();
        if (gas != null) {
            dustbin.setAirQuality(gas);
        }
        if (request.getMoisture() != null) {
            dustbin.setMoisture(request.getMoisture());
        }
        if (request.getBatteryLevel() != null) {
            dustbin.setBatteryLevel(request.getBatteryLevel());
        }
        dustbin.setLastSeen(ZonedDateTime.now());
        if (request.getLatitude() != null && request.getLongitude() != null) {
            dustbin.setLatitude(request.getLatitude());
            dustbin.setLongitude(request.getLongitude());
        }

        // Calculate Status (Available/Full based on 80% threshold)
        if (dustbin.getFillLevel() != null && dustbin.getFillLevel() >= 80) {
            dustbin.setStatus("FULL");
        } else {
            dustbin.setStatus("AVAILABLE");
        }

        // Calculate Waste Type (simplistic algorithm based on moisture)
        if (dustbin.getMoisture() != null) {
            if (dustbin.getMoisture() > 60) dustbin.setWasteType("WET");
            else if (dustbin.getMoisture() < 30) dustbin.setWasteType("DRY");
            else dustbin.setWasteType("MIXED");
        }

        dustbinRepository.save(dustbin);

        // Save History Log
        SensorReading reading = new SensorReading();
        reading.setDustbin(dustbin);
        reading.setFillLevel(dustbin.getFillLevel());
        reading.setTemperature(dustbin.getTemperature());
        reading.setHumidity(dustbin.getHumidity());
        reading.setAirQuality(dustbin.getAirQuality());
        reading.setMoisture(dustbin.getMoisture());
        reading.setBatteryLevel(dustbin.getBatteryLevel());
        sensorReadingRepository.save(reading);

        // Check Alerts
        checkAlerts(dustbin);

        // Broadcast to WebSocket Dashboard
        messagingTemplate.convertAndSend("/topic/dustbins", dustbin);
        return dustbin;
    }

    private void checkAlerts(Dustbin dustbin) {
        if ("FULL".equals(dustbin.getStatus())) {
            createAlert(dustbin, "BIN_FULL", "HIGH", "Dustbin is full");
        }
        
        if (dustbin.getAirQuality() != null && dustbin.getAirQuality() > 200) {
            createAlert(dustbin, "AIR_QUALITY", "HIGH", "Critical air quality / gas detected");
        }
        
        if (dustbin.getBatteryLevel() != null && dustbin.getBatteryLevel() < 15) {
            createAlert(dustbin, "LOW_BATTERY", "MEDIUM", "Device battery is low");
        }
    }
    
    private void createAlert(Dustbin dustbin, String type, String severity, String message) {
        Alert alert = new Alert();
        alert.setDustbin(dustbin);
        alert.setAlertType(type);
        alert.setSeverity(severity);
        alert.setMessage(message);
        alertRepository.save(alert);
        messagingTemplate.convertAndSend("/topic/alerts", alert);

        String title = "Alert: " + type;
        if ("BIN_FULL".equals(type)) {
            title = "Bin Full Warning";
        } else if ("AIR_QUALITY".equals(type)) {
            title = "Environmental Warning";
        }
        
        notificationService.createNotification(null, type, title, message + " (Bin: " + dustbin.getName() + ")", "Dustbin", dustbin.getId().toString());
    }
}
