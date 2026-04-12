package com.kedar.kapse.notification_service.kafka;

import com.kedar.kapse.notification_service.service.EmailService;
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

    @KafkaListener(topics = EventTopics.PATIENT_CREATED, groupId = "notification-group")
    public void onPatientCreated(BaseEvent<PatientCreatedPayload> event) {
        PatientCreatedPayload p = event.getPayload();
        if (p == null || p.getEmail() == null) {
            log.warn("Dropping PATIENT_CREATED event with missing payload: {}", event.getEventId());
            return;
        }
        log.info("📩 PATIENT_CREATED eventId={} tenant={}", event.getEventId(), event.getTenantId());
        emailService.sendRegistrationLink(p.getEmail(), p.getFirstName(), p.getRegistrationLink(), p.getTenantRealm());
    }
}
