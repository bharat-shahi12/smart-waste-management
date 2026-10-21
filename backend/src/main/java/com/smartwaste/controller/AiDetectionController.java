package com.smartwaste.controller;

import com.smartwaste.entity.User;
import com.smartwaste.entity.WasteDetection;
import com.smartwaste.service.AiDetectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiDetectionController {

    @org.springframework.beans.factory.annotation.Autowired
    private com.smartwaste.security.CurrentUserService currentUserService;

    private final AiDetectionService aiDetectionService;

    public AiDetectionController(AiDetectionService aiDetectionService) {
        this.aiDetectionService = aiDetectionService;
    }

    @PostMapping("/detect")
    public ResponseEntity<?> detectWaste(
            Authentication authentication,
            @RequestParam("image") MultipartFile image) {
        try {
            User user = currentUserService.from(authentication);
            WasteDetection detection = aiDetectionService.detectWaste(user.getId(), image);
            return ResponseEntity.ok(detection);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my-history")
    public ResponseEntity<List<WasteDetection>> getMyHistory(Authentication authentication) {
        User user = currentUserService.from(authentication);
        return ResponseEntity.ok(aiDetectionService.getUserDetections(user.getId()));
    }
}
