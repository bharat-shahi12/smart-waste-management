package com.smartwaste.security;

import com.smartwaste.entity.User;
import com.smartwaste.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Resolves the authenticated JPA {@link User} entity from a Spring Security
 * {@link Authentication}. The JWT filter stores a Spring Security UserDetails
 * principal (not our entity), so we always look the user up by email.
 */
@Component
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User from(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Not authenticated");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof User u) {
            return u;
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
