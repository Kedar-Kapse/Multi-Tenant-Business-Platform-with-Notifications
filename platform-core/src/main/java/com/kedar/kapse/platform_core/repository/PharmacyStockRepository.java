package com.kedar.kapse.platform_core.repository;

import com.kedar.kapse.platform_core.entity.PharmacyStock;
import com.kedar.kapse.platform_core.enums.MedicineStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface PharmacyStockRepository extends JpaRepository<PharmacyStock, UUID> {

    List<PharmacyStock> findByFacilityId(UUID facilityId);

    List<PharmacyStock> findByFacilityIdAndStatus(UUID facilityId, MedicineStatus status);

    List<PharmacyStock> findByFacilityIdAndCategory(UUID facilityId, String category);

    @Query("SELECT p FROM PharmacyStock p WHERE p.facility.id = :facilityId " +
           "AND (LOWER(p.medicineName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(p.batchNumber) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(p.manufacturer) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(p.category) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<PharmacyStock> searchByFacility(@Param("facilityId") UUID facilityId, @Param("query") String query);

    @Query("SELECT p FROM PharmacyStock p WHERE p.facility.id = :facilityId AND p.quantity <= p.minimumStockLevel")
    List<PharmacyStock> findLowStockByFacility(@Param("facilityId") UUID facilityId);

    @Query("SELECT p FROM PharmacyStock p WHERE p.facility.id = :facilityId AND p.expiryDate <= :date")
    List<PharmacyStock> findExpiredByFacility(@Param("facilityId") UUID facilityId, @Param("date") LocalDate date);

    @Query("SELECT p FROM PharmacyStock p WHERE p.facility.id = :facilityId AND p.expiryDate BETWEEN :start AND :end")
    List<PharmacyStock> findExpiringSoonByFacility(@Param("facilityId") UUID facilityId,
                                                    @Param("start") LocalDate start,
                                                    @Param("end") LocalDate end);

    @Query("SELECT DISTINCT p.category FROM PharmacyStock p WHERE p.facility.id = :facilityId ORDER BY p.category")
    List<String> findDistinctCategoriesByFacility(@Param("facilityId") UUID facilityId);

    @Query("SELECT COUNT(p) FROM PharmacyStock p WHERE p.facility.id = :facilityId AND p.status = :status")
    long countByFacilityAndStatus(@Param("facilityId") UUID facilityId, @Param("status") MedicineStatus status);
}
