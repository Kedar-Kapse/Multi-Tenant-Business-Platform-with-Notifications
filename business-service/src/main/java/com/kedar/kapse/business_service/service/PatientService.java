package com.kedar.kapse.business_service.service;

import com.kedar.kapse.platform_core.dto.CreatePatientRequest;
import com.kedar.kapse.platform_core.dto.PatientResponse;
import com.kedar.kapse.platform_core.dto.UpdatePatientProfileRequest;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface PatientService {
    Page<PatientResponse> searchPatients(String query, PatientStatus status, Pageable pageable);
    PatientResponse getById(UUID id);
    PatientResponse createPatient(CreatePatientRequest request);
    PatientResponse createPatientForProvider(UUID providerId, CreatePatientRequest request);
    void deletePatient(UUID id);
    PatientResponse triggerPccSync(UUID id);

    /** Returns the profile of the currently authenticated patient identified by their Keycloak user ID (JWT sub). */
    PatientResponse getMyProfile(String keycloakUserId);

    /** Updates the profile of the currently authenticated patient. Only non-null fields in the request are applied. */
    PatientResponse updateMyProfile(String keycloakUserId, UpdatePatientProfileRequest request);
}
