package com.kedar.kapse.platform_core.repository;

import com.kedar.kapse.platform_core.entity.PatientProviderMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PatientProviderMappingRepository extends JpaRepository<PatientProviderMapping, UUID> {

    List<PatientProviderMapping> findByPatientId(UUID patientId);

    List<PatientProviderMapping> findByProviderId(UUID providerId);

    boolean existsByPatientIdAndProviderId(UUID patientId, UUID providerId);
}
