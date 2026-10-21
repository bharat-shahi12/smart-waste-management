package com.smartwaste.service;

import com.smartwaste.dto.WasteLogRequest;
import com.smartwaste.dto.WasteLogResponse;
import com.smartwaste.entity.User;
import com.smartwaste.entity.WasteLog;
import com.smartwaste.repository.UserRepository;
import com.smartwaste.repository.WasteLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WasteLogService {

    private final WasteLogRepository wasteLogRepository;
    private final UserRepository userRepository;
    private final RewardService rewardService;
    private final com.smartwaste.websocket.RealtimePublisher realtimePublisher;

    @Transactional
    public WasteLogResponse createLog(String userEmail, WasteLogRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Calculate points (e.g., 10 points per kg)
        int points = request.getQuantityKg().multiply(java.math.BigDecimal.TEN).intValue();

        WasteLog log = WasteLog.builder()
                .user(user)
                .wasteType(request.getWasteType())
                .quantityKg(request.getQuantityKg())
                .pointsEarned(points)
                .build();

        WasteLog savedLog = wasteLogRepository.save(log);
        
        if (points > 0) {
            rewardService.awardPoints(
                    user.getId(), 
                    points, 
                    "Verified recycling action (" + request.getQuantityKg() + "kg of " + request.getWasteType() + ")", 
                    "WasteLog", 
                    savedLog.getId().toString()
            );
        }

        realtimePublisher.userActivity(user.getId(), "WASTE_LOG");
        return mapToResponse(savedLog);
    }

    @Transactional(readOnly = true)
    public List<WasteLogResponse> getUserLogs(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return wasteLogRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private WasteLogResponse mapToResponse(WasteLog log) {
        return WasteLogResponse.builder()
                .id(log.getId())
                .wasteType(log.getWasteType())
                .quantityKg(log.getQuantityKg())
                .pointsEarned(log.getPointsEarned())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
