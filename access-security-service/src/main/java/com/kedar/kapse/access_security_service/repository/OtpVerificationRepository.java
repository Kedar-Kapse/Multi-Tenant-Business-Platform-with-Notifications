package com.kedar.kapse.access_security_service.repository;

import com.kedar.kapse.access_security_service.entity.OtpVerification;
import com.kedar.kapse.platform_core.enums.OtpPurpose;
import com.kedar.kapse.platform_core.enums.OtpStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, UUID> {

    Optional<OtpVerification> findTopByIdentifierAndPurposeAndStatusOrderByCreatedAtDesc(
            String identifier, OtpPurpose purpose, OtpStatus status);

    long countByIdentifierAndPurposeAndCreatedAtAfter(
            String identifier, OtpPurpose purpose, LocalDateTime since);
}
