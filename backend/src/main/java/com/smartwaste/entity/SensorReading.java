package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Entity
@Table(name = "sensor_readings")
public class SensorReading {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dustbin_id", nullable = false)
    private Dustbin dustbin;
    
    private Double fillLevel;
    private Double temperature;
    private Double humidity;
    private Double airQuality;
    private Double moisture;
    private Double batteryLevel;
    private ZonedDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        if (recordedAt == null) recordedAt = ZonedDateTime.now();
    }
}
