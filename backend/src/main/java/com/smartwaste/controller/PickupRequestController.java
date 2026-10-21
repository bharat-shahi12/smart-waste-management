package com.smartwaste.controller;

import com.smartwaste.entity.PickupRequest;
import com.smartwaste.entity.PickupUpdate;
import com.smartwaste.entity.User;
import com.smartwaste.service.PickupRequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pickups")
public class PickupRequestController {

    @org.springframework.beans.factory.annotation.Autowired
    private com.smartwaste.security.CurrentUserService currentUserService;

    private final PickupRequestService pickupRequestService;

    public PickupRequestController(PickupRequestService pickupRequestService) {
        this.pickupRequestService = pickupRequestService;
    }

    @PostMapping
    public ResponseEntity<?> createPickupRequest(
            Authentication authentication,
            @RequestParam String wasteType,
            @RequestParam(required = false) String quantity,
            @RequestParam String address,
            @RequestParam(required = false) String preferredDate,
            @RequestParam(required = false) String preferredTime,
            @RequestParam(required = false) String notes,
            @RequestParam(required = false) MultipartFile image) {
        try {
            User user = currentUserService.from(authentication);
            LocalDate pDate = preferredDate != null && !preferredDate.isEmpty() ? LocalDate.parse(preferredDate) : null;
            PickupRequest req = pickupRequestService.createPickupRequest(user.getId(), wasteType, quantity, address, pDate, preferredTime, notes, image);
            return ResponseEntity.ok(req);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<List<PickupRequest>> getMyRequests(Authentication authentication) {
        User user = currentUserService.from(authentication);
        return ResponseEntity.ok(pickupRequestService.getUserRequests(user.getId()));
    }

    @GetMapping
    public ResponseEntity<List<PickupRequest>> getAllRequests() {
        return ResponseEntity.ok(pickupRequestService.getAllRequests());
    }

    @GetMapping("/collectors")
    public ResponseEntity<List<User>> getCollectors() {
        return ResponseEntity.ok(pickupRequestService.getCollectors());
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

            PickupUpdate update = pickupRequestService.updateStatus(id, admin.getId(), status, message, isPublic);
            return ResponseEntity.ok(update);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<?> assignTeam(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, Long> body) {
        try {
            User admin = currentUserService.from(authentication);
            Long teamId = body.get("teamId");
            PickupRequest req = pickupRequestService.assignTeam(id, teamId, admin.getId());
            return ResponseEntity.ok(req);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
