package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Entity
@Table(name = "complaints")
public class Complaint {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dustbin_id")
    private Dustbin dustbin;
    
    private String title;
    private String description;
    private String imageUrl;
    
    @Column(name = "complaint_id", unique = true)
    private String complaintId;
    
    private Double latitude;
    private Double longitude;
    private Integer rating;
    private String status = "OPEN";
    private String priority = "MEDIUM";
    private ZonedDateTime createdAt;
    private ZonedDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }
}
