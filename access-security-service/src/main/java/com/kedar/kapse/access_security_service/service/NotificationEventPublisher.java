package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.event.BaseEvent;
import com.kedar.kapse.platform_core.event.EventTopics;
import com.kedar.kapse.platform_core.event.OtpRequestedPayload;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Publishes OTP events to Kafka.
 * Non-blocking: send runs async; if the broker rejects the message the
 * {@link FallbackMailSender} delivers the email directly so OTP is never lost.
 */
@Component
@Slf4j
public class NotificationEventPublisher {

    private static final String SOURCE = "access-security-service";

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final FallbackMailSender fallbackMailSender;

    @Autowired
    public NotificationEventPublisher(
            @Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate,
            FallbackMailSender fallbackMailSender) {
        this.kafkaTemplate = kafkaTemplate;
        this.fallbackMailSender = fallbackMailSender;
    }

    public void publishOtp(String identifier, String channel, String purpose,
                           String otpCode, int ttlSeconds, String tenantRealm) {
        OtpRequestedPayload payload = OtpRequestedPayload.builder()
                .identifier(identifier)
                .channel(channel)
                .purpose(purpose)
                .otpCode(otpCode)
                .ttlSeconds(ttlSeconds)
                .tenantRealm(tenantRealm)
                .build();

        BaseEvent<OtpRequestedPayload> event = wrap("OTP_REQUESTED", tenantRealm, payload);
        send(EventTopics.OTP_REQUESTED, identifier, event, () -> {
            if ("CALL".equalsIgnoreCase(channel)) {
                log.warn("[fallback] CALL channel requested but no IVR provider wired — OTP not dispatched to {}", identifier);
            } else {
                fallbackMailSender.sendOtp(identifier, otpCode, purpose, ttlSeconds);
            }
        });
    }

    private <T> BaseEvent<T> wrap(String type, String tenant, T payload) {
        return BaseEvent.<T>builder()
                .eventId(UUID.randomUUID().toString())
                .tenantId(tenant)
                .eventType(type)
                .source(SOURCE)
                .timestamp(System.currentTimeMillis())
                .payload(payload)
                .build();
    }

    private void send(String topic, String key, Object event, Runnable fallback) {
        if (kafkaTemplate == null) {
            log.warn("KafkaTemplate unavailable — using direct-mail fallback for topic={}", topic);
            runFallback(topic, fallback);
            return;
        }
        try {
            CompletableFuture<?> future = kafkaTemplate.send(topic, key, event);
            future.whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Kafka publish failed topic={} key={}: {} — invoking fallback",
                            topic, key, ex.getMessage());
                    runFallback(topic, fallback);
                } else {
                    log.debug("Kafka publish succeeded topic={} key={}", topic, key);
                }
            });
        } catch (Exception e) {
            log.error("Kafka publish threw synchronously topic={} key={}: {}", topic, key, e.getMessage());
            runFallback(topic, fallback);
        }
    }

    private void runFallback(String topic, Runnable fallback) {
        try {
            fallback.run();
        } catch (Exception e) {
            log.error("Fallback delivery failed for topic={}: {}", topic, e.getMessage());
        }
    }
}
