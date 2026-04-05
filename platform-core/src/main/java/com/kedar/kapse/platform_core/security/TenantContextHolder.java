package com.kedar.kapse.platform_core.security;

/**
 * Thread-local holder for the current Keycloak realm name.
 *
 * The X-TENANT-ID header drives realm switching. TenantFilter extracts the
 * header and calls setTenant(). Every downstream component (ValidateToken,
 * CustomAuthenticationManager, IamRestApiProvider) reads getTenant() to
 * resolve the correct Keycloak realm for token validation and admin API calls.
 *
 * LIFECYCLE:
 *   1. TenantFilter reads X-TENANT-ID -> setTenant(realm)
 *   2. ValidateToken fetches JWKS from /realms/{realm}/protocol/openid-connect/certs
 *   3. CustomAccess resolves portal-specific roles from the realm
 *   4. Finally block calls clear() to prevent tenant leaking across pooled threads
 */
public final class TenantContextHolder {

    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContextHolder() {}

    /**
     * Sets the current tenant (Keycloak realm name) for this request thread.
     */
    public static void setTenant(String realm) {
        CURRENT_TENANT.set(realm);
    }

    /**
     * Returns the current tenant realm name.
     * Falls back to "master" if no tenant has been set — this allows
     * platform-level admin operations to proceed without a tenant header.
     */
    public static String getTenant() {
        String tenant = CURRENT_TENANT.get();
        return (tenant != null && !tenant.isBlank()) ? tenant : "master";
    }

    /**
     * Returns the raw tenant value (nullable, no fallback).
     * Use this when you need to distinguish "no tenant set" from "master".
     */
    public static String getTenantOrNull() {
        return CURRENT_TENANT.get();
    }

    /**
     * Clears the tenant context. MUST be called in a finally block
     * to prevent tenant ID leaking between requests in thread pools.
     */
    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
