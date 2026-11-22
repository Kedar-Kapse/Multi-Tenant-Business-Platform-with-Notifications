package com.kedar.kapse.notification_service.config;

import com.kedar.kapse.platform_core.security.CustomAuthenticationManager;
import com.kedar.kapse.platform_core.security.TenantFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Same login check as the other services: the caller's token is validated against
 * their hospital's realm (TenantFilter runs first and picks the realm from X-TENANT-ID).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class NotificationSecurityConfig {

    @Value("${keycloak.base-url:${KEYCLOAK_BASE_URL:http://localhost:8080}}")
    private String keycloakBaseUrl;

    @Bean
    public SecurityFilterChain notificationSecurityFilterChain(HttpSecurity http, TenantFilter tenantFilter) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(tenantFilter, BearerTokenAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.opaqueToken(t -> t.authenticationManager(new CustomAuthenticationManager(keycloakBaseUrl))));
        return http.build();
    }
}
