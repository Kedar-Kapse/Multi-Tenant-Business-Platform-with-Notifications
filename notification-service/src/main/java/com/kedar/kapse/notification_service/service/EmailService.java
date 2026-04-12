package com.kedar.kapse.notification_service.service;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

/**
 * SMTP-backed email dispatcher. Sends HTML messages via the configured
 * {@code spring.mail.*} server. Throws {@link MailDeliveryException} on failure
 * so callers (Kafka listener, fallback path) can react.
 */
@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${notification.mail.from:no-reply@invision.local}")
    private String fromAddress;

    @Value("${notification.mail.display-name:Invision Patient Portal}")
    private String fromDisplayName;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtp(String to, String otpCode, String purpose, int ttlSeconds) {
        String subject = switch (purpose == null ? "" : purpose.toUpperCase()) {
            case "FORGOT_PASSWORD" -> "Reset your password — verification code";
            case "LOGIN_MFA"       -> "Your login verification code";
            default                -> "Your verification code";
        };
        String html = buildOtpHtml(otpCode, purpose, ttlSeconds);
        send(to, subject, html);
        log.info("OTP email sent to={} purpose={}", to, purpose);
    }

    public void sendRegistrationLink(String to, String firstName, String registrationLink) {
        String subject = "Welcome to Invision — complete your registration";
        String html = buildRegistrationHtml(firstName, registrationLink);
        send(to, subject, html);
        log.info("Registration email sent to={}", to);
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
        } catch (MailException | jakarta.mail.MessagingException | UnsupportedEncodingException e) {
            log.error("Failed to send email to={} subject='{}': {}", to, subject, e.getMessage());
            throw new MailDeliveryException("Failed to deliver email to " + to, e);
        }
    }

    private String buildOtpHtml(String otpCode, String purpose, int ttlSeconds) {
        String heading = "FORGOT_PASSWORD".equalsIgnoreCase(purpose)
                ? "Reset your password"
                : "Verify your email";
        return """
                <!doctype html>
                <html>
                <body style="font-family: -apple-system, Segoe UI, sans-serif; background:#f4f6fb; padding:24px; color:#1f2937;">
                  <div style="max-width:480px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.06);">
                    <div style="background:#0f766e; color:#fff; padding:20px 28px;">
                      <h1 style="margin:0; font-size:20px;">%s</h1>
                      <p style="margin:4px 0 0; font-size:13px; opacity:.85;">Invision Patient Portal</p>
                    </div>
                    <div style="padding:24px 28px;">
                      <p style="margin:0 0 16px;">Use the verification code below to continue. It expires in %d seconds.</p>
                      <div style="font-family: ui-monospace, Menlo, monospace; font-size:32px; letter-spacing:8px; background:#f0fdfa; color:#0f766e; text-align:center; padding:16px; border-radius:8px; font-weight:600;">%s</div>
                      <p style="margin:16px 0 0; font-size:13px; color:#6b7280;">If you didn't request this, you can safely ignore this email.</p>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(heading, ttlSeconds, otpCode);
    }

    private String buildRegistrationHtml(String firstName, String link) {
        String name = (firstName == null || firstName.isBlank()) ? "there" : firstName;
        return """
                <!doctype html>
                <html>
                <body style="font-family: -apple-system, Segoe UI, sans-serif; background:#f4f6fb; padding:24px; color:#1f2937;">
                  <div style="max-width:520px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.06);">
                    <div style="background:#0f766e; color:#fff; padding:20px 28px;">
                      <h1 style="margin:0; font-size:20px;">Welcome, %s</h1>
                      <p style="margin:4px 0 0; font-size:13px; opacity:.85;">Complete your patient registration</p>
                    </div>
                    <div style="padding:24px 28px;">
                      <p style="margin:0 0 16px;">Your clinician has registered you on the Invision Patient Portal. Click below to verify your email, set a password, and start using the portal.</p>
                      <p style="text-align:center; margin:24px 0;">
                        <a href="%s" style="display:inline-block; background:#0f766e; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600;">Complete registration</a>
                      </p>
                      <p style="margin:0; font-size:13px; color:#6b7280;">Or copy this link into your browser:<br><a href="%s" style="color:#0f766e; word-break:break-all;">%s</a></p>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(name, link, link, link);
    }

    public static class MailDeliveryException extends RuntimeException {
        public MailDeliveryException(String message, Throwable cause) { super(message, cause); }
    }
}
