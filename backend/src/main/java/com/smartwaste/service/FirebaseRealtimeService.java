package com.smartwaste.service;

import com.google.api.core.ApiFuture;
import com.google.firebase.FirebaseApp;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.smartwaste.entity.Dustbin;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ForkJoinPool;

@Service
public class FirebaseRealtimeService {

    private final FirebaseDatabase database;

    public FirebaseRealtimeService(@Autowired(required = false) FirebaseApp firebaseApp) {
        if (firebaseApp != null) {
            this.database = FirebaseDatabase.getInstance(firebaseApp);
        } else {
            this.database = null;
        }
    }

    public CompletableFuture<Void> publishLatest(Dustbin bin) {
        if (database == null) {
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

        DatabaseReference reference = database
                .getReference("liveDustbins")
                .child(deviceId);

        ApiFuture<Void> apiFuture = reference.setValueAsync(data);
        CompletableFuture<Void> completableFuture = new CompletableFuture<>();
        apiFuture.addListener(() -> {
            try {
                completableFuture.complete(apiFuture.get());
            } catch (Exception e) {
                completableFuture.completeExceptionally(e.getCause() != null ? e.getCause() : e);
            }
        }, ForkJoinPool.commonPool());

        return completableFuture;
    }
}
