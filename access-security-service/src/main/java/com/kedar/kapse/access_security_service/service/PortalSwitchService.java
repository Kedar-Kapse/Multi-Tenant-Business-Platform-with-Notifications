package com.kedar.kapse.access_security_service.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kedar.kapse.access_security_service.config.PortalConfig;
import com.kedar.kapse.platform_core.security.SecurityConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Manages one-time-use switch codes for cross-portal navigation.
 *
 * FLOW:
 *   1. Admin requests a switch code via POST /api/auth/portal-switch/generate
 *   2. Service validates the user has ADMIN role, generates a cryptographic code,
 *      stores it in Redis with a short TTL (default 30s)
 *   3. Admin portal redirects to target portal: {portalUrl}/portal-entry?code={code}
 *   4. Target portal calls POST /api/auth/portal-switch/exchange with the code
 *   5. Service validates the code (one-time use, not expired), returns the stored tokens
 *   6. Target portal stores the tokens and redirects to its dashboard
 *
 * SECURITY:
 *   - Codes are 64-character hex strings (256-bit entropy)
 *   - One-time use: atomically consumed on first exchange (getAndDelete)
 *   - Short-lived: Redis TTL = switchCodeTtlSeconds (default 30)
 *   - Only ADMIN role can generate codes
 */
@Service
@Slf4j
public class PortalSwitchService {

    private static final String KEY_PREFIX = "portal:switch:";

    private final PortalConfig portalConfig;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final SecureRandom secureRandom = new SecureRandom();

    public PortalSwitchService(PortalConfig portalConfig,
                               StringRedisTemplate redis,
                               ObjectMapper objectMapper) {
        this.portalConfig = portalConfig;
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, String>> getAvailablePortals() {
        List<Map<String, String>> result = new ArrayList<>();
        portalConfig.getPortals().forEach((key, entry) -> {
            Map<String, String> portal = new LinkedHashMap<>();
            portal.put("key", key);
            portal.put("name", entry.getName());
            portal.put("url", entry.getUrl().replace("{tenant}", String.valueOf(com.kedar.kapse.platform_core.security.TenantContext.getTenantId())));
            result.add(portal);
        });
        return result;
    }

    public String generateSwitchCode(List<String> roles, String accessToken, String refreshToken,
                                     String targetPortal, String tenantId) {
        if (roles == null || !roles.contains(SecurityConstants.ROLE_ADMIN)) {
            throw new SecurityException("Only users with ADMIN role can switch portals");
        }

        if (!portalConfig.getPortals().containsKey(targetPortal)) {
            throw new IllegalArgumentException("Unknown portal: " + targetPortal);
        }

        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String code = bytesToHex(randomBytes);

        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("accessToken", accessToken);
        payload.put("refreshToken", refreshToken);
        payload.put("targetPortal", targetPortal);
        payload.put("tenantId", tenantId);

        try {
            String json = objectMapper.writeValueAsString(payload);
            redis.opsForValue().set(KEY_PREFIX + code, json,
                    Duration.ofSeconds(portalConfig.getSwitchCodeTtlSeconds()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize switch code payload", e);
        }

        log.info("Generated portal switch code for target '{}', tenant '{}'", targetPortal, tenantId);
        return code;
    }

    public Map<String, String> exchangeCode(String code) {
        String json = redis.opsForValue().getAndDelete(KEY_PREFIX + code);

        if (json == null) {
            log.warn("Portal switch code not found or already used");
            throw new SecurityException("Invalid or expired switch code");
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, String> payload = objectMapper.readValue(json, Map.class);
            log.info("Portal switch code exchanged successfully for portal '{}'", payload.get("targetPortal"));

            Map<String, String> result = new LinkedHashMap<>();
            result.put("access_token", payload.get("accessToken"));
            result.put("refresh_token", payload.get("refreshToken"));
            result.put("target_portal", payload.get("targetPortal"));
            result.put("tenant_id", payload.get("tenantId"));
            return result;
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize switch code payload", e);
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
