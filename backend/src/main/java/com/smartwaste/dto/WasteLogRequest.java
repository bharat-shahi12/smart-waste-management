package com.smartwaste.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class WasteLogRequest {
    @NotBlank(message = "Waste type is required")
    private String wasteType;

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "0.1", message = "Quantity must be at least 0.1 kg")
    private BigDecimal quantityKg;
}
