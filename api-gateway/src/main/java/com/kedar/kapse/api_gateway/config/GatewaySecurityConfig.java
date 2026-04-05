package com.kedar.kapse.api_gateway.config;

import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthentication;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.oauth2.server.resource.introspection.OAuth2IntrospectionAuthenticatedPrincipal;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.interfaces.RSAPublicKey;
import java.text.ParseException;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
                        .pathMatchers("/access-security/api/admin/v1/dashboard/**").permitAll()
                        .pathMatchers("/actuator/health", "/actuator/info").permitAll()
                        .pathMatchers("/*/actuator/health", "/*/actuator/info").permitAll()
                        .pathMatchers("/access-security/api/realms/**").permitAll()
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

    /**
     * Reactive AuthenticationManager that performs manual Nimbus JWT validation.
     * This is the reactive equivalent of CustomAuthenticationManager.
     */
    @Bean
    public ReactiveAuthenticationManager reactiveCustomAuthManager() {
        String baseUrl = keycloakBaseUrl.endsWith("/")
                ? keycloakBaseUrl.substring(0, keycloakBaseUrl.length() - 1)
                : keycloakBaseUrl;

        return new RestoreReactiveAuthManager(baseUrl);
    }

    // CORS is configured inline in the SecurityWebFilterChain above

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
        var grantedAuthoritiesConverter = new org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter();
        // We build authorities manually in a custom converter
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

    // ========================================================================================
    // REACTIVE CUSTOM AUTH MANAGER — Manual Nimbus JWT validation for Spring Cloud Gateway
    // ========================================================================================

    private static class RestoreReactiveAuthManager implements ReactiveAuthenticationManager {

        private final String keycloakBaseUrl;
        private final HttpClient httpClient;
        private final ConcurrentHashMap<String, CachedJwks> jwksCache = new ConcurrentHashMap<>();
        private static final long JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

        RestoreReactiveAuthManager(String keycloakBaseUrl) {
            this.keycloakBaseUrl = keycloakBaseUrl;
            this.httpClient = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();
        }

        @Override
        public Mono<Authentication> authenticate(Authentication authentication) {
            return Mono.fromCallable(() -> {
                String token;
                if (authentication instanceof BearerTokenAuthenticationToken bearerToken) {
                    token = bearerToken.getToken();
                } else {
                    throw new BadCredentialsException("Expected BearerTokenAuthenticationToken");
                }

                // Step 1: Parse with SignedJWT.parse()
                SignedJWT signedJWT;
                try {
                    signedJWT = SignedJWT.parse(token);
                } catch (ParseException e) {
                    throw new BadCredentialsException("Invalid JWT format: " + e.getMessage());
                }

                // Step 2: Extract realm from issuer
                JWTClaimsSet claims;
                try {
                    claims = signedJWT.getJWTClaimsSet();
                } catch (ParseException e) {
                    throw new BadCredentialsException("Cannot parse JWT claims: " + e.getMessage());
                }

                String issuer = claims.getIssuer();
                String realm = extractRealmFromIssuer(issuer);
                if (realm == null) {
                    throw new BadCredentialsException("Cannot determine realm from JWT issuer");
                }

                // Step 3: Validate signature against realm JWKS
                if (!validateSignature(signedJWT, realm)) {
                    // Fallback to master realm
                    if (!"master".equals(realm) && !validateSignature(signedJWT, "master")) {
                        throw new BadCredentialsException(
                                "JWT signature verification failed for realm '" + realm + "' and master");
                    } else if ("master".equals(realm)) {
                        throw new BadCredentialsException(
                                "JWT signature verification failed for master realm");
                    }
                }

                // Step 4: Check expiration
                Date exp = claims.getExpirationTime();
                if (exp != null && exp.before(new Date())) {
                    throw new BadCredentialsException("JWT is expired");
                }

                // Step 5: Extract authorities
                Collection<GrantedAuthority> authorities = extractAuthorities(claims);

                // Step 6: Build authenticated token
                Map<String, Object> attrs = new HashMap<>();
                attrs.put("sub", claims.getSubject());
                attrs.put("iss", issuer);
                attrs.put("preferred_username", claims.getClaim("preferred_username"));
                attrs.put("azp", claims.getClaim("azp"));
                attrs.put("realm_access", claims.getClaim("realm_access"));
                attrs.put("resource_access", claims.getClaim("resource_access"));

                OAuth2IntrospectionAuthenticatedPrincipal principal =
                        new OAuth2IntrospectionAuthenticatedPrincipal(
                                getUsername(claims), attrs, authorities);

                Instant issuedAt = claims.getIssueTime() != null
                        ? claims.getIssueTime().toInstant() : Instant.now();
                Instant expiresAt = exp != null ? exp.toInstant() : null;

                OAuth2AccessToken accessToken = new OAuth2AccessToken(
                        OAuth2AccessToken.TokenType.BEARER, token, issuedAt, expiresAt);

                BearerTokenAuthentication auth =
                        new BearerTokenAuthentication(principal, accessToken, authorities);
                auth.setAuthenticated(true);

                log.debug("Gateway: authenticated user '{}' for realm '{}'",
                        getUsername(claims), realm);

                return (Authentication) auth;
            }).subscribeOn(Schedulers.boundedElastic());
        }

        private boolean validateSignature(SignedJWT signedJWT, String realm) {
            try {
                String kid = signedJWT.getHeader().getKeyID();
                if (kid == null) return false;

                JWKSet jwkSet = getJwks(realm);
                if (jwkSet == null) return false;

                JWK matchingKey = jwkSet.getKeyByKeyId(kid);
                if (matchingKey == null) {
                    // Force refresh and retry
                    jwksCache.remove(realm);
                    jwkSet = getJwks(realm);
                    if (jwkSet == null) return false;
                    matchingKey = jwkSet.getKeyByKeyId(kid);
                    if (matchingKey == null) return false;
                }

                RSAPublicKey rsaPublicKey = ((RSAKey) matchingKey).toRSAPublicKey();
                JWSVerifier verifier = new RSASSAVerifier(rsaPublicKey);
                return signedJWT.verify(verifier);

            } catch (Exception e) {
                log.error("Gateway: signature validation error for realm '{}': {}", realm, e.getMessage());
                return false;
            }
        }

        private JWKSet getJwks(String realm) {
            CachedJwks cached = jwksCache.get(realm);
            if (cached != null && !cached.isExpired()) {
                return cached.jwkSet;
            }

            String jwksUrl = keycloakBaseUrl + "/realms/" + realm + "/protocol/openid-connect/certs";
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(jwksUrl))
                        .header("Accept", "application/json")
                        .timeout(Duration.ofSeconds(10))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200) {
                    log.error("Gateway: JWKS fetch failed for realm '{}': HTTP {}", realm, response.statusCode());
                    return null;
                }

                JWKSet jwkSet = JWKSet.parse(response.body());
                jwksCache.put(realm, new CachedJwks(jwkSet));
                return jwkSet;

            } catch (Exception e) {
                log.error("Gateway: failed to fetch JWKS from '{}': {}", jwksUrl, e.getMessage());
                return null;
            }
        }

        @SuppressWarnings("unchecked")
        private Collection<GrantedAuthority> extractAuthorities(JWTClaimsSet claims) {
            Set<GrantedAuthority> authorities = new HashSet<>();
            try {
                Map<String, Object> realmAccess = claims.getJSONObjectClaim("realm_access");
                if (realmAccess != null && realmAccess.containsKey("roles")) {
                    ((List<String>) realmAccess.get("roles")).stream()
                            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                            .forEach(authorities::add);
                }

                Map<String, Object> resourceAccess = claims.getJSONObjectClaim("resource_access");
                if (resourceAccess != null) {
                    for (Map.Entry<String, Object> entry : resourceAccess.entrySet()) {
                        Map<String, Object> clientData = (Map<String, Object>) entry.getValue();
                        if (clientData.containsKey("roles")) {
                            ((List<String>) clientData.get("roles")).stream()
                                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                                    .forEach(authorities::add);
                        }
                    }
                }
            } catch (ParseException e) {
                log.warn("Gateway: error extracting authorities: {}", e.getMessage());
            }
            return authorities;
        }

        private String extractRealmFromIssuer(String issuer) {
            if (issuer == null) return null;
            int idx = issuer.indexOf("/realms/");
            if (idx < 0) return null;
            return issuer.substring(idx + 8);
        }

        private String getUsername(JWTClaimsSet claims) {
            try {
                String username = claims.getStringClaim("preferred_username");
                return username != null ? username : claims.getSubject();
            } catch (ParseException e) {
                return claims.getSubject();
            }
        }

        private static class CachedJwks {
            final JWKSet jwkSet;
            final long fetchedAt;

            CachedJwks(JWKSet jwkSet) {
                this.jwkSet = jwkSet;
                this.fetchedAt = System.currentTimeMillis();
            }

            boolean isExpired() {
                return System.currentTimeMillis() - fetchedAt > JWKS_CACHE_TTL_MS;
            }
        }
    }
}
