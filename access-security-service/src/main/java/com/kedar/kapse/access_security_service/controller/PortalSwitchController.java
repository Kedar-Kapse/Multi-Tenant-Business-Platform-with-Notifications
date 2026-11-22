package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.config.PortalConfig;
import com.kedar.kapse.access_security_service.service.PortalSwitchService;
import com.kedar.kapse.platform_core.security.SecurityConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Cross-portal navigation controller — Admin-only portal switching.
 *
 * Enables authenticated ADMIN users to navigate between portals (Admin, Provider, Patient)
 * without re-entering credentials. Uses a one-time-use, short-lived switch code pattern
 * (similar to OAuth authorization code flow).
 *
 * ENDPOINTS:
 *   GET  /api/auth/portal-switch/portals   — List available portals (requires ADMIN)
 *   POST /api/auth/portal-switch/generate  — Generate a one-time switch code (requires ADMIN)
 *   POST /api/auth/portal-switch/exchange  — Exchange a switch code for tokens (public)
 */
@Slf4j
@RestController
@RequestMapping("/api/auth/portal-switch")
public class PortalSwitchController {

    private final PortalSwitchService portalSwitchService;
    private final PortalConfig portalConfig;

    public PortalSwitchController(PortalSwitchService portalSwitchService, PortalConfig portalConfig) {
        this.portalSwitchService = portalSwitchService;
        this.portalConfig = portalConfig;
    }

    /**
     * Returns the list of available portals for the switch UI.
     * Only accessible to ADMIN users.
     */
    @GetMapping("/portals")
    public ResponseEntity<?> getAvailablePortals(Authentication authentication) {
        if (!hasAdminRole(authentication)) {
            return ResponseEntity.status(403)
                    .body(Map.of("error", "Forbidden", "message", "Only ADMIN users can access portal switching"));
        }

        return ResponseEntity.ok(Map.of("portals", portalSwitchService.getAvailablePortals()));
    }

    /**
     * Generates a one-time-use switch code for navigating to a target portal.
     *
     * Request body: { "target_portal": "provider", "refresh_token": "..." }
     * The access token is extracted from the Authorization header.
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generateSwitchCode(
            @RequestHeader(SecurityConstants.TENANT_HEADER) String tenantId,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> request,
            Authentication authentication) {

        if (!hasAdminRole(authentication)) {
            return ResponseEntity.status(403)
                    .body(Map.of("error", "Forbidden", "message", "Only ADMIN users can switch portals"));
        }

        String targetPortal = request.get("target_portal");
        String refreshToken = request.get("refresh_token");

        if (targetPortal == null || targetPortal.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bad Request", "message", "target_portal is required"));
        }

        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bad Request", "message", "refresh_token is required"));
        }

        String accessToken = authHeader.replace("Bearer ", "");

        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(a -> a.startsWith("ROLE_") ? a.substring(5) : a)
                .toList();

        try {
            String code = portalSwitchService.generateSwitchCode(
                    roles, accessToken, refreshToken, targetPortal, tenantId);

            PortalConfig.PortalEntry portal = portalConfig.getPortals().get(targetPortal);
            String redirectUrl = portal.getUrl().replace("{tenant}", com.kedar.kapse.platform_core.security.TenantContext.getRequiredTenantId()) + "/portal-entry?code=" + code;

            return ResponseEntity.ok(Map.of(
                    "code", code,
                    "redirect_url", redirectUrl,
                    "expires_in_seconds", portalConfig.getSwitchCodeTtlSeconds()
            ));

        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden", "message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bad Request", "message", e.getMessage()));
        }
    }

    /**
     * Exchanges a one-time switch code for access and refresh tokens.
     * This endpoint is public (no authentication required) because the target portal
     * doesn't have tokens yet — the code itself is the proof of authorization.
     */
    @PostMapping("/exchange")
    public ResponseEntity<?> exchangeCode(@RequestBody Map<String, String> request) {
        String code = request.get("code");

        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bad Request", "message", "code is required"));
        }

        try {
            Map<String, String> tokens = portalSwitchService.exchangeCode(code);
            return ResponseEntity.ok(tokens);
        } catch (SecurityException e) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Unauthorized", "message", e.getMessage()));
        }
    }

    private boolean hasAdminRole(Authentication authentication) {
        if (authentication == null) return false;
        return authentication.getAuthorities().stream()
                .anyMatch(a -> {
                    String authority = a.getAuthority();
                    return authority.equals("ROLE_" + SecurityConstants.ROLE_ADMIN)
                            || authority.equals(SecurityConstants.ROLE_ADMIN);
                });
    }
}
