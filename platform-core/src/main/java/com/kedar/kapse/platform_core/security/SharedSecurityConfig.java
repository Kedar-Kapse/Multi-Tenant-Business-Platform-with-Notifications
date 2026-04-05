package com.kedar.kapse.platform_core.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Default security configuration for all servlet-based microservices.
 *
 * MULTI-TENANT SECURITY FLOW:
 * 1. TenantFilter (runs first) extracts X-TENANT-ID header into TenantContext
 * 2. Spring Security intercepts the request
 * 3. MultiTenantJwtDecoder reads TenantContext to determine the Keycloak realm
 * 4. Fetches JWKS from the tenant's realm to validate the JWT signature
 * 5. KeycloakJwtConverter extracts roles from the validated JWT
 * 6. @PreAuthorize checks enforce permission rules
 *
 * Services that need custom security rules (e.g., access-security-service)
 * can define their own SecurityFilterChain bean. The @ConditionalOnMissingBean
 * annotation ensures this shared config is automatically skipped.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SharedSecurityConfig {

    @Bean
    @ConditionalOnMissingBean(SecurityFilterChain.class)
    public SecurityFilterChain sharedSecurityFilterChain(
            HttpSecurity http,
            JwtDecoder multiTenantJwtDecoder) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(SecurityConstants.PUBLIC_ENDPOINTS).permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .decoder(multiTenantJwtDecoder)
                                .jwtAuthenticationConverter(keycloakJwtConverter()))
                );

        return http.build();
    }

    @Bean
    @ConditionalOnMissingBean(JwtDecoder.class)
    public JwtDecoder multiTenantJwtDecoder(
            @Value("${keycloak.base-url:http://localhost:8080}") String keycloakBaseUrl) {
        return new MultiTenantJwtDecoder(keycloakBaseUrl);
    }

    @Bean
    @ConditionalOnMissingBean(KeycloakJwtConverter.class)
    public KeycloakJwtConverter keycloakJwtConverter() {
        return new KeycloakJwtConverter();
    }
}
