package com.kedar.kapse.business_service.service;

import com.kedar.kapse.business_service.entity.Patient;
import com.kedar.kapse.business_service.repository.PatientRepository;
import com.kedar.kapse.platform_core.dto.InternalPatientDto;
import com.kedar.kapse.platform_core.dto.ProvisionPatientRequest;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PatientInternalService {

    private final PatientRepository patientRepository;

    @Transactional(readOnly = true)
    public Optional<InternalPatientDto> findByEmail(String email) {
        return patientRepository.findByEmailAndDeletedAtIsNull(email)
                .map(this::toDto);
    }

    @Transactional
    public InternalPatientDto provision(ProvisionPatientRequest req) {
        Patient saved = patientRepository.save(Patient.builder()
                .firstName(req.getFirstName())
                .lastName(req.getLastName() != null ? req.getLastName() : "")
                .email(req.getEmail())
                .keycloakUserId(req.getKeycloakUserId())
                .tenantRealm(req.getTenantRealm())
                .status(PatientStatus.PENDING_REGISTRATION)
                .build());
        log.info("Provisioned patient via internal API: email={} keycloakId={} realm={}",
                saved.getEmail(), saved.getKeycloakUserId(), saved.getTenantRealm());
        return toDto(saved);
    }

    @Transactional
    public InternalPatientDto linkKeycloak(UUID patientId, String keycloakUserId, String tenantRealm) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + patientId));
        patient.setKeycloakUserId(keycloakUserId);
        if (tenantRealm != null && !tenantRealm.isBlank()) {
            patient.setTenantRealm(tenantRealm);
        }
        patientRepository.save(patient);
        log.info("Linked Keycloak user to patient: id={} keycloakId={}", patientId, keycloakUserId);
        return toDto(patient);
    }

    @Transactional
    public void activate(UUID patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + patientId));
        patient.setStatus(PatientStatus.ACTIVE);
        patient.setRegistrationCompletedAt(LocalDateTime.now());
        patientRepository.save(patient);
        log.info("Activated patient via internal API: id={}", patientId);
    }

    private InternalPatientDto toDto(Patient p) {
        return InternalPatientDto.builder()
                .id(p.getId())
                .email(p.getEmail())
                .keycloakUserId(p.getKeycloakUserId())
                .tenantRealm(p.getTenantRealm())
                .status(p.getStatus())
                .build();
    }
}
