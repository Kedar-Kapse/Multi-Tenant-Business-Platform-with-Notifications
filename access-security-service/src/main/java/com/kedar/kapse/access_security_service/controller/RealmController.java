package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.service.KeycloakService;
import com.kedar.kapse.platform_core.enums.KeycloakRole;
import com.kedar.kapse.platform_core.security.PlatformAccess;
import com.kedar.kapse.platform_core.security.SecretGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Realm management endpoints for multi-tenant onboarding.
 *
 * These endpoints allow platform administrators to:
 * - Create new tenant realms (with default roles, clients, permissions)
 * - List all tenant realms
 *
 * Platform admins only (see PlatformAccess) -- a hospital admin must never be
 * able to create or list other hospitals.
 */
@Slf4j
@RestController
@RequestMapping("/api/realms")
@RequiredArgsConstructor
public class RealmController {

    private final KeycloakService keycloakService;
    private final PlatformAccess platformAccess;

    /**
     * Creates a new tenant realm in Keycloak.
     *
     * Request body:
     * {
     *   "realmName": "hospital-c",
     *   "displayName": "Hospital C - Regional Medical",
     *   "clientSecret": "optional -- a random one is generated if missing"
     * }
     */
    @PostMapping
    @PreAuthorize("@platformAccess.isPlatformAdmin(authentication)")
    public ResponseEntity<?> createRealm(@RequestBody Map<String, String> request) {
        String realmName = request.get("realmName");
        String displayName = request.getOrDefault("displayName", realmName);
        String clientSecret = request.get("clientSecret");
        if (clientSecret == null || clientSecret.isBlank()) {
            clientSecret = SecretGenerator.newSecret();
        }

        if (realmName == null || realmName.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "realmName is required"));
        }
        if (platformAccess.isReservedRealm(realmName)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "'" + realmName + "' is reserved and cannot be a hospital"));
        }

        log.info("Creating tenant realm: {}", realmName);
        keycloakService.createTenantRealm(realmName, displayName, clientSecret);

        return ResponseEntity.ok(Map.of(
                "message", "Tenant realm created successfully",
                "realm", realmName,
                "clients", List.of("platform-backend", "platform-frontend"),
                "roles", Arrays.stream(KeycloakRole.values()).map(Enum::name).toList(),
                "permissions", List.of("READ_PATIENT", "UPDATE_PATIENT", "CREATE_PATIENT",
                        "DELETE_PATIENT", "MANAGE_STAFF", "MANAGE_FACILITY", "VIEW_REPORTS", "MANAGE_PHARMACY")
        ));
    }

    /**
     * Lists all tenant realms (excludes the master realm).
     */
    @GetMapping
    @PreAuthorize("@platformAccess.isPlatformAdmin(authentication)")
    public ResponseEntity<?> listRealms() {
        List<String> realms = keycloakService.listTenantRealms();
        return ResponseEntity.ok(Map.of("realms", realms));
    }
}
