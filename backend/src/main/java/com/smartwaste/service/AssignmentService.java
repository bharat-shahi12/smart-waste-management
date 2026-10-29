package com.smartwaste.service;

import com.smartwaste.entity.*;
import com.smartwaste.repository.*;
import com.smartwaste.websocket.RealtimePublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;
    private final PickupRequestRepository pickupRequestRepository;
    private final DustbinRepository dustbinRepository;
    private final RealtimePublisher realtimePublisher;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final FirebaseRealtimeService firebaseRealtimeService;

    public AssignmentService(AssignmentRepository assignmentRepository, UserRepository userRepository,
                             ComplaintRepository complaintRepository, PickupRequestRepository pickupRequestRepository,
                             DustbinRepository dustbinRepository, RealtimePublisher realtimePublisher,
                             NotificationService notificationService,
                             SimpMessagingTemplate messagingTemplate,
                             @Autowired(required = false) FirebaseRealtimeService firebaseRealtimeService) {
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
        this.complaintRepository = complaintRepository;
        this.pickupRequestRepository = pickupRequestRepository;
        this.dustbinRepository = dustbinRepository;
        this.realtimePublisher = realtimePublisher;
        this.notificationService = notificationService;
        this.messagingTemplate = messagingTemplate;
        this.firebaseRealtimeService = firebaseRealtimeService;
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
        
        realtimePublisher.globalActivity("COMPLAINT");
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
        
        // Notify citizen that collector was assigned
        if (pickup.getUser() != null) {
            notificationService.createNotification(
                pickup.getUser().getId(),
                "PICKUP_ASSIGNED",
                "Collector Assigned to Pickup",
                "Responder " + responder.getName() + " has been assigned to your pickup " + pickup.getPickupId() + ".",
                "PickupRequest",
                pickup.getId().toString()
            );
            realtimePublisher.userActivity(pickup.getUser().getId(), "PICKUP");
            realtimePublisher.userActivity(pickup.getUser().getId(), "NOTIFICATION");
        }

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
        notificationService.createNotification(
            responderId, 
            "ASSIGNMENT_CREATED", 
            "New Task Assigned", 
            "You have been assigned a new " + type + " task: " + refId, 
            "Assignment", 
            assignment.getId().toString()
        );
        realtimePublisher.userActivity(responderId, "ASSIGNMENT");
    }

    public List<Assignment> getResponderAssignments(Long responderId) {
        return assignmentRepository.findByResponderIdOrderByCreatedAtDesc(responderId);
    }

    @Transactional
    public Assignment updateAssignmentStatus(Long assignmentId, Long responderId, String status, String note, String photo) {
        return updateAssignmentStatus(assignmentId, responderId, status, note, photo, null, null, null, null);
    }

    @Transactional
    public Assignment updateAssignmentStatus(Long assignmentId, Long responderId, String status, String note, String photo,
                                             Double latitude, Double longitude, String locationName, Integer etaMinutes) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
        
        if (!assignment.getResponder().getId().equals(responderId)) {
            throw new RuntimeException("Not authorized to update this assignment");
        }

        assignment.setStatus(status);

        // Update GPS Location of Responder if provided
        if (latitude != null && longitude != null) {
            assignment.setResponderLatitude(latitude);
            assignment.setResponderLongitude(longitude);
            assignment.setResponderLocationName(locationName != null ? locationName : "Live Responder GPS");
            assignment.setResponderEtaMinutes(etaMinutes != null ? etaMinutes : 10);
            assignment.setResponderUpdatedAt(ZonedDateTime.now());
        }

        // Handle Timestamps & Cascades
        if ("ACCEPTED".equals(status)) {
            assignment.setAcceptedAt(ZonedDateTime.now());
            if (assignment.getPickup() != null) {
                PickupRequest pickup = assignment.getPickup();
                pickup.setStatus("ACCEPTED");
                pickupRequestRepository.save(pickup);

                // Notify User
                if (pickup.getUser() != null) {
                    notificationService.createNotification(
                        pickup.getUser().getId(),
                        "PICKUP_ACCEPTED",
                        "Pickup Request Accepted! 🚛",
                        "Collector " + assignment.getResponder().getName() + " has accepted your pickup (" + pickup.getPickupId() + ") and is preparing to head your way. Live location sharing active.",
                        "PickupRequest",
                        pickup.getId().toString()
                    );
                    realtimePublisher.userActivity(pickup.getUser().getId(), "PICKUP");
                    realtimePublisher.userActivity(pickup.getUser().getId(), "NOTIFICATION");
                }
            }
        } else if ("ON_THE_WAY".equals(status)) {
            assignment.setStartedAt(ZonedDateTime.now());
            if (assignment.getPickup() != null) {
                PickupRequest pickup = assignment.getPickup();
                pickup.setStatus("ON_THE_WAY");
                pickupRequestRepository.save(pickup);

                if (pickup.getUser() != null) {
                    notificationService.createNotification(
                        pickup.getUser().getId(),
                        "PICKUP_ON_THE_WAY",
                        "Collector On The Way! 📍",
                        "Collector " + assignment.getResponder().getName() + " is currently driving to your address (" + pickup.getAddress() + "). Track live location on your dashboard.",
                        "PickupRequest",
                        pickup.getId().toString()
                    );
                    realtimePublisher.userActivity(pickup.getUser().getId(), "PICKUP");
                    realtimePublisher.userActivity(pickup.getUser().getId(), "NOTIFICATION");
                }
            }
        } else if ("ARRIVED".equals(status)) {
            assignment.setArrivedAt(ZonedDateTime.now());
            if (assignment.getPickup() != null) {
                PickupRequest pickup = assignment.getPickup();
                pickup.setStatus("ARRIVED");
                pickupRequestRepository.save(pickup);

                if (pickup.getUser() != null) {
                    notificationService.createNotification(
                        pickup.getUser().getId(),
                        "PICKUP_ARRIVED",
                        "Collector Arrived at Your Location! 🔔",
                        "Collector " + assignment.getResponder().getName() + " has arrived for pickup " + pickup.getPickupId() + ".",
                        "PickupRequest",
                        pickup.getId().toString()
                    );
                    realtimePublisher.userActivity(pickup.getUser().getId(), "PICKUP");
                    realtimePublisher.userActivity(pickup.getUser().getId(), "NOTIFICATION");
                }
            }
        } else if ("COMPLETED".equals(status) || "CANNOT_COMPLETE".equals(status)) {
            assignment.setCompletedAt(ZonedDateTime.now());
            if (note != null) assignment.setCompletionNote(note);
            if (photo != null) assignment.setProofImage(photo);

            if ("COMPLETED".equals(status)) {
                if (assignment.getComplaint() != null) {
                    assignment.getComplaint().setStatus("RESOLVED");
                    assignment.getComplaint().setResolvedAt(ZonedDateTime.now());
                    complaintRepository.save(assignment.getComplaint());
                    realtimePublisher.globalActivity("COMPLAINT");
                    realtimePublisher.userActivity(assignment.getComplaint().getUser().getId(), "COMPLAINT");
                }
                if (assignment.getPickup() != null) {
                    PickupRequest pickup = assignment.getPickup();
                    pickup.setStatus("COMPLETED");
                    pickupRequestRepository.save(pickup);
                    realtimePublisher.globalActivity("PICKUP");

                    if (pickup.getUser() != null) {
                        notificationService.createNotification(
                            pickup.getUser().getId(),
                            "PICKUP_COMPLETED",
                            "Pickup Completed Successfully! 🎉",
                            "Your pickup request (" + pickup.getPickupId() + ") was completed by " + assignment.getResponder().getName() + ". 20 eco-points awarded!",
                            "PickupRequest",
                            pickup.getId().toString()
                        );
                        realtimePublisher.userActivity(pickup.getUser().getId(), "PICKUP");
                        realtimePublisher.userActivity(pickup.getUser().getId(), "NOTIFICATION");
                    }
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
        broadcastLiveTracking(saved);

        realtimePublisher.userActivity(responderId, "ASSIGNMENT_UPDATED");
        realtimePublisher.globalActivity("ASSIGNMENT_UPDATED");
        return saved;
    }

    @Transactional
    public Assignment updateResponderLocation(Long assignmentId, Long responderId, Double lat, Double lng, String locationName, Integer etaMinutes) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        if (!assignment.getResponder().getId().equals(responderId)) {
            throw new RuntimeException("Not authorized to update location for this assignment");
        }

        assignment.setResponderLatitude(lat);
        assignment.setResponderLongitude(lng);
        if (locationName != null && !locationName.isBlank()) assignment.setResponderLocationName(locationName);
        if (etaMinutes != null) assignment.setResponderEtaMinutes(etaMinutes);
        assignment.setResponderUpdatedAt(ZonedDateTime.now());

        Assignment saved = assignmentRepository.save(assignment);
        broadcastLiveTracking(saved);
        return saved;
    }

    public Map<String, Object> getTrackingForPickup(Long pickupId) {
        PickupRequest pickup = pickupRequestRepository.findById(pickupId)
                .orElseThrow(() -> new RuntimeException("Pickup not found"));

        Assignment assignment = assignmentRepository.findAll().stream()
                .filter(a -> a.getPickup() != null && a.getPickup().getId().equals(pickupId))
                .findFirst()
                .orElse(null);

        Map<String, Object> tracking = new HashMap<>();
        tracking.put("pickupId", pickup.getPickupId());
        tracking.put("status", pickup.getStatus());
        tracking.put("wasteType", pickup.getWasteType());
        tracking.put("quantity", pickup.getQuantity());
        tracking.put("pickupAddress", pickup.getAddress());
        tracking.put("preferredDate", pickup.getPreferredDate());
        tracking.put("preferredTime", pickup.getPreferredTime());
        tracking.put("notes", pickup.getNotes());

        if (assignment != null && assignment.getResponder() != null) {
            User responder = assignment.getResponder();
            Map<String, Object> responderData = new HashMap<>();
            responderData.put("id", responder.getId());
            responderData.put("name", responder.getName());
            responderData.put("phone", responder.getPhone() != null ? responder.getPhone() : "+91 91234 56780");
            responderData.put("email", responder.getEmail());
            responderData.put("vehicle", "Municipal Waste Vehicle #104");
            tracking.put("responder", responderData);

            if (assignment.getResponderLatitude() != null && assignment.getResponderLongitude() != null) {
                Map<String, Object> location = new HashMap<>();
                location.put("latitude", assignment.getResponderLatitude());
                location.put("longitude", assignment.getResponderLongitude());
                location.put("locationName", assignment.getResponderLocationName() != null ? assignment.getResponderLocationName() : "Driver Live GPS");
                location.put("etaMinutes", assignment.getResponderEtaMinutes() != null ? assignment.getResponderEtaMinutes() : 10);
                location.put("updatedAt", assignment.getResponderUpdatedAt() != null ? assignment.getResponderUpdatedAt() : ZonedDateTime.now());
                tracking.put("responderLocation", location);
            } else {
                tracking.put("responderLocation", null);
            }
            tracking.put("assignmentStatus", assignment.getStatus());
        }

        return tracking;
    }

    private void broadcastLiveTracking(Assignment assignment) {
        if (assignment.getPickup() == null) return;

        PickupRequest pickup = assignment.getPickup();
        Map<String, Object> tracking = getTrackingForPickup(pickup.getId());

        // Broadcast to WebSocket topics
        String topic1 = "/topic/pickups/" + pickup.getId() + "/tracking";
        String topic2 = "/topic/pickups/" + pickup.getPickupId() + "/tracking";
        messagingTemplate.convertAndSend(topic1, (Object) tracking);
        messagingTemplate.convertAndSend(topic2, (Object) tracking);

        // Also publish to Firebase Realtime Database at livePickups/{pickupId}
        if (firebaseRealtimeService != null) {
            try {
                firebaseRealtimeService.publishPickupTracking(pickup.getPickupId(), tracking);
            } catch (Exception ignored) {}
        }
    }
}
