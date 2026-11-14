package com.kedar.kapse.platform_core.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Servlet filter that extracts X-TENANT-ID from incoming requests and stores it
 * in the TenantContext for the duration of the request.
 *
 * Execution order: each service explicitly wires this into its own
 * SecurityFilterChain via addFilterAfter(tenantFilter, BasicAuthenticationFilter.class),
 * so it runs before JWT validation (the tenant must be available to select the
 * correct realm). Spring Boot's automatic standalone-filter registration for this
 * @Component is disabled in TenantFilterRegistrationConfig — otherwise it would
 * also run a second, redundant time outside the Spring Security chain.
 *
 * For public endpoints (login, health checks), the tenant header is optional.
 * Protected endpoints will fail JWT validation if no tenant is set (because the
 * multi-tenant JWT decoder needs the realm name to fetch the correct JWKS).
 */
@Component
public class TenantFilter extends OncePerRequestFilter {

    public static final String TENANT_HEADER = "X-TENANT-ID";

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        try {
            String tenantId = request.getHeader(TENANT_HEADER);
            if (tenantId != null && !tenantId.isBlank()) {
                // Sanitize: lowercase, trim, and validate format (alphanumeric + hyphens only)
                tenantId = tenantId.trim().toLowerCase();
                if (tenantId.matches("^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$") || tenantId.matches("^[a-z0-9]$")) {
                    TenantContext.setTenantId(tenantId);
                    TenantContextHolder.setTenant(tenantId);
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            TenantContextHolder.clear();
        }
    }
}
