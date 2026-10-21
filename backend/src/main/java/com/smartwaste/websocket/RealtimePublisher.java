package com.smartwaste.websocket;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.Map;

/**
 * Publishes lightweight "user activity" events to /topic/activity/user/{id}.
 * Events are sent AFTER the surrounding DB transaction commits, so when the
 * frontend refetches (analytics, suggestions, alerts, rewards, impact) it
 * always sees the freshly persisted data.
 */
@Component
public class RealtimePublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimePublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void userActivity(Long userId, String type) {
        if (userId == null) return;
        Map<String, Object> payload = Map.of(
                "type", type,
                "userId", userId,
                "timestamp", Instant.now().toString()
        );
        Runnable send = () -> messagingTemplate.convertAndSend("/topic/activity/user/" + userId, (Object) payload);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
        } else {
            send.run();
        }
    }

    public void globalActivity(String type) {
        Map<String, Object> payload = Map.of(
                "type", type,
                "timestamp", Instant.now().toString()
        );
        Runnable send = () -> messagingTemplate.convertAndSend("/topic/activity/global", (Object) payload);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
        } else {
            send.run();
        }
    }
}
