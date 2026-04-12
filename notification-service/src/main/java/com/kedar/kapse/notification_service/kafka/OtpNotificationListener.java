package com.kedar.kapse.notification_service.kafka;

import com.kedar.kapse.notification_service.service.CallService;
import com.kedar.kapse.notification_service.service.EmailService;
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

    @KafkaListener(topics = EventTopics.OTP_REQUESTED, groupId = "notification-group")
    public void onOtpRequested(BaseEvent<OtpRequestedPayload> event) {
        OtpRequestedPayload p = event.getPayload();
        if (p == null || p.getIdentifier() == null || p.getOtpCode() == null) {
            log.warn("Dropping OTP_REQUESTED event with missing payload: {}", event.getEventId());
            return;
        }
        log.info("📩 OTP_REQUESTED eventId={} channel={} purpose={}",
                event.getEventId(), p.getChannel(), p.getPurpose());

        int ttl = p.getTtlSeconds() != null ? p.getTtlSeconds() : 60;
        if ("CALL".equalsIgnoreCase(p.getChannel())) {
            callService.placeOtpCall(p.getIdentifier(), p.getOtpCode(), p.getPurpose(), ttl, p.getTenantRealm());
        } else {
            emailService.sendOtp(p.getIdentifier(), p.getOtpCode(), p.getPurpose(), ttl, p.getTenantRealm());
        }
    }
}
