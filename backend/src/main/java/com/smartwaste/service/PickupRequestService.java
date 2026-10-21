package com.smartwaste.service;

import com.smartwaste.entity.*;
import com.smartwaste.repository.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import com.smartwaste.service.NotificationService;
import com.smartwaste.websocket.RealtimePublisher;
import org.springframework.context.annotation.Lazy;

@Service
public class PickupRequestService {

    private final PickupRequestRepository pickupRequestRepository;
    private final PickupUpdateRepository pickupUpdateRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final WasteLogRepository wasteLogRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final RewardService rewardService;
    private final RealtimePublisher realtimePublisher;
    private final AssignmentService assignmentService;

    public PickupRequestService(PickupRequestRepository pickupRequestRepository,
                                PickupUpdateRepository pickupUpdateRepository,
                                UserRepository userRepository,
                                AuditLogRepository auditLogRepository,
                                WasteLogRepository wasteLogRepository,
                                SimpMessagingTemplate messagingTemplate,
                                NotificationService notificationService,
                                RewardService rewardService,
                                RealtimePublisher realtimePublisher,
                                @Lazy AssignmentService assignmentService) {
        this.pickupRequestRepository = pickupRequestRepository;
        this.pickupUpdateRepository = pickupUpdateRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.wasteLogRepository = wasteLogRepository;
        this.messagingTemplate = messagingTemplate;
        this.notificationService = notificationService;
        this.rewardService = rewardService;
        this.realtimePublisher = realtimePublisher;
        this.assignmentService = assignmentService;
    }

    private String generatePickupId() {
        return "PK-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    private String saveImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;
        String uploadDir = "uploads/pickups/";
        File dir = new File(uploadDir);
        if (!dir.exists()) dir.mkdirs();
        String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filepath = Paths.get(uploadDir, filename);
        Files.write(filepath, file.getBytes());
        return "/" + uploadDir + filename;
    }

    @Transactional
    public PickupRequest createPickupRequest(Long userId, String wasteType, String quantity,
                                             String address, LocalDate preferredDate, String preferredTime,
                                             String notes, MultipartFile image) throws IOException {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        PickupRequest req = new PickupRequest();
        req.setPickupId(generatePickupId());
        req.setUser(user);
        req.setWasteType(wasteType);
        req.setQuantity(quantity);
        req.setAddress(address);
        req.setPreferredDate(preferredDate);
        req.setPreferredTime(preferredTime);
        req.setNotes(notes);
        req.setImageUrl(saveImage(image));
        req.setStatus("REQUESTED");

        PickupRequest saved = pickupRequestRepository.save(req);

        AuditLog log = new AuditLog();
        log.setAction("CREATE_PICKUP");
        log.setEntityName("PickupRequest");
        log.setEntityId(saved.getId());
        log.setDetails("Pickup requested: " + saved.getPickupId());
        log.setCreatedBy(user.getEmail());
        auditLogRepository.save(log);

        // Notify Admins
        messagingTemplate.convertAndSend("/topic/pickups", saved);
        realtimePublisher.globalActivity("PICKUP");
        notificationService.createNotification(null, "PICKUP_REQUESTED", "New Pickup Request", "A new pickup request " + saved.getPickupId() + " has been submitted.", "PickupRequest", saved.getId().toString());
        // Confirm to the user (persisted alert + live update)
        notificationService.createNotification(user.getId(), "PICKUP_REQUESTED", "Pickup Requested", "Your pickup request " + saved.getPickupId() + " was received and is awaiting assignment.", "PickupRequest", saved.getId().toString());

        return saved;
    }

    public List<PickupRequest> getUserRequests(Long userId) {
        return pickupRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<PickupRequest> getAllRequests() {
        return pickupRequestRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<User> getCollectors() {
        return userRepository.findByRole(Role.COLLECTOR);
    }

    @Transactional
    public PickupUpdate updateStatus(Long requestId, Long adminId, String status, String message, Boolean isPublic) {
        PickupRequest req = pickupRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        if (status != null && !status.isEmpty()) {
            req.setStatus(status);
            pickupRequestRepository.save(req);
        }

        PickupUpdate update = new PickupUpdate();
        update.setPickupRequest(req);
        update.setStatus(status != null ? status : req.getStatus());
        update.setMessage(message);
        update.setIsPublic(isPublic);
        update.setCreatedBy(admin);

        PickupUpdate savedUpdate = pickupUpdateRepository.save(update);

        if ("COMPLETED".equalsIgnoreCase(status)) {
            rewardService.awardPoints(req.getUser().getId(), 20, "Completed pickup", "PickupRequest", req.getId().toString());
            
            // Generate WasteLog for Analytics
            WasteLog log = new WasteLog();
            log.setUser(req.getUser());
            log.setWasteType(req.getWasteType());
            try {
                // Try to parse quantity from string, fallback to 10kg
                double qty = Double.parseDouble(req.getQuantity().replaceAll("[^0-9.]", ""));
                log.setQuantityKg(java.math.BigDecimal.valueOf(qty));
            } catch (Exception e) {
                log.setQuantityKg(java.math.BigDecimal.valueOf(10.0));
            }
            log.setPointsEarned(20);
            wasteLogRepository.save(log);
        }

        // Notify user about update
        messagingTemplate.convertAndSend("/topic/pickups/user/" + req.getUser().getId(), req);
        realtimePublisher.userActivity(req.getUser().getId(), "PICKUP");
        notificationService.createNotification(req.getUser().getId(), "PICKUP_UPDATED", "Pickup Request Updated", "Your pickup request " + req.getPickupId() + " status is now " + req.getStatus() + ".", "PickupRequest", req.getId().toString());

        // Notify admins about update
        messagingTemplate.convertAndSend("/topic/pickups", req);
        realtimePublisher.globalActivity("PICKUP");

        return savedUpdate;
    }

    @Transactional
    public PickupRequest assignTeam(Long requestId, Long teamId, Long adminId) {
        PickupRequest req = pickupRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        
        assignmentService.assignPickup(requestId, teamId, "MEDIUM");

        updateStatus(requestId, adminId, "ASSIGNED", "A collection team has been assigned.", true);
        return req;
    }
}
