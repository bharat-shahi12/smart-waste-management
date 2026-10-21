package com.smartwaste.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Entity
@Table(name = "waste_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WasteLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "waste_type", nullable = false)
    private String wasteType;

    @Column(name = "quantity_kg", nullable = false)
    private BigDecimal quantityKg;

    @Column(name = "points_earned", nullable = false)
    private Integer pointsEarned;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;
}
