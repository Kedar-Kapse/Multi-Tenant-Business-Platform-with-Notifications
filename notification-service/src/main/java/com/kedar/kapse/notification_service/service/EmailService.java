package com.kedar.kapse.notification_service.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Mock email dispatcher — logs a structured message.
 * Replace with JavaMailSender / SendGrid / SES integration in production.
 */
@Service
@Slf4j
public class EmailService {

    public void sendRegistrationLink(String to, String firstName, String link, String tenantRealm) {
        log.info("""

                ───── 📧 MOCK EMAIL (Registration) ─────
                To        : {}
                Subject   : Welcome to the platform — complete your registration
                Tenant    : {}
                Body      : Hi {}, please complete your registration by clicking:
                            {}
                ────────────────────────────────────────
                """, to, tenantRealm, firstName, link);
    }

    public void sendOtp(String to, String otpCode, String purpose, int ttlSeconds, String tenantRealm) {
        log.info("""

                ───── 📧 MOCK EMAIL (OTP) ─────
                To        : {}
                Subject   : Your verification code
                Tenant    : {}
                Purpose   : {}
                Body      : Your code is {} — valid for {} seconds.
                ───────────────────────────────
                """, to, tenantRealm, purpose, otpCode, ttlSeconds);
    }
}
