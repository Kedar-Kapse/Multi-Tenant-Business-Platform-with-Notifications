package com.kedar.kapse.access_security_service.repository;

import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import com.kedar.kapse.access_security_service.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    /** Filtered search; rows are already limited to the caller's hospital (@TenantId). */
    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:action IS NULL OR a.action = :action) " +
           "AND (:entityType IS NULL OR a.entityType = :entityType) " +
           "AND (CAST(:from AS timestamp) IS NULL OR a.createdAt >= :from) " +
           "AND (CAST(:to AS timestamp) IS NULL OR a.createdAt < :to) " +
           "AND (:query IS NULL OR :query = '' " +
           "     OR LOWER(a.actorName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "     OR LOWER(a.details) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "     OR LOWER(a.entityId) LIKE LOWER(CONCAT('%', :query, '%')))")
    org.springframework.data.domain.Page<AuditLog> search(
            @Param("action") String action,
            @Param("entityType") String entityType,
            @Param("from") java.time.LocalDateTime from,
            @Param("to") java.time.LocalDateTime to,
            @Param("query") String query,
            org.springframework.data.domain.Pageable pageable);
}
