package com.smartwaste.dto;
import lombok.Data;
@Data
public class SensorDataDto {
    private String deviceId;
    private String apiKey;
    private Double fillLevel;
    private Double temperature;
    private Double humidity;
    private Double airQuality;
    private Double gasLevel;
    private Double moisture;
    private Double batteryLevel;
    private Double latitude;
    private Double longitude;
}
