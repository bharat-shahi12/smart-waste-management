package com.smartwaste.controller;

import com.smartwaste.dto.DeviceReadingRequest;
import com.smartwaste.dto.DeviceReadingResponse;
import com.smartwaste.entity.Dustbin;
import com.smartwaste.iot.IoTService;
import com.smartwaste.service.DeviceAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.util.Map;

/**
 * Controller handling hardware IoT device (ESP32) communications and sensor readings.
 * Protected by device-level authentication (API key / secret token).
 */
@RestController
@RequestMapping("/api/device")
public class DeviceController {

    private final DeviceAuthService deviceAuthService;
    private final IoTService ioTService;

    public DeviceController(DeviceAuthService deviceAuthService, IoTService ioTService) {
        this.deviceAuthService = deviceAuthService;
        this.ioTService = ioTService;
    }

    /**
     * Endpoint where ESP32 devices submit telemetry and sensor readings.
     * Protected with device authentication (Header 'X-Device-Key', 'X-API-KEY', 'Authorization', or 'apiKey' in payload).
     */
    @PostMapping(value = {"/readings", "/data", "/telemetry"})
    public ResponseEntity<?> receiveDeviceReadings(
            @RequestHeader(value = "X-Device-Key", required = false) String headerKey,
            @RequestHeader(value = "X-API-KEY", required = false) String headerApiKey,
            @RequestHeader(value = "X-Device-Token", required = false) String headerToken,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody DeviceReadingRequest request) {

        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "BAD_REQUEST",
                    "message", "Request body is required."
            ));
        }

        // 1. Resolve authentication token from headers or body
        String token = deviceAuthService.resolveDeviceToken(headerKey, headerApiKey, headerToken, authHeader, request.getApiKey());

        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "error", "UNAUTHORIZED",
                    "message", "Device authentication failed: Missing device API key. Provide 'X-Device-Key' header or 'apiKey' in payload."
            ));
        }

        // 2. Validate device ID
        if (request.getDeviceId() == null || request.getDeviceId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "BAD_REQUEST",
                    "message", "deviceId is required in reading payload."
            ));
        }

        // 3. Authenticate device
        Dustbin dustbin;
        try {
            dustbin = deviceAuthService.authenticateDevice(request.getDeviceId(), token);
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
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "error", "SERVER_ERROR",
                    "message", e.getMessage()
            ));
        }

        // 4. Process sensor readings and update system state
        Dustbin updatedBin = ioTService.processDeviceReading(dustbin, request);

        // 5. Calculate hardware feedback flags for ESP32 actuators
        boolean isFull = "FULL".equalsIgnoreCase(updatedBin.getStatus());
        boolean hazardousAir = false;
        if (updatedBin.getAirQuality() != null) {
            double gasVal = updatedBin.getAirQuality();
            hazardousAir = (gasVal >= 1000.0) ? (gasVal > 2500.0) : (gasVal > 200.0);
        }

        String ledStatus;
        if (isFull || hazardousAir) {
            ledStatus = "RED";
        } else if (updatedBin.getFillLevel() != null && updatedBin.getFillLevel() >= 60.0) {
            ledStatus = "YELLOW";
        } else {
            ledStatus = "GREEN";
        }

        boolean buzzerAlert = isFull || hazardousAir;
        int pollIntervalSeconds = isFull ? 10 : 30;

        DeviceReadingResponse response = DeviceReadingResponse.builder()
                .success(true)
                .message("Sensor readings processed successfully")
                .deviceId(updatedBin.getDeviceId())
                .binName(updatedBin.getName())
                .status(updatedBin.getStatus())
                .fillLevel(updatedBin.getFillLevel())
                .wasteType(updatedBin.getWasteType())
                .led(ledStatus)
                .buzzer(buzzerAlert)
                .pollIntervalSeconds(pollIntervalSeconds)
                .serverTime(ZonedDateTime.now())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Connectivity and authentication check endpoint for ESP32 on startup
     */
    @GetMapping("/ping")
    public ResponseEntity<?> pingDevice(
            @RequestParam String deviceId,
            @RequestHeader(value = "X-Device-Key", required = false) String headerKey,
            @RequestHeader(value = "X-API-KEY", required = false) String headerApiKey,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "apiKey", required = false) String paramKey) {

        String token = deviceAuthService.resolveDeviceToken(headerKey, headerApiKey, null, authHeader, paramKey);
        try {
            Dustbin bin = deviceAuthService.authenticateDevice(deviceId, token);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "status", "ONLINE",
                    "message", "Device authenticated successfully",
                    "deviceId", bin.getDeviceId(),
                    "binName", bin.getName(),
                    "serverTime", ZonedDateTime.now()
            ));
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
    }
}
