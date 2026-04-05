package com.kedar.kapse.business_service.Conttrollers;

import com.kedar.kapse.platform_core.security.SecurityConstants;
import com.kedar.kapse.platform_core.security.TenantContext;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Sample secured endpoints demonstrating multi-tenant RBAC with Keycloak.
 *
 * Each endpoint requires specific roles or permissions extracted from the JWT.
 * The tenant context is available via TenantContext.getTenantId().
 *
 * TESTING:
 *   1. Login as admin-a (hospital-a) → access all endpoints
 *   2. Login as nurse.mary (hospital-a) → only /patient-records
 *   3. Login as admin-b (hospital-b) → access all endpoints, but tenant = hospital-b
 */
@RestController
@RequestMapping("/api/v1/secured")
public class SecuredEndpointController {

    /**
     * Any authenticated user can access this endpoint.
     * Demonstrates basic JWT validation and tenant extraction.
     */
    @GetMapping("/me")
    public Map<String, Object> getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
        return Map.of(
                "tenant", TenantContext.getTenantId() != null ? TenantContext.getTenantId() : "unknown",
                "username", jwt.getClaimAsString("preferred_username"),
                "email", jwt.getClaimAsString("email"),
                "realmRoles", jwt.getClaimAsMap("realm_access"),
                "issuer", jwt.getClaimAsString("iss")
        );
    }

    /**
     * Requires ADMIN role — only tenant administrators.
     */
    @GetMapping("/admin-only")
    @PreAuthorize("hasRole('" + SecurityConstants.ROLE_ADMIN + "')")
    public Map<String, String> adminOnly() {
        return Map.of(
                "message", "You have ADMIN access",
                "tenant", TenantContext.getRequiredTenantId()
        );
    }

    /**
     * Requires READ_PATIENT permission (client role on platform-backend).
     * Accessible by: ADMIN, PHYSICIAN, THERAPIST, NURSE, PATIENT
     */
    @GetMapping("/patient-records")
    @PreAuthorize("hasRole('" + SecurityConstants.PERM_READ_PATIENT + "')")
    public Map<String, String> readPatientRecords() {
        return Map.of(
                "message", "Patient records for tenant: " + TenantContext.getRequiredTenantId(),
                "tenant", TenantContext.getRequiredTenantId(),
                "data", "Sample patient data would be here"
        );
    }

    /**
     * Requires MANAGE_STAFF permission — only ADMIN.
     */
    @GetMapping("/staff-management")
    @PreAuthorize("hasRole('" + SecurityConstants.PERM_MANAGE_STAFF + "')")
    public Map<String, String> manageStaff() {
        return Map.of(
                "message", "Staff management for tenant: " + TenantContext.getRequiredTenantId(),
                "tenant", TenantContext.getRequiredTenantId()
        );
    }

    /**
     * Requires either PHYSICIAN or THERAPIST role.
     * Demonstrates compound role checks.
     */
    @GetMapping("/clinical-data")
    @PreAuthorize("hasAnyRole('" + SecurityConstants.ROLE_PHYSICIAN + "', '" + SecurityConstants.ROLE_THERAPIST + "')")
    public Map<String, String> clinicalData() {
        return Map.of(
                "message", "Clinical data access granted",
                "tenant", TenantContext.getRequiredTenantId()
        );
    }
}
