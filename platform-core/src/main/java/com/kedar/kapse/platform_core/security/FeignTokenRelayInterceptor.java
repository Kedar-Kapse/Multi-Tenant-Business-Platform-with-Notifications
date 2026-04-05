package com.kedar.kapse.platform_core.security;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Feign interceptor that propagates both the JWT token and tenant ID
 * to downstream services.
 *
 * When Service A calls Service B via Feign:
 *   - Copies the Authorization header (Bearer token)
 *   - Copies the X-TENANT-ID header (tenant context)
 *
 * This ensures downstream services can:
 *   1. Validate the JWT against the correct tenant's Keycloak realm
 *   2. Apply tenant-specific business logic
 */
public class FeignTokenRelayInterceptor implements RequestInterceptor {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    @Override
    public void apply(RequestTemplate template) {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

        if (attributes == null) {
            return;
        }

        HttpServletRequest request = attributes.getRequest();

        // Relay the JWT token
        String authHeader = request.getHeader(AUTHORIZATION_HEADER);
        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            template.header(AUTHORIZATION_HEADER, authHeader);
        }

        // Relay the tenant ID
        String tenantId = request.getHeader(SecurityConstants.TENANT_HEADER);
        if (tenantId != null && !tenantId.isBlank()) {
            template.header(SecurityConstants.TENANT_HEADER, tenantId);
        }
    }
}
