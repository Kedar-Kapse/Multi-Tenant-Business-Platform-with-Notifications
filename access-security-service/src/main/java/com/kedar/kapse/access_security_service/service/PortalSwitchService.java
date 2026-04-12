package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.access_security_service.config.PortalConfig;
import com.kedar.kapse.platform_core.security.SecurityConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages one-time-use switch codes for cross-portal navigation.
 *
 * FLOW:
 *   1. Admin requests a switch code via POST /api/auth/portal-switch/generate
 *   2. Service validates the user has ADMIN role, generates a cryptographic code,
 *      stores it in memory with a short TTL (default 30s)
 *   3. Admin portal redirects to target portal: {portalUrl}/portal-entry?code={code}
 *   4. Target portal calls POST /api/auth/portal-switch/exchange with the code
 *   5. Service validates the code (one-time use, not expired), returns the stored tokens
 *   6. Target portal stores the tokens and redirects to its dashboard
 *
 * SECURITY:
 *   - Codes are 64-character hex strings (256-bit entropy)
 *   - One-time use: consumed on first exchange
 *   - Short-lived: expires after switchCodeTtlSeconds (default 30)
 *   - Periodic cleanup of expired codes
 *   - Only ADMIN role can generate codes
 */
@Service
@Slf4j
public class PortalSwitchService {

    private final PortalConfig portalConfig;
    private final ConcurrentHashMap<String, SwitchCodeEntry> codeStore = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    public PortalSwitchService(PortalConfig portalConfig) {
        this.portalConfig = portalConfig;
    }

    /**
     * Returns the list of available portals (for the switch UI).
     */
    public List<Map<String, String>> getAvailablePortals() {
        List<Map<String, String>> result = new ArrayList<>();
        portalConfig.getPortals().forEach((key, entry) -> {
            Map<String, String> portal = new LinkedHashMap<>();
            portal.put("key", key);
            portal.put("name", entry.getName());
            portal.put("url", entry.getUrl());
            result.add(portal);
        });
        return result;
    }

    /**
     * Generates a one-time-use switch code for cross-portal navigation.
     *
     * @param roles       the user's realm roles (must contain ADMIN)
     * @param accessToken the user's current access token
     * @param refreshToken the user's current refresh token
     * @param targetPortal the target portal key
     * @param tenantId    the current tenant ID
     * @return the generated switch code
     * @throws SecurityException if the user is not an ADMIN
     * @throws IllegalArgumentException if the target portal is unknown
     */
    public String generateSwitchCode(List<String> roles, String accessToken, String refreshToken,
                                     String targetPortal, String tenantId) {
        if (roles == null || !roles.contains(SecurityConstants.ROLE_ADMIN)) {
            throw new SecurityException("Only users with ADMIN role can switch portals");
        }

        if (!portalConfig.getPortals().containsKey(targetPortal)) {
            throw new IllegalArgumentException("Unknown portal: " + targetPortal);
        }

        cleanupExpiredCodes();

        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String code = bytesToHex(randomBytes);

        SwitchCodeEntry entry = new SwitchCodeEntry(
                accessToken, refreshToken, targetPortal, tenantId,
                Instant.now().plusSeconds(portalConfig.getSwitchCodeTtlSeconds())
        );

        codeStore.put(code, entry);
        log.info("Generated portal switch code for target '{}', tenant '{}'. Expires at {}",
                targetPortal, tenantId, entry.expiresAt);

        return code;
    }

    /**
     * Exchanges a one-time switch code for tokens.
     * The code is consumed (deleted) on successful exchange.
     *
     * @param code the switch code to exchange
     * @return map containing access_token, refresh_token, target_portal, tenant_id
     * @throws SecurityException if the code is invalid, expired, or already used
     */
    public Map<String, String> exchangeCode(String code) {
        SwitchCodeEntry entry = codeStore.remove(code);

        if (entry == null) {
            log.warn("Portal switch code not found or already used");
            throw new SecurityException("Invalid or expired switch code");
        }

        if (Instant.now().isAfter(entry.expiresAt)) {
            log.warn("Portal switch code expired at {}", entry.expiresAt);
            throw new SecurityException("Switch code has expired");
        }

        log.info("Portal switch code exchanged successfully for portal '{}'", entry.targetPortal);

        Map<String, String> result = new LinkedHashMap<>();
        result.put("access_token", entry.accessToken);
        result.put("refresh_token", entry.refreshToken);
        result.put("target_portal", entry.targetPortal);
        result.put("tenant_id", entry.tenantId);
        return result;
    }

    private void cleanupExpiredCodes() {
        Instant now = Instant.now();
        codeStore.entrySet().removeIf(e -> now.isAfter(e.getValue().expiresAt));
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private record SwitchCodeEntry(
            String accessToken,
            String refreshToken,
            String targetPortal,
            String tenantId,
            Instant expiresAt
    ) {}
}
