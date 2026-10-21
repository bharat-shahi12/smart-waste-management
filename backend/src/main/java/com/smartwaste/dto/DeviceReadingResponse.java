package com.smartwaste.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.ZonedDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceReadingResponse {
    private boolean success;
    private String message;
    private String deviceId;
    private String binName;
    private String status;              // "AVAILABLE", "FULL", "LOW", etc.
    private Double fillLevel;           // Effective fill percentage
    private String wasteType;           // "DRY", "WET", "MIXED"
    private String led;                 // "GREEN", "YELLOW", "RED" indicator for ESP32
    private boolean buzzer;             // true if alert condition (full or toxic gas)
    private int pollIntervalSeconds;    // Suggested reading interval for microcontroller power saving
    private ZonedDateTime serverTime;
}
