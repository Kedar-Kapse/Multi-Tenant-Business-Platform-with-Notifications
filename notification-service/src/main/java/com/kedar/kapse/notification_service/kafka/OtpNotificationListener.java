package com.kedar.kapse.notification_service.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kedar.kapse.notification_service.service.CallService;
import com.kedar.kapse.notification_service.service.EmailService;
import com.kedar.kapse.notification_service.service.EventIdempotencyService;
import com.kedar.kapse.platform_core.event.BaseEvent;
import com.kedar.kapse.platform_core.event.EventTopics;
import com.kedar.kapse.platform_core.event.OtpRequestedPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpNotificationListener {

    private final EmailService emailService;
    private final CallService callService;
    private final ObjectMapper objectMapper;
    private final EventIdempotencyService idempotencyService;

    // Own consumer group (not shared with PatientNotificationListener) so a
    // rebalance/restart on one doesn't couple with or blend monitoring with the other.
    @KafkaListener(topics = EventTopics.OTP_REQUESTED, groupId = "notification-otp-group")
    public void onOtpRequested(BaseEvent<?> event) {
        OtpRequestedPayload p = objectMapper.convertValue(event.getPayload(), OtpRequestedPayload.class);
        if (p == null || p.getIdentifier() == null || p.getOtpCode() == null) {
            log.warn("Dropping OTP_REQUESTED event with missing payload: eventId={}", event.getEventId());
            return;
        }
        if (idempotencyService.isAlreadyProcessed(event.getEventId())) {
            log.info("Skipping duplicate OTP_REQUESTED eventId={} (already processed)", event.getEventId());
            return;
        }
        log.info("Received OTP_REQUESTED eventId={} channel={} purpose={}",
                event.getEventId(), p.getChannel(), p.getPurpose());

        int ttl = p.getTtlSeconds() != null ? p.getTtlSeconds() : 60;
        // No try/catch here on purpose: a failure now propagates to the container-level
        // DefaultErrorHandler (NotificationKafkaConfig), which retries with a short
        // backoff, then routes to otp.requested.dlq instead of silently dropping it.
        if ("CALL".equalsIgnoreCase(p.getChannel())) {
            // Voice-call OTP stays mocked until an IVR provider (Twilio/Exotel) is wired up.
            callService.placeOtpCall(p.getIdentifier(), p.getOtpCode(), p.getPurpose(), ttl, p.getTenantRealm());
        } else {
            emailService.sendOtp(p.getIdentifier(), p.getOtpCode(), p.getPurpose(), ttl);
        }
        idempotencyService.markProcessed(event.getEventId());
    }
}
