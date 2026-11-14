package com.kedar.kapse.notification_service.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kedar.kapse.notification_service.service.CallService;
import com.kedar.kapse.notification_service.service.EmailService;
import com.kedar.kapse.notification_service.service.EventIdempotencyService;
import com.kedar.kapse.platform_core.event.BaseEvent;
import com.kedar.kapse.platform_core.event.OtpRequestedPayload;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Exercises the Kafka listener's routing logic: EMAIL channel → EmailService,
 * CALL channel → CallService (mock IVR), malformed events → dropped silently.
 */
@ExtendWith(MockitoExtension.class)
class OtpNotificationListenerTest {

    @Mock private EmailService emailService;
    @Mock private CallService callService;
    @Mock private EventIdempotencyService idempotencyService;

    private OtpNotificationListener listener() {
        return new OtpNotificationListener(emailService, callService, new ObjectMapper(), idempotencyService);
    }

    private BaseEvent<OtpRequestedPayload> event(String channel, String identifier, String code) {
        return BaseEvent.<OtpRequestedPayload>builder()
                .eventId("evt-1").tenantId("test").eventType("OTP_REQUESTED")
                .source("access-security-service").timestamp(System.currentTimeMillis())
                .payload(OtpRequestedPayload.builder()
                        .identifier(identifier).channel(channel).purpose("REGISTRATION")
                        .otpCode(code).ttlSeconds(60).tenantRealm("test").build())
                .build();
    }

    @Test
    void routesEmailChannelToEmailService() {
        listener().onOtpRequested(event("EMAIL", "user@example.com", "123456"));
        verify(emailService).sendOtp("user@example.com", "123456", "REGISTRATION", 60);
        verify(idempotencyService).markProcessed("evt-1");
        verify(callService, never()).placeOtpCall(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void routesCallChannelToCallService() {
        listener().onOtpRequested(event("CALL", "+15551234567", "654321"));
        verify(callService).placeOtpCall("+15551234567", "654321", "REGISTRATION", 60, "test");
        verify(emailService, never()).sendOtp(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void skipsDuplicateEvent() {
        when(idempotencyService.isAlreadyProcessed("evt-1")).thenReturn(true);
        listener().onOtpRequested(event("EMAIL", "user@example.com", "123456"));
        verify(emailService, never()).sendOtp(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyInt());
        verify(idempotencyService, never()).markProcessed("evt-1");
    }

    @Test
    void dropsEventWithMissingPayload() {
        BaseEvent<OtpRequestedPayload> broken = BaseEvent.<OtpRequestedPayload>builder()
                .eventId("evt-broken").build();
        listener().onOtpRequested(broken);
        verify(emailService, never()).sendOtp(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyInt());
    }
}
