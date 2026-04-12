package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.CreatePatientRequest;
import com.kedar.kapse.platform_core.dto.PatientResponse;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface PatientService {

    PatientResponse createPatient(CreatePatientRequest request, UUID providerIdOverride);

    PatientResponse getPatient(UUID id);

    Page<PatientResponse> searchPatients(String query, PatientStatus status, Pageable pageable);

    void softDelete(UUID id);
}
