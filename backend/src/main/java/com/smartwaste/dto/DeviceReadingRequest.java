package com.smartwaste.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceReadingRequest {
    /**
     * Unique identifier for the hardware device (e.g. "ESP32_101")
     */
    private String deviceId;

    /**
     * Optional device secret key in the request body (alternative to X-Device-Key header)
     */
    private String apiKey;

    /**
     * Fill level in percentage (0.0 to 100.0)
     */
    private Double fillLevel;

    /**
     * Distance measured by ultrasonic sensor in centimeters (optional alternative to fillLevel)
     */
    private Double distance;

    /**
     * Total physical depth/height of the bin in centimeters (optional, defaults to 100.0 cm)
     */
    private Double binHeight;

    /**
     * Temperature in Celsius (e.g., from DHT11 / DHT22 sensor)
     */
    private Double temperature;

    /**
     * Relative humidity percentage (0.0 to 100.0)
     */
    private Double humidity;

    /**
     * Air quality / gas index (e.g., analog reading or ppm from MQ-135 sensor)
     */
    private Double airQuality;

    /**
     * Alternative alias for gas level
     */
    private Double gasLevel;

    /**
     * Waste moisture content percentage (0.0 to 100.0)
     */
    private Double moisture;

    /**
     * Device battery percentage (0.0 to 100.0)
     */
    private Double batteryLevel;

    /**
     * Optional GPS latitude
     */
    private Double latitude;

    /**
     * Optional GPS longitude
     */
    private Double longitude;

    /**
     * Optional lid status (true if lid is open, false if closed)
     */
    private Boolean lidOpen;

    /**
     * Optional raw status reported by hardware (e.g. "OK", "ERROR_SENSOR")
     */
    private String rawStatus;
}
