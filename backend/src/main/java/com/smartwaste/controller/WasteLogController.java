package com.smartwaste.controller;

import com.smartwaste.dto.WasteLogRequest;
import com.smartwaste.dto.WasteLogResponse;
import com.smartwaste.service.WasteLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user/logs")
@RequiredArgsConstructor
public class WasteLogController {

    private final WasteLogService wasteLogService;

    @PostMapping
    public ResponseEntity<WasteLogResponse> createLog(
            @Valid @RequestBody WasteLogRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(wasteLogService.createLog(authentication.getName(), request));
    }

    @GetMapping
    public ResponseEntity<List<WasteLogResponse>> getUserLogs(Authentication authentication) {
        return ResponseEntity.ok(wasteLogService.getUserLogs(authentication.getName()));
    }
}
