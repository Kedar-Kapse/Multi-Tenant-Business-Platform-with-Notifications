package com.kedar.kapse.platform_core.repository;

import com.kedar.kapse.platform_core.entity.Patient;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientRepository extends JpaRepository<Patient, UUID> {

    Optional<Patient> findByEmail(String email);

    Optional<Patient> findByEmailAndDeletedAtIsNull(String email);

    boolean existsByEmailAndDeletedAtIsNull(String email);

    @Query("SELECT p FROM Patient p WHERE p.deletedAt IS NULL AND " +
           "(:query IS NULL OR :query = '' OR " +
           "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.email) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "AND (:status IS NULL OR p.status = :status)")
    Page<Patient> searchPatients(@Param("query") String query,
                                 @Param("status") PatientStatus status,
                                 Pageable pageable);
}
