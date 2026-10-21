package com.smartwaste.service;

import com.smartwaste.entity.Complaint;
import com.smartwaste.entity.PickupRequest;
import com.smartwaste.entity.User;
import com.smartwaste.entity.WasteLog;
import com.smartwaste.repository.ComplaintRepository;
import com.smartwaste.repository.PickupRequestRepository;
import com.smartwaste.repository.WasteLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ImpactService {

    private final WasteLogRepository wasteLogRepository;
    private final PickupRequestRepository pickupRequestRepository;
    private final ComplaintRepository complaintRepository;

    @Value("${impact.co2.conversion.factor:2.5}")
    private double co2ConversionFactor;

    @Transactional(readOnly = true)
    public Map<String, Object> getUserImpact(User user, String period) {
        ZonedDateTime now = ZonedDateTime.now();
        ZonedDateTime startDate;

        if ("monthly".equalsIgnoreCase(period)) {
            startDate = now.minusMonths(1);
        } else if ("yearly".equalsIgnoreCase(period)) {
            startDate = now.minusYears(1);
        } else {
            // lifetime
            startDate = now.minusYears(100); 
        }

        // Fetch Data
        List<WasteLog> wasteLogs = wasteLogRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().filter(log -> log.getCreatedAt().isAfter(startDate)).collect(Collectors.toList());
        
        List<PickupRequest> pickups = pickupRequestRepository.findByUserId(user.getId())
                .stream().filter(req -> req.getCreatedAt().isAfter(startDate)).collect(Collectors.toList());
        
        List<Complaint> complaints = complaintRepository.findByUserId(user.getId())
                .stream().filter(c -> c.getCreatedAt().isAfter(startDate)).collect(Collectors.toList());

        // Calculations
        double wasteRecycledKg = 0;
        for (WasteLog log : wasteLogs) {
            wasteRecycledKg += log.getQuantityKg().doubleValue();
        }

        double wasteCollectedPickupKg = 0;
        for (PickupRequest req : pickups) {
            if ("COMPLETED".equalsIgnoreCase(req.getStatus())) {
                wasteCollectedPickupKg += extractKg(req.getQuantity());
            }
        }

        long reportsSubmitted = complaints.size();
        long reportsResolved = complaints.stream().filter(c -> "RESOLVED".equalsIgnoreCase(c.getStatus())).count();

        // Impact metrics
        double totalWasteDiverted = wasteRecycledKg + wasteCollectedPickupKg;
        double co2Saved = totalWasteDiverted * co2ConversionFactor;

        Map<String, Object> response = new HashMap<>();
        response.put("wasteRecycledKg", wasteRecycledKg);
        response.put("wasteCollectedPickupKg", wasteCollectedPickupKg);
        response.put("reportsSubmitted", reportsSubmitted);
        response.put("reportsResolved", reportsResolved);
        response.put("co2SavedEstimateKg", co2Saved);
        response.put("co2ConversionFactorUsed", co2ConversionFactor);
        response.put("period", period);
        
        // Activity stats
        response.put("recyclingActivitiesCount", wasteLogs.size());
        response.put("pickupActivitiesCount", pickups.stream().filter(p -> "COMPLETED".equalsIgnoreCase(p.getStatus())).count());

        return response;
    }

    private double extractKg(String quantity) {
        if (quantity == null || quantity.isEmpty()) return 5.0; // Default estimate
        try {
            String numbers = quantity.replaceAll("[^0-9.]", "");
            if (numbers.isEmpty()) return 5.0;
            return Double.parseDouble(numbers);
        } catch (Exception e) {
            return 5.0; // Default fallback
        }
    }
}
