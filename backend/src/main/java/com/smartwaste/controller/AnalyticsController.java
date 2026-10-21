package com.smartwaste.controller;

import com.smartwaste.entity.User;
import com.smartwaste.repository.DustbinRepository;
import com.smartwaste.repository.AlertRepository;
import com.smartwaste.repository.CollectionTaskRepository;
import com.smartwaste.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @org.springframework.beans.factory.annotation.Autowired
    private com.smartwaste.security.CurrentUserService currentUserService;
    
    private final DustbinRepository dustbinRepo;
    private final AlertRepository alertRepo;
    private final CollectionTaskRepository taskRepo;
    private final AnalyticsService analyticsService;

    public AnalyticsController(DustbinRepository dustbinRepo, AlertRepository alertRepo, CollectionTaskRepository taskRepo, AnalyticsService analyticsService) {
        this.dustbinRepo = dustbinRepo;
        this.alertRepo = alertRepo;
        this.taskRepo = taskRepo;
        this.analyticsService = analyticsService;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        long totalBins = dustbinRepo.count();
        long fullBins = dustbinRepo.findAll().stream().filter(b -> "FULL".equals(b.getStatus()) || "OVERFLOW".equals(b.getStatus())).count();
        long openAlerts = alertRepo.findAll().stream().filter(a -> !a.getIsResolved()).count();
        
        stats.put("totalDustbins", totalBins);
        stats.put("fullDustbins", fullBins);
        stats.put("openAlerts", openAlerts);
        return stats;
    }

    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> getUserAnalytics(Authentication authentication) {
        User user = currentUserService.from(authentication);
        return ResponseEntity.ok(analyticsService.getUserAnalytics(user.getId()));
    }

    @GetMapping("/admin")
    public ResponseEntity<Map<String, Object>> getAdminAnalytics() {
        return ResponseEntity.ok(analyticsService.getAdminAnalytics());
    }
}
