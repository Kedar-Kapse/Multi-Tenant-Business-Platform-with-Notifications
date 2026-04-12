package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.OtpGenerateRequest;
import com.kedar.kapse.platform_core.dto.OtpVerifyRequest;
import com.kedar.kapse.platform_core.entity.OtpVerification;
import com.kedar.kapse.platform_core.enums.OtpChannel;
import com.kedar.kapse.platform_core.enums.OtpPurpose;
import com.kedar.kapse.platform_core.enums.OtpStatus;
import com.kedar.kapse.platform_core.repository.OtpVerificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link OtpService} — now covering BCrypt hashing + verification.
 */
@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    // Low BCrypt cost so tests stay snappy. Still hash-based.
    private static final int TEST_BCRYPT_COST = 4;

    @Mock private OtpVerificationRepository otpRepository;
    @Mock private NotificationEventPublisher eventPublisher;

    private OtpService otpService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(TEST_BCRYPT_COST);

    @BeforeEach
    void setUp() {
        otpService = new OtpService(otpRepository, eventPublisher, TEST_BCRYPT_COST);
        ReflectionTestUtils.setField(otpService, "otpLength", 6);
        ReflectionTestUtils.setField(otpService, "ttlSeconds", 60);
        ReflectionTestUtils.setField(otpService, "maxAttempts", 3);
        ReflectionTestUtils.setField(otpService, "resendCooldownSeconds", 30);
        ReflectionTestUtils.setField(otpService, "maxPerWindow", 5);
        ReflectionTestUtils.setField(otpService, "rateWindowMinutes", 10);

        when(otpRepository.save(any(OtpVerification.class))).thenAnswer(inv -> {
            OtpVerification o = inv.getArgument(0);
            if (o.getId() == null) o.setId(UUID.randomUUID());
            if (o.getCreatedAt() == null) o.setCreatedAt(LocalDateTime.now());
            return o;
        });
    }

    private OtpGenerateRequest genReq() {
        return OtpGenerateRequest.builder()
                .identifier("user@example.com")
                .channel(OtpChannel.EMAIL)
                .purpose(OtpPurpose.REGISTRATION)
                .build();
    }

    @Test
    void generate_storesHashedOtp_andPublishesRawCode() {
        when(otpRepository.countByIdentifierAndPurposeAndCreatedAtAfter(anyString(), any(), any())).thenReturn(0L);
        when(otpRepository.findTopByIdentifierAndPurposeAndStatusOrderByCreatedAtDesc(anyString(), any(), any()))
                .thenReturn(Optional.empty());

        otpService.generate(genReq());

        ArgumentCaptor<OtpVerification> saved = ArgumentCaptor.forClass(OtpVerification.class);
        verify(otpRepository).save(saved.capture());

        String stored = saved.getValue().getOtpCode();
        assertThat(stored).startsWith("$2"); // BCrypt prefix
        assertThat(stored).hasSizeGreaterThanOrEqualTo(60);
        assertThat(stored).doesNotMatch("\\d{6}"); // raw digits must never be persisted

        ArgumentCaptor<String> rawCode = ArgumentCaptor.forClass(String.class);
        verify(eventPublisher).publishOtp(eq("user@example.com"), eq("EMAIL"),
                eq("REGISTRATION"), rawCode.capture(), eq(60), any());
        assertThat(rawCode.getValue()).matches("\\d{6}");
        assertThat(encoder.matches(rawCode.getValue(), stored))
                .as("published raw code must match the stored hash")
                .isTrue();
    }

    @Test
    void generate_rejectsWhenRateLimitExceeded() {
        when(otpRepository.countByIdentifierAndPurposeAndCreatedAtAfter(anyString(), any(), any())).thenReturn(5L);

        assertThatThrownBy(() -> otpService.generate(genReq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("rate limit");
    }

    @Test
    void generate_enforcesResendCooldown() {
        when(otpRepository.countByIdentifierAndPurposeAndCreatedAtAfter(anyString(), any(), any())).thenReturn(0L);
        OtpVerification previous = OtpVerification.builder()
                .id(UUID.randomUUID()).identifier("user@example.com").otpCode(encoder.encode("111111"))
                .channel(OtpChannel.EMAIL).purpose(OtpPurpose.REGISTRATION).status(OtpStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusSeconds(60)).attemptCount(0).maxAttempts(3)
                .build();
        previous.setCreatedAt(LocalDateTime.now().minusSeconds(5));
        when(otpRepository.findTopByIdentifierAndPurposeAndStatusOrderByCreatedAtDesc(anyString(), any(), any()))
                .thenReturn(Optional.of(previous));

        assertThatThrownBy(() -> otpService.generate(genReq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("wait");
    }

    @Test
    void verify_matchesBcryptHash_andReturnsToken() {
        String raw = "234567";
        UUID otpId = UUID.randomUUID();
        OtpVerification pending = OtpVerification.builder()
                .id(otpId).identifier("user@example.com").otpCode(encoder.encode(raw))
                .channel(OtpChannel.EMAIL).purpose(OtpPurpose.REGISTRATION).status(OtpStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusSeconds(30)).attemptCount(0).maxAttempts(3)
                .build();
        when(otpRepository.findTopByIdentifierAndPurposeAndStatusOrderByCreatedAtDesc(anyString(), any(), any()))
                .thenReturn(Optional.of(pending));

        UUID token = otpService.verify(OtpVerifyRequest.builder()
                .identifier("user@example.com").otpCode(raw).purpose(OtpPurpose.REGISTRATION).build());

        assertThat(token).isEqualTo(otpId);
        assertThat(pending.getStatus()).isEqualTo(OtpStatus.VERIFIED);
        assertThat(pending.getVerifiedAt()).isNotNull();
    }

    @Test
    void verify_rejectsWrongCode_withoutLeakingHash() {
        OtpVerification pending = OtpVerification.builder()
                .id(UUID.randomUUID()).identifier("user@example.com").otpCode(encoder.encode("999999"))
                .channel(OtpChannel.EMAIL).purpose(OtpPurpose.REGISTRATION).status(OtpStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusSeconds(60)).attemptCount(0).maxAttempts(3)
                .build();
        when(otpRepository.findTopByIdentifierAndPurposeAndStatusOrderByCreatedAtDesc(anyString(), any(), any()))
                .thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> otpService.verify(OtpVerifyRequest.builder()
                .identifier("user@example.com").otpCode("000000").purpose(OtpPurpose.REGISTRATION).build()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("2 attempt");
        assertThat(pending.getAttemptCount()).isEqualTo(1);
        assertThat(pending.getStatus()).isEqualTo(OtpStatus.PENDING);
    }

    @Test
    void verify_marksFailedAfterMaxAttempts() {
        OtpVerification pending = OtpVerification.builder()
                .id(UUID.randomUUID()).identifier("user@example.com").otpCode(encoder.encode("123456"))
                .channel(OtpChannel.EMAIL).purpose(OtpPurpose.REGISTRATION).status(OtpStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusSeconds(60)).attemptCount(2).maxAttempts(3)
                .build();
        when(otpRepository.findTopByIdentifierAndPurposeAndStatusOrderByCreatedAtDesc(anyString(), any(), any()))
                .thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> otpService.verify(OtpVerifyRequest.builder()
                .identifier("user@example.com").otpCode("000000").purpose(OtpPurpose.REGISTRATION).build()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Max OTP attempts");
        assertThat(pending.getStatus()).isEqualTo(OtpStatus.FAILED);
    }

    @Test
    void verify_failsOnExpiredOtp() {
        OtpVerification expired = OtpVerification.builder()
                .id(UUID.randomUUID()).identifier("user@example.com").otpCode(encoder.encode("123456"))
                .channel(OtpChannel.EMAIL).purpose(OtpPurpose.REGISTRATION).status(OtpStatus.PENDING)
                .expiresAt(LocalDateTime.now().minusSeconds(5)).attemptCount(0).maxAttempts(3)
                .build();
        when(otpRepository.findTopByIdentifierAndPurposeAndStatusOrderByCreatedAtDesc(anyString(), any(), any()))
                .thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> otpService.verify(OtpVerifyRequest.builder()
                .identifier("user@example.com").otpCode("123456").purpose(OtpPurpose.REGISTRATION).build()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("expired");
        assertThat(expired.getStatus()).isEqualTo(OtpStatus.EXPIRED);
    }

    @Test
    void consumeVerificationToken_marksConsumedOnSuccess() {
        UUID id = UUID.randomUUID();
        OtpVerification verified = OtpVerification.builder()
                .id(id).identifier("user@example.com").otpCode(encoder.encode("123456"))
                .channel(OtpChannel.EMAIL).purpose(OtpPurpose.REGISTRATION).status(OtpStatus.VERIFIED)
                .verifiedAt(LocalDateTime.now().minusMinutes(1))
                .expiresAt(LocalDateTime.now().minusSeconds(5)).attemptCount(1).maxAttempts(3)
                .build();
        when(otpRepository.findById(id)).thenReturn(Optional.of(verified));

        String identifier = otpService.consumeVerificationToken(id, OtpPurpose.REGISTRATION);

        assertThat(identifier).isEqualTo("user@example.com");
        assertThat(verified.getStatus()).isEqualTo(OtpStatus.CONSUMED);
    }

    @Test
    void consumeVerificationToken_rejectsIfNotVerified() {
        UUID id = UUID.randomUUID();
        OtpVerification pending = OtpVerification.builder()
                .id(id).identifier("user@example.com").otpCode(encoder.encode("123456"))
                .channel(OtpChannel.EMAIL).purpose(OtpPurpose.REGISTRATION).status(OtpStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusSeconds(60)).attemptCount(0).maxAttempts(3)
                .build();
        when(otpRepository.findById(id)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> otpService.consumeVerificationToken(id, OtpPurpose.REGISTRATION))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not valid");
    }
}
