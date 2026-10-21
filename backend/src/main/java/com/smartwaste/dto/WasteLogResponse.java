package com.smartwaste.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Data
@Builder
public class WasteLogResponse {
    private Long id;
    private String wasteType;
    private BigDecimal quantityKg;
    private Integer pointsEarned;
    private ZonedDateTime createdAt;
}
