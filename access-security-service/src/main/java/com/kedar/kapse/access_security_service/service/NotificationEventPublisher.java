package com.kedar.kapse.access_security_service.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Publishes notification-related domain events.
 *
 * Phase 2a: logs only. Phase 2b replaces the implementation with a Kafka producer
 * so notification-service can consume and dispatch email/voice notifications.
 */
@Component
@Slf4j
public class NotificationEventPublisher {

    @Value("${portal.portals.patient.url:http://localhost:3002}")
    private String patientPortalUrl;

    public void publishPatientCreated(String email, String firstName, String tenantRealm, String patientId) {
        String registrationLink = String.format("%s/register?email=%s&tenant=%s",
                patientPortalUrl, email, tenantRealm != null ? tenantRealm : "");
        log.info("📧 [PATIENT_CREATED] To={}, Name={}, Tenant={}, PatientId={}, Link={}",
                email, firstName, tenantRealm, patientId, registrationLink);
    }

    public void publishOtp(String identifier, String channel, String purpose, String otpCode, String tenantRealm) {
        if ("CALL".equalsIgnoreCase(channel)) {
            log.info("📞 [OTP_CALL] Identifier={}, Purpose={}, Tenant={}, OTP={}, (mock voice dispatch)",
                    identifier, purpose, tenantRealm, otpCode);
        } else {
            log.info("📧 [OTP_EMAIL] Identifier={}, Purpose={}, Tenant={}, OTP={}",
                    identifier, purpose, tenantRealm, otpCode);
        }
    }
}
