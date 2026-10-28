package com.smartwaste.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.smartwaste.entity.Dustbin;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class FirebaseRealtimeService {

    private static final Logger log = LoggerFactory.getLogger(FirebaseRealtimeService.class);
    private final FirebaseDatabase database;

    public FirebaseRealtimeService(@Autowired(required = false) FirebaseApp firebaseApp) {
        if (firebaseApp != null) {
            this.database = FirebaseDatabase.getInstance(firebaseApp);
            log.info("🔥 FirebaseRealtimeService connected to Firebase RTDB");
        } else {
            this.database = null;
            log.warn("⚠️ FirebaseRealtimeService initialized in STANDBY mode (FirebaseApp is null)");
        }
    }

    public CompletableFuture<Void> publishLatest(Dustbin bin) {
        if (database == null) {
            log.warn("⚠️ Firebase Realtime Database is not configured, skipping live push.");
            return CompletableFuture.completedFuture(null);
        }

        String deviceId = bin.getDeviceId();

        if (deviceId == null || deviceId.isBlank()) {
            return CompletableFuture.failedFuture(
                    new IllegalArgumentException("Device ID is required")
            );
        }

        Map<String, Object> data = new HashMap<>();
        data.put("deviceId", deviceId);
        data.put("name", bin.getName());
        data.put("fillLevel", bin.getFillLevel());
        data.put("temperature", bin.getTemperature());
        data.put("humidity", bin.getHumidity());
        data.put("airQuality", bin.getAirQuality());
        data.put("status", bin.getStatus());
        data.put("lastUpdated", System.currentTimeMillis());

        CompletableFuture<Void> completableFuture = new CompletableFuture<>();

        DatabaseReference reference = database
                .getReference("liveDustbins")
                .child(deviceId);

        log.info("📡 Publishing dustbin '{}' ({}) to Firebase RTDB at liveDustbins/{} ...", 
                bin.getName(), deviceId, deviceId);

        reference.setValue(data, new DatabaseReference.CompletionListener() {
            @Override
            public void onComplete(DatabaseError error, DatabaseReference ref) {
                if (error != null) {
                    log.error("❌ Firebase RTDB write failed for device {}: {} (details: {})",
                            deviceId, error.getMessage(), error.getDetails());
                    completableFuture.completeExceptionally(error.toException());
                } else {
                    log.info("✅ Firebase RTDB write SUCCESS for device {} at path: {}", deviceId, ref.getPath());
                    completableFuture.complete(null);
                }
            }
        });

        return completableFuture;
    }
}
