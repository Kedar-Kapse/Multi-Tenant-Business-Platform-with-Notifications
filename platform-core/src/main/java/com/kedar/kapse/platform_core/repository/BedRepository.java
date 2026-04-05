package com.kedar.kapse.platform_core.repository;

import com.kedar.kapse.platform_core.entity.Bed;
import com.kedar.kapse.platform_core.enums.BedStatus;
import com.kedar.kapse.platform_core.enums.BedType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BedRepository extends JpaRepository<Bed, UUID> {

    List<Bed> findByFacilityId(UUID facilityId);

    List<Bed> findByFacilityIdAndStatus(UUID facilityId, BedStatus status);

    List<Bed> findByFacilityIdAndWardName(UUID facilityId, String wardName);

    List<Bed> findByFacilityIdAndBedType(UUID facilityId, BedType bedType);

    @Query("SELECT b FROM Bed b WHERE b.facility.id = :facilityId " +
           "AND (LOWER(b.wardName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(b.roomNumber) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(b.bedNumber) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(b.assignedPatientName) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Bed> searchByFacility(@Param("facilityId") UUID facilityId, @Param("query") String query);

    @Query("SELECT DISTINCT b.wardName FROM Bed b WHERE b.facility.id = :facilityId ORDER BY b.wardName")
    List<String> findDistinctWardsByFacility(@Param("facilityId") UUID facilityId);

    @Query("SELECT COUNT(b) FROM Bed b WHERE b.facility.id = :facilityId AND b.status = :status")
    long countByFacilityAndStatus(@Param("facilityId") UUID facilityId, @Param("status") BedStatus status);

    @Query("SELECT COUNT(b) FROM Bed b WHERE b.facility.id = :facilityId")
    long countByFacility(@Param("facilityId") UUID facilityId);
}
