package com.kedar.kapse.business_service.repository;

import com.kedar.kapse.business_service.entity.ClinicalNote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ClinicalNoteRepository extends JpaRepository<ClinicalNote, UUID> {

    @Query("SELECT n FROM ClinicalNote n WHERE " +
           "(:patientId IS NULL OR n.patientId = :patientId) " +
           "AND (:providerId IS NULL OR n.providerId = :providerId) " +
           "AND (:status IS NULL OR n.status = :status) " +
           "AND (:query IS NULL OR :query = '' OR LOWER(n.patientName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "     OR LOWER(n.title) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<ClinicalNote> search(@Param("patientId") UUID patientId, @Param("providerId") String providerId,
                              @Param("status") String status, @Param("query") String query, Pageable pageable);

    List<ClinicalNote> findByPatientIdAndStatusOrderBySignedAtDesc(UUID patientId, String status);

    long countByProviderIdAndStatus(String providerId, String status);
}
