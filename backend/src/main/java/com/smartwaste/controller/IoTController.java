package com.smartwaste.controller;

import com.smartwaste.dto.SensorDataDto;
import com.smartwaste.iot.IoTService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/iot")
public class IoTController {

    private final IoTService ioTService;

    public IoTController(IoTService ioTService) {
        this.ioTService = ioTService;
    }

    @PostMapping(value = {"/sensor-data", "/bin-data"})
    public ResponseEntity<?> receiveSensorData(@RequestBody SensorDataDto data) {
        try {
            // Basic validation
            if (data.getDeviceId() == null || data.getDeviceId().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "deviceId is required"));
            }
            
            com.smartwaste.entity.Dustbin bin = ioTService.processSensorData(data);
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
