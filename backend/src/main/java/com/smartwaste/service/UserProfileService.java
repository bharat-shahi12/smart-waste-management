package com.smartwaste.service;

import com.smartwaste.dto.ChangePasswordRequest;
import com.smartwaste.dto.UserProfileUpdateRequest;
import com.smartwaste.entity.User;
import com.smartwaste.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.smartwaste.websocket.RealtimePublisher realtimePublisher;

    @Transactional
    public User updateProfile(Long userId, UserProfileUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getName() != null) user.setName(request.getName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getCity() != null) user.setCity(request.getCity());
        if (request.getAddress() != null) user.setAddress(request.getAddress());
        if (request.getPincode() != null) user.setPincode(request.getPincode());
        if (request.getSavedArea() != null) user.setSavedArea(request.getSavedArea());
        if (request.getLanguage() != null) user.setLanguage(request.getLanguage());
        if (request.getTheme() != null) user.setTheme(request.getTheme());
        if (request.getNotificationsEnabled() != null) user.setNotificationsEnabled(request.getNotificationsEnabled());

        User savedUser = userRepository.save(user);
        realtimePublisher.userActivity(userId, "PROFILE_UPDATED");
        return savedUser;
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Incorrect current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional
    public void deleteAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        userRepository.delete(user);
    }
}
