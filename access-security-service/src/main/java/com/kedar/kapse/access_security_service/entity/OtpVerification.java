package com.kedar.kapse.access_security_service.entity;

import com.kedar.kapse.platform_core.entity.BaseEntity;
import com.kedar.kapse.platform_core.enums.OtpChannel;
import com.kedar.kapse.platform_core.enums.OtpPurpose;
import com.kedar.kapse.platform_core.enums.OtpStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "otp_verification", indexes = {
        @Index(name = "idx_otp_identifier_purpose", columnList = "identifier,purpose,status"),
        @Index(name = "idx_otp_expires_at", columnList = "expiresAt")
})
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OtpVerification extends BaseEntity {

    /** Email address or phone number used for OTP delivery. */
    @Column(nullable = false, length = 100)
    private String identifier;

    /** BCrypt hash of the raw OTP. The raw code is never persisted. */
    @Column(nullable = false, length = 72)
    private String otpCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private OtpChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OtpPurpose purpose;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @lombok.Builder.Default
    private OtpStatus status = OtpStatus.PENDING;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    @lombok.Builder.Default
    private Integer attemptCount = 0;

    @Column(nullable = false)
    @lombok.Builder.Default
    private Integer maxAttempts = 3;

    private LocalDateTime verifiedAt;

    @Column(length = 50)
    private String tenantRealm;
}
