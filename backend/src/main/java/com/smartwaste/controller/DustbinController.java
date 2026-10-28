package com.smartwaste.controller;

import com.smartwaste.entity.Dustbin;
import com.smartwaste.repository.DustbinRepository;
import com.smartwaste.repository.SensorReadingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import com.smartwaste.repository.AuditLogRepository;
import com.smartwaste.entity.AuditLog;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.smartwaste.websocket.RealtimePublisher;
import com.smartwaste.service.AssignmentService;
import com.smartwaste.service.FirebaseRealtimeService;

@RestController
@RequestMapping("/api/dustbins")
public class DustbinController {
    
    private final DustbinRepository repository;
    private final SensorReadingRepository sensorReadingRepository;
    private final AuditLogRepository auditLogRepository;
    private final RealtimePublisher realtimePublisher;
    private final AssignmentService assignmentService;
    private final SimpMessagingTemplate messagingTemplate;
    private final FirebaseRealtimeService firebaseRealtimeService;

    public DustbinController(DustbinRepository repository, SensorReadingRepository sensorReadingRepository,
                             AuditLogRepository auditLogRepository, RealtimePublisher realtimePublisher,
                             AssignmentService assignmentService, SimpMessagingTemplate messagingTemplate,
                             @Autowired(required = false) FirebaseRealtimeService firebaseRealtimeService) {
        this.repository = repository;
        this.sensorReadingRepository = sensorReadingRepository;
        this.auditLogRepository = auditLogRepository;
        this.realtimePublisher = realtimePublisher;
        this.assignmentService = assignmentService;
        this.messagingTemplate = messagingTemplate;
        this.firebaseRealtimeService = firebaseRealtimeService;
    }

    @GetMapping
    public List<Dustbin> getAll() {
        List<Dustbin> bins = repository.findAll();
        bins.forEach(this::updateStatusIfOffline);
        return bins;
    }

    @GetMapping("/nearby")
    public List<Dustbin> getNearby(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false, defaultValue = "5") Double radius) {
        List<Dustbin> bins = repository.findAll();
        bins.forEach(this::updateStatusIfOffline);
        if (lat == null || lng == null) {
            return bins;
        }
        return bins.stream().filter(b -> {
            if (b.getLatitude() == null || b.getLongitude() == null) return false;
            // Haversine formula distance approx in km
            double dLat = Math.toRadians(b.getLatitude() - lat);
            double dLng = Math.toRadians(b.getLongitude() - lng);
            double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                       Math.cos(Math.toRadians(lat)) * Math.cos(Math.toRadians(b.getLatitude())) *
                       Math.sin(dLng / 2) * Math.sin(dLng / 2);
            double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            double dist = 6371 * c;
            return dist <= radius;
        }).toList();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Dustbin> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(bin -> {
                    updateStatusIfOffline(bin);
                    return ResponseEntity.ok(bin);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<com.smartwaste.entity.SensorReading>> getHistory(
            @PathVariable Long id,
            @RequestParam(value = "range", required = false, defaultValue = "24h") String range) {
        List<com.smartwaste.entity.SensorReading> history = sensorReadingRepository.findTop100ByDustbinIdOrderByRecordedAtDesc(id);
        return ResponseEntity.ok(history);
    }

    private void updateStatusIfOffline(Dustbin dustbin) {
        // Mark OFFLINE if no telemetry received within the last 5 minutes
        if (dustbin.getLastSeen() == null || 
            dustbin.getLastSeen().isBefore(java.time.ZonedDateTime.now().minusMinutes(5))) {
            dustbin.setStatus("OFFLINE");
        }
    }

    @PostMapping
    public ResponseEntity<Dustbin> createDustbin(@RequestBody Dustbin dustbin, Authentication authentication) {
        dustbin.setLastSeen(java.time.ZonedDateTime.now());
        // Generate a cryptographically unique device API key if none provided
        if (dustbin.getApiKey() == null || dustbin.getApiKey().isBlank()) {
            dustbin.setApiKey("dvk_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 24));
        }
        if (dustbin.getStatus() == null || dustbin.getStatus().isBlank()) {
            dustbin.setStatus("AVAILABLE");
        }
        if (dustbin.getFillLevel() == null) {
            dustbin.setFillLevel(0.0);
        }
        Dustbin saved = repository.save(dustbin);
        
        logAudit("CREATE", "Dustbin", saved.getId(), "Created dustbin " + saved.getName(), authentication);
        
        // Broadcast saved dustbin to dashboard/map live topics
        messagingTemplate.convertAndSend("/topic/dustbins", saved);
        realtimePublisher.globalActivity("BIN", java.util.Map.of(
            "action", "CREATE",
            "binId", saved.getId(),
            "name", saved.getName() != null ? saved.getName() : ""
        ));
        return ResponseEntity.ok(saved);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Dustbin> updateDustbin(@PathVariable Long id, @RequestBody Dustbin dustbin, Authentication authentication) {
        return repository.findById(id).map(existing -> {
            if (dustbin.getName() != null && !dustbin.getName().isBlank()) {
                existing.setName(dustbin.getName());
            }
            if (dustbin.getDeviceId() != null && !dustbin.getDeviceId().isBlank()) {
                existing.setDeviceId(dustbin.getDeviceId());
            }
            if (dustbin.getApiKey() != null && !dustbin.getApiKey().isBlank()) {
                existing.setApiKey(dustbin.getApiKey());
            }
            if (dustbin.getWasteType() != null && !dustbin.getWasteType().isBlank()) {
                existing.setWasteType(dustbin.getWasteType());
            }
            if (dustbin.getCapacityLiters() != null) {
                existing.setCapacityLiters(dustbin.getCapacityLiters());
            }
            if (dustbin.getLocationName() != null) {
                existing.setLocationName(dustbin.getLocationName());
            }
            if (dustbin.getAddress() != null) {
                existing.setAddress(dustbin.getAddress());
            }
            if (dustbin.getLatitude() != null) {
                existing.setLatitude(dustbin.getLatitude());
            }
            if (dustbin.getLongitude() != null) {
                existing.setLongitude(dustbin.getLongitude());
            }
            if (dustbin.getAreaType() != null) {
                existing.setAreaType(dustbin.getAreaType());
            }
            if (dustbin.getIsActive() != null) {
                existing.setIsActive(dustbin.getIsActive());
            }
            if (dustbin.getStatus() != null && !dustbin.getStatus().isBlank()) {
                existing.setStatus(dustbin.getStatus());
            }
            if (dustbin.getFillLevel() != null) {
                existing.setFillLevel(dustbin.getFillLevel());
            }
            
            Dustbin updated = repository.save(existing);
            logAudit("UPDATE", "Dustbin", updated.getId(), "Updated dustbin " + updated.getName(), authentication);
            
            // Broadcast live update to /topic/dustbins and /topic/activity/global
            messagingTemplate.convertAndSend("/topic/dustbins", updated);
            realtimePublisher.globalActivity("BIN", java.util.Map.of(
                "action", "UPDATE",
                "binId", updated.getId(),
                "name", updated.getName() != null ? updated.getName() : ""
            ));
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDustbin(@PathVariable Long id, Authentication authentication) {
        return repository.findById(id).map(bin -> {
            String binName = bin.getName();
            try {
                repository.delete(bin);
            } catch (Exception e) {
                // If foreign keys prevent hard delete, mark inactive
                bin.setIsActive(false);
                repository.save(bin);
            }
            logAudit("DELETE", "Dustbin", id, "Deleted dustbin " + binName, authentication);
            
            realtimePublisher.globalActivity("BIN", java.util.Map.of(
                "action", "DELETE",
                "binId", id,
                "name", binName != null ? binName : ""
            ));
            return ResponseEntity.ok(java.util.Map.of("message", "Dustbin deleted successfully", "id", id));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<?> assignTeam(@PathVariable Long id, @RequestParam Long teamId, Authentication authentication) {
        try {
            assignmentService.assignBin(id, teamId, "HIGH");
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/set-main-location")
    public ResponseEntity<Dustbin> setMainLocation(@RequestBody Map<String, Object> payload, Authentication authentication) {
        Double lat = payload.get("latitude") != null ? Double.valueOf(payload.get("latitude").toString()) : null;
        Double lng = payload.get("longitude") != null ? Double.valueOf(payload.get("longitude").toString()) : null;
        String address = (String) payload.get("address");
        String locationName = (String) payload.get("locationName");

        if (lat == null || lng == null) {
            return ResponseEntity.badRequest().build();
        }

        // Find main dustbin ESP32_1001 (or first registered dustbin)
        Dustbin mainBin = repository.findByDeviceId("ESP32_1001")
                .or(() -> repository.findAll().stream().findFirst())
                .orElse(null);

        if (mainBin == null) {
            return ResponseEntity.notFound().build();
        }

        mainBin.setLatitude(lat);
        mainBin.setLongitude(lng);
        if (address != null && !address.isBlank()) mainBin.setAddress(address);
        if (locationName != null && !locationName.isBlank()) mainBin.setLocationName(locationName);
        mainBin.setLastSeen(java.time.ZonedDateTime.now());

        Dustbin saved = repository.save(mainBin);
        logAudit("UPDATE_LOCATION", "Dustbin", saved.getId(), "Set main dustbin coordinates to " + lat + ", " + lng, authentication);

        messagingTemplate.convertAndSend("/topic/dustbins", saved);
        realtimePublisher.globalActivity("BIN", Map.of(
            "action", "UPDATE",
            "binId", saved.getId(),
            "name", saved.getName() != null ? saved.getName() : ""
        ));

        if (firebaseRealtimeService != null) {
            try {
                firebaseRealtimeService.publishLatest(saved);
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/seed-mock")
    public ResponseEntity<List<Dustbin>> seedMockBins(@RequestBody(required = false) Map<String, Object> coords, Authentication authentication) {
        double centerLat = 28.555467;
        double centerLng = 77.325600;

        if (coords != null && coords.get("latitude") != null && coords.get("longitude") != null) {
            centerLat = Double.valueOf(coords.get("latitude").toString());
            centerLng = Double.valueOf(coords.get("longitude").toString());
        } else {
            Dustbin mainBin = repository.findByDeviceId("ESP32_1001").orElse(null);
            if (mainBin != null && mainBin.getLatitude() != null && mainBin.getLongitude() != null) {
                centerLat = mainBin.getLatitude();
                centerLng = mainBin.getLongitude();
            }
        }

        double[][] offsets = {
            { 0.0035,  0.0042},
            {-0.0041,  0.0028},
            { 0.0062, -0.0033},
            {-0.0028, -0.0055},
            { 0.0019, -0.0071},
            {-0.0075,  0.0018},
            { 0.0082,  0.0064},
            {-0.0053, -0.0042}
        };

        String[] names = {
            "Central Park Eco-Station",
            "Tech Boulevard Smart Hub",
            "Metro Junction Recycler",
            "Market Square Waste Pod",
            "City Hospital Gate #3",
            "University Campus Quad",
            "Residential Enclave B4",
            "Green Horizon Plaza"
        };

        String[] wasteTypes = {"DRY", "WET", "MIXED", "RECYCLABLE", "DRY", "WET", "MIXED", "RECYCLABLE"};
        double[] fillLevels = {18.0, 45.0, 88.0, 94.0, 32.0, 64.0, 78.0, 12.0};
        String[] statuses = {"AVAILABLE", "AVAILABLE", "FULL", "FULL", "AVAILABLE", "AVAILABLE", "AVAILABLE", "AVAILABLE"};

        List<Dustbin> seeded = new ArrayList<>();
        for (int i = 0; i < offsets.length; i++) {
            String devId = "ESP32_MOCK_" + (100 + i);
            Dustbin bin = repository.findByDeviceId(devId).orElse(new Dustbin());
            bin.setDeviceId(devId);
            bin.setName(names[i]);
            bin.setLocationName(names[i] + " Sector");
            bin.setAddress("Zone " + (i + 1) + ", Eco Smart District");
            bin.setLatitude(Math.round((centerLat + offsets[i][0]) * 100000.0) / 100000.0);
            bin.setLongitude(Math.round((centerLng + offsets[i][1]) * 100000.0) / 100000.0);
            bin.setCapacityLiters(120);
            bin.setFillLevel(fillLevels[i]);
            bin.setStatus(statuses[i]);
            bin.setWasteType(wasteTypes[i]);
            bin.setTemperature(24.0 + (i % 5));
            bin.setHumidity(50.0 + (i * 2));
            bin.setAirQuality(250.0 + (i * 40));
            bin.setIsActive(true);
            bin.setLastSeen(java.time.ZonedDateTime.now());
            if (bin.getApiKey() == null) {
                bin.setApiKey("dvk_mock_" + (100 + i));
            }
            Dustbin saved = repository.save(bin);
            seeded.add(saved);
            messagingTemplate.convertAndSend("/topic/dustbins", saved);
        }

        logAudit("SEED_MOCK", "Dustbin", 0L, "Seeded 8 mock smart dustbins around " + centerLat + ", " + centerLng, authentication);
        return ResponseEntity.ok(seeded);
    }

    private void logAudit(String action, String entityName, Long entityId, String details, Authentication authentication) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setEntityName(entityName);
        log.setEntityId(entityId);
        log.setDetails(details);
        log.setCreatedBy(authentication != null ? authentication.getName() : "SYSTEM");
        auditLogRepository.save(log);
    }
}
