package com.smartwaste.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.IOException;

@Configuration
public class FirebaseConfig {

    @Bean
    public FirebaseApp firebaseApp(
            @Value("${firebase.database-url:}") String databaseUrl,
            @Value("${firebase.service-account-path:}") String keyPath,
            @Value("${FIREBASE_SERVICE_ACCOUNT_JSON:}") String rawServiceAccountJson
    ) throws IOException {

        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        InputStream stream = null;

        // 1. Check raw JSON string in environment variable
        if (rawServiceAccountJson != null && !rawServiceAccountJson.isBlank()) {
            stream = new java.io.ByteArrayInputStream(rawServiceAccountJson.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }

        // 2. Check specified keyPath
        if (stream == null && keyPath != null && !keyPath.isBlank()) {
            File file = new File(keyPath);
            if (file.exists()) {
                stream = new FileInputStream(file);
            } else if (keyPath.startsWith("classpath:")) {
                String cpPath = keyPath.substring("classpath:".length());
                stream = getClass().getClassLoader().getResourceAsStream(cpPath);
            }
        }

        // 3. Fallback to current working directory serviceAccountKey.json
        if (stream == null) {
            File fallback = new File("serviceAccountKey.json");
            if (fallback.exists()) {
                stream = new FileInputStream(fallback);
            }
        }

        if (stream == null) {
            System.out.println("⚠️ Firebase service account key not found at path: [" + keyPath + 
                               "]. Set FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT_JSON, or place serviceAccountKey.json in root.");
            return null;
        }

        try (InputStream is = stream) {
            System.out.println("🔥 Initializing Firebase with URL: [" + databaseUrl + "]");
            FirebaseOptions.Builder builder = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(is));

            if (databaseUrl != null && !databaseUrl.isBlank()) {
                builder.setDatabaseUrl(databaseUrl.trim());
            }

            FirebaseOptions options = builder.build();
            FirebaseApp app = FirebaseApp.initializeApp(options);
            System.out.println("✅ Firebase initialized successfully: " + app.getName() + " with database URL: " + app.getOptions().getDatabaseUrl());
            return app;
        }
    }
}
