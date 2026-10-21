package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@Entity
@Table(name = "waste_detections")
public class WasteDetection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    @Column(name = "detected_category", nullable = false)
    private String detectedCategory;

    @Column(nullable = false)
    private Double confidence;

    @Column(name = "recommended_disposal", nullable = false, columnDefinition = "TEXT")
    private String recommendedDisposal;

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }
}
