package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.access_security_service.entity.OtpVerification;
import com.kedar.kapse.access_security_service.repository.OtpVerificationRepository;
import com.kedar.kapse.platform_core.dto.OtpGenerateRequest;
import com.kedar.kapse.platform_core.dto.OtpVerifyRequest;
import com.kedar.kapse.platform_core.enums.OtpPurpose;
import com.kedar.kapse.platform_core.enums.OtpStatus;
import com.kedar.kapse.platform_core.security.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * OTP lifecycle service.
 *
 * Security model:
 * - Raw OTPs never hit disk. We store a BCrypt hash and compare with
 *   {@link BCryptPasswordEncoder#matches(CharSequence, String)} on verify.
 * - Rate limit + resend cooldown prevent code-spraying.
 * - A verified OTP row's id is returned as a one-time verificationToken;
 *   {@link #consumeVerificationToken} flips it to CONSUMED after set-password.
 */
@Service
@Slf4j
public class OtpService {

    private static final SecureRandom RANDOM = new SecureRandom();
    /** Max age of a VERIFIED OTP that can still be used to complete set-password. */
    private static final int VERIFIED_TOKEN_TTL_MINUTES = 5;

    @Value("${otp.length:6}")                    private int otpLength;
    @Value("${otp.ttl-seconds:60}")              private int ttlSeconds;
    @Value("${otp.max-attempts:3}")              private int maxAttempts;
    @Value("${otp.resend-cooldown-seconds:30}")  private int resendCooldownSeconds;
    @Value("${otp.max-per-window:5}")            private int maxPerWindow;
    @Value("${otp.rate-window-minutes:10}")      private int rateWindowMinutes;

    private final OtpVerificationRepository otpRepository;
    private final NotificationEventPublisher eventPublisher;
    private final BCryptPasswordEncoder passwordEncoder;

    public OtpService(OtpVerificationRepository otpRepository,
                      NotificationEventPublisher eventPublisher,
                      @Value("${otp.bcrypt-cost:10}") int bcryptCost) {
        this.otpRepository = otpRepository;
        this.eventPublisher = eventPublisher;
        this.passwordEncoder = new BCryptPasswordEncoder(bcryptCost);
    }

    @Transactional
    public void generate(OtpGenerateRequest req) {
        String identifier = req.getIdentifier().trim().toLowerCase();
        String tenantRealm = TenantContext.getTenantId();

        long recent = otpRepository.countByIdentifierAndPurposeAndCreatedAtAfter(
                identifier, req.getPurpose(), LocalDateTime.now().minusMinutes(rateWindowMinutes));
        if (recent >= maxPerWindow) {
            throw new IllegalStateException("OTP rate limit exceeded. Try again later.");
        }

        Optional<OtpVerification> latest = otpRepository
                .findTopByIdentifierAndPurposeAndStatusOrderByCreatedAtDesc(
                        identifier, req.getPurpose(), OtpStatus.PENDING);
        latest.ifPresent(prev -> {
            long secondsSince = Duration.between(prev.getCreatedAt(), LocalDateTime.now()).getSeconds();
            if (secondsSince < resendCooldownSeconds) {
                throw new IllegalStateException("Please wait " + (resendCooldownSeconds - secondsSince) +
                        "s before requesting another OTP.");
            }
            prev.setStatus(OtpStatus.EXPIRED);
            otpRepository.save(prev);
        });

        String rawCode = generateCode(otpLength);
        String hash = passwordEncoder.encode(rawCode);

        OtpVerification otp = OtpVerification.builder()
                .identifier(identifier)
                .otpCode(hash)
                .channel(req.getChannel())
                .purpose(req.getPurpose())
                .status(OtpStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusSeconds(ttlSeconds))
                .attemptCount(0)
                .maxAttempts(maxAttempts)
                .tenantRealm(tenantRealm)
                .build();
        otpRepository.save(otp);

        // Publish the RAW code (it's ephemeral — never persisted). If Kafka is
        // unreachable the publisher falls back to sending the email directly.
        eventPublisher.publishOtp(identifier, req.getChannel().name(), req.getPurpose().name(),
                rawCode, ttlSeconds, tenantRealm);
    }

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

        if (!passwordEncoder.matches(req.getOtpCode(), otp.getOtpCode())) {
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
        log.info("OTP verified identifier={} purpose={}", identifier, req.getPurpose());
        return otp.getId();
    }

    /**
     * Validates the token and returns the identifier WITHOUT consuming it.
     * Call this first, do all side-effect work, then call consumeVerificationToken at the end.
     * This way a failure mid-flow leaves the token in VERIFIED state so the user can retry.
     */
    @Transactional(readOnly = true)
    public String validateVerificationToken(UUID verificationToken, OtpPurpose expectedPurpose) {
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
            throw new IllegalArgumentException("Verification token has expired. Please verify OTP again.");
        }
        return otp.getIdentifier();
    }

    @Transactional
    public void consumeVerificationToken(UUID verificationToken) {
        if (verificationToken == null) throw new IllegalArgumentException("Verification token is required");
        OtpVerification otp = otpRepository.findById(verificationToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid verification token"));
        if (otp.getVerifiedAt() == null ||
                otp.getVerifiedAt().isBefore(LocalDateTime.now().minusMinutes(VERIFIED_TOKEN_TTL_MINUTES))) {
            otp.setStatus(OtpStatus.EXPIRED);
            otpRepository.save(otp);
            throw new IllegalArgumentException("Verification token has expired. Please verify OTP again.");
        }
        otp.setStatus(OtpStatus.CONSUMED);
        otpRepository.save(otp);
    }

    private static String generateCode(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) sb.append(RANDOM.nextInt(10));
        return sb.toString();
    }
}
