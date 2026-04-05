package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.CreateUserRequest;
import com.kedar.kapse.platform_core.security.TenantContext;
import jakarta.ws.rs.core.Response;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.representations.idm.*;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Multi-tenant Keycloak administration service.
 *
 * Uses the master realm admin client to manage tenant realms.
 * The target realm is determined by the current tenant context (X-TENANT-ID header).
 *
 * OPERATIONS:
 * - Realm management: create/list tenant realms with pre-configured clients & roles
 * - User management: create/enable/disable users within a tenant realm
 * - Role management: assign/remove roles within a tenant realm
 */
@Service
@Slf4j
public class KeycloakService {

    private final Keycloak keycloakAdmin;

    private static final String BACKEND_CLIENT_ID = "platform-backend";
    private static final String FRONTEND_CLIENT_ID = "platform-frontend";
    private static final String[] DEFAULT_REALM_ROLES = {
            "ADMIN", "PROVIDER", "THERAPIST", "PHYSICIAN", "NURSE", "PATIENT"
    };
    private static final String[] DEFAULT_CLIENT_PERMISSIONS = {
            "READ_PATIENT", "UPDATE_PATIENT", "CREATE_PATIENT", "DELETE_PATIENT",
            "MANAGE_STAFF", "MANAGE_FACILITY", "VIEW_REPORTS", "MANAGE_PHARMACY"
    };

    public KeycloakService(Keycloak keycloakAdmin) {
        this.keycloakAdmin = keycloakAdmin;
    }

    // ======================== REALM MANAGEMENT ========================

    /**
     * Creates a new tenant realm with default clients, roles, and permissions.
     * This is called when a new tenant (hospital/organization) is onboarded.
     */
    public void createTenantRealm(String realmName, String displayName, String backendClientSecret) {
        log.info("Creating tenant realm: {}", realmName);

        RealmRepresentation realm = new RealmRepresentation();
        realm.setRealm(realmName);
        realm.setDisplayName(displayName);
        realm.setDisplayNameHtml("<b>" + displayName + "</b>");
        realm.setEnabled(true);
        realm.setSslRequired("external");
        realm.setRegistrationAllowed(false);
        realm.setLoginWithEmailAllowed(true);
        realm.setBruteForceProtected(true);
        realm.setAccessTokenLifespan(300);       // 5 minutes
        realm.setSsoSessionIdleTimeout(1800);    // 30 minutes
        realm.setSsoSessionMaxLifespan(36000);   // 10 hours

        keycloakAdmin.realms().create(realm);
        log.info("Realm '{}' created successfully", realmName);

        // Create default roles
        createDefaultRoles(realmName);

        // Create backend and frontend clients
        createBackendClient(realmName, backendClientSecret);
        createFrontendClient(realmName);

        // Create default client permissions
        createClientPermissions(realmName);

        log.info("Tenant realm '{}' fully configured with roles, clients, and permissions", realmName);
    }

    /**
     * Updates the display name of a Keycloak realm.
     */
    public void updateRealmDisplayName(String realmName, String displayName) {
        RealmRepresentation realm = keycloakAdmin.realm(realmName).toRepresentation();
        realm.setDisplayName(displayName);
        realm.setDisplayNameHtml("<b>" + displayName + "</b>");
        keycloakAdmin.realm(realmName).update(realm);
        log.info("Updated display name for realm '{}' to '{}'", realmName, displayName);
    }

    /**
     * Deletes a tenant realm. Used during rollback if onboarding fails.
     */
    public void deleteRealm(String realmName) {
        log.info("Deleting realm '{}'", realmName);
        keycloakAdmin.realm(realmName).remove();
        log.info("Realm '{}' deleted", realmName);
    }

    /**
     * Returns a list of all tenant realm names (excludes 'master').
     */
    public List<String> listTenantRealms() {
        return keycloakAdmin.realms().findAll().stream()
                .map(RealmRepresentation::getRealm)
                .filter(name -> !"master".equals(name))
                .toList();
    }

    // ======================== USER MANAGEMENT ========================

    /**
     * Creates a user in the current tenant's realm.
     * The realm is determined by TenantContext (from X-TENANT-ID header).
     */
    public String createUser(CreateUserRequest userDTO) {
        String realm = TenantContext.getRequiredTenantId();
        return createUserInRealm(realm, userDTO);
    }

    /**
     * Creates a user in a specific realm.
     */
    public String createUserInRealm(String realm, CreateUserRequest userDTO) {
        UserRepresentation user = new UserRepresentation();
        user.setUsername(userDTO.getUsername());
        user.setEmail(userDTO.getEmail());
        user.setFirstName(userDTO.getFirstName());
        user.setLastName(userDTO.getLastName());
        user.setEnabled(true);
        user.setEmailVerified(true);

        RealmResource realmResource = keycloakAdmin.realm(realm);
        try (Response response = realmResource.users().create(user)) {
            if (response.getStatus() != 201) {
                String body = response.readEntity(String.class);
                log.error("Failed to create user in realm '{}'. Status: {}, Body: {}", realm, response.getStatus(), body);
                throw new RuntimeException("Failed to create user in Keycloak: " + response.getStatus() + " - " + body);
            }

            String path = response.getLocation().getPath();
            String userId = path.substring(path.lastIndexOf('/') + 1);

            setUserPassword(realmResource, userId, userDTO.getPassword());

            log.info("Created user '{}' in realm '{}' with ID: {}", userDTO.getUsername(), realm, userId);
            return userId;
        }
    }

    /**
     * Assigns a realm-level role to a user.
     */
    public void assignRole(String userId, String roleName) {
        String realm = TenantContext.getRequiredTenantId();
        assignRoleInRealm(realm, userId, roleName);
    }

    public void assignRoleInRealm(String realm, String userId, String roleName) {
        RealmResource realmResource = keycloakAdmin.realm(realm);
        RoleRepresentation role = realmResource.roles().get(roleName).toRepresentation();
        realmResource.users().get(userId)
                .roles()
                .realmLevel()
                .add(Collections.singletonList(role));
        log.info("Assigned role '{}' to user '{}' in realm '{}'", roleName, userId, realm);
    }

    /**
     * Assigns a client-level permission to a user.
     */
    public void assignClientRole(String userId, String clientRoleName) {
        String realm = TenantContext.getRequiredTenantId();
        RealmResource realmResource = keycloakAdmin.realm(realm);

        // Find the backend client's internal ID
        String clientUuid = realmResource.clients().findByClientId(BACKEND_CLIENT_ID)
                .stream().findFirst()
                .orElseThrow(() -> new RuntimeException("Client '" + BACKEND_CLIENT_ID + "' not found in realm '" + realm + "'"))
                .getId();

        RoleRepresentation clientRole = realmResource.clients().get(clientUuid)
                .roles().get(clientRoleName).toRepresentation();

        realmResource.users().get(userId)
                .roles()
                .clientLevel(clientUuid)
                .add(Collections.singletonList(clientRole));

        log.info("Assigned client role '{}' to user '{}' in realm '{}'", clientRoleName, userId, realm);
    }

    public void enableUser(String userId) {
        setUserEnabled(TenantContext.getRequiredTenantId(), userId, true);
    }

    public void disableUser(String userId) {
        setUserEnabled(TenantContext.getRequiredTenantId(), userId, false);
    }

    // ======================== PRIVATE HELPERS ========================

    private void createDefaultRoles(String realm) {
        RealmResource realmResource = keycloakAdmin.realm(realm);
        for (String roleName : DEFAULT_REALM_ROLES) {
            try {
                RoleRepresentation role = new RoleRepresentation();
                role.setName(roleName);
                role.setDescription("Healthcare role: " + roleName);
                realmResource.roles().create(role);
                log.info("Created realm role '{}' in realm '{}'", roleName, realm);
            } catch (Exception e) {
                log.debug("Role '{}' may already exist in realm '{}': {}", roleName, realm, e.getMessage());
            }
        }
    }

    private void createBackendClient(String realm, String clientSecret) {
        ClientRepresentation client = new ClientRepresentation();
        client.setClientId(BACKEND_CLIENT_ID);
        client.setName("Platform Backend Services");
        client.setEnabled(true);
        client.setPublicClient(false);
        client.setServiceAccountsEnabled(true);
        client.setDirectAccessGrantsEnabled(true);
        client.setStandardFlowEnabled(false);
        client.setSecret(clientSecret);
        client.setRedirectUris(List.of("*"));
        client.setWebOrigins(List.of("*"));
        client.setProtocol("openid-connect");
        client.setFullScopeAllowed(true);

        try (Response response = keycloakAdmin.realm(realm).clients().create(client)) {
            if (response.getStatus() == 201) {
                log.info("Created backend client in realm '{}'", realm);
            } else {
                log.warn("Backend client creation returned status {} for realm '{}'", response.getStatus(), realm);
            }
        }
    }

    private void createFrontendClient(String realm) {
        ClientRepresentation client = new ClientRepresentation();
        client.setClientId(FRONTEND_CLIENT_ID);
        client.setName("Platform Frontend Application");
        client.setEnabled(true);
        client.setPublicClient(true);
        client.setDirectAccessGrantsEnabled(true);
        client.setStandardFlowEnabled(true);
        client.setRedirectUris(List.of("http://localhost:3000/*", "http://localhost:4200/*"));
        client.setWebOrigins(List.of("http://localhost:3000", "http://localhost:4200"));
        client.setProtocol("openid-connect");
        client.setFullScopeAllowed(true);

        try (Response response = keycloakAdmin.realm(realm).clients().create(client)) {
            if (response.getStatus() == 201) {
                log.info("Created frontend client in realm '{}'", realm);
            } else {
                log.warn("Frontend client creation returned status {} for realm '{}'", response.getStatus(), realm);
            }
        }
    }

    private void createClientPermissions(String realm) {
        RealmResource realmResource = keycloakAdmin.realm(realm);
        String clientUuid = realmResource.clients().findByClientId(BACKEND_CLIENT_ID)
                .stream().findFirst()
                .map(ClientRepresentation::getId)
                .orElse(null);

        if (clientUuid == null) {
            log.warn("Cannot create client permissions — backend client not found in realm '{}'", realm);
            return;
        }

        for (String permission : DEFAULT_CLIENT_PERMISSIONS) {
            try {
                RoleRepresentation role = new RoleRepresentation();
                role.setName(permission);
                role.setDescription("Permission: " + permission);
                realmResource.clients().get(clientUuid).roles().create(role);
                log.info("Created client permission '{}' in realm '{}'", permission, realm);
            } catch (Exception e) {
                log.debug("Permission '{}' may already exist in realm '{}': {}", permission, realm, e.getMessage());
            }
        }
    }

    private void setUserPassword(RealmResource realmResource, String userId, String password) {
        CredentialRepresentation cred = new CredentialRepresentation();
        cred.setTemporary(false);
        cred.setType(CredentialRepresentation.PASSWORD);
        cred.setValue(password);
        realmResource.users().get(userId).resetPassword(cred);
    }

    private void setUserEnabled(String realm, String userId, boolean enabled) {
        RealmResource realmResource = keycloakAdmin.realm(realm);
        UserResource userResource = realmResource.users().get(userId);
        UserRepresentation user = userResource.toRepresentation();
        user.setEnabled(enabled);
        userResource.update(user);
        log.info("{} user '{}' in realm '{}'", enabled ? "Enabled" : "Disabled", userId, realm);
    }
}
