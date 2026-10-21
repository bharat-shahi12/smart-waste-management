package com.smartwaste.service;

import com.smartwaste.entity.*;
import com.smartwaste.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnalyticsService {

    private final WasteLogRepository wasteLogRepository;
    private final PickupRequestRepository pickupRequestRepository;
    private final ComplaintRepository complaintRepository;
    private final DustbinRepository dustbinRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final WasteDetectionRepository wasteDetectionRepository;
    private final UserRepository userRepository;

    public AnalyticsService(WasteLogRepository wasteLogRepository,
                            PickupRequestRepository pickupRequestRepository,
                            ComplaintRepository complaintRepository,
                            DustbinRepository dustbinRepository,
                            SensorReadingRepository sensorReadingRepository,
                            WasteDetectionRepository wasteDetectionRepository,
                            UserRepository userRepository) {
        this.wasteLogRepository = wasteLogRepository;
        this.pickupRequestRepository = pickupRequestRepository;
        this.complaintRepository = complaintRepository;
        this.dustbinRepository = dustbinRepository;
        this.sensorReadingRepository = sensorReadingRepository;
        this.wasteDetectionRepository = wasteDetectionRepository;
        this.userRepository = userRepository;
    }

    public Map<String, Object> getUserAnalytics(Long userId) {
        Map<String, Object> stats = new HashMap<>();

        // Waste Logs
        List<WasteLog> logs = wasteLogRepository.findByUserIdOrderByCreatedAtDesc(userId);
        double totalWaste = 0;
        double recycledWaste = 0;
        Map<String, Double> wasteByType = new java.util.LinkedHashMap<>();

        for (WasteLog log : logs) {
            double qty = log.getQuantityKg() != null ? log.getQuantityKg().doubleValue() : 0;
            totalWaste += qty;
            String type = log.getWasteType() == null ? "other" : log.getWasteType().toLowerCase();
            if (type.contains("recycl") || type.contains("plastic") || type.contains("paper") || type.contains("glass") || type.contains("metal")) {
                recycledWaste += qty;
            }
            String label = log.getWasteType() == null ? "Other" : log.getWasteType();
            wasteByType.merge(label, qty, Double::sum);
        }

        // AI detections
        List<WasteDetection> detections = wasteDetectionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Map<String, Long> detectionsByCategory = new java.util.LinkedHashMap<>();
        for (WasteDetection d : detections) {
            detectionsByCategory.merge(d.getDetectedCategory(), 1L, Long::sum);
        }

        // Pickups
        List<PickupRequest> pickups = pickupRequestRepository.findByUserId(userId);
        long completedPickups = pickups.stream().filter(p -> "COMPLETED".equalsIgnoreCase(p.getStatus())).count();

        // Complaints
        List<Complaint> complaints = complaintRepository.findByUserId(userId);
        long resolvedComplaints = complaints.stream().filter(c -> "RESOLVED".equalsIgnoreCase(c.getStatus())).count();

        // Points
        int points = userRepository.findById(userId).map(u -> u.getTotalPoints() != null ? u.getTotalPoints() : 0).orElse(0);

        // Real 7-day activity timeline
        java.time.LocalDate today = java.time.LocalDate.now();
        List<Map<String, Object>> timeline = new java.util.ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            java.time.LocalDate day = today.minusDays(i);
            Map<String, Object> row = new HashMap<>();
            row.put("date", day.toString());
            row.put("name", day.getDayOfWeek().getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH));
            row.put("scans", detections.stream().filter(d -> sameDay(d.getCreatedAt(), day)).count());
            row.put("reports", complaints.stream().filter(c -> sameDay(c.getCreatedAt(), day)).count());
            row.put("pickups", pickups.stream().filter(p -> sameDay(p.getCreatedAt(), day)).count());
            row.put("wasteKg", logs.stream().filter(l -> sameDay(l.getCreatedAt(), day))
                    .mapToDouble(l -> l.getQuantityKg() != null ? l.getQuantityKg().doubleValue() : 0).sum());
            timeline.add(row);
        }

        stats.put("totalWasteCollected", totalWaste);
        stats.put("totalWasteRecycled", recycledWaste);
        stats.put("recyclingRate", totalWaste > 0 ? (recycledWaste / totalWaste) * 100.0 : 0.0);
        stats.put("pickupRequests", pickups.size());
        stats.put("pickupsCompleted", completedPickups);
        stats.put("reportsSubmitted", complaints.size());
        stats.put("reportsResolved", resolvedComplaints);
        stats.put("aiScans", detections.size());
        stats.put("totalPoints", points);
        stats.put("wasteByType", wasteByType);
        stats.put("detectionsByCategory", detectionsByCategory);
        stats.put("timeline", timeline);

        // Cleanliness score derived from real data: base 80, open reports reduce it,
        // resolved reports and completed pickups contribute positively (bounded 0..100).
        long pending = complaints.size() - resolvedComplaints;
        long score = 80 - (pending * 5) + (resolvedComplaints * 3) + (completedPickups * 2) + Math.min(10, detections.size());
        stats.put("areaCleanlinessScore", Math.max(0, Math.min(100, score)));
        stats.put("generatedAt", java.time.ZonedDateTime.now().toString());

        return stats;
    }

    private boolean sameDay(java.time.ZonedDateTime ts, java.time.LocalDate day) {
        return ts != null && ts.withZoneSameInstant(java.time.ZoneId.systemDefault()).toLocalDate().equals(day);
    }
    public Map<String, Object> getAdminAnalytics() {
        Map<String, Object> stats = new HashMap<>();

        List<WasteLog> logs = wasteLogRepository.findAll();
        double totalWaste = 0;
        double recycledWaste = 0;
        for (WasteLog log : logs) {
            double qty = log.getQuantityKg().doubleValue();
            totalWaste += qty;
            String type = log.getWasteType().toLowerCase();
            if (type.contains("recycl") || type.contains("plastic") || type.contains("paper") || type.contains("glass") || type.contains("metal")) {
                recycledWaste += qty;
            }
        }

        List<Dustbin> bins = dustbinRepository.findAll();
        long fullBins = bins.stream().filter(b -> b.getFillLevel() != null && b.getFillLevel() >= 80).count();
        long activeBins = bins.stream().filter(b -> Boolean.TRUE.equals(b.getIsActive())).count();

        stats.put("totalWasteCollected", totalWaste);
        stats.put("totalWasteRecycled", recycledWaste);
        stats.put("recyclingRate", totalWaste > 0 ? (recycledWaste / totalWaste) * 100.0 : 0.0);
        stats.put("totalBins", bins.size());
        stats.put("fullBins", fullBins);
        stats.put("activeBins", activeBins);
        stats.put("totalPickups", pickupRequestRepository.count());
        stats.put("totalComplaints", complaintRepository.count());

        return stats;
    }

    public Map<String, Object> getCurrentEnvironment() {
        // Find latest sensor reading by getting all and sorting (in a real app we'd use a query, but we don't have one in repo yet)
        // Actually, we can just fetch all bins and average their current sensor states, since Dustbin stores it
        List<Dustbin> bins = dustbinRepository.findAll();
        double avgTemp = 0;
        double avgHum = 0;
        double avgGas = 0;
        int count = 0;

        for (Dustbin b : bins) {
            if (b.getTemperature() != null) {
                avgTemp += b.getTemperature();
                avgHum += (b.getHumidity() != null ? b.getHumidity() : 0);
                avgGas += (b.getAirQuality() != null ? b.getAirQuality() : 0);
                count++;
            }
        }

        Map<String, Object> env = new HashMap<>();
        if (count > 0) {
            env.put("temperature", avgTemp / count);
            env.put("humidity", avgHum / count);
            env.put("gasLevel", avgGas / count);
            env.put("status", (avgGas / count > 300) ? "POOR" : "GOOD");
        } else {
            env.put("temperature", null);
            env.put("humidity", null);
            env.put("gasLevel", null);
            env.put("status", "NO DATA");
        }
        return env;
    }

    public List<Map<String, Object>> getEnvironmentHistory() {
        // Mocking historical trend data based on current environment for demonstration.
        // In a real production system, this would group SensorReadings by day/hour using a database query.
        Map<String, Object> current = getCurrentEnvironment();
        double baseTemp = current.get("temperature") != null ? (double) current.get("temperature") : 25.0;
        double baseHum = current.get("humidity") != null ? (double) current.get("humidity") : 50.0;
        
        List<Map<String, Object>> history = new java.util.ArrayList<>();
        String[] days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
        for (int i = 0; i < 7; i++) {
            Map<String, Object> day = new HashMap<>();
            day.put("name", days[i]);
            day.put("temperature", Math.round((baseTemp + (Math.random() * 5 - 2.5)) * 10) / 10.0);
            day.put("humidity", Math.round((baseHum + (Math.random() * 10 - 5)) * 10) / 10.0);
            day.put("fill", Math.round(30 + Math.random() * 60)); // Average fill level trend
            history.add(day);
        }
        return history;
    }
}
