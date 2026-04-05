package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.CreateTenantRequest;
import com.kedar.kapse.platform_core.dto.TenantResponse;
import com.kedar.kapse.platform_core.dto.UpdateTenantRequest;
import com.kedar.kapse.platform_core.entity.Tenant;
import com.kedar.kapse.platform_core.repository.TenantRepository;
import com.kedar.kapse.platform_core.enums.TenantStatus;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TenantServiceImpl implements TenantService {

    private final TenantRepository tenantRepository;
    private final KeycloakService keycloakService;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public TenantResponse createTenant(CreateTenantRequest request) {
        String tenantCode = request.getTenantCode().toLowerCase();
        // Use organization name for realm (sanitized) so it's readable in Keycloak
        String realmName = request.getName().toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-");
        String schemaName = "tenant_" + tenantCode.replace("-", "_");
        String clientSecret = tenantCode + "-secret";

        log.info("Onboarding tenant: name='{}', code='{}', realm='{}', schema='{}'",
                request.getName(), tenantCode, realmName, schemaName);

        // Step 1: Check if tenant already exists
        if (tenantRepository.existsByTenantCode(tenantCode)) {
            throw new IllegalArgumentException("Tenant with code '" + tenantCode + "' already exists");
        }

        // Step 2: Save tenant as PROVISIONING
        Tenant tenant = Tenant.builder()
                .name(request.getName())
                .tenantCode(tenantCode)
                .realmName(realmName)
                .schemaName(schemaName)
                .status(TenantStatus.PROVISIONING)
                .build();
        tenant = tenantRepository.save(tenant);
        log.info("Tenant '{}' saved with PROVISIONING status, id={}", tenantCode, tenant.getId());

        boolean schemaCreated = false;
        boolean realmCreated = false;

        try {
            // Step 3: Create database schema
            createSchema(schemaName);
            schemaCreated = true;
            log.info("Database schema '{}' created", schemaName);

            // Step 4: Create Keycloak realm with roles, clients, permissions
            keycloakService.createTenantRealm(realmName, request.getName(), clientSecret);
            realmCreated = true;
            log.info("Keycloak realm '{}' created with roles, clients, and permissions", realmName);

            // Step 5: Mark as ACTIVE
            tenant.setStatus(TenantStatus.ACTIVE);
            tenant = tenantRepository.save(tenant);
            log.info("Tenant '{}' onboarding COMPLETED — status=ACTIVE", tenantCode);

        } catch (Exception e) {
            log.error("Tenant onboarding FAILED for '{}' — rolling back: {}", tenantCode, e.getMessage(), e);

            // Rollback: delete Keycloak realm if created
            if (realmCreated) {
                try {
                    keycloakService.deleteRealm(realmName);
                    log.info("Rolled back Keycloak realm '{}'", realmName);
                } catch (Exception re) {
                    log.error("Failed to rollback Keycloak realm '{}': {}", realmName, re.getMessage());
                }
            }

            // Rollback: drop schema if created
            if (schemaCreated) {
                try {
                    dropSchema(schemaName);
                    log.info("Rolled back database schema '{}'", schemaName);
                } catch (Exception re) {
                    log.error("Failed to rollback schema '{}': {}", schemaName, re.getMessage());
                }
            }

            // Mark tenant as FAILED
            tenant.setStatus(TenantStatus.FAILED);
            tenant.setFailureReason(e.getMessage());
            tenantRepository.save(tenant);

            throw new RuntimeException("Tenant onboarding failed: " + e.getMessage(), e);
        }

        return TenantResponse.fromEntity(tenant);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TenantResponse> listTenants() {
        log.debug("Fetching all tenants");
        return tenantRepository.findAll().stream()
                .map(TenantResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public TenantResponse getTenantById(UUID tenantId) {
        log.debug("Fetching tenant by id={}", tenantId);
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found with id: " + tenantId));
        return TenantResponse.fromEntity(tenant);
    }

    @Override
    @Transactional
    public TenantResponse updateTenant(UUID tenantId, UpdateTenantRequest request) {
        log.info("Updating tenant id={}", tenantId);
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found with id: " + tenantId));

        tenant.setName(request.getName());
        tenant = tenantRepository.save(tenant);

        // Update display name in Keycloak
        if (tenant.getRealmName() != null) {
            try {
                keycloakService.updateRealmDisplayName(tenant.getRealmName(), request.getName());
                log.info("Keycloak realm '{}' display name updated to '{}'", tenant.getRealmName(), request.getName());
            } catch (Exception e) {
                log.warn("Failed to update Keycloak display name for realm '{}': {}", tenant.getRealmName(), e.getMessage());
            }
        }

        log.info("Tenant '{}' updated successfully", tenant.getTenantCode());
        return TenantResponse.fromEntity(tenant);
    }

    @Override
    @Transactional
    public void deactivateTenant(UUID tenantId) {
        log.info("Deactivating tenant id={}", tenantId);
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found with id: " + tenantId));

        tenant.setStatus(TenantStatus.INACTIVE);
        tenantRepository.save(tenant);

        log.info("Tenant '{}' deactivated", tenant.getTenantCode());
    }

    @Override
    @Transactional
    public TenantResponse activateTenant(UUID tenantId) {
        log.info("Activating tenant id={}", tenantId);
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found with id: " + tenantId));

        tenant.setStatus(TenantStatus.ACTIVE);
        tenant = tenantRepository.save(tenant);

        log.info("Tenant '{}' activated", tenant.getTenantCode());
        return TenantResponse.fromEntity(tenant);
    }

    // ======================== SCHEMA HELPERS ========================

    private void createSchema(String schemaName) {
        if (!schemaName.matches("^tenant_[a-z0-9_]+$")) {
            throw new IllegalArgumentException("Invalid schema name: " + schemaName);
        }
        jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);
    }

    private void dropSchema(String schemaName) {
        if (!schemaName.matches("^tenant_[a-z0-9_]+$")) {
            throw new IllegalArgumentException("Invalid schema name: " + schemaName);
        }
        jdbcTemplate.execute("DROP SCHEMA IF EXISTS " + schemaName + " CASCADE");
    }
}
