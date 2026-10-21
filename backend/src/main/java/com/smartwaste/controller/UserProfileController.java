package com.smartwaste.controller;

import com.smartwaste.dto.ChangePasswordRequest;
import com.smartwaste.dto.UserProfileUpdateRequest;
import com.smartwaste.entity.User;
import com.smartwaste.repository.UserRepository;
import com.smartwaste.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<User> getProfile(Authentication authentication) {
        if (authentication == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(user);
    }

    @PutMapping
    public ResponseEntity<User> updateProfile(@RequestBody UserProfileUpdateRequest request, Authentication authentication) {
        if (authentication == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        return ResponseEntity.ok(userProfileService.updateProfile(user.getId(), request));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@RequestBody ChangePasswordRequest request, Authentication authentication) {
        if (authentication == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        userProfileService.changePassword(user.getId(), request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAccount(Authentication authentication) {
        if (authentication == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        userProfileService.deleteAccount(user.getId());
        return ResponseEntity.ok().build();
    }
}
