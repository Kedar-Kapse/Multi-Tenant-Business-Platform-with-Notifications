package com.kedar.kapse.access_security_service.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Configurable portal registry for cross-portal navigation.
 *
 * Each entry maps a portal key (e.g., "admin", "provider", "patient")
 * to its display name and base URL. Only users with the ADMIN realm role
 * can use portal switching.
 *
 * Configuration (application.yml):
 *   portal:
 *     switch-code-ttl-seconds: 30
 *     portals:
 *       admin:
 *         name: Admin Portal
 *         url: http://localhost:3000
 *       provider:
 *         name: Provider Portal
 *         url: http://localhost:3001
 *       patient:
 *         name: Patient Portal
 *         url: http://localhost:3002
 */
@ConfigurationProperties(prefix = "portal")
@Getter
@Setter
public class PortalConfig {

    private int switchCodeTtlSeconds = 30;

    private Map<String, PortalEntry> portals = new LinkedHashMap<>();

    @Getter
    @Setter
    public static class PortalEntry {
        private String name;
        private String url;
    }
}
