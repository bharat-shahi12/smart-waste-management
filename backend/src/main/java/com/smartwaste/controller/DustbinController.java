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
import com.smartwaste.websocket.RealtimePublisher;
import com.smartwaste.service.AssignmentService;

@RestController
@RequestMapping("/api/dustbins")
public class DustbinController {
    
    private final DustbinRepository repository;
    private final SensorReadingRepository sensorReadingRepository;
    private final AuditLogRepository auditLogRepository;
    private final RealtimePublisher realtimePublisher;
    private final AssignmentService assignmentService;

    public DustbinController(DustbinRepository repository, SensorReadingRepository sensorReadingRepository,
                             AuditLogRepository auditLogRepository, RealtimePublisher realtimePublisher,
                             AssignmentService assignmentService) {
        this.repository = repository;
        this.sensorReadingRepository = sensorReadingRepository;
        this.auditLogRepository = auditLogRepository;
        this.realtimePublisher = realtimePublisher;
        this.assignmentService = assignmentService;
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
        Dustbin saved = repository.save(dustbin);
        
        logAudit("CREATE", "Dustbin", saved.getId(), "Created dustbin " + saved.getName(), authentication);
        realtimePublisher.globalActivity("BIN");
        return ResponseEntity.ok(saved);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Dustbin> updateDustbin(@PathVariable Long id, @RequestBody Dustbin dustbin, Authentication authentication) {
        return repository.findById(id).map(existing -> {
            existing.setName(dustbin.getName());
            existing.setDeviceId(dustbin.getDeviceId());
            if (dustbin.getApiKey() != null && !dustbin.getApiKey().isBlank()) {
                existing.setApiKey(dustbin.getApiKey());
            }
            existing.setWasteType(dustbin.getWasteType());
            existing.setCapacityLiters(dustbin.getCapacityLiters());
            existing.setLocationName(dustbin.getLocationName());
            existing.setAddress(dustbin.getAddress());
            existing.setLatitude(dustbin.getLatitude());
            existing.setLongitude(dustbin.getLongitude());
            existing.setAreaType(dustbin.getAreaType());
            existing.setIsActive(dustbin.getIsActive());
            
            Dustbin updated = repository.save(existing);
            logAudit("UPDATE", "Dustbin", updated.getId(), "Updated dustbin " + updated.getName(), authentication);
            realtimePublisher.globalActivity("BIN");
            return ResponseEntity.ok(updated);
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
