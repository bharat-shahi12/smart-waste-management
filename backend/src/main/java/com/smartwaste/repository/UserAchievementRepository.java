package com.smartwaste.repository;

import com.smartwaste.entity.UserAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {
    List<UserAchievement> findByUserIdOrderByUnlockedAtDesc(Long userId);
    Optional<UserAchievement> findByUserIdAndAchievementName(Long userId, String achievementName);
}
