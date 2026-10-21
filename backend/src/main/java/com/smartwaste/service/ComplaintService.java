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
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;
import com.smartwaste.service.NotificationService;
import com.smartwaste.websocket.RealtimePublisher;
import org.springframework.context.annotation.Lazy;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final ComplaintUpdateRepository complaintUpdateRepository;
    private final DustbinRepository dustbinRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final RewardService rewardService;
    private final RealtimePublisher realtimePublisher;
    private final AssignmentService assignmentService;

    public ComplaintService(ComplaintRepository complaintRepository, 
                            ComplaintUpdateRepository complaintUpdateRepository,
                            DustbinRepository dustbinRepository,
                            UserRepository userRepository,
                            AuditLogRepository auditLogRepository,
                            SimpMessagingTemplate messagingTemplate,
                            NotificationService notificationService,
                            RewardService rewardService,
                            RealtimePublisher realtimePublisher,
                            @Lazy AssignmentService assignmentService) {
        this.complaintRepository = complaintRepository;
        this.complaintUpdateRepository = complaintUpdateRepository;
        this.dustbinRepository = dustbinRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.messagingTemplate = messagingTemplate;
        this.notificationService = notificationService;
        this.rewardService = rewardService;
        this.realtimePublisher = realtimePublisher;
        this.assignmentService = assignmentService;
    }

    private String generateComplaintId() {
        return "CMP-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    private String saveImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;
        String uploadDir = "uploads/complaints/";
        File dir = new File(uploadDir);
        if (!dir.exists()) dir.mkdirs();
        String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filepath = Paths.get(uploadDir, filename);
        Files.write(filepath, file.getBytes());
        return "/" + uploadDir + filename;
    }

    @Transactional
    public Complaint createComplaint(Long userId, Long dustbinId, String title, String description, 
                                     Double latitude, Double longitude, MultipartFile image) throws IOException {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Dustbin dustbin = dustbinId != null ? dustbinRepository.findById(dustbinId).orElse(null) : null;

        Complaint complaint = new Complaint();
        complaint.setComplaintId(generateComplaintId());
        complaint.setUser(user);
        complaint.setDustbin(dustbin);
        complaint.setTitle(title);
        complaint.setDescription(description);
        complaint.setLatitude(latitude);
        complaint.setLongitude(longitude);
        complaint.setStatus("PENDING");
        complaint.setImageUrl(saveImage(image));

        Complaint saved = complaintRepository.save(complaint);

        AuditLog log = new AuditLog();
        log.setAction("CREATE_COMPLAINT");
        log.setEntityName("Complaint");
        log.setEntityId(saved.getId());
        log.setDetails("Complaint created: " + saved.getComplaintId());
        log.setCreatedBy(user.getEmail());
        auditLogRepository.save(log);

        // Notify Admins
        messagingTemplate.convertAndSend("/topic/complaints", saved);
        realtimePublisher.globalActivity("COMPLAINT");
        notificationService.createNotification(null, "COMPLAINT_SUBMITTED", "New Complaint", "A new complaint " + saved.getComplaintId() + " has been submitted.", "Complaint", saved.getId().toString());

        // Award Points
        rewardService.awardPoints(user.getId(), 50, "Valid complaint submitted", "Complaint", saved.getId().toString());

        return saved;
    }

    public List<Complaint> getUserComplaints(Long userId) {
        return complaintRepository.findByUserId(userId); 
    }

    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    @Transactional
    public ComplaintUpdate addUpdate(Long complaintId, Long adminId, String status, String message, Boolean isPublic) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        if (status != null && !status.isEmpty()) {
            complaint.setStatus(status);
            if ("RESOLVED".equals(status) || "REJECTED".equals(status)) {
                complaint.setResolvedAt(ZonedDateTime.now());
            }
            complaintRepository.save(complaint);
        }

        ComplaintUpdate update = new ComplaintUpdate();
        update.setComplaint(complaint);
        update.setStatus(status != null ? status : complaint.getStatus());
        update.setMessage(message);
        update.setIsPublic(isPublic);
        update.setCreatedBy(admin);

        ComplaintUpdate savedUpdate = complaintUpdateRepository.save(update);

        // Notify user about update
        messagingTemplate.convertAndSend("/topic/complaints/user/" + complaint.getUser().getId(), complaint);
        realtimePublisher.userActivity(complaint.getUser().getId(), "COMPLAINT");
        notificationService.createNotification(complaint.getUser().getId(), "COMPLAINT_UPDATED", "Complaint Updated", "Your complaint " + complaint.getComplaintId() + " status is now " + complaint.getStatus() + ".", "Complaint", complaint.getId().toString());

        // Notify admins about update
        messagingTemplate.convertAndSend("/topic/complaints", complaint);
        realtimePublisher.globalActivity("COMPLAINT");

        return savedUpdate;
    }

    @Transactional
    public Complaint rateComplaint(Long complaintId, Long userId, Integer rating) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        if (!complaint.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized to rate this complaint");
        }

        if (!"RESOLVED".equals(complaint.getStatus())) {
            throw new RuntimeException("Can only rate resolved complaints");
        }

        complaint.setRating(rating);
        return complaintRepository.save(complaint);
    }

    @Transactional
    public Complaint assignTeam(Long complaintId, Long teamId, Long adminId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        
        assignmentService.assignComplaint(complaintId, teamId, "MEDIUM");

        addUpdate(complaintId, adminId, "ASSIGNED", "A response team has been assigned.", true);
        return complaint;
    }
}
