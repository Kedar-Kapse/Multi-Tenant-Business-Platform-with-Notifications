package com.kedar.kapse.platform_core.security;

import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.interfaces.RSAPublicKey;
import java.text.ParseException;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manual JWT validation using Nimbus JOSE+JWT.
 *
 * This class does NOT rely on Spring's auto-configured JwtDecoder or
 * the spring.security.oauth2.resourceserver.jwt.issuer-uri property.
 *
 * VALIDATION FLOW:
 *   1. Parse the raw token with SignedJWT.parse(token)
 *   2. Extract the "kid" (Key ID) from the JWT header
 *   3. Fetch the JWKS from {baseUrl}/realms/{realm}/protocol/openid-connect/certs
 *   4. Find the matching RSA public key by kid
 *   5. Verify the signature with RSASSAVerifier
 *   6. Check expiration and issuer claims
 *
 * FALLBACK:
 *   If validation against the tenant realm fails, attempt validation
 *   against the "master" realm before returning false.
 *
 * CACHING:
 *   JWKS responses are cached per realm to avoid hitting Keycloak on every request.
 *   Cache entries have a configurable TTL (default 5 minutes).
 */
public class ValidateToken {

    private static final Logger log = LoggerFactory.getLogger(ValidateToken.class);
    private static final long JWKS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    private final String keycloakBaseUrl;
    private final HttpClient httpClient;

    // Cache: realm -> (jwkSet, fetchTimestamp)
    private final ConcurrentHashMap<String, CachedJwks> jwksCache = new ConcurrentHashMap<>();

    public ValidateToken(String keycloakBaseUrl) {
        this.keycloakBaseUrl = keycloakBaseUrl.endsWith("/")
                ? keycloakBaseUrl.substring(0, keycloakBaseUrl.length() - 1)
                : keycloakBaseUrl;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Validates the token and returns true if the signature is valid,
     * the token is not expired, and the issuer matches the expected realm.
     *
     * Called by CustomAuthenticationManager.authenticate() to determine
     * whether to set authentication.setAuthenticated(true).
     */
    public boolean isAuthorize(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        String realm = TenantContextHolder.getTenant();

        // Primary: validate against the tenant's realm
        if (validateAgainstRealm(token, realm)) {
            return true;
        }

        // Fallback: if tenant realm != master, try master realm
        if (!"master".equals(realm)) {
            log.debug("Token validation failed for realm '{}', falling back to master realm", realm);
            return validateAgainstRealm(token, "master");
        }

        return false;
    }

    /**
     * Parses the JWT and returns the claims if the token is valid, null otherwise.
     * Useful for extracting user info after validation.
     */
    public JWTClaimsSet parseAndValidate(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }

        String realm = TenantContextHolder.getTenant();

        JWTClaimsSet claims = validateAndGetClaims(token, realm);
        if (claims != null) {
            return claims;
        }

        // Fallback to master
        if (!"master".equals(realm)) {
            log.debug("Token validation failed for realm '{}', falling back to master", realm);
            return validateAndGetClaims(token, "master");
        }

        return null;
    }

    /**
     * Extracts the realm name from the token's issuer claim without verifying signature.
     * Used by TenantFilter as a fallback when X-TENANT-ID header is missing.
     */
    public String extractRealmFromToken(String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            String issuer = signedJWT.getJWTClaimsSet().getIssuer();
            return extractRealmFromIssuer(issuer);
        } catch (ParseException e) {
            log.debug("Failed to parse JWT for realm extraction: {}", e.getMessage());
            return null;
        }
    }

    // ======================== PRIVATE METHODS ========================

    private boolean validateAgainstRealm(String token, String realm) {
        return validateAndGetClaims(token, realm) != null;
    }

    private JWTClaimsSet validateAndGetClaims(String token, String realm) {
        try {
            // Step 1: Parse the JWT using Nimbus
            SignedJWT signedJWT = SignedJWT.parse(token);

            // Step 2: Get the key ID from the JWT header
            String kid = signedJWT.getHeader().getKeyID();
            if (kid == null) {
                log.warn("JWT has no 'kid' header — cannot match JWKS key");
                return null;
            }

            // Step 3: Fetch the JWKS for this realm
            JWKSet jwkSet = getJwks(realm);
            if (jwkSet == null) {
                log.error("Failed to fetch JWKS for realm '{}'", realm);
                return null;
            }

            // Step 4: Find the matching key by kid
            JWK matchingKey = jwkSet.getKeyByKeyId(kid);
            if (matchingKey == null) {
                // Key rotation may have occurred — force refresh and retry
                log.debug("Key '{}' not found in cached JWKS for realm '{}', refreshing...", kid, realm);
                jwksCache.remove(realm);
                jwkSet = getJwks(realm);
                if (jwkSet == null) return null;
                matchingKey = jwkSet.getKeyByKeyId(kid);
                if (matchingKey == null) {
                    log.warn("Key '{}' not found in JWKS for realm '{}' even after refresh", kid, realm);
                    return null;
                }
            }

            // Step 5: Verify the RSA signature
            RSAPublicKey rsaPublicKey = ((RSAKey) matchingKey).toRSAPublicKey();
            JWSVerifier verifier = new RSASSAVerifier(rsaPublicKey);

            if (!signedJWT.verify(verifier)) {
                log.warn("JWT signature verification failed for realm '{}'", realm);
                return null;
            }

            // Step 6: Validate claims (expiration, issuer)
            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();

            Date expirationTime = claims.getExpirationTime();
            if (expirationTime != null && expirationTime.before(new Date())) {
                log.debug("JWT is expired (exp: {})", expirationTime);
                return null;
            }

            String issuer = claims.getIssuer();
            if (issuer != null) {
                String tokenRealm = extractRealmFromIssuer(issuer);
                if (tokenRealm != null && !realm.equalsIgnoreCase(tokenRealm)) {
                    log.warn("JWT issuer realm '{}' does not match expected realm '{}'", tokenRealm, realm);
                    return null;
                }
            }

            log.debug("JWT validated successfully for realm '{}'", realm);
            return claims;

        } catch (ParseException e) {
            log.error("Failed to parse JWT: {}", e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("JWT validation error for realm '{}': {}", realm, e.getMessage());
            return null;
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
                log.error("JWKS fetch failed for realm '{}': HTTP {}", realm, response.statusCode());
                return null;
            }

            JWKSet jwkSet = JWKSet.parse(response.body());
            jwksCache.put(realm, new CachedJwks(jwkSet));
            log.debug("JWKS fetched and cached for realm '{}' ({} keys)", realm, jwkSet.getKeys().size());
            return jwkSet;

        } catch (Exception e) {
            log.error("Failed to fetch JWKS from '{}': {}", jwksUrl, e.getMessage());
            return null;
        }
    }

    private String extractRealmFromIssuer(String issuer) {
        if (issuer == null) return null;
        int realmsIndex = issuer.indexOf("/realms/");
        if (realmsIndex < 0) return null;
        return issuer.substring(realmsIndex + 8);
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
