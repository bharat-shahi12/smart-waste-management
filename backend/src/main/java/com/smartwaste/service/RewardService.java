package com.smartwaste.service;

import com.smartwaste.entity.RewardTransaction;
import com.smartwaste.entity.User;
import com.smartwaste.entity.UserAchievement;
import com.smartwaste.repository.RewardTransactionRepository;
import com.smartwaste.repository.UserAchievementRepository;
import com.smartwaste.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RewardService {

    private final RewardTransactionRepository rewardTransactionRepository;
    private final UserAchievementRepository userAchievementRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void awardPoints(Long userId, int amount, String description, String entityType, String entityId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check for duplicates
        if (entityType != null && entityId != null) {
            Optional<RewardTransaction> existing = rewardTransactionRepository
                    .findByUserIdAndEntityTypeAndEntityId(userId, entityType, entityId);
            if (existing.isPresent()) {
                return; // Already rewarded for this action
            }
        }

        // Create Transaction
        RewardTransaction tx = new RewardTransaction();
        tx.setUser(user);
        tx.setAmount(amount);
        tx.setDescription(description);
        tx.setEntityType(entityType);
        tx.setEntityId(entityId);
        rewardTransactionRepository.save(tx);

        // Update User Points
        if (user.getTotalPoints() == null) {
            user.setTotalPoints(0);
        }
        user.setTotalPoints(user.getTotalPoints() + amount);
        userRepository.save(user);

        // Notify
        notificationService.createNotification(
                user.getId(),
                "REWARD_EARNED",
                "Points Earned!",
                "You earned " + amount + " points for " + description + ".",
                "RewardTransaction",
                tx.getId().toString()
        );
        messagingTemplate.convertAndSend("/topic/rewards/user/" + user.getId(), tx);

        // Check Achievements
        checkAchievements(user);
    }

    private void checkAchievements(User user) {
        int points = user.getTotalPoints() != null ? user.getTotalPoints() : 0;

        if (points >= 100) {
            grantAchievement(user, "Eco Beginner", "Earned your first 100 points");
        }
        if (points >= 500) {
            grantAchievement(user, "Green Guardian", "Reached 500 eco points");
        }
        if (points >= 1000) {
            grantAchievement(user, "Planet Savior", "Achieved 1000 eco points milestone");
        }
    }

    private void grantAchievement(User user, String name, String description) {
        Optional<UserAchievement> existing = userAchievementRepository.findByUserIdAndAchievementName(user.getId(), name);
        if (existing.isEmpty()) {
            UserAchievement ach = new UserAchievement();
            ach.setUser(user);
            ach.setAchievementName(name);
            ach.setDescription(description);
            userAchievementRepository.save(ach);

            notificationService.createNotification(
                    user.getId(),
                    "ACHIEVEMENT_UNLOCKED",
                    "Achievement Unlocked!",
                    "You unlocked: " + name + " - " + description,
                    "UserAchievement",
                    ach.getId().toString()
            );
            messagingTemplate.convertAndSend("/topic/rewards/user/" + user.getId(), ach);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUserRewardProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<RewardTransaction> history = rewardTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<UserAchievement> achievements = userAchievementRepository.findByUserIdOrderByUnlockedAtDesc(userId);

        int points = user.getTotalPoints() != null ? user.getTotalPoints() : 0;
        int level = (points / 500) + 1;
        int nextLevelPoints = level * 500;
        int progress = (points % 500);

        Map<String, Object> response = new HashMap<>();
        response.put("points", points);
        response.put("level", level);
        response.put("nextLevelPoints", nextLevelPoints);
        response.put("progress", progress);
        response.put("history", history);
        response.put("achievements", achievements);

        return response;
    }
}
