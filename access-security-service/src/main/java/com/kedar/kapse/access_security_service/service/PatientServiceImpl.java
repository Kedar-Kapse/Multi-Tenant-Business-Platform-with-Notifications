package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.CreatePatientRequest;
import com.kedar.kapse.platform_core.dto.PatientResponse;
import com.kedar.kapse.platform_core.entity.Patient;
import com.kedar.kapse.platform_core.entity.PatientProviderMapping;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import com.kedar.kapse.platform_core.repository.PatientProviderMappingRepository;
import com.kedar.kapse.platform_core.repository.PatientRepository;
import com.kedar.kapse.platform_core.security.TenantContext;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PatientServiceImpl implements PatientService {

    private static final String PATIENT_REALM_ROLE = "PATIENT";

    private final PatientRepository patientRepository;
    private final PatientProviderMappingRepository mappingRepository;
    private final KeycloakService keycloakService;
    private final NotificationEventPublisher eventPublisher;
    private final AuditService auditService;

    @Override
    @Transactional
    public PatientResponse createPatient(CreatePatientRequest request, UUID providerIdOverride) {
        log.info("Creating patient email={} tenant={}", request.getEmail(), TenantContext.getTenantId());

        if (patientRepository.existsByEmailAndDeletedAtIsNull(request.getEmail())) {
            throw new IllegalArgumentException("A patient with email '" + request.getEmail() + "' already exists");
        }

        String tenantRealm = TenantContext.getTenantId();
        String keycloakUserId = null;

        if (tenantRealm != null && !tenantRealm.isBlank()) {
            try {
                String username = request.getEmail();
                keycloakUserId = keycloakService.createPendingUserInRealm(
                        tenantRealm, username, request.getEmail(),
                        request.getFirstName(), request.getLastName());
                keycloakService.assignRoleInRealm(tenantRealm, keycloakUserId, PATIENT_REALM_ROLE);
            } catch (Exception e) {
                log.error("Keycloak user creation failed for {}: {}", request.getEmail(), e.getMessage());
                throw new RuntimeException("Failed to create Keycloak user: " + e.getMessage(), e);
            }
        } else {
            log.warn("No tenant realm in context — creating patient without Keycloak user (dev/test mode)");
        }

        Patient patient = Patient.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .addressLine1(request.getAddressLine1())
                .addressLine2(request.getAddressLine2())
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .zipCode(request.getZipCode())
                .keycloakUserId(keycloakUserId)
                .tenantRealm(tenantRealm)
                .status(PatientStatus.PENDING_REGISTRATION)
                .build();
        patient = patientRepository.save(patient);

        UUID providerId = providerIdOverride != null ? providerIdOverride : request.getProviderId();
        if (providerId != null) {
            PatientProviderMapping mapping = PatientProviderMapping.builder()
                    .patientId(patient.getId())
                    .providerId(providerId)
                    .locationCode(request.getLocationCode())
                    .primary(true)
                    .build();
            mappingRepository.save(mapping);
            log.info("Mapped patient {} to provider {}", patient.getId(), providerId);
        }

        eventPublisher.publishPatientCreated(patient.getEmail(), patient.getFirstName(),
                patient.getLastName(), tenantRealm, patient.getId().toString());
        auditService.record("PATIENT", patient.getId().toString(), "CREATE", null,
                "Created by " + (providerId != null ? "provider:" + providerId : "admin"));

        log.info("Patient created id={} email={} keycloakId={}",
                patient.getId(), patient.getEmail(), keycloakUserId);
        return PatientResponse.fromEntity(patient);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientResponse getPatient(UUID id) {
        Patient p = patientRepository.findById(id)
                .filter(x -> x.getDeletedAt() == null)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + id));
        return PatientResponse.fromEntity(p);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PatientResponse> searchPatients(String query, PatientStatus status, Pageable pageable) {
        return patientRepository.searchPatients(query, status, pageable).map(PatientResponse::fromEntity);
    }

    @Override
    @Transactional
    public void softDelete(UUID id) {
        Patient p = patientRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + id));
        p.setDeletedAt(LocalDateTime.now());
        p.setStatus(PatientStatus.DELETED);
        patientRepository.save(p);

        if (p.getKeycloakUserId() != null && p.getTenantRealm() != null) {
            try {
                keycloakService.disableUserInRealm(p.getTenantRealm(), p.getKeycloakUserId());
            } catch (Exception e) {
                log.warn("Failed to disable Keycloak user during soft-delete: {}", e.getMessage());
            }
        }
        auditService.record("PATIENT", id.toString(), "SOFT_DELETE", null, null);
    }
}
