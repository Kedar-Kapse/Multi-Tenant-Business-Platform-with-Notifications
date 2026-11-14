package com.kedar.kapse.notification_service.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kedar.kapse.notification_service.service.EmailService;
import com.kedar.kapse.notification_service.service.EventIdempotencyService;
import com.kedar.kapse.platform_core.event.BaseEvent;
import com.kedar.kapse.platform_core.event.EventTopics;
import com.kedar.kapse.platform_core.event.PatientCreatedPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class PatientNotificationListener {

    private final EmailService emailService;
    private final ObjectMapper objectMapper;
    private final EventIdempotencyService idempotencyService;

    // Own consumer group (not shared with OtpNotificationListener) so a
    // rebalance/restart on one doesn't couple with or blend monitoring with the other.
    @KafkaListener(topics = EventTopics.PATIENT_CREATED, groupId = "notification-patient-group")
    public void onPatientCreated(BaseEvent<?> event) {
        PatientCreatedPayload p = objectMapper.convertValue(event.getPayload(), PatientCreatedPayload.class);
        if (p == null || p.getEmail() == null) {
            log.warn("Dropping PATIENT_CREATED event with missing payload: eventId={}", event.getEventId());
            return;
        }
        if (idempotencyService.isAlreadyProcessed(event.getEventId())) {
            log.info("Skipping duplicate PATIENT_CREATED eventId={} (already processed)", event.getEventId());
            return;
        }
        log.info("Received PATIENT_CREATED eventId={} tenant={}", event.getEventId(), event.getTenantId());

        // No try/catch here on purpose: a failure now propagates to the container-level
        // DefaultErrorHandler (NotificationKafkaConfig), which retries with a short
        // backoff, then routes to patient.created.dlq instead of silently dropping it.
        emailService.sendRegistrationLink(p.getEmail(), p.getFirstName(), p.getRegistrationLink());
        idempotencyService.markProcessed(event.getEventId());
    }
}
