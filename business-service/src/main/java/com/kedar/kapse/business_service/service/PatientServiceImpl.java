package com.kedar.kapse.business_service.service;

import com.kedar.kapse.business_service.entity.Patient;
import com.kedar.kapse.business_service.repository.PatientRepository;
import com.kedar.kapse.platform_core.dto.CreatePatientRequest;
import com.kedar.kapse.platform_core.dto.PatientResponse;
import com.kedar.kapse.platform_core.dto.UpdatePatientProfileRequest;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import com.kedar.kapse.platform_core.enums.PccSyncStatus;
import com.kedar.kapse.platform_core.event.BaseEvent;
import com.kedar.kapse.platform_core.event.EventTopics;
import com.kedar.kapse.platform_core.event.PatientCreatedPayload;
import com.kedar.kapse.platform_core.event.PccSyncPayload;
import com.kedar.kapse.platform_core.security.TenantContext;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PatientServiceImpl implements PatientService {

    private final PatientRepository patientRepository;

    @Autowired(required = false)
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${portal.patient-base-url:http://localhost:3001}")
    private String patientPortalBaseUrl;

    @Override
    @Transactional(readOnly = true)
    public Page<PatientResponse> searchPatients(String query, PatientStatus status, Pageable pageable) {
        return patientRepository.searchPatients(query, status, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientResponse getById(UUID id) {
        return toResponse(patientRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + id)));
    }

    @Override
    @Transactional
    public PatientResponse createPatient(CreatePatientRequest req) {
        if (patientRepository.existsByEmailAndDeletedAtIsNull(req.getEmail())) {
            throw new IllegalArgumentException("A patient with this email already exists: " + req.getEmail());
        }
        if (patientRepository.existsByMrnAndDeletedAtIsNull(req.getMrn())) {
            throw new IllegalArgumentException("A patient with this MRN already exists: " + req.getMrn());
        }
        String ssnHash = hashSsn(req.getSsn());
        if (patientRepository.existsBySsnHashAndDeletedAtIsNull(ssnHash)) {
            throw new IllegalArgumentException("A patient with this SSN already exists");
        }
        Patient saved = patientRepository.save(buildPatient(req, ssnHash));
        publishPatientCreated(saved);
        if (req.isPccSyncRequired()) {
            // Publish AFTER commit so the consumer always finds the patient row in the DB.
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publishPccSyncRequested(saved);
                }
            });
        }
        log.info("Patient created: id={} mrn={} email={} pccSync={}", saved.getId(), saved.getMrn(), saved.getEmail(), req.isPccSyncRequired());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public PatientResponse createPatientForProvider(UUID providerId, CreatePatientRequest req) {
        return createPatient(req);
    }

    @Override
    @Transactional
    public void deletePatient(UUID id) {
        Patient patient = patientRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + id));
        patient.setDeletedAt(LocalDateTime.now());
        patient.setStatus(PatientStatus.DELETED);
        patientRepository.save(patient);
        log.info("Patient soft-deleted: id={}", id);
    }

    @Override
    @Transactional
    public PatientResponse triggerPccSync(UUID id) {
        Patient patient = patientRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + id));

        if (PccSyncStatus.IN_PROGRESS.equals(patient.getPccSyncStatus())) {
            throw new IllegalStateException("PCC sync is already in progress for this patient");
        }

        patient.setPccSyncStatus(PccSyncStatus.PENDING);
        Patient saved = patientRepository.save(patient);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                publishPccSyncRequested(saved);
            }
        });

        log.info("PCC sync manually triggered: patientId={}", id);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientResponse getMyProfile(String keycloakUserId) {
        Patient patient = patientRepository.findByKeycloakUserIdAndDeletedAtIsNull(keycloakUserId)
                .orElseThrow(() -> new EntityNotFoundException("Patient profile not found for user: " + keycloakUserId));
        return toResponse(patient);
    }

    @Override
    @Transactional
    public PatientResponse updateMyProfile(String keycloakUserId, UpdatePatientProfileRequest req) {
        Patient patient = patientRepository.findByKeycloakUserIdAndDeletedAtIsNull(keycloakUserId)
                .orElseThrow(() -> new EntityNotFoundException("Patient profile not found for user: " + keycloakUserId));

        if (req.getFirstName() != null)        patient.setFirstName(req.getFirstName());
        if (req.getLastName() != null)         patient.setLastName(req.getLastName());
        if (req.getPhone() != null)            patient.setPhone(req.getPhone());
        if (req.getDateOfBirth() != null)      patient.setDateOfBirth(req.getDateOfBirth());
        if (req.getGender() != null)           patient.setGender(req.getGender());
        if (req.getAddressLine1() != null)     patient.setAddressLine1(req.getAddressLine1());
        if (req.getAddressLine2() != null)     patient.setAddressLine2(req.getAddressLine2());
        if (req.getCity() != null)             patient.setCity(req.getCity());
        if (req.getState() != null)            patient.setState(req.getState());
        if (req.getCountry() != null)          patient.setCountry(req.getCountry());
        if (req.getZipCode() != null)          patient.setZipCode(req.getZipCode());
        if (req.getBloodGroup() != null)       patient.setBloodGroup(req.getBloodGroup());
        if (req.getEmergencyContact() != null) patient.setEmergencyContact(req.getEmergencyContact());
        if (req.getAllergies() != null)         patient.setAllergies(req.getAllergies());
        if (req.getChronicConditions() != null) patient.setChronicConditions(req.getChronicConditions());
        if (req.getInsuranceProvider() != null) patient.setInsuranceProvider(req.getInsuranceProvider());
        if (req.getPolicyNumber() != null)     patient.setPolicyNumber(req.getPolicyNumber());

        Patient saved = patientRepository.save(patient);
        log.info("Patient profile updated: keycloakUserId={} patientId={}", keycloakUserId, saved.getId());
        return toResponse(saved);
    }

    private Patient buildPatient(CreatePatientRequest req, String ssnHash) {
        return Patient.builder()
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .dateOfBirth(req.getDateOfBirth())
                .gender(req.getGender())
                .addressLine1(req.getAddressLine1())
                .addressLine2(req.getAddressLine2())
                .city(req.getCity())
                .state(req.getState())
                .country(req.getCountry())
                .zipCode(req.getZipCode())
                .mrn(req.getMrn())
                .ssn(req.getSsn())
                .ssnHash(ssnHash)
                .tenantRealm(TenantContext.getTenantId())
                .status(PatientStatus.PENDING_REGISTRATION)
                .pccSyncStatus(req.isPccSyncRequired() ? PccSyncStatus.PENDING : null)
                .pccRetryCount(0)
                .build();
    }

    private static String hashSsn(String ssn) {
        String digits = ssn.replaceAll("[^0-9]", "");
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(digits.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private void publishPatientCreated(Patient patient) {
        if (kafkaTemplate == null) {
            log.warn("KafkaTemplate unavailable — patient.created event not published for id={}", patient.getId());
            return;
        }
        try {
            String registrationLink = patientPortalBaseUrl + "/register?email="
                    + URLEncoder.encode(patient.getEmail(), StandardCharsets.UTF_8);
            PatientCreatedPayload payload = PatientCreatedPayload.builder()
                    .patientId(patient.getId().toString())
                    .email(patient.getEmail())
                    .firstName(patient.getFirstName())
                    .lastName(patient.getLastName())
                    .tenantRealm(patient.getTenantRealm())
                    .registrationLink(registrationLink)
                    .build();
            BaseEvent<PatientCreatedPayload> event = BaseEvent.<PatientCreatedPayload>builder()
                    .eventId(UUID.randomUUID().toString())
                    .eventType("PATIENT_CREATED")
                    .tenantId(patient.getTenantRealm())
                    .source("business-service")
                    .timestamp(System.currentTimeMillis())
                    .payload(payload)
                    .build();
            kafkaTemplate.send(EventTopics.PATIENT_CREATED, patient.getEmail(), event);
        } catch (Exception e) {
            log.error("Failed to publish patient.created for id={}: {}", patient.getId(), e.getMessage());
        }
    }

    private void publishPccSyncRequested(Patient patient) {
        if (kafkaTemplate == null) {
            log.warn("KafkaTemplate unavailable — pcc.sync.requested not published for id={}", patient.getId());
            return;
        }
        try {
            PccSyncPayload payload = PccSyncPayload.builder()
                    .patientId(patient.getId().toString())
                    .tenantRealm(patient.getTenantRealm())
                    .build();
            BaseEvent<PccSyncPayload> event = BaseEvent.<PccSyncPayload>builder()
                    .eventId(UUID.randomUUID().toString())
                    .eventType("PCC_SYNC_REQUESTED")
                    .tenantId(patient.getTenantRealm())
                    .source("business-service")
                    .timestamp(System.currentTimeMillis())
                    .payload(payload)
                    .build();
            kafkaTemplate.send(EventTopics.PCC_SYNC_REQUESTED, patient.getId().toString(), event);
            log.info("Published pcc.sync.requested for patient id={}", patient.getId());
        } catch (Exception e) {
            log.error("Failed to publish pcc.sync.requested for id={}: {}", patient.getId(), e.getMessage());
        }
    }

    private PatientResponse toResponse(Patient p) {
        return PatientResponse.builder()
                .id(p.getId())
                .firstName(p.getFirstName())
                .lastName(p.getLastName())
                .email(p.getEmail())
                .phone(p.getPhone())
                .dateOfBirth(p.getDateOfBirth())
                .gender(p.getGender())
                .addressLine1(p.getAddressLine1())
                .addressLine2(p.getAddressLine2())
                .city(p.getCity())
                .state(p.getState())
                .country(p.getCountry())
                .zipCode(p.getZipCode())
                .keycloakUserId(p.getKeycloakUserId())
                .tenantRealm(p.getTenantRealm())
                .status(p.getStatus())
                .registrationCompletedAt(p.getRegistrationCompletedAt())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .mrn(p.getMrn())
                .pccSyncStatus(p.getPccSyncStatus())
                .pccPatientId(p.getPccPatientId())
                .pccLastError(p.getPccLastError())
                .pccRetryCount(p.getPccRetryCount())
                .bloodGroup(p.getBloodGroup())
                .emergencyContact(p.getEmergencyContact())
                .allergies(p.getAllergies())
                .chronicConditions(p.getChronicConditions())
                .insuranceProvider(p.getInsuranceProvider())
                .policyNumber(p.getPolicyNumber())
                .build();
    }
}
