package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@Entity
@Table(name = "user_suggestions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "reference_key"})
})
public class UserSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(nullable = false)
    private String category;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "is_dismissed")
    private Boolean isDismissed = false;

    @Column(name = "reference_key")
    private String referenceKey;

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }
}
