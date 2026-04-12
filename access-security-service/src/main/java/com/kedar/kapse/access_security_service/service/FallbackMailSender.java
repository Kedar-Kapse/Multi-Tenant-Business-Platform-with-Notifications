package com.kedar.kapse.access_security_service.service;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * Direct-SMTP fallback used when Kafka publish fails — guarantees patient never
 * loses an OTP or registration link just because the broker is unreachable.
 * Kept intentionally minimal; the canonical HTML templates live in
 * notification-service's EmailService.
 */
@Component
@Slf4j
public class FallbackMailSender {

    private final JavaMailSender mailSender;

    @Value("${notification.mail.from:no-reply@invision.local}")
    private String fromAddress;

    @Value("${notification.mail.display-name:Invision Patient Portal}")
    private String fromDisplayName;

    public FallbackMailSender(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtp(String to, String otpCode, String purpose, int ttlSeconds) {
        String subject = "FORGOT_PASSWORD".equalsIgnoreCase(purpose)
                ? "Reset your password — verification code"
                : "Your verification code";
        String html = """
                <!doctype html><html><body style="font-family:sans-serif; padding:24px; color:#1f2937;">
                <div style="max-width:420px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
                  <h2 style="margin:0 0 12px; color:#0f766e;">Your verification code</h2>
                  <p style="margin:0 0 16px; font-size:14px;">Use this code to continue. Expires in %d seconds.</p>
                  <div style="font-family:monospace; font-size:28px; letter-spacing:6px; text-align:center; background:#f0fdfa; color:#0f766e; padding:14px; border-radius:8px; font-weight:600;">%s</div>
                </div></body></html>
                """.formatted(ttlSeconds, otpCode);
        send(to, subject, html);
    }

    public void sendRegistrationLink(String to, String firstName, String link) {
        String name = (firstName == null || firstName.isBlank()) ? "there" : firstName;
        String subject = "Welcome to Invision — complete your registration";
        String html = """
                <!doctype html><html><body style="font-family:sans-serif; padding:24px; color:#1f2937;">
                <div style="max-width:520px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
                  <h2 style="margin:0 0 12px; color:#0f766e;">Welcome, %s</h2>
                  <p style="margin:0 0 20px; font-size:14px;">Complete your registration to the Invision Patient Portal by clicking the link below.</p>
                  <p style="text-align:center;"><a href="%s" style="display:inline-block; background:#0f766e; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600;">Complete registration</a></p>
                </div></body></html>
                """.formatted(name, link);
        send(to, subject, html);
    }

    private void send(String to, String subject, String html) {
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, false, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(fromAddress, fromDisplayName, StandardCharsets.UTF_8.name()));
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(mime);
            log.info("[fallback-mail] sent to={} subject='{}'", to, subject);
        } catch (Exception e) {
            log.error("[fallback-mail] failed to deliver to={}: {}", to, e.getMessage());
        }
    }
}
