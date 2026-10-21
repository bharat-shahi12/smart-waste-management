package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.ZonedDateTime;

@Data
@Entity
@Table(name = "collection_tasks")
public class CollectionTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dustbin_id")
    private Dustbin dustbin;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collector_id")
    private User collector;
    
    private String status = "PENDING";
    private String priority = "LOW";
    private ZonedDateTime assignedAt;
    private ZonedDateTime collectedAt;
    private String notes;
}
