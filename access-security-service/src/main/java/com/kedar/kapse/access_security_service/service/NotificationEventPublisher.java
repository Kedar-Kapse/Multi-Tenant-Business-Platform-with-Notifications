package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.event.BaseEvent;
import com.kedar.kapse.platform_core.event.EventTopics;
import com.kedar.kapse.platform_core.event.OtpRequestedPayload;
import com.kedar.kapse.platform_core.event.PatientCreatedPayload;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Publishes notification-related domain events to Kafka.
 * If KafkaTemplate isn't available (tests / Kafka down), degrades to logging.
 */
@Component
@Slf4j
public class NotificationEventPublisher {

    private static final String SOURCE = "access-security-service";

    @Value("${portal.portals.patient.url:http://localhost:3002}")
    private String patientPortalUrl;

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired(required = false)
    public NotificationEventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishPatientCreated(String email, String firstName, String lastName,
                                      String tenantRealm, String patientId) {
        String link = String.format("%s/register?email=%s&tenant=%s",
                patientPortalUrl, email, tenantRealm != null ? tenantRealm : "");

        PatientCreatedPayload payload = PatientCreatedPayload.builder()
                .patientId(patientId)
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .tenantRealm(tenantRealm)
                .registrationLink(link)
                .build();

        BaseEvent<PatientCreatedPayload> event = BaseEvent.<PatientCreatedPayload>builder()
                .eventId(UUID.randomUUID().toString())
                .tenantId(tenantRealm)
                .eventType("PATIENT_CREATED")
                .source(SOURCE)
                .timestamp(System.currentTimeMillis())
                .payload(payload)
                .build();
        send(EventTopics.PATIENT_CREATED, email, event);
        log.info("📧 [PATIENT_CREATED] email={} link={}", email, link);
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

        BaseEvent<OtpRequestedPayload> event = BaseEvent.<OtpRequestedPayload>builder()
                .eventId(UUID.randomUUID().toString())
                .tenantId(tenantRealm)
                .eventType("OTP_REQUESTED")
                .source(SOURCE)
                .timestamp(System.currentTimeMillis())
                .payload(payload)
                .build();
        send(EventTopics.OTP_REQUESTED, identifier, event);
        log.info("🔐 [OTP_REQUESTED] identifier={} channel={} purpose={}", identifier, channel, purpose);
    }

    private void send(String topic, String key, Object event) {
        if (kafkaTemplate == null) {
            log.warn("KafkaTemplate unavailable — event to topic '{}' not published: {}", topic, event);
            return;
        }
        try {
            kafkaTemplate.send(topic, key, event);
        } catch (Exception e) {
            log.error("Kafka publish failed topic={} key={}: {}", topic, key, e.getMessage());
        }
    }
}
