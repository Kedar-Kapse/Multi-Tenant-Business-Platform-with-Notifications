package com.kedar.kapse.access_security_service.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * ============================================================================
 * TEST CONTROLLER — Endpoints to Verify JWT Authentication is Working
 * ============================================================================
 *
 * Use these endpoints to test that your Keycloak + Spring Security integration
 * is working correctly. Each endpoint demonstrates a different security scenario.
 *
 * HOW TO TEST WITH CURL:
 * ----------------------
 * Step 1: Get an access token from Keycloak:
 *
 *   curl -X POST http://localhost:8080/realms/myrealm/protocol/openid-connect/token \
 *     -H "Content-Type: application/x-www-form-urlencoded" \
 *     -d "grant_type=client_credentials" \
 *     -d "client_id=access-security-service" \
 *     -d "client_secret=YOUR_CLIENT_SECRET"
 *
 *   (Copy the "access_token" value from the response)
 *
 * Step 2: Call a protected endpoint with the token:
 *
 *   curl http://localhost:8082/api/test \
 *     -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..."
 *
 * WHAT HAPPENS BEHIND THE SCENES:
 * --------------------------------
 *   1. curl sends the request with "Authorization: Bearer <token>"
 *   2. Spring Security intercepts the request
 *   3. Extracts the JWT from the Authorization header
 *   4. Fetches Keycloak's public key from:
 *      http://localhost:8080/realms/myrealm/protocol/openid-connect/certs
 *   5. Verifies the JWT signature using RSA public key
 *   6. Checks the token is not expired
 *   7. Checks the issuer matches: http://localhost:8080/realms/myrealm
 *   8. KeycloakJwtConverter extracts roles from realm_access.roles
 *   9. Creates a Spring Security Authentication with the user's roles
 *  10. Request reaches THIS controller method
 *
 * If ANY step fails → 401 Unauthorized (no body, just status code)
 */
@RestController
@RequestMapping("/api/test")
public class TestController {

    /**
     * BASIC AUTHENTICATION TEST
     * -------------------------
     * This endpoint requires a VALID JWT token but does NOT check any specific role.
     * Any authenticated user can access it.
     *
     * Returns the username and roles extracted from the JWT token, proving that:
     *   ✓ JWT signature verification works
     *   ✓ Token is not expired
     *   ✓ Issuer matches your Keycloak realm
     *   ✓ KeycloakJwtConverter correctly extracts user info
     *
     * TEST:
     *   curl http://localhost:8082/api/test -H "Authorization: Bearer <TOKEN>"
     *
     *   Expected: 200 OK with JSON showing your username and roles
     *   Without token: 401 Unauthorized
     */
    @GetMapping
    public Map<String, Object> testAuthentication(@AuthenticationPrincipal Jwt jwt) {
        // @AuthenticationPrincipal Jwt jwt — Spring injects the decoded JWT token
        // This gives us access to ALL claims inside the token

        return Map.of(
                "message", "Authentication successful! Your JWT token is valid.",
                "username", jwt.getClaimAsString("preferred_username") != null
                        ? jwt.getClaimAsString("preferred_username") : "N/A",
                "email", jwt.getClaimAsString("email") != null
                        ? jwt.getClaimAsString("email") : "N/A",
                "issuer", jwt.getIssuer().toString(),
                "tokenId", jwt.getId() != null ? jwt.getId() : "N/A",
                "issuedAt", String.valueOf(jwt.getIssuedAt()),
                "expiresAt", String.valueOf(jwt.getExpiresAt()),
                "realmRoles", jwt.getClaimAsMap("realm_access") != null
                        ? jwt.getClaimAsMap("realm_access").get("roles") : "none"
        );
    }

    /**
     * ADMIN-ONLY ENDPOINT
     * --------------------
     * This endpoint requires the user to have the "ADMIN" role in Keycloak.
     *
     * HOW @PreAuthorize WORKS:
     *   1. Spring checks if the authenticated user has "ROLE_ADMIN" authority
     *   2. The "ROLE_" prefix is added automatically by hasRole()
     *   3. Our KeycloakJwtConverter already prefixed roles with "ROLE_"
     *   4. So Keycloak role "ADMIN" → "ROLE_ADMIN" → matches hasRole('ADMIN')
     *
     * TEST:
     *   curl http://localhost:8082/api/test/admin -H "Authorization: Bearer <TOKEN>"
     *
     *   With ADMIN role: 200 OK
     *   Without ADMIN role: 403 Forbidden
     *   Without any token: 401 Unauthorized
     */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> testAdminAccess(@AuthenticationPrincipal Jwt jwt) {
        return Map.of(
                "message", "You have ADMIN access!",
                "username", jwt.getClaimAsString("preferred_username") != null
                        ? jwt.getClaimAsString("preferred_username") : "service-account"
        );
    }

    /**
     * PUBLIC ENDPOINT — No authentication required
     * -----------------------------------------------
     * This endpoint is accessible WITHOUT any JWT token.
     * It's listed in SecurityConstants.PUBLIC_ENDPOINTS under /api/auth/**
     * but since /api/test/** is NOT in the public list, we need a separate
     * unprotected endpoint under /api/auth/ for testing.
     *
     * This endpoint proves that the security config correctly differentiates
     * between public and protected endpoints.
     *
     * TEST:
     *   curl http://localhost:8082/api/test/public
     *
     *   Expected: 200 OK (no token needed)
     */
    @GetMapping("/public")
    public Map<String, String> testPublicAccess() {
        return Map.of(
                "message", "This is a public endpoint — no authentication required",
                "info", "The /api/test endpoint (without /public) requires a valid JWT token"
        );
    }
}
