package com.kedar.kapse.platform_core.repository;

import com.kedar.kapse.platform_core.entity.Facility;
import com.kedar.kapse.platform_core.enums.FacilityStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, UUID> {

    List<Facility> findByTenantId(UUID tenantId);

    List<Facility> findByTenantIdAndStatus(UUID tenantId, FacilityStatus status);

    Optional<Facility> findByTenantIdAndFacilityCode(UUID tenantId, String facilityCode);

    @Query("SELECT f FROM Facility f WHERE f.tenant.id = :tenantId " +
           "AND (LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(f.facilityCode) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(f.city) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Facility> searchByTenant(@Param("tenantId") UUID tenantId, @Param("query") String query);

    List<Facility> findByStatus(FacilityStatus status);
}
