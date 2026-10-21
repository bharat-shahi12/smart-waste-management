package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@Entity
@Table(name = "user_achievements", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "achievement_name"})
})
public class UserAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @Column(name = "achievement_name", nullable = false)
    private String achievementName;

    @Column(nullable = false)
    private String description;

    @Column(name = "unlocked_at", updatable = false)
    private ZonedDateTime unlockedAt;

    @PrePersist
    protected void onCreate() {
        unlockedAt = ZonedDateTime.now();
    }
}
