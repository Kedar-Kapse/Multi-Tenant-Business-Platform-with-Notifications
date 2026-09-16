package com.kedar.kapse.access_security_service.repository;

import com.kedar.kapse.access_security_service.entity.Tenant;
import com.kedar.kapse.platform_core.enums.TenantStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    long countByStatus(TenantStatus status);
    boolean existsByTenantCode(String tenantCode);
    Optional<Tenant> findByTenantCode(String tenantCode);
}
