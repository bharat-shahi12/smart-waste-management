package com.smartwaste.controller;

import com.smartwaste.dto.SensorDataDto;
import com.smartwaste.entity.Dustbin;
import com.smartwaste.iot.IoTService;
import com.smartwaste.service.DeviceAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/iot")
public class IoTController {

    private final IoTService ioTService;
    private final DeviceAuthService deviceAuthService;

    public IoTController(IoTService ioTService, DeviceAuthService deviceAuthService) {
        this.ioTService = ioTService;
        this.deviceAuthService = deviceAuthService;
    }

    /**
     * Legacy sensor-data endpoint, now protected with device authentication.
     */
    @PostMapping(value = {"/sensor-data", "/bin-data"})
    public ResponseEntity<?> receiveSensorData(
            @RequestHeader(value = "X-Device-Key", required = false) String headerKey,
            @RequestHeader(value = "X-API-KEY", required = false) String headerApiKey,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody SensorDataDto data) {
        try {
            if (data == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Payload is required"));
            }

            // Basic validation
            if (data.getDeviceId() == null || data.getDeviceId().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "deviceId is required"));
            }

            // Enforce device authentication
            String token = deviceAuthService.resolveDeviceToken(headerKey, headerApiKey, null, authHeader, data.getApiKey());
            if (token == null || token.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "success", false,
                        "error", "UNAUTHORIZED",
                        "message", "Device authentication required. Provide 'X-Device-Key' header or 'apiKey' field."
                ));
            }

            try {
                deviceAuthService.authenticateDevice(data.getDeviceId(), token);
            } catch (SecurityException se) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "success", false,
                        "error", "UNAUTHORIZED",
                        "message", se.getMessage()
                ));
            } catch (IllegalArgumentException iae) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "success", false,
                        "error", "DEVICE_NOT_FOUND",
                        "message", iae.getMessage()
                ));
            }

            Dustbin bin = ioTService.processSensorData(data);
            String ledStatus = "GREEN";
            if ("FULL".equals(bin.getStatus())) {
                ledStatus = "RED";
            }
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Sensor data received",
                "status", bin.getStatus(),
                "led", ledStatus
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
