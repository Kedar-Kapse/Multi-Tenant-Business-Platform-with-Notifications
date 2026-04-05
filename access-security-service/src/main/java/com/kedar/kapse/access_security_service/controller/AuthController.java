package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.platform_core.security.SecurityConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

/**
 * Multi-tenant authentication controller — Login, Refresh, and Logout via Keycloak.
 *
 * This controller proxies authentication requests to the correct Keycloak realm
 * based on the X-TENANT-ID header. Each tenant has its own Keycloak realm.
 *
 * FLOW:
 *   1. Frontend sends login request with X-TENANT-ID header
 *   2. Controller resolves the Keycloak token URL for that tenant's realm
 *   3. Forwards credentials to Keycloak
 *   4. Returns JWT access_token + refresh_token to the frontend
 *
 * TOKEN URL PATTERN:
 *   {keycloakBaseUrl}/realms/{tenantId}/protocol/openid-connect/token
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final WebClient webClient;
    private final String keycloakBaseUrl;
    private final String backendClientId;
    private final String defaultClientSecret;

    public AuthController(
            WebClient.Builder webClientBuilder,
            @Value("${keycloak.admin.server-url:http://localhost:8080}") String keycloakBaseUrl,
            @Value("${keycloak.auth.client-id:platform-backend}") String backendClientId,
            @Value("${keycloak.auth.client-secret:}") String defaultClientSecret) {

        this.webClient = webClientBuilder.build();
        this.keycloakBaseUrl = keycloakBaseUrl.endsWith("/")
                ? keycloakBaseUrl.substring(0, keycloakBaseUrl.length() - 1)
                : keycloakBaseUrl;
        this.backendClientId = backendClientId;
        this.defaultClientSecret = defaultClientSecret;

        log.info("AuthController initialized. Keycloak base URL: {}", this.keycloakBaseUrl);
    }

    // ======================== LOGIN ========================

    /**
     * Authenticates a user against their tenant's Keycloak realm.
     *
     * Required headers: X-TENANT-ID (e.g., "hospital-a")
     * Required body: { "username": "...", "password": "..." }
     * Optional body: { "client_secret": "..." } — overrides default
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestHeader(SecurityConstants.TENANT_HEADER) String tenantId,
            @RequestBody Map<String, String> loginRequest) {

        String username = loginRequest.get("username");
        String password = loginRequest.get("password");
        String clientSecret = loginRequest.getOrDefault("client_secret", defaultClientSecret);
        String tokenUrl = buildTokenUrl(tenantId);

        log.info("Login attempt for user '{}' in tenant '{}'", username, tenantId);

        try {
            String response = webClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters
                            .fromFormData("grant_type", "password")
                            .with("client_id", backendClientId)
                            .with("client_secret", clientSecret)
                            .with("username", username)
                            .with("password", password))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.info("User '{}' logged in successfully in tenant '{}'", username, tenantId);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response);

        } catch (Exception e) {
            log.error("Login failed for user '{}' in tenant '{}': {}", username, tenantId, e.getMessage());
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Authentication failed",
                                 "message", "Invalid username or password",
                                 "tenant", tenantId));
        }
    }

    // ======================== TOKEN REFRESH ========================

    /**
     * Refreshes an expired access token using a valid refresh token.
     *
     * Required headers: X-TENANT-ID
     * Required body: { "refresh_token": "..." }
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(
            @RequestHeader(SecurityConstants.TENANT_HEADER) String tenantId,
            @RequestBody Map<String, String> refreshRequest) {

        String refreshToken = refreshRequest.get("refresh_token");
        String clientSecret = refreshRequest.getOrDefault("client_secret", defaultClientSecret);
        String tokenUrl = buildTokenUrl(tenantId);

        log.info("Token refresh requested for tenant '{}'", tenantId);

        try {
            String response = webClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters
                            .fromFormData("grant_type", "refresh_token")
                            .with("client_id", backendClientId)
                            .with("client_secret", clientSecret)
                            .with("refresh_token", refreshToken))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.info("Token refreshed successfully for tenant '{}'", tenantId);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response);

        } catch (Exception e) {
            log.error("Token refresh failed for tenant '{}': {}", tenantId, e.getMessage());
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Token refresh failed",
                                 "message", "Invalid or expired refresh token"));
        }
    }

    // ======================== LOGOUT ========================

    /**
     * Logs out a user by invalidating their refresh token in Keycloak.
     *
     * Required headers: X-TENANT-ID
     * Required body: { "refresh_token": "..." }
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @RequestHeader(SecurityConstants.TENANT_HEADER) String tenantId,
            @RequestBody Map<String, String> logoutRequest) {

        String refreshToken = logoutRequest.get("refresh_token");
        String clientSecret = logoutRequest.getOrDefault("client_secret", defaultClientSecret);
        String logoutUrl = buildLogoutUrl(tenantId);

        log.info("Logout requested for tenant '{}'", tenantId);

        try {
            webClient.post()
                    .uri(logoutUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters
                            .fromFormData("client_id", backendClientId)
                            .with("client_secret", clientSecret)
                            .with("refresh_token", refreshToken))
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();

            log.info("User logged out successfully from tenant '{}'", tenantId);
            return ResponseEntity.ok(Map.of("message", "Logged out successfully"));

        } catch (Exception e) {
            log.error("Logout failed for tenant '{}': {}", tenantId, e.getMessage());
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Logout failed",
                                 "message", e.getMessage()));
        }
    }

    // ======================== HELPERS ========================

    private String buildTokenUrl(String tenantId) {
        return keycloakBaseUrl + "/realms/" + tenantId + "/protocol/openid-connect/token";
    }

    private String buildLogoutUrl(String tenantId) {
        return keycloakBaseUrl + "/realms/" + tenantId + "/protocol/openid-connect/logout";
    }
}
