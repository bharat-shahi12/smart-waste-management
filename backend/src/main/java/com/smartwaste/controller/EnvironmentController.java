package com.smartwaste.controller;

import com.smartwaste.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/environment")
public class EnvironmentController {

    private final AnalyticsService analyticsService;

    public EnvironmentController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> getCurrentEnvironment() {
        return ResponseEntity.ok(analyticsService.getCurrentEnvironment());
    }

    @GetMapping("/history")
    public ResponseEntity<java.util.List<Map<String, Object>>> getEnvironmentHistory() {
        return ResponseEntity.ok(analyticsService.getEnvironmentHistory());
    }
}
