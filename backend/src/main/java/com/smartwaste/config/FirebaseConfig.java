package com.smartwaste.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

@Configuration
public class FirebaseConfig {

    @Bean
    public FirebaseApp firebaseApp(
            @Value("${firebase.database-url:}") String databaseUrl,
            @Value("${firebase.service-account-path:}") String keyPath
    ) throws IOException {

        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        if (keyPath == null || keyPath.isBlank() || !new File(keyPath).exists()) {
            System.out.println("⚠️ Firebase service account key not found at path: [" + keyPath + 
                               "]. Set FIREBASE_SERVICE_ACCOUNT_PATH and FIREBASE_DATABASE_URL to enable Firebase.");
            return null;
        }

        try (FileInputStream stream = new FileInputStream(keyPath)) {
            System.out.println("🔥 Initializing Firebase with URL: [" + databaseUrl + "] and key: [" + keyPath + "]");
            FirebaseOptions.Builder builder = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(stream));

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
