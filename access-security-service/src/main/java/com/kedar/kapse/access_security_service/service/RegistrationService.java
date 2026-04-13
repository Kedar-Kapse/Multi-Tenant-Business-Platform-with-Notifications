package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.entity.Patient;
import com.kedar.kapse.platform_core.enums.OtpPurpose;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import com.kedar.kapse.platform_core.repository.PatientRepository;
import com.kedar.kapse.platform_core.security.TenantContext;
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

    private static final String PATIENT_REALM_ROLE = "PATIENT";

    private final PatientRepository patientRepository;
    private final OtpService otpService;
    private final KeycloakService keycloakService;
    private final AuditService auditService;

    /**
     * Completes patient registration:
     * <ol>
     *   <li>Consumes the OTP verification token.</li>
     *   <li>If the Patient row doesn't exist (self-signup path) it auto-provisions
     *       a disabled Keycloak user, assigns the PATIENT role, and creates the
     *       Patient row with {@code status = PENDING_REGISTRATION}.</li>
     *   <li>Sets the password on the Keycloak user, enables the account, and marks
     *       the Patient row {@code ACTIVE}.</li>
     * </ol>
     */
    @Transactional
    public void completeRegistration(UUID verificationToken, String password) {
        String identifier = otpService.consumeVerificationToken(verificationToken, OtpPurpose.REGISTRATION);

        Patient patient = patientRepository.findByEmailAndDeletedAtIsNull(identifier)
                .orElseGet(() -> autoProvisionPatient(identifier));

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
     * Self-service path: OTP was verified but no Patient/Keycloak user exists.
     * Provision both now so the outer flow can finish (password + enable).
     */
    private Patient autoProvisionPatient(String email) {
        String tenantRealm = TenantContext.getTenantId();
        if (tenantRealm == null || tenantRealm.isBlank()) {
            throw new IllegalStateException(
                    "Cannot self-provision patient — missing X-TENANT-ID. Ensure the portal is sending the tenant header.");
        }

        String firstName = deriveFirstName(email);

        String keycloakUserId = keycloakService.createPendingUserInRealm(
                tenantRealm, email, email, firstName, "");
        keycloakService.assignRoleInRealm(tenantRealm, keycloakUserId, PATIENT_REALM_ROLE);

        Patient patient = Patient.builder()
                .firstName(firstName)
                .lastName("")
                .email(email)
                .keycloakUserId(keycloakUserId)
                .tenantRealm(tenantRealm)
                .status(PatientStatus.PENDING_REGISTRATION)
                .build();
        patient = patientRepository.save(patient);

        auditService.record("PATIENT", patient.getId().toString(), "SELF_SIGNUP",
                keycloakUserId, "Auto-provisioned during /register/complete");
        log.info("Auto-provisioned patient from self-signup: email={} keycloakId={} realm={}",
                email, keycloakUserId, tenantRealm);
        return patient;
    }

    private String deriveFirstName(String email) {
        String local = email.split("@", 2)[0];
        if (local.isBlank()) return "Patient";
        return Character.toUpperCase(local.charAt(0)) + local.substring(1);
    }

    /**
     * Forgot-password flow: consumes a FORGOT_PASSWORD OTP token and resets the
     * Keycloak user's password. Does NOT change the patient's ACTIVE status and
     * does NOT auto-provision — you cannot reset a password for an account that
     * was never created.
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
