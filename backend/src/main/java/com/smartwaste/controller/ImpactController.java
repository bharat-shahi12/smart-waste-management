package com.smartwaste.controller;

import com.smartwaste.entity.User;
import com.smartwaste.repository.UserRepository;
import com.smartwaste.service.ImpactService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/impact")
@RequiredArgsConstructor
public class ImpactController {

    private final ImpactService impactService;
    private final UserRepository userRepository;

    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> getUserImpact(
            @RequestParam(defaultValue = "lifetime") String period,
            Authentication authentication) {
        
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        return ResponseEntity.ok(impactService.getUserImpact(user, period));
    }
}
