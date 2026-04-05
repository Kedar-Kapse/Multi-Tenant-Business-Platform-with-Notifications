package com.kedar.kapse.access_security_service.config;

import com.kedar.kapse.platform_core.security.CustomAccess;
import com.kedar.kapse.platform_core.security.CustomAuthenticationManager;
import com.kedar.kapse.platform_core.security.SecurityConstants;
import com.kedar.kapse.platform_core.security.TenantFilter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

/**
 * Access-Security-Service — Restore Production security configuration.
 *
 * Uses CustomAuthenticationManager with manual Nimbus JWT validation (ValidateToken)
 * and CustomAccess for multi-portal authorization decisions.
 *
 * This service defines its OWN SecurityFilterChain because:
 * - /api/auth/** must be publicly accessible (login, refresh, logout)
 * - /api/realms/** must be accessible for realm management
 * - /api/test/** is public for health testing
 * - Dashboard stats are public
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@Slf4j
public class SecurityConfig {

    @Value("${keycloak.base-url:http://localhost:8080}")
    private String keycloakBaseUrl;

    @Bean
    public SecurityFilterChain accessSecurityFilterChain(
            HttpSecurity http,
            CustomAccess customAccess,
            TenantFilter tenantFilter) throws Exception {

        log.info("Configuring Access Security Service — Restore Production architecture...");

        CustomAuthenticationManager authManager = new CustomAuthenticationManager(keycloakBaseUrl);

        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Filter order: BasicAuthenticationFilter → TenantFilter → OAuth2 opaque token
                .addFilterAfter(tenantFilter, BasicAuthenticationFilter.class)

                .authorizeHttpRequests(authorize -> authorize
                        // Public endpoints
                        .requestMatchers(SecurityConstants.PUBLIC_ENDPOINTS).permitAll()
                        .requestMatchers("/api/test/**").permitAll()
                        .requestMatchers("/api/admin/v1/dashboard/**").permitAll()

                        // Protected actuator endpoints — ADMIN only
                        .requestMatchers(SecurityConstants.PROTECTED_ACTUATOR_ENDPOINTS)
                                .hasRole(SecurityConstants.ROLE_ADMIN)

                        // All other endpoints go through CustomAccess
                        .anyRequest().access(customAccess)
                )

                // Opaque token with CustomAuthenticationManager (manual Nimbus validation)
                .oauth2ResourceServer(oauth2 -> oauth2
                        .opaqueToken(opaque -> opaque
                                .authenticationManager(authManager))
                );

        log.info("Access Security Service — Restore Production filter chain configured.");
        return http.build();
    }
}
