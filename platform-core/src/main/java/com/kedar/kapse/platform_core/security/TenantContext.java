package com.kedar.kapse.platform_core.security;

/**
 * Thread-local holder for the current tenant identifier.
 *
 * In a multi-tenant architecture, every incoming request belongs to a specific
 * tenant (hospital/organization). The tenant is identified by the X-TENANT-ID
 * HTTP header or extracted from the JWT "iss" claim (realm name).
 *
 * TenantContext stores this value in a ThreadLocal so any code in the request
 * processing chain can access the current tenant without passing it explicitly.
 *
 * LIFECYCLE:
 *   1. TenantFilter reads X-TENANT-ID header and calls TenantContext.setTenantId()
 *   2. Security filters, services, and repositories call TenantContext.getTenantId()
 *   3. After the request completes, TenantFilter calls TenantContext.clear()
 *
 * IMPORTANT: Always call clear() in a finally block to prevent tenant ID leaking
 * between requests in thread pools.
 */
public final class TenantContext {

    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContext() {}

    public static void setTenantId(String tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static String getTenantId() {
        return CURRENT_TENANT.get();
    }

    public static String getRequiredTenantId() {
        String tenantId = CURRENT_TENANT.get();
        if (tenantId == null || tenantId.isBlank()) {
            throw new IllegalStateException("No tenant ID found in context. Ensure X-TENANT-ID header is present.");
        }
        return tenantId;
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
