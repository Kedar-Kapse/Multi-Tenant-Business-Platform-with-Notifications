package com.kedar.kapse.business_service.repository;

import com.kedar.kapse.business_service.entity.PatientDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface PatientDocumentRepository extends JpaRepository<PatientDocument, UUID> {
    List<PatientDocument> findByPatientIdOrderByUploadedAtDesc(String patientId);
    List<PatientDocument> findByPatientIdAndCategoryOrderByUploadedAtDesc(String patientId, String category);
}
