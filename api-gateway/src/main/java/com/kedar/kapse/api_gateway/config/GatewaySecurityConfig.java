package com.kedar.kapse.api_gateway.config;

import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.text.ParseException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * API Gateway — Restore Production reactive security configuration.
 *
 * Uses manual Nimbus SignedJWT.parse() + RSASSAVerifier for JWT validation,
 * wrapped in a ReactiveAuthenticationManager for Spring WebFlux compatibility.
 *
 * No spring.security.oauth2.resourceserver.jwt.issuer-uri auto-configuration.
 * No NimbusJwtDecoder from Spring. All validation is manual.
 *
 * The gateway extracts the tenant realm from the JWT's "iss" claim
 * (since reactive filters don't have ThreadLocal-based TenantContextHolder).
 */
@Configuration
@EnableWebFluxSecurity
public class GatewaySecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(GatewaySecurityConfig.class);

    @Value("${keycloak.base-url:http://localhost:8080}")
    private String keycloakBaseUrl;

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .cors(cors -> cors.configurationSource(exchange -> {
                    CorsConfiguration config = new CorsConfiguration();
                    config.setAllowedOriginPatterns(List.of("*"));
                    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
                    config.setAllowedHeaders(List.of("*"));
                    config.setExposedHeaders(List.of("Authorization", "X-TENANT-ID"));
                    config.setAllowCredentials(true);
                    config.setMaxAge(3600L);
                    return config;
                }))
                .authorizeExchange(exchanges -> exchanges
                        // Public endpoints
                        .pathMatchers("/access-security/api/auth/**").permitAll()
                        .pathMatchers("/actuator/health", "/actuator/info").permitAll()
                        .pathMatchers("/*/actuator/health", "/*/actuator/info").permitAll()
                        // Block all internal service-to-service endpoints at the gateway
                        .pathMatchers("/*/internal/**").denyAll()
                        // Everything else requires valid JWT
                        .anyExchange().authenticated()
                )
                // Custom reactive JWT decoder for multi-tenant Nimbus validation
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .jwtDecoder(multiTenantReactiveJwtDecoder())
                                .jwtAuthenticationConverter(keycloakGrantedAuthoritiesConverter()))
                );

        return http.build();
    }

    // ========================================================================================
    // Multi-tenant ReactiveJwtDecoder — validates JWT against the correct realm's JWKS
    // ========================================================================================

    @Bean
    public ReactiveJwtDecoder multiTenantReactiveJwtDecoder() {
        String baseUrl = keycloakBaseUrl.endsWith("/")
                ? keycloakBaseUrl.substring(0, keycloakBaseUrl.length() - 1)
                : keycloakBaseUrl;

        // Cache decoders per realm to avoid creating new ones on every request
        ConcurrentHashMap<String, NimbusReactiveJwtDecoder> decoderCache = new ConcurrentHashMap<>();

        return token -> Mono.fromCallable(() -> {
            try {
                SignedJWT signedJWT = SignedJWT.parse(token);
                JWTClaimsSet claims = signedJWT.getJWTClaimsSet();

                String issuer = claims.getIssuer();
                String realm = extractRealmFromIssuerStatic(issuer);
                if (realm == null) {
                    throw new org.springframework.security.oauth2.jwt.JwtException("Cannot determine realm from issuer: " + issuer);
                }

                NimbusReactiveJwtDecoder decoder = decoderCache.computeIfAbsent(realm, r -> {
                    String jwksUrl = baseUrl + "/realms/" + r + "/protocol/openid-connect/certs";
                    log.info("Creating JWT decoder for realm '{}' with JWKS URL: {}", r, jwksUrl);
                    return NimbusReactiveJwtDecoder.withJwkSetUri(jwksUrl).build();
                });

                return decoder.decode(token).block();
            } catch (ParseException e) {
                throw new org.springframework.security.oauth2.jwt.JwtException("Invalid JWT: " + e.getMessage());
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private static String extractRealmFromIssuerStatic(String issuer) {
        if (issuer == null) return null;
        int idx = issuer.indexOf("/realms/");
        if (idx < 0) return null;
        return issuer.substring(idx + 8);
    }

    private ReactiveJwtAuthenticationConverterAdapter keycloakGrantedAuthoritiesConverter() {
        var converter = new org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Set<GrantedAuthority> authorities = new HashSet<>();

            Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
            if (realmAccess != null && realmAccess.containsKey("roles")) {
                @SuppressWarnings("unchecked")
                Collection<String> roles = (Collection<String>) realmAccess.get("roles");
                roles.forEach(role -> authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase())));
            }

            Map<String, Object> resourceAccess = jwt.getClaimAsMap("resource_access");
            if (resourceAccess != null) {
                for (Map.Entry<String, Object> entry : resourceAccess.entrySet()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> clientData = (Map<String, Object>) entry.getValue();
                    if (clientData.containsKey("roles")) {
                        @SuppressWarnings("unchecked")
                        Collection<String> clientRoles = (Collection<String>) clientData.get("roles");
                        clientRoles.forEach(role -> authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase())));
                    }
                }
            }

            return authorities;
        });
        return new ReactiveJwtAuthenticationConverterAdapter(converter);
    }

}
