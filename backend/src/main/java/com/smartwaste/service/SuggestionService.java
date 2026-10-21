package com.smartwaste.service;

import com.smartwaste.entity.*;
import com.smartwaste.repository.*;
import com.smartwaste.websocket.RealtimePublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Generates personalised suggestions purely from the user's persisted activity
 * (AI scans, waste logs, complaints, pickups, reward points). Suggestions are
 * stored in the user_suggestions table and are re-evaluated every time the
 * user's data changes (the frontend refetches on live activity events).
 */
@Service
@RequiredArgsConstructor
public class SuggestionService {

    private final UserSuggestionRepository suggestionRepository;
    private final WasteLogRepository wasteLogRepository;
    private final WasteDetectionRepository wasteDetectionRepository;
    private final ComplaintRepository complaintRepository;
    private final RewardTransactionRepository rewardTransactionRepository;
    private final PickupRequestRepository pickupRequestRepository;
    private final RealtimePublisher realtimePublisher;

    @Transactional
    public List<UserSuggestion> getUserSuggestions(User user) {
        generateDynamicSuggestions(user);
        return suggestionRepository.findByUserIdAndIsDismissedFalseOrderByCreatedAtDesc(user.getId());
    }

    @Transactional
    public void markAsRead(Long id, Long userId) {
        UserSuggestion suggestion = suggestionRepository.findById(id).orElseThrow();
        if (suggestion.getUser().getId().equals(userId)) {
            suggestion.setIsRead(true);
            suggestionRepository.save(suggestion);
            realtimePublisher.userActivity(userId, "SUGGESTION");
        }
    }

    @Transactional
    public void dismiss(Long id, Long userId) {
        UserSuggestion suggestion = suggestionRepository.findById(id).orElseThrow();
        if (suggestion.getUser().getId().equals(userId)) {
            suggestion.setIsDismissed(true);
            suggestionRepository.save(suggestion);
            realtimePublisher.userActivity(userId, "SUGGESTION");
        }
    }

    private void generateDynamicSuggestions(User user) {
        Long uid = user.getId();
        List<WasteDetection> detections = wasteDetectionRepository.findByUserIdOrderByCreatedAtDesc(uid);
        List<WasteLog> logs = wasteLogRepository.findByUserIdOrderByCreatedAtDesc(uid);
        List<Complaint> complaints = complaintRepository.findByUserId(uid);
        List<PickupRequest> pickups = pickupRequestRepository.findByUserId(uid);
        int points = user.getTotalPoints() != null ? user.getTotalPoints() : 0;

        // 1. Category-specific disposal tip based on the latest AI scan
        if (!detections.isEmpty()) {
            String cat = detections.get(0).getDetectedCategory();
            String key = "DETECT_TIP_" + cat.toUpperCase().replaceAll("[^A-Z]", "_");
            switch (cat.toLowerCase()) {
                case "plastic" -> createIfNotExists(user, "Separate plastic waste before disposal",
                        "Your latest AI scan detected plastic. Rinse and crush bottles before dropping them in the BLUE recycling bin.",
                        "Recycling", key);
                case "paper" -> createIfNotExists(user, "Keep paper dry for recycling",
                        "You recently scanned paper. Wet or food-soiled paper can't be recycled — keep it dry and flatten cardboard.",
                        "Recycling", key);
                case "glass" -> createIfNotExists(user, "Handle glass safely",
                        "Glass detected in your last scan. Remove caps and wrap broken glass before placing it in the recycling bin.",
                        "Safety", key);
                case "metal" -> createIfNotExists(user, "Metal cans are 100% recyclable",
                        "Your scan found metal. Rinse cans and tins — metal can be recycled endlessly without losing quality.",
                        "Recycling", key);
                case "organic" -> createIfNotExists(user, "Try home composting",
                        "Organic waste detected. Composting kitchen scraps cuts landfill methane and gives you free fertiliser.",
                        "Composting", key);
                case "e-waste" -> createIfNotExists(user, "E-waste needs special handling",
                        "Your scan detected electronic waste. Request a pickup or drop it at an e-waste centre — never put it in regular bins.",
                        "Hazard", key);
                default -> createIfNotExists(user, "Reduce general landfill waste",
                        "Your last scan was general waste. Try choosing reusable or recyclable alternatives for these items.",
                        "Reduction", key);
            }
        } else {
            createIfNotExists(user, "Scan your first item with AI",
                    "Use AI Detection to identify the right bin for any item — each scan earns you 5 eco points.",
                    "Getting Started", "FIRST_SCAN");
        }

        // 2. Recycling milestones & recycling-rate coaching from waste logs
        if (logs.size() >= 3) {
            createIfNotExists(user, "Your recycling activity increased!",
                    "You have " + logs.size() + " recorded waste collections. Keep up the great work for a cleaner environment.",
                    "Activity", "RECYCLING_MILESTONE_" + (logs.size() / 3));

            double total = 0, recyclable = 0;
            for (WasteLog l : logs) {
                double q = l.getQuantityKg() != null ? l.getQuantityKg().doubleValue() : 0;
                total += q;
                String t = l.getWasteType() == null ? "" : l.getWasteType().toLowerCase();
                if (t.contains("plastic") || t.contains("paper") || t.contains("glass") || t.contains("metal") || t.contains("recycl")) {
                    recyclable += q;
                }
            }
            if (total > 0 && (recyclable / total) < 0.4) {
                createIfNotExists(user, "Boost your recycling rate",
                        String.format("Only %.0f%% of your collected waste was recyclable. Segregate dry recyclables to raise your score.", (recyclable / total) * 100),
                        "Recycling", "LOW_RECYCLING_RATE");
            }
        }

        // 3. Complaint follow-up (self-updating: message refreshes, auto-clears when none pending)
        long pending = complaints.stream()
                .filter(c -> "PENDING".equalsIgnoreCase(c.getStatus()) || "IN_PROGRESS".equalsIgnoreCase(c.getStatus()))
                .count();
        if (pending > 0) {
            upsert(user, "Track your active reports",
                    "You have " + pending + " open report(s). Authorities are working on them — you'll get a live alert on every update.",
                    "Community", "PENDING_COMPLAINTS");
        } else {
            autoDismiss(uid, "PENDING_COMPLAINTS");
        }
        long resolved = complaints.stream().filter(c -> "RESOLVED".equalsIgnoreCase(c.getStatus())).count();
        if (resolved > 0) {
            createIfNotExists(user, "Rate your resolved reports",
                    "You have " + resolved + " resolved report(s). Rating the resolution helps authorities improve service.",
                    "Community", "RATE_RESOLVED_" + resolved);
        }

        // 4. Pickup guidance
        long openPickups = pickups.stream()
                .filter(p -> !"COMPLETED".equalsIgnoreCase(p.getStatus()) && !"CANCELLED".equalsIgnoreCase(p.getStatus()) && !"REJECTED".equalsIgnoreCase(p.getStatus()))
                .count();
        if (openPickups > 0) {
            upsert(user, "Pickup in progress",
                    "You have " + openPickups + " active pickup request(s). Keep the waste segregated and ready at the pickup address.",
                    "Pickup", "OPEN_PICKUPS");
        } else {
            autoDismiss(uid, "OPEN_PICKUPS");
        }
        long completedPickups = pickups.stream().filter(p -> "COMPLETED".equalsIgnoreCase(p.getStatus())).count();
        if (completedPickups >= 2) {
            createIfNotExists(user, "Consider a regular pickup schedule",
                    "You've completed " + completedPickups + " pickups. Requesting them on a fixed day helps teams plan efficient routes.",
                    "Pickup", "REGULAR_PICKUP");
        }

        // 5. Reward progress — always points to the next real achievement
        int[] thresholds = {100, 500, 1000};
        String[] names = {"Eco Beginner", "Green Guardian", "Planet Savior"};
        for (int i = 0; i < thresholds.length; i++) {
            if (points > 0 && points < thresholds[i]) {
                upsert(user, "You're close to " + names[i] + "!",
                        "You have " + points + " points. Earn " + (thresholds[i] - points) + " more to unlock " + names[i] + ".",
                        "Rewards", "NEXT_ACHIEVEMENT");
                break;
            }
        }

        // 6. Inactivity nudge (no activity in last 7 days)
        ZonedDateTime latest = null;
        if (!detections.isEmpty()) latest = max(latest, detections.get(0).getCreatedAt());
        if (!logs.isEmpty()) latest = max(latest, logs.get(0).getCreatedAt());
        for (Complaint c : complaints) latest = max(latest, c.getCreatedAt());
        for (PickupRequest p : pickups) latest = max(latest, p.getCreatedAt());
        if (latest != null && latest.isBefore(ZonedDateTime.now().minusDays(7))) {
            createIfNotExists(user, "We miss you!",
                    "It's been over a week since your last activity. Scan an item or check nearby bins to keep your streak alive.",
                    "Engagement", "INACTIVE_" + ZonedDateTime.now().getYear() + "_" + ZonedDateTime.now().getDayOfYear() / 7);
        }

        // 7. Welcome
        createIfNotExists(user, "Welcome to SmartWaste!",
                "Start by reporting an issue, scanning waste with AI, or requesting a pickup to unlock your first achievement.",
                "System", "WELCOME_SUGGESTION");
    }

    private ZonedDateTime max(ZonedDateTime a, ZonedDateTime b) {
        if (b == null) return a;
        if (a == null) return b;
        return b.isAfter(a) ? b : a;
    }

    private void createIfNotExists(User user, String title, String message, String category, String refKey) {
        Optional<UserSuggestion> existing = suggestionRepository.findByUserIdAndReferenceKey(user.getId(), refKey);
        if (existing.isEmpty()) {
            UserSuggestion suggestion = new UserSuggestion();
            suggestion.setUser(user);
            suggestion.setTitle(title);
            suggestion.setMessage(message);
            suggestion.setCategory(category);
            suggestion.setReferenceKey(refKey);
            suggestionRepository.save(suggestion);
        }
    }

    /** Creates or refreshes a suggestion whose content depends on live counts. */
    private void upsert(User user, String title, String message, String category, String refKey) {
        Optional<UserSuggestion> existing = suggestionRepository.findByUserIdAndReferenceKey(user.getId(), refKey);
        if (existing.isEmpty()) {
            createIfNotExists(user, title, message, category, refKey);
            return;
        }
        UserSuggestion s = existing.get();
        if (!message.equals(s.getMessage()) || !title.equals(s.getTitle())) {
            s.setTitle(title);
            s.setMessage(message);
            s.setIsRead(false);
            s.setIsDismissed(false); // content changed -> surface it again
            suggestionRepository.save(s);
        }
    }

    private void autoDismiss(Long userId, String refKey) {
        suggestionRepository.findByUserIdAndReferenceKey(userId, refKey).ifPresent(s -> {
            if (!Boolean.TRUE.equals(s.getIsDismissed())) {
                s.setIsDismissed(true);
                suggestionRepository.save(s);
            }
        });
    }
}
