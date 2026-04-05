package com.kedar.kapse.platform_core.security;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Multi-tenant JWT decoder that dynamically resolves the JWKS endpoint
 * based on the current tenant's Keycloak realm.
 *
 * HOW IT WORKS:
 * 1. TenantFilter extracts X-TENANT-ID header and stores it in TenantContext
 * 2. When Spring Security validates the JWT, this decoder reads TenantContext
 * 3. It constructs the JWKS URL: {keycloakBaseUrl}/realms/{tenantId}/protocol/openid-connect/certs
 * 4. NimbusJwtDecoder fetches the realm's public key and validates the JWT signature
 * 5. STRICT TENANT MATCH: After decoding, the issuer claim in the JWT is compared
 *    against the X-TENANT-ID header. If they don't match, the token is rejected.
 *    This prevents a user from switching tenants by changing the header.
 *
 * CACHING:
 * Each realm's JwtDecoder is cached in a ConcurrentHashMap to avoid re-fetching
 * the JWKS endpoint on every request. The cache is safe for concurrent access.
 *
 * FALLBACK:
 * If no tenant is in the context, the decoder attempts to extract the realm from
 * the JWT's "iss" (issuer) claim. This supports scenarios where the tenant header
 * is missing but the JWT is self-describing.
 */
public class MultiTenantJwtDecoder implements JwtDecoder {

    private final String keycloakBaseUrl;
    private final ConcurrentHashMap<String, NimbusJwtDecoder> decoderCache = new ConcurrentHashMap<>();

    public MultiTenantJwtDecoder(String keycloakBaseUrl) {
        // Remove trailing slash if present
        this.keycloakBaseUrl = keycloakBaseUrl.endsWith("/")
                ? keycloakBaseUrl.substring(0, keycloakBaseUrl.length() - 1)
                : keycloakBaseUrl;
    }

    @Override
    public Jwt decode(String token) throws JwtException {
        String tenantId = TenantContext.getTenantId();

        if (tenantId == null || tenantId.isBlank()) {
            // Fallback: try to extract realm from the JWT issuer claim without full validation
            tenantId = extractRealmFromToken(token);
        }

        if (tenantId == null || tenantId.isBlank()) {
            throw new JwtException("Cannot determine tenant. Provide X-TENANT-ID header or ensure JWT has valid issuer.");
        }

        JwtDecoder decoder = decoderCache.computeIfAbsent(tenantId, this::createDecoder);
        Jwt jwt = decoder.decode(token);

        // --- STRICT TENANT MATCH ---
        // After successful signature verification, ensure the JWT's issuer realm
        // matches the tenant requested via X-TENANT-ID header. This prevents a
        // user from Hospital A changing their header to Hospital B to access
        // another tenant's data. Without this check, the signature would still
        // fail (different realm keys), but we enforce it explicitly as defense-in-depth.
        String headerTenantId = TenantContext.getTenantId();
        if (headerTenantId != null && !headerTenantId.isBlank()) {
            String issuer = jwt.getClaimAsString("iss");
            if (issuer != null) {
                String tokenRealm = extractRealmFromIssuer(issuer);
                if (tokenRealm != null && !headerTenantId.equalsIgnoreCase(tokenRealm)) {
                    throw new InvalidBearerTokenException(
                            "Token issuer realm '" + tokenRealm
                                    + "' does not match tenant header '" + headerTenantId
                                    + "'. Cross-tenant access is not allowed.");
                }
            }
        }

        return jwt;
    }

    private NimbusJwtDecoder createDecoder(String realm) {
        String jwkSetUri = keycloakBaseUrl + "/realms/" + realm + "/protocol/openid-connect/certs";
        return NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
    }

    /**
     * Extracts the realm name from an already-decoded issuer URL.
     * E.g., "http://keycloak:8080/realms/hospital-a" → "hospital-a"
     */
    private String extractRealmFromIssuer(String issuer) {
        int realmsIndex = issuer.indexOf("/realms/");
        if (realmsIndex < 0) return null;
        return issuer.substring(realmsIndex + 8);
    }

    /**
     * Extracts the realm name from the JWT's issuer claim without verifying the signature.
     * The issuer URL format is: {keycloakBaseUrl}/realms/{realmName}
     *
     * This is used as a fallback when X-TENANT-ID header is not present.
     * The actual signature verification happens after we determine the realm.
     */
    private String extractRealmFromToken(String token) {
        try {
            // JWT format: header.payload.signature — decode the payload (Base64)
            String[] parts = token.split("\\.");
            if (parts.length < 2) return null;

            String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));

            // Extract "iss" claim from the payload JSON
            // Looking for: "iss":"http://keycloak:8080/realms/hospital-a"
            int issIndex = payload.indexOf("\"iss\"");
            if (issIndex < 0) return null;

            int valueStart = payload.indexOf("\"", issIndex + 5) + 1;
            int valueEnd = payload.indexOf("\"", valueStart);
            if (valueStart <= 0 || valueEnd <= 0) return null;

            String issuer = payload.substring(valueStart, valueEnd);

            // Extract realm name from the issuer URL (last path segment after /realms/)
            int realmsIndex = issuer.indexOf("/realms/");
            if (realmsIndex < 0) return null;

            return issuer.substring(realmsIndex + 8);
        } catch (Exception e) {
            return null;
        }
    }
}
