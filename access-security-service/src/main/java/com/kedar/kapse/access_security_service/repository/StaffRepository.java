package com.kedar.kapse.access_security_service.repository;

import com.kedar.kapse.access_security_service.entity.Staff;
import com.kedar.kapse.platform_core.enums.StaffRole;
import com.kedar.kapse.platform_core.enums.StaffStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface StaffRepository extends JpaRepository<Staff, UUID> {
    boolean existsByEmail(String email);
    boolean existsByEmailAndIdNot(String email, UUID id);

    java.util.Optional<Staff> findByKeycloakUserId(String keycloakUserId);

    /** Active clinical staff that can be booked/messaged (they have a login). */
    @Query("SELECT s FROM Staff s WHERE s.status = com.kedar.kapse.platform_core.enums.StaffStatus.ACTIVE " +
           "AND s.keycloakUserId IS NOT NULL AND s.role IN :roles " +
           "AND (:query IS NULL OR :query = '' OR " +
           "LOWER(s.firstName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.lastName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.specialization) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Staff> findDirectory(@Param("query") String query,
                              @Param("roles") java.util.Collection<StaffRole> roles, Pageable pageable);
    @Query("SELECT s FROM Staff s WHERE " +
           "(:query IS NULL OR :query = '' OR " +
           "LOWER(s.firstName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.lastName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.email) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "AND (:role IS NULL OR s.role = :role) " +
           "AND (:status IS NULL OR s.status = :status)")
    Page<Staff> searchStaff(@Param("query") String query, @Param("role") StaffRole role,
                            @Param("status") StaffStatus status, Pageable pageable);
}
