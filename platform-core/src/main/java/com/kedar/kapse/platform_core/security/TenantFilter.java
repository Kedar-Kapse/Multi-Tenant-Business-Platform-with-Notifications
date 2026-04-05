package com.kedar.kapse.platform_core.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Servlet filter that extracts X-TENANT-ID from incoming requests and stores it
 * in the TenantContext for the duration of the request.
 *
 * Execution order: This filter runs BEFORE Spring Security filters (Ordered.HIGHEST_PRECEDENCE)
 * so that the tenant is available during JWT validation (to select the correct realm).
 *
 * For public endpoints (login, health checks), the tenant header is optional.
 * Protected endpoints will fail JWT validation if no tenant is set (because the
 * multi-tenant JWT decoder needs the realm name to fetch the correct JWKS).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
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
