package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.service.KeycloakService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Realm management endpoints for multi-tenant onboarding.
 *
 * These endpoints allow platform administrators to:
 * - Create new tenant realms (with default roles, clients, permissions)
 * - List all tenant realms
 *
 * In production, these should be restricted to a super-admin role.
 * For now they are public to simplify initial setup and testing.
 */
@Slf4j
@RestController
@RequestMapping("/api/realms")
@RequiredArgsConstructor
public class RealmController {

    private final KeycloakService keycloakService;

    /**
     * Creates a new tenant realm in Keycloak.
     *
     * Request body:
     * {
     *   "realmName": "hospital-c",
     *   "displayName": "Hospital C - Regional Medical",
     *   "clientSecret": "my-secret-for-hospital-c"
     * }
     */
    @PostMapping
    public ResponseEntity<?> createRealm(@RequestBody Map<String, String> request) {
        String realmName = request.get("realmName");
        String displayName = request.getOrDefault("displayName", realmName);
        String clientSecret = request.getOrDefault("clientSecret", realmName + "-secret");

        if (realmName == null || realmName.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "realmName is required"));
        }

        log.info("Creating tenant realm: {}", realmName);
        keycloakService.createTenantRealm(realmName, displayName, clientSecret);

        return ResponseEntity.ok(Map.of(
                "message", "Tenant realm created successfully",
                "realm", realmName,
                "clients", List.of("platform-backend", "platform-frontend"),
                "roles", List.of("ADMIN", "PROVIDER", "THERAPIST", "PHYSICIAN", "NURSE", "PATIENT"),
                "permissions", List.of("READ_PATIENT", "UPDATE_PATIENT", "CREATE_PATIENT",
                        "DELETE_PATIENT", "MANAGE_STAFF", "MANAGE_FACILITY", "VIEW_REPORTS", "MANAGE_PHARMACY")
        ));
    }

    /**
     * Lists all tenant realms (excludes the master realm).
     */
    @GetMapping
    public ResponseEntity<?> listRealms() {
        List<String> realms = keycloakService.listTenantRealms();
        return ResponseEntity.ok(Map.of("realms", realms));
    }
}
