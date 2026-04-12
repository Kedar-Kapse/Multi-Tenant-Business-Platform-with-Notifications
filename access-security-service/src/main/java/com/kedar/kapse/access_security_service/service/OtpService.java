package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.OtpGenerateRequest;
import com.kedar.kapse.platform_core.dto.OtpVerifyRequest;
import com.kedar.kapse.platform_core.entity.OtpVerification;
import com.kedar.kapse.platform_core.enums.OtpStatus;
import com.kedar.kapse.platform_core.repository.OtpVerificationRepository;
import com.kedar.kapse.platform_core.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private static final SecureRandom RANDOM = new SecureRandom();

    @Value("${otp.length:6}")
    private int otpLength;

    @Value("${otp.ttl-seconds:60}")
    private int ttlSeconds;

    @Value("${otp.max-attempts:3}")
    private int maxAttempts;

    @Value("${otp.resend-cooldown-seconds:30}")
    private int resendCooldownSeconds;

    @Value("${otp.max-per-window:5}")
    private int maxPerWindow;

    @Value("${otp.rate-window-minutes:10}")
    private int rateWindowMinutes;

    /** Max age of a VERIFIED OTP that can still be used to complete set-password. */
    private static final int VERIFIED_TOKEN_TTL_MINUTES = 5;

    private final OtpVerificationRepository otpRepository;
    private final NotificationEventPublisher eventPublisher;

    @Transactional
    public void generate(OtpGenerateRequest req) {
        String identifier = req.getIdentifier().trim().toLowerCase();
        String tenantRealm = TenantContext.getTenantId();

        long recent = otpRepository.countByIdentifierAndPurposeAndCreatedAtAfter(
                identifier, req.getPurpose(), LocalDateTime.now().minusMinutes(rateWindowMinutes));
        if (recent >= maxPerWindow) {
            throw new IllegalStateException("OTP rate limit exceeded. Try again later.");
        }

        // Cooldown check — prevents spamming resend
        Optional<OtpVerification> latest = otpRepository
                .findTopByIdentifierAndPurposeAndStatusOrderByCreatedAtDesc(
                        identifier, req.getPurpose(), OtpStatus.PENDING);
        latest.ifPresent(prev -> {
            long secondsSince = java.time.Duration.between(prev.getCreatedAt(), LocalDateTime.now()).getSeconds();
            if (secondsSince < resendCooldownSeconds) {
                throw new IllegalStateException("Please wait " + (resendCooldownSeconds - secondsSince) +
                        "s before requesting another OTP.");
            }
            prev.setStatus(OtpStatus.EXPIRED);
            otpRepository.save(prev);
        });

        String code = generateCode(otpLength);
        OtpVerification otp = OtpVerification.builder()
                .identifier(identifier)
                .otpCode(code)
                .channel(req.getChannel())
                .purpose(req.getPurpose())
                .status(OtpStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusSeconds(ttlSeconds))
                .attemptCount(0)
                .maxAttempts(maxAttempts)
                .tenantRealm(tenantRealm)
                .build();
        otpRepository.save(otp);

        eventPublisher.publishOtp(identifier, req.getChannel().name(), req.getPurpose().name(),
                code, ttlSeconds, tenantRealm);
    }

    /**
     * Verifies an OTP. On success returns a verificationToken (UUID) to be
     * presented at set-password. Throws IllegalArgumentException on failures.
     */
    @Transactional
    public UUID verify(OtpVerifyRequest req) {
        String identifier = req.getIdentifier().trim().toLowerCase();
        OtpVerification otp = otpRepository
                .findTopByIdentifierAndPurposeAndStatusOrderByCreatedAtDesc(
                        identifier, req.getPurpose(), OtpStatus.PENDING)
                .orElseThrow(() -> new IllegalArgumentException("No active OTP found. Please request a new one."));

        if (otp.getExpiresAt().isBefore(LocalDateTime.now())) {
            otp.setStatus(OtpStatus.EXPIRED);
            otpRepository.save(otp);
            throw new IllegalArgumentException("OTP has expired. Please request a new one.");
        }

        otp.setAttemptCount(otp.getAttemptCount() + 1);

        if (!otp.getOtpCode().equals(req.getOtpCode())) {
            if (otp.getAttemptCount() >= otp.getMaxAttempts()) {
                otp.setStatus(OtpStatus.FAILED);
                otpRepository.save(otp);
                throw new IllegalArgumentException("Max OTP attempts exceeded. Please request a new one.");
            }
            otpRepository.save(otp);
            int remaining = otp.getMaxAttempts() - otp.getAttemptCount();
            throw new IllegalArgumentException("Invalid OTP. " + remaining + " attempt(s) remaining.");
        }

        otp.setStatus(OtpStatus.VERIFIED);
        otp.setVerifiedAt(LocalDateTime.now());
        otpRepository.save(otp);
        log.info("OTP verified for identifier={} purpose={}", identifier, req.getPurpose());
        return otp.getId();
    }

    /**
     * Consumes a previously VERIFIED OTP by its token (id). Returns the identifier
     * it was issued for. Used by registration / set-password / forgot-password flows.
     */
    @Transactional
    public String consumeVerificationToken(UUID verificationToken,
                                           com.kedar.kapse.platform_core.enums.OtpPurpose expectedPurpose) {
        OtpVerification otp = otpRepository.findById(verificationToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid verification token"));

        if (otp.getStatus() != OtpStatus.VERIFIED) {
            throw new IllegalArgumentException("Verification token is not valid (status=" + otp.getStatus() + ")");
        }
        if (otp.getPurpose() != expectedPurpose) {
            throw new IllegalArgumentException("Verification token purpose mismatch");
        }
        if (otp.getVerifiedAt() == null ||
                otp.getVerifiedAt().isBefore(LocalDateTime.now().minusMinutes(VERIFIED_TOKEN_TTL_MINUTES))) {
            otp.setStatus(OtpStatus.EXPIRED);
            otpRepository.save(otp);
            throw new IllegalArgumentException("Verification token has expired. Please verify OTP again.");
        }

        otp.setStatus(OtpStatus.CONSUMED);
        otpRepository.save(otp);
        return otp.getIdentifier();
    }

    private static String generateCode(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) sb.append(RANDOM.nextInt(10));
        return sb.toString();
    }
}
