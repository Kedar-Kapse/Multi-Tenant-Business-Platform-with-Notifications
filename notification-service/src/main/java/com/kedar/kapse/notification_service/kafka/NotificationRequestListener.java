package com.kedar.kapse.notification_service.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kedar.kapse.notification_service.entity.Notification;
import com.kedar.kapse.notification_service.repository.NotificationRepository;
import com.kedar.kapse.platform_core.event.BaseEvent;
import com.kedar.kapse.platform_core.event.EventTopics;
import com.kedar.kapse.platform_core.event.NotificationRequestedPayload;
import com.kedar.kapse.platform_core.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Stores "notify this user" events as in-app notifications, in the event's hospital.
 * A redelivered event (same eventId) is stored only once.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationRequestListener {

    private final NotificationRepository repo;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = EventTopics.NOTIFICATION_REQUESTED, groupId = "notification-inbox")
    public void onNotificationRequested(BaseEvent<?> event) {
        NotificationRequestedPayload p = objectMapper.convertValue(event.getPayload(), NotificationRequestedPayload.class);
        if (p == null || p.getRecipientId() == null || event.getTenantId() == null || event.getEventId() == null) {
            log.warn("Dropping notification event without recipient/tenant: eventId={}", event.getEventId());
            return;
        }
        TenantContext.runAs(event.getTenantId(), () -> {
            if (repo.existsByEventId(event.getEventId())) return;
            repo.save(Notification.builder()
                    .eventId(event.getEventId())
                    .recipientId(p.getRecipientId())
                    .type(p.getType() != null ? p.getType() : "INFO")
                    .title(cut(p.getTitle() != null ? p.getTitle() : "Notification", 200))
                    .body(cut(p.getBody(), 1000))
                    .link(cut(p.getLink(), 200))
                    .build());
        });
    }

    private static String cut(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
