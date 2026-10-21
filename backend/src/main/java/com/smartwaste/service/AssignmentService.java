package com.smartwaste.service;

import com.smartwaste.entity.*;
import com.smartwaste.repository.*;
import com.smartwaste.websocket.RealtimePublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;

@Service
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;
    private final PickupRequestRepository pickupRequestRepository;
    private final DustbinRepository dustbinRepository;
    private final RealtimePublisher realtimePublisher;
    private final NotificationService notificationService;

    public AssignmentService(AssignmentRepository assignmentRepository, UserRepository userRepository,
                             ComplaintRepository complaintRepository, PickupRequestRepository pickupRequestRepository,
                             DustbinRepository dustbinRepository, RealtimePublisher realtimePublisher,
                             NotificationService notificationService) {
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
        this.complaintRepository = complaintRepository;
        this.pickupRequestRepository = pickupRequestRepository;
        this.dustbinRepository = dustbinRepository;
        this.realtimePublisher = realtimePublisher;
        this.notificationService = notificationService;
    }

    @Transactional
    public Assignment assignComplaint(Long complaintId, Long responderId, String priority) {
        Complaint complaint = complaintRepository.findById(complaintId).orElseThrow(() -> new RuntimeException("Complaint not found"));
        User responder = userRepository.findById(responderId).orElseThrow(() -> new RuntimeException("Responder not found"));

        Assignment assignment = new Assignment();
        assignment.setResponder(responder);
        assignment.setType("COMPLAINT");
        assignment.setComplaint(complaint);
        assignment.setPriority(priority != null ? priority : "MEDIUM");
        
        complaint.setStatus("ASSIGNED");
        complaintRepository.save(complaint);

        Assignment saved = assignmentRepository.save(assignment);
        notifyResponder(responderId, saved, "COMPLAINT", complaint.getComplaintId());
        
        realtimePublisher.globalActivity("COMPLAINT"); // Notify admin/global
        return saved;
    }

    @Transactional
    public Assignment assignPickup(Long pickupId, Long responderId, String priority) {
        PickupRequest pickup = pickupRequestRepository.findById(pickupId).orElseThrow(() -> new RuntimeException("Pickup not found"));
        User responder = userRepository.findById(responderId).orElseThrow(() -> new RuntimeException("Responder not found"));

        Assignment assignment = new Assignment();
        assignment.setResponder(responder);
        assignment.setType("PICKUP");
        assignment.setPickup(pickup);
        assignment.setPriority(priority != null ? priority : "MEDIUM");

        pickup.setStatus("ASSIGNED");
        pickup.setAssignedTeam(responder);
        pickupRequestRepository.save(pickup);

        Assignment saved = assignmentRepository.save(assignment);
        notifyResponder(responderId, saved, "PICKUP", pickup.getPickupId());
        
        realtimePublisher.globalActivity("PICKUP");
        return saved;
    }

    @Transactional
    public Assignment assignBin(Long binId, Long responderId, String priority) {
        Dustbin dustbin = dustbinRepository.findById(binId).orElseThrow(() -> new RuntimeException("Bin not found"));
        User responder = userRepository.findById(responderId).orElseThrow(() -> new RuntimeException("Responder not found"));

        Assignment assignment = new Assignment();
        assignment.setResponder(responder);
        assignment.setType("BIN_COLLECTION");
        assignment.setDustbin(dustbin);
        assignment.setPriority(priority != null ? priority : "HIGH");

        Assignment saved = assignmentRepository.save(assignment);
        notifyResponder(responderId, saved, "BIN", dustbin.getDeviceId());
        
        realtimePublisher.globalActivity("BIN");
        return saved;
    }

    private void notifyResponder(Long responderId, Assignment assignment, String type, String refId) {
        notificationService.createNotification(responderId, "ASSIGNMENT_CREATED", "New Task Assigned", "You have been assigned a new " + type + " task: " + refId, "Assignment", assignment.getId().toString());
        realtimePublisher.userActivity(responderId, "ASSIGNMENT");
    }

    public List<Assignment> getResponderAssignments(Long responderId) {
        return assignmentRepository.findByResponderIdOrderByCreatedAtDesc(responderId);
    }

    @Transactional
    public Assignment updateAssignmentStatus(Long assignmentId, Long responderId, String status, String note, String photo) {
        Assignment assignment = assignmentRepository.findById(assignmentId).orElseThrow(() -> new RuntimeException("Assignment not found"));
        
        if (!assignment.getResponder().getId().equals(responderId)) {
            throw new RuntimeException("Not authorized to update this assignment");
        }

        assignment.setStatus(status);
        if ("ACCEPTED".equals(status)) assignment.setAcceptedAt(ZonedDateTime.now());
        else if ("ON_THE_WAY".equals(status)) assignment.setStartedAt(ZonedDateTime.now());
        else if ("ARRIVED".equals(status)) assignment.setArrivedAt(ZonedDateTime.now());
        else if ("COMPLETED".equals(status) || "CANNOT_COMPLETE".equals(status)) {
            assignment.setCompletedAt(ZonedDateTime.now());
            if (note != null) assignment.setCompletionNote(note);
            if (photo != null) assignment.setProofImage(photo);

            // Cascade completion
            if ("COMPLETED".equals(status)) {
                if (assignment.getComplaint() != null) {
                    assignment.getComplaint().setStatus("RESOLVED");
                    assignment.getComplaint().setResolvedAt(ZonedDateTime.now());
                    complaintRepository.save(assignment.getComplaint());
                    realtimePublisher.globalActivity("COMPLAINT");
                    realtimePublisher.userActivity(assignment.getComplaint().getUser().getId(), "COMPLAINT");
                }
                if (assignment.getPickup() != null) {
                    assignment.getPickup().setStatus("COMPLETED");
                    pickupRequestRepository.save(assignment.getPickup());
                    realtimePublisher.globalActivity("PICKUP");
                    realtimePublisher.userActivity(assignment.getPickup().getUser().getId(), "PICKUP");
                }
                if (assignment.getDustbin() != null) {
                    assignment.getDustbin().setFillLevel(0.0);
                    assignment.getDustbin().setStatus("AVAILABLE");
                    dustbinRepository.save(assignment.getDustbin());
                    realtimePublisher.globalActivity("BIN");
                }
            }
        }
        
        Assignment saved = assignmentRepository.save(assignment);
        realtimePublisher.userActivity(responderId, "ASSIGNMENT_UPDATED");
        realtimePublisher.globalActivity("ASSIGNMENT_UPDATED");
        return saved;
    }
}
