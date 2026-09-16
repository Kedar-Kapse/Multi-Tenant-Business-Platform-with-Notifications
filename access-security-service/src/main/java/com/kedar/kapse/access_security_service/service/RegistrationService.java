package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.access_security_service.client.PatientProvisioningClient;
import com.kedar.kapse.platform_core.dto.InternalPatientDto;
import com.kedar.kapse.platform_core.dto.ProvisionPatientRequest;
import com.kedar.kapse.platform_core.enums.*;
import com.kedar.kapse.platform_core.security.TenantContext;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RegistrationService {

    private static final KeycloakRole PATIENT_REALM_ROLE = KeycloakRole.PATIENT;

    private final PatientProvisioningClient patientClient;
    private final OtpService otpService;
    private final KeycloakService keycloakService;
    private final AuditService auditService;

    /**
     * Completes patient registration:
     * <ol>
     *   <li>Consumes the OTP verification token.</li>
     *   <li>Looks up the patient via business-service. If not found (self-signup path)
     *       it auto-provisions a disabled Keycloak user and creates the Patient row
     *       with {@code status = PENDING_REGISTRATION} via business-service.</li>
     *   <li>Sets the password on the Keycloak user, enables the account, and marks
     *       the Patient row {@code ACTIVE} via business-service.</li>
     * </ol>
     */
    public void completeRegistration(UUID verificationToken, String password) {
        // Validate first (does NOT consume — lets the user retry if anything below fails)
        String identifier = otpService.validateVerificationToken(verificationToken, OtpPurpose.REGISTRATION);

        InternalPatientDto patient = findOrProvision(identifier);

        if (patient.getStatus() == PatientStatus.ACTIVE) {
            throw new IllegalStateException("Patient is already registered. Please log in.");
        }
        if (patient.getKeycloakUserId() == null || patient.getTenantRealm() == null) {
            throw new IllegalStateException("Patient has no Keycloak user — cannot activate.");
        }

        keycloakService.resetPasswordInRealm(patient.getTenantRealm(), patient.getKeycloakUserId(), password);
        keycloakService.enableUserInRealm(patient.getTenantRealm(), patient.getKeycloakUserId());
        patientClient.activate(patient.getId());

        // Consume only after all side effects succeed — failed attempts leave token VERIFIED for retry
        otpService.consumeVerificationToken(verificationToken);

        auditService.record(AuditEntityType.PATIENT, patient.getId().toString(), AuditAction.REGISTRATION_COMPLETE,
                patient.getKeycloakUserId(), null);
        log.info("Patient registration completed: email={} keycloakId={}",
                patient.getEmail(), patient.getKeycloakUserId());
    }

    /**
     * Forgot-password flow: consumes a FORGOT_PASSWORD OTP token and resets the
     * Keycloak user's password. Does NOT auto-provision — you cannot reset a password
     * for an account that was never created.
     */
    public void resetPassword(UUID verificationToken, String password) {
        String identifier = otpService.validateVerificationToken(verificationToken, OtpPurpose.FORGOT_PASSWORD);

        ResponseEntity<InternalPatientDto> response = patientClient.findByEmail(identifier);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new EntityNotFoundException("No patient found for identifier: " + identifier);
        }
        InternalPatientDto patient = response.getBody();

        if (patient.getKeycloakUserId() == null || patient.getTenantRealm() == null) {
            throw new IllegalStateException("Patient has no Keycloak user — cannot reset password.");
        }
        keycloakService.resetPasswordInRealm(patient.getTenantRealm(), patient.getKeycloakUserId(), password);

        // Consume only after Keycloak reset succeeds
        otpService.consumeVerificationToken(verificationToken);

        auditService.record(AuditEntityType.PATIENT, patient.getId().toString(), AuditAction.PASSWORD_RESET,
                patient.getKeycloakUserId(), null);
        log.info("Patient password reset: email={}", patient.getEmail());
    }

    private InternalPatientDto findOrProvision(String email) {
        ResponseEntity<InternalPatientDto> response = patientClient.findByEmail(email);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            InternalPatientDto patient = response.getBody();
            if (patient.getKeycloakUserId() == null) {
                // Patient was pre-created by admin/provider — Keycloak user not yet made. Create it now.
                return linkKeycloakToExistingPatient(patient);
            }
            return patient;
        }
        return autoProvisionPatient(email);
    }

    private InternalPatientDto linkKeycloakToExistingPatient(InternalPatientDto patient) {
        String tenantRealm = patient.getTenantRealm();
        if (tenantRealm == null || tenantRealm.isBlank()) {
            tenantRealm = TenantContext.getTenantId();
        }
        if (tenantRealm == null || tenantRealm.isBlank()) {
            throw new IllegalStateException(
                    "Cannot create Keycloak user — missing tenant realm for patient: " + patient.getEmail());
        }

        String firstName = deriveFirstName(patient.getEmail());
        String keycloakUserId = keycloakService.createPendingUserInRealm(
                tenantRealm, patient.getEmail(), patient.getEmail(), firstName, "");
        keycloakService.assignRoleInRealm(tenantRealm, keycloakUserId, PATIENT_REALM_ROLE);

        ResponseEntity<InternalPatientDto> linked = patientClient.linkKeycloak(
                patient.getId(),
                Map.of("keycloakUserId", keycloakUserId, "tenantRealm", tenantRealm));

        if (!linked.getStatusCode().is2xxSuccessful() || linked.getBody() == null) {
            throw new IllegalStateException("Failed to link Keycloak user to patient: " + patient.getId());
        }
        log.info("Created and linked Keycloak user for pre-existing patient: email={} keycloakId={} realm={}",
                patient.getEmail(), keycloakUserId, tenantRealm);
        return linked.getBody();
    }

    private InternalPatientDto autoProvisionPatient(String email) {
        String tenantRealm = TenantContext.getTenantId();
        if (tenantRealm == null || tenantRealm.isBlank()) {
            throw new IllegalStateException(
                    "Cannot self-provision patient — missing X-TENANT-ID. Ensure the portal is sending the tenant header.");
        }

        String firstName = deriveFirstName(email);
        String keycloakUserId = keycloakService.createPendingUserInRealm(
                tenantRealm, email, email, firstName, "");
        keycloakService.assignRoleInRealm(tenantRealm, keycloakUserId, PATIENT_REALM_ROLE);

        InternalPatientDto patient = patientClient.provision(
                ProvisionPatientRequest.builder()
                        .email(email)
                        .firstName(firstName)
                        .lastName("")
                        .keycloakUserId(keycloakUserId)
                        .tenantRealm(tenantRealm)
                        .build()).getBody();

        if (patient == null) {
            throw new IllegalStateException("Patient provisioning returned no data for email: " + email);
        }

        auditService.record(AuditEntityType.PATIENT, patient.getId().toString(),
                AuditAction.SELF_SIGNUP, keycloakUserId,
                "Auto-provisioned during /register/complete");
        log.info("Auto-provisioned patient from self-signup: email={} keycloakId={} realm={}",
                email, keycloakUserId, tenantRealm);
        return patient;
    }

    private String deriveFirstName(String email) {
        String local = email.split("@", 2)[0];
        if (local.isBlank()) return "Patient";
        return Character.toUpperCase(local.charAt(0)) + local.substring(1);
    }
}
