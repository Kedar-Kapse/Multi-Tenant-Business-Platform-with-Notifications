package com.kedar.kapse.business_service.service;

import com.kedar.kapse.platform_core.event.BaseEvent;
import com.kedar.kapse.platform_core.event.EventTopics;
import com.kedar.kapse.platform_core.event.NotificationRequestedPayload;
import com.kedar.kapse.platform_core.security.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

/**
 * Sends "notify this user" events to notification-service (Kafka), which stores them
 * for the bell / Notifications page. Sent only AFTER the database change commits, so a
 * rolled-back booking never produces a notification. A Kafka problem is logged and
 * never breaks the user's action.
 */
@Component
@Slf4j
public class NotificationPublisher {

    @Autowired(required = false)
    private KafkaTemplate<String, Object> kafkaTemplate;

    public void notify(String recipientId, String type, String title, String body, String link) {
        if (recipientId == null || recipientId.isBlank()) return;
        String tenant = TenantContext.getTenantId();
        BaseEvent<NotificationRequestedPayload> event = BaseEvent.<NotificationRequestedPayload>builder()
                .eventId(UUID.randomUUID().toString())
                .tenantId(tenant)
                .eventType("NOTIFICATION_REQUESTED")
                .source("business-service")
                .timestamp(System.currentTimeMillis())
                .payload(NotificationRequestedPayload.builder()
                        .recipientId(recipientId).type(type).title(title).body(body).link(link).build())
                .build();
        Runnable send = () -> {
            if (kafkaTemplate == null) {
                log.warn("Kafka unavailable: notification {} for {} not sent", type, recipientId);
                return;
            }
            try {
                kafkaTemplate.send(EventTopics.NOTIFICATION_REQUESTED, recipientId, event);
            } catch (Exception e) {
                log.warn("Could not send notification {} for {}: {}", type, recipientId, e.getMessage());
            }
        };
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
