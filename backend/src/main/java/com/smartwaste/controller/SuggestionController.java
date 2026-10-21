package com.smartwaste.controller;

import com.smartwaste.entity.User;
import com.smartwaste.entity.UserSuggestion;
import com.smartwaste.service.SuggestionService;
import com.smartwaste.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suggestions")
@RequiredArgsConstructor
public class SuggestionController {

    private final SuggestionService suggestionService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<UserSuggestion>> getUserSuggestions(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(suggestionService.getUserSuggestions(user));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id, Authentication authentication) {
        if (authentication == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        suggestionService.markAsRead(id, user.getId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/dismiss")
    public ResponseEntity<Void> dismiss(@PathVariable Long id, Authentication authentication) {
        if (authentication == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        suggestionService.dismiss(id, user.getId());
        return ResponseEntity.ok().build();
    }
}
