package com.kedar.kapse.admin_service.config;

import com.restore.core.security.CustomAuthenticationManager;
import com.restore.core.security.RestoreSecurityConstants;
import com.restore.core.security.TenantContextHolder;
import com.restore.core.security.TenantFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Admin Service — Restore Production security configuration.
 *
 * Admin-service is a lightweight monitoring tool that does NOT depend on
 * platform-core's full component scan. It provides its own TenantFilter
 * inline and uses CustomAuthenticationManager for manual Nimbus JWT validation.
 *
 * All endpoints require ADMIN role except health checks.
 */
@Configuration
@EnableWebSecurity
public class AdminSecurityConfig {

    @Value("${keycloak.base-url:http://localhost:8080}")
    private String keycloakBaseUrl;

    @Bean
    public SecurityFilterChain adminSecurityFilterChain(HttpSecurity http) throws Exception {

        CustomAuthenticationManager authManager = new CustomAuthenticationManager(keycloakBaseUrl);

        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Inline tenant filter for admin-service (no platform-core scan)
                .addFilterAfter(new AdminTenantFilter(), BasicAuthenticationFilter.class)

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                        .anyRequest().hasRole("ADMIN")
                )

                // Opaque token with CustomAuthenticationManager (manual Nimbus validation)
                .oauth2ResourceServer(oauth2 -> oauth2
                        .opaqueToken(opaque -> opaque
                                .authenticationManager(authManager))
                );

        return http.build();
    }

    /**
     * Inline TenantFilter for admin-service — extracts X-TENANT-ID header
     * and populates TenantContextHolder without requiring platform-core's component scan.
     */
    static class AdminTenantFilter extends OncePerRequestFilter {

        @Override
        protected void doFilterInternal(
                @NonNull HttpServletRequest request,
                @NonNull HttpServletResponse response,
                @NonNull FilterChain filterChain) throws ServletException, IOException {
            try {
                String tenantId = request.getHeader(RestoreSecurityConstants.TENANT_HEADER);
                if (tenantId != null && !tenantId.isBlank()) {
                    tenantId = tenantId.trim().toLowerCase();
                    if (tenantId.matches("^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$")
                            || tenantId.matches("^[a-z0-9]$")) {
                        TenantContextHolder.setTenant(tenantId);
                    }
                }
                filterChain.doFilter(request, response);
            } finally {
                TenantContextHolder.clear();
            }
        }
    }
}
