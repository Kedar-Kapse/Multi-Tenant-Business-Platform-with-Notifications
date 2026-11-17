package com.kedar.kapse.business_service.config;

import com.kedar.kapse.platform_core.security.CustomAuthenticationManager;
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
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

// NOTE: @EnableMethodSecurity must be declared HERE (not relied upon from
// SharedSecurityConfig) because BusinessServiceApplication's @ComponentScan
// excludes SharedSecurityConfig.class entirely — which also strips its
// class-level annotations, silently disabling every @PreAuthorize otherwise.
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@Slf4j
public class BusinessSecurityConfig {

    @Value("${keycloak.base-url:http://localhost:8080}")
    private String keycloakBaseUrl;

    @Bean
    public SecurityFilterChain businessSecurityFilterChain(
            HttpSecurity http, TenantFilter tenantFilter,
            InternalApiKeyFilter internalApiKeyFilter) throws Exception {

        CustomAuthenticationManager authManager = new CustomAuthenticationManager(keycloakBaseUrl);

        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // InternalApiKeyFilter runs first — it blocks /internal/** without a valid key
            // before Spring Security even evaluates JWT auth for those paths.
            .addFilterBefore(internalApiKeyFilter, BasicAuthenticationFilter.class)
            // Must run before the bearer-token check: token validation picks the
            // Keycloak realm from the tenant this filter sets (else it falls back to "master").
            .addFilterBefore(tenantFilter, BearerTokenAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                // /internal/** is guarded by InternalApiKeyFilter, not by JWT.
                // The API gateway MUST block these paths from external traffic.
                .requestMatchers("/internal/**").permitAll()
                // ACID learning endpoint — open for local testing only.
                .requestMatchers("/api/practice/acid/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .opaqueToken(opaque -> opaque.authenticationManager(authManager))
            );

        log.info("Business Service security configured");
        return http.build();
    }
}
