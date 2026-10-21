package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Entity
@Table(name = "dustbins")
public class Dustbin {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String deviceId;
    @Column(name = "api_key")
    private String apiKey;
    private String name;
    private String locationName;
    private Double latitude;
    private Double longitude;
    private String address;
    private String areaType;
    private Integer capacityLiters;
    private Double fillLevel = 0.0;
    private String status = "EMPTY";
    private String wasteType;
    private Double temperature;
    private Double humidity;
    private Double airQuality;
    private Double moisture;
    private Double batteryLevel;
    private ZonedDateTime lastSeen;
    private Boolean isActive = true;
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
