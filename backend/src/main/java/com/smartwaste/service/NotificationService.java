package com.smartwaste.service;

import com.smartwaste.entity.Notification;
import com.smartwaste.entity.User;
import com.smartwaste.repository.NotificationRepository;
import com.smartwaste.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final com.smartwaste.websocket.RealtimePublisher realtimePublisher;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               SimpMessagingTemplate messagingTemplate,
                               com.smartwaste.websocket.RealtimePublisher realtimePublisher) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.realtimePublisher = realtimePublisher;
    }

    @Transactional
    public void createNotification(Long userId, String type, String title, String message, String entityType, String entityId) {
        User user = null;
        if (userId != null) {
            user = userRepository.findById(userId).orElse(null);
        }

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setEntityType(entityType);
        notification.setEntityId(entityId);

        Notification saved = notificationRepository.save(notification);

        if (user != null) {
            messagingTemplate.convertAndSend("/topic/notifications/user/" + user.getId(), saved);
            realtimePublisher.userActivity(user.getId(), "NOTIFICATION");
        } else {
            // Global/Admin notification
            messagingTemplate.convertAndSend("/topic/notifications/admin", saved);
        }
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countUnreadByUserId(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (notification.getUser() != null && notification.getUser().getId().equals(userId)) {
            notification.setIsRead(true);
            notificationRepository.save(notification);
            realtimePublisher.userActivity(userId, "NOTIFICATIONS_READ");
        }
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
        realtimePublisher.userActivity(userId, "NOTIFICATIONS_READ");
    }
}
