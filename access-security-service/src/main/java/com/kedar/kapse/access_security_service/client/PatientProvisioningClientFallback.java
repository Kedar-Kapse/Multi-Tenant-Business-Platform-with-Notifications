package com.kedar.kapse.access_security_service.client;

import com.kedar.kapse.platform_core.dto.InternalPatientDto;
import com.kedar.kapse.platform_core.dto.ProvisionPatientRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class PatientProvisioningClientFallback implements PatientProvisioningClient {

    @Override
    public ResponseEntity<InternalPatientDto> findByEmail(String email) {
        // DO NOT return notFound() here. A 404 from the fallback would cause
        // RegistrationService to auto-provision a patient even when business-service
        // is merely temporarily down, risking duplicate records on recovery.
        log.error("business-service unavailable: findByEmail({}) — cannot determine patient existence", email);
        throw new IllegalStateException(
                "Patient service is temporarily unavailable. Please try again shortly.");
    }

    @Override
    public ResponseEntity<InternalPatientDto> provision(ProvisionPatientRequest request) {
        log.error("business-service unavailable: cannot provision patient for email={}", request.getEmail());
        throw new IllegalStateException(
                "Patient provisioning service is temporarily unavailable. Please try again shortly.");
    }

    @Override
    public ResponseEntity<InternalPatientDto> linkKeycloak(UUID id, Map<String, String> body) {
        log.error("business-service unavailable: cannot link Keycloak user to patient id={}", id);
        throw new IllegalStateException(
                "Patient service is temporarily unavailable. Please try again shortly.");
    }

    @Override
    public ResponseEntity<Void> activate(UUID id) {
        log.error("business-service unavailable: cannot activate patient id={}", id);
        throw new IllegalStateException(
                "Patient activation service is temporarily unavailable. Please try again shortly.");
    }
}
