package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@Entity
@Table(name = "pickup_requests")
public class PickupRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pickup_id", unique = true, nullable = false)
    private String pickupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @Column(name = "waste_type", nullable = false)
    private String wasteType;

    private String quantity;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;

    @Column(name = "preferred_date")
    private LocalDate preferredDate;

    @Column(name = "preferred_time")
    private String preferredTime;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "image_url")
    private String imageUrl;

    private String status = "REQUESTED";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_team_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User assignedTeam;

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
        updatedAt = ZonedDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }
}
