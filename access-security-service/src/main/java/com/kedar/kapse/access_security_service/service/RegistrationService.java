package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.entity.Patient;
import com.kedar.kapse.platform_core.enums.OtpPurpose;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import com.kedar.kapse.platform_core.repository.PatientRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RegistrationService {

    private final PatientRepository patientRepository;
    private final OtpService otpService;
    private final KeycloakService keycloakService;
    private final AuditService auditService;

    /**
     * Completes patient registration: consumes OTP verification token, sets the
     * password on the Keycloak user, enables the account, and marks the Patient
     * record as ACTIVE.
     */
    @Transactional
    public void completeRegistration(UUID verificationToken, String password) {
        String identifier = otpService.consumeVerificationToken(verificationToken, OtpPurpose.REGISTRATION);
        Patient patient = patientRepository.findByEmailAndDeletedAtIsNull(identifier)
                .orElseThrow(() -> new EntityNotFoundException("No patient found for identifier: " + identifier));

        if (patient.getStatus() == PatientStatus.ACTIVE) {
            throw new IllegalStateException("Patient is already registered. Please log in.");
        }
        if (patient.getKeycloakUserId() == null || patient.getTenantRealm() == null) {
            throw new IllegalStateException("Patient has no Keycloak user — cannot activate.");
        }

        keycloakService.resetPasswordInRealm(patient.getTenantRealm(), patient.getKeycloakUserId(), password);
        keycloakService.enableUserInRealm(patient.getTenantRealm(), patient.getKeycloakUserId());

        patient.setStatus(PatientStatus.ACTIVE);
        patient.setRegistrationCompletedAt(LocalDateTime.now());
        patientRepository.save(patient);

        auditService.record("PATIENT", patient.getId().toString(), "REGISTRATION_COMPLETE",
                patient.getKeycloakUserId(), null);
        log.info("Patient registration completed: email={} keycloakId={}",
                patient.getEmail(), patient.getKeycloakUserId());
    }

    /**
     * Forgot-password flow: consumes a FORGOT_PASSWORD OTP token and resets the
     * Keycloak user's password. Does NOT change the patient's ACTIVE status.
     */
    @Transactional
    public void resetPassword(UUID verificationToken, String password) {
        String identifier = otpService.consumeVerificationToken(verificationToken, OtpPurpose.FORGOT_PASSWORD);
        Patient patient = patientRepository.findByEmailAndDeletedAtIsNull(identifier)
                .orElseThrow(() -> new EntityNotFoundException("No patient found for identifier: " + identifier));

        if (patient.getKeycloakUserId() == null || patient.getTenantRealm() == null) {
            throw new IllegalStateException("Patient has no Keycloak user — cannot reset password.");
        }
        keycloakService.resetPasswordInRealm(patient.getTenantRealm(), patient.getKeycloakUserId(), password);
        auditService.record("PATIENT", patient.getId().toString(), "PASSWORD_RESET",
                patient.getKeycloakUserId(), null);
        log.info("Patient password reset: email={}", patient.getEmail());
    }
}
