package com.smartwaste.controller;

import com.smartwaste.dto.LoginRequest;
import com.smartwaste.dto.RegisterRequest;
import com.smartwaste.dto.AuthResponse;
import com.smartwaste.dto.ForgotPasswordRequest;
import com.smartwaste.dto.ResetPasswordRequest;
import com.smartwaste.dto.ChangePasswordRequest;
import com.smartwaste.entity.User;
import com.smartwaste.entity.Role;
import com.smartwaste.repository.UserRepository;
import com.smartwaste.security.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Map;
import java.util.UUID;
import java.time.ZonedDateTime;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final com.smartwaste.websocket.RealtimePublisher realtimePublisher;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService, com.smartwaste.websocket.RealtimePublisher realtimePublisher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.realtimePublisher = realtimePublisher;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElse(null);
                
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
        }
        
        String token = jwtService.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getName(), user.getRole()));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is already registered"));
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhone(request.getPhone());
        user.setCity(request.getCity());
        user.setAddress(request.getAddress());
        user.setPincode(request.getPincode());
        user.setRole(request.getRole() != null ? request.getRole() : Role.USER);
        user.setIsActive(true);

        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getName(), user.getRole()));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
        // Don't send password back
        user.setPassword(null);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> request, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        if (request.containsKey("name")) user.setName(request.get("name"));
        if (request.containsKey("phone")) user.setPhone(request.get("phone"));
        if (request.containsKey("city")) user.setCity(request.get("city"));
        if (request.containsKey("address")) user.setAddress(request.get("address"));
        if (request.containsKey("pincode")) user.setPincode(request.get("pincode"));
        
        userRepository.save(user);
        
        // Notify realtime so any listening client (like their own browser tabs) can reload profile
        realtimePublisher.userActivity(user.getId(), "PROFILE_UPDATED");

        user.setPassword(null);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user != null) {
            String token = UUID.randomUUID().toString();
            user.setResetPasswordToken(token);
            user.setResetPasswordTokenExpiry(ZonedDateTime.now().plusHours(1));
            userRepository.save(user);
            // In a real app, send an email here. For now, just return success.
            return ResponseEntity.ok(Map.of("message", "Password reset instructions sent", "token", token));
        }
        return ResponseEntity.ok(Map.of("message", "If the email exists, instructions were sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        User user = userRepository.findByResetPasswordToken(request.getToken()).orElse(null);
        if (user == null || user.getResetPasswordTokenExpiry().isBefore(ZonedDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired reset token"));
        }
        
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("message", "Password successfully reset"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        
        User user = userRepository.findByEmail(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
        
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Incorrect current password"));
        }
        
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("message", "Password successfully changed"));
    }
}

