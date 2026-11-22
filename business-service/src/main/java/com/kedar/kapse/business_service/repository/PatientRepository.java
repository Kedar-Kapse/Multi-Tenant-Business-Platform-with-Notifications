package com.kedar.kapse.business_service.repository;

import com.kedar.kapse.business_service.entity.Patient;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import com.kedar.kapse.platform_core.enums.PccSyncStatus;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientRepository extends JpaRepository<Patient, UUID> {

    Optional<Patient> findByEmail(String email);

    Optional<Patient> findByEmailAndDeletedAtIsNull(String email);

    Optional<Patient> findByKeycloakUserIdAndDeletedAtIsNull(String keycloakUserId);

    boolean existsByEmailAndDeletedAtIsNull(String email);

    boolean existsByMrnAndDeletedAtIsNull(String mrn);

    boolean existsBySsnHashAndDeletedAtIsNull(String ssnHash);

    /**
     * Atomically claims a patient for PCC sync: sets status=IN_PROGRESS and records
     * the claim timestamp in a single UPDATE. Only proceeds when current status is
     * null, PENDING, or FAILED — prevents double-processing in multi-instance deployments.
     * Returns 1 if claimed, 0 if another instance already holds the lock.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Patient p SET p.pccSyncStatus = :inProgress, p.pccSyncClaimedAt = :claimedAt " +
           "WHERE p.id = :id AND (p.pccSyncStatus IS NULL " +
           "OR p.pccSyncStatus = :pending " +
           "OR p.pccSyncStatus = :failed)")
    int claimForPccSync(@Param("id") UUID id,
                        @Param("inProgress") PccSyncStatus inProgress,
                        @Param("claimedAt") java.time.LocalDateTime claimedAt,
                        @Param("pending") PccSyncStatus pending,
                        @Param("failed") PccSyncStatus failed);

    /**
     * Finds patients stuck in IN_PROGRESS state beyond the given threshold timestamp.
     * These are patients whose consumer crashed or was killed after claiming but before
     * writing SYNCED/FAILED. The recovery scheduler resets them to FAILED for re-processing.
     */
    @Query("SELECT p FROM Patient p WHERE p.pccSyncStatus = :inProgress " +
           "AND p.pccSyncClaimedAt IS NOT NULL AND p.pccSyncClaimedAt < :threshold " +
           "AND p.deletedAt IS NULL")
    List<Patient> findStuckInProgress(@Param("inProgress") PccSyncStatus inProgress,
                                      @Param("threshold") java.time.LocalDateTime threshold);

    /**
     * Finds patients in PENDING state older than the given threshold.
     * These are patients whose afterCommit() Kafka publish was silently lost
     * (app crash between commit and publish, or KafkaTemplate send failure).
     * The recovery scheduler re-publishes events for them.
     */
    @Query("SELECT p FROM Patient p WHERE p.pccSyncStatus = :pending " +
           "AND p.createdAt < :threshold AND p.deletedAt IS NULL")
    List<Patient> findStalePendingForSync(@Param("pending") PccSyncStatus pending,
                                         @Param("threshold") java.time.LocalDateTime threshold);

    List<Patient> findByPccSyncStatusAndDeletedAtIsNull(PccSyncStatus pccSyncStatus);

    @Query("SELECT p FROM Patient p WHERE p.deletedAt IS NULL AND " +
           "(:query IS NULL OR :query = '' OR " +
           "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.email) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "AND (:status IS NULL OR p.status = :status) " +
           "AND (:providerId IS NULL OR EXISTS (SELECT 1 FROM PatientProviderMapping m " +
           "     WHERE m.patientId = p.id AND m.providerId = :providerId))")
    Page<Patient> searchPatients(@Param("query") String query,
                                 @Param("status") PatientStatus status,
                                 @Param("providerId") java.util.UUID providerId,
                                 Pageable pageable);
}
