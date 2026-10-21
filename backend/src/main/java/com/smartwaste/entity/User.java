package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    @Column(unique = true, nullable = false)
    private String email;
    private String phone;
    @Column(nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    private String password;
    @Enumerated(EnumType.STRING)
    private Role role;
    private String profileImage;
    private String city;
    private String address;
    private String pincode;
    private Boolean isActive = true;
    
    @Column(name = "saved_area")
    private String savedArea;
    
    private String language = "en";
    private String theme = "dark";
    
    @Column(name = "notifications_enabled")
    private Boolean notificationsEnabled = true;
    
    @Column(name = "total_points")
    private Integer totalPoints = 0;
    
    private String resetPasswordToken;
    private ZonedDateTime resetPasswordTokenExpiry;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
        updatedAt = createdAt;
    }
    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }
}
