package com.smartwaste.service;

import com.smartwaste.entity.Dustbin;
import com.smartwaste.repository.DustbinRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Optional;

@Service
public class DeviceAuthService {

    private final DustbinRepository dustbinRepository;

    @Value("${device.api.key:esp32_smartwaste_secret_key_2025}")
    private String globalDeviceApiKey;

    public DeviceAuthService(DustbinRepository dustbinRepository) {
        this.dustbinRepository = dustbinRepository;
    }

    /**
     * Resolves the token from standard HTTP headers or JSON payload
     */
    public String resolveDeviceToken(String headerKey, String apiKeyHeader, String deviceTokenHeader, String authHeader, String bodyKey) {
        if (StringUtils.hasText(headerKey)) return headerKey.trim();
        if (StringUtils.hasText(apiKeyHeader)) return apiKeyHeader.trim();
        if (StringUtils.hasText(deviceTokenHeader)) return deviceTokenHeader.trim();
        if (StringUtils.hasText(authHeader)) {
            String trimmed = authHeader.trim();
            if (trimmed.toLowerCase().startsWith("bearer ")) {
                return trimmed.substring(7).trim();
            }
            return trimmed;
        }
        if (StringUtils.hasText(bodyKey)) return bodyKey.trim();
        return null;
    }

    /**
     * Authenticates an ESP32 device against registered database keys and/or global system key.
     */
    public Dustbin authenticateDevice(String deviceId, String providedToken) {
        if (!StringUtils.hasText(providedToken)) {
            throw new SecurityException("Device authentication failed: Missing device API key. Provide 'X-Device-Key' header or 'apiKey' in payload.");
        }

        if (!StringUtils.hasText(deviceId)) {
            throw new IllegalArgumentException("Device ID is required.");
        }

        Optional<Dustbin> dustbinOpt = dustbinRepository.findByDeviceId(deviceId.trim());
        if (dustbinOpt.isEmpty()) {
            throw new IllegalArgumentException("Device with ID '" + deviceId + "' is not registered.");
        }

        Dustbin dustbin = dustbinOpt.get();

        // Check if token matches global master key OR device-specific registered key
        boolean matchesGlobal = StringUtils.hasText(globalDeviceApiKey) && globalDeviceApiKey.equals(providedToken);
        boolean matchesDeviceKey = StringUtils.hasText(dustbin.getApiKey()) && dustbin.getApiKey().equals(providedToken);

        if (!matchesGlobal && !matchesDeviceKey) {
            throw new SecurityException("Device authentication failed: Invalid API key for device '" + deviceId + "'.");
        }

        return dustbin;
    }

    public String getGlobalDeviceApiKey() {
        return globalDeviceApiKey;
    }
}
