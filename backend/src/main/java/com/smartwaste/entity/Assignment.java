package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@Entity
@Table(name = "assignments")
public class Assignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responder_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private User responder;

    // Type of task: COMPLAINT, PICKUP, BIN_COLLECTION
    @Column(nullable = false)
    private String type;

    // Optional references based on type
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "complaint_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Complaint complaint;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pickup_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private PickupRequest pickup;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "bin_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Dustbin dustbin;

    private String priority = "MEDIUM";
    private String status = "ASSIGNED";

    @Column(name = "assigned_at")
    private ZonedDateTime assignedAt;

    @Column(name = "accepted_at")
    private ZonedDateTime acceptedAt;

    @Column(name = "started_at")
    private ZonedDateTime startedAt;

    @Column(name = "arrived_at")
    private ZonedDateTime arrivedAt;

    @Column(name = "completed_at")
    private ZonedDateTime completedAt;

    @Column(columnDefinition = "TEXT", name = "completion_note")
    private String completionNote;

    @Column(name = "proof_image")
    private String proofImage;

    @Column(name = "responder_latitude")
    private Double responderLatitude;

    @Column(name = "responder_longitude")
    private Double responderLongitude;

    @Column(name = "responder_location_name")
    private String responderLocationName;

    @Column(name = "responder_eta_minutes")
    private Integer responderEtaMinutes;

    @Column(name = "responder_updated_at")
    private ZonedDateTime responderUpdatedAt;

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
        updatedAt = ZonedDateTime.now();
        if (assignedAt == null) assignedAt = ZonedDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }
}
