package com.smartwaste.controller;

import com.smartwaste.entity.Assignment;
import com.smartwaste.entity.User;
import com.smartwaste.security.CurrentUserService;
import com.smartwaste.service.AssignmentService;
import com.smartwaste.repository.AssignmentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
import java.util.HashMap;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/responder/assignments")
public class ResponderAssignmentController {

    private final AssignmentService assignmentService;
    private final AssignmentRepository assignmentRepository;
    private final CurrentUserService currentUserService;

    public ResponderAssignmentController(AssignmentService assignmentService, AssignmentRepository assignmentRepository, CurrentUserService currentUserService) {
        this.assignmentService = assignmentService;
        this.assignmentRepository = assignmentRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<Assignment>> getMyAssignments(Authentication authentication) {
        User responder = currentUserService.from(authentication);
        return ResponseEntity.ok(assignmentService.getResponderAssignments(responder.getId()));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats(Authentication authentication) {
        User responder = currentUserService.from(authentication);
        Long id = responder.getId();
        Map<String, Object> stats = new HashMap<>();
        
        long totalAssigned = assignmentRepository.countByResponderIdAndStatus(id, "ASSIGNED");
        long totalAccepted = assignmentRepository.countByResponderIdAndStatus(id, "ACCEPTED");
        long onTheWay = assignmentRepository.countByResponderIdAndStatus(id, "ON_THE_WAY");
        long arrived = assignmentRepository.countByResponderIdAndStatus(id, "ARRIVED");
        long completed = assignmentRepository.countByResponderIdAndStatus(id, "COMPLETED");

        stats.put("assignedTasks", totalAssigned + totalAccepted + onTheWay + arrived);
        stats.put("pendingTasks", totalAssigned);
        stats.put("inProgressTasks", totalAccepted + onTheWay + arrived);
        stats.put("completedToday", completed); // simplified, assuming we want just completed count for now
        stats.put("criticalAlerts", 0); // implement logic to count high priority bins/complaints later if needed

        return ResponseEntity.ok(stats);
    }

    private String saveImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;
        String uploadDir = "uploads/proofs/";
        File dir = new File(uploadDir);
        if (!dir.exists()) dir.mkdirs();
        String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filepath = Paths.get(uploadDir, filename);
        Files.write(filepath, file.getBytes());
        return "/" + uploadDir + filename;
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, 
                                          @RequestParam("status") String status,
                                          @RequestParam(value = "note", required = false) String note,
                                          @RequestParam(value = "proofImage", required = false) MultipartFile proofImage,
                                          @RequestParam(value = "latitude", required = false) Double latitude,
                                          @RequestParam(value = "longitude", required = false) Double longitude,
                                          @RequestParam(value = "locationName", required = false) String locationName,
                                          @RequestParam(value = "etaMinutes", required = false) Integer etaMinutes,
                                          Authentication authentication) {
        try {
            User responder = currentUserService.from(authentication);
            String photoUrl = saveImage(proofImage);
            Assignment updated = assignmentService.updateAssignmentStatus(
                id, responder.getId(), status, note, photoUrl, latitude, longitude, locationName, etaMinutes
            );
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/location")
    public ResponseEntity<?> updateLocation(@PathVariable Long id,
                                            @RequestBody Map<String, Object> body,
                                            Authentication authentication) {
        try {
            User responder = currentUserService.from(authentication);
            Double lat = body.get("latitude") != null ? Double.valueOf(body.get("latitude").toString()) : null;
            Double lng = body.get("longitude") != null ? Double.valueOf(body.get("longitude").toString()) : null;
            String locationName = (String) body.get("locationName");
            Integer eta = body.get("etaMinutes") != null ? Integer.valueOf(body.get("etaMinutes").toString()) : null;

            Assignment updated = assignmentService.updateResponderLocation(id, responder.getId(), lat, lng, locationName, eta);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bin/{binId}/assign")
    public ResponseEntity<?> assignBinToSelf(@PathVariable Long binId, Authentication authentication) {
        try {
            User responder = currentUserService.from(authentication);
            assignmentService.assignBin(binId, responder.getId(), "HIGH");
            return ResponseEntity.ok(Map.of("message", "Bin collection scheduled successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
