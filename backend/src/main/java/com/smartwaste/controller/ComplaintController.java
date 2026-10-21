package com.smartwaste.controller;

import com.smartwaste.entity.Complaint;
import com.smartwaste.entity.ComplaintUpdate;
import com.smartwaste.entity.User;
import com.smartwaste.service.ComplaintService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    @org.springframework.beans.factory.annotation.Autowired
    private com.smartwaste.security.CurrentUserService currentUserService;

    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @PostMapping
    public ResponseEntity<?> createComplaint(
            Authentication authentication,
            @RequestParam(required = false) Long dustbinId,
            @RequestParam String title,
            @RequestParam String description,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) MultipartFile image) {
        try {
            User user = currentUserService.from(authentication);
            Complaint complaint = complaintService.createComplaint(user.getId(), dustbinId, title, description, latitude, longitude, image);
            return ResponseEntity.ok(complaint);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<List<Complaint>> getMyComplaints(Authentication authentication) {
        User user = currentUserService.from(authentication);
        return ResponseEntity.ok(complaintService.getUserComplaints(user.getId()));
    }

    @GetMapping
    public ResponseEntity<List<Complaint>> getAllComplaints(Authentication authentication) {
        return ResponseEntity.ok(complaintService.getAllComplaints());
    }

    @PostMapping("/{id}/updates")
    public ResponseEntity<?> addUpdate(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        try {
            User admin = currentUserService.from(authentication);
            String status = (String) body.get("status");
            String message = (String) body.get("message");
            Boolean isPublic = body.containsKey("isPublic") ? (Boolean) body.get("isPublic") : true;

            ComplaintUpdate update = complaintService.addUpdate(id, admin.getId(), status, message, isPublic);
            return ResponseEntity.ok(update);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/rate")
    public ResponseEntity<?> rateComplaint(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        try {
            User user = currentUserService.from(authentication);
            Integer rating = body.get("rating");
            Complaint complaint = complaintService.rateComplaint(id, user.getId(), rating);
            return ResponseEntity.ok(complaint);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<?> assignTeam(
            Authentication authentication,
            @PathVariable Long id,
            @RequestParam Long teamId) {
        try {
            User admin = currentUserService.from(authentication);
            Complaint complaint = complaintService.assignTeam(id, teamId, admin.getId());
            return ResponseEntity.ok(complaint);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
