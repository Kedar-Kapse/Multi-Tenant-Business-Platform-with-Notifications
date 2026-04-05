package com.kedar.kapse.platform_core.security;

import org.keycloak.OAuth2Constants;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.RolesResource;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Dynamic Keycloak Admin REST API provider.
 *
 * Generates and caches per-realm Keycloak Admin clients. Supports:
 *   - Token exchange (urn:ietf:params:oauth:grant-type:token-exchange)
 *   - Role composite search (permissions with attribute 'permission'=true)
 *   - User attribute retrieval (e.g., lastLoggedInFacility)
 *   - Realm-level and client-level role management
 *
 * Used by:
 *   - CustomAccess: to fetch user roles and permissions per portal type
 *   - IsAuthorizeAspect: to verify role composites via Keycloak Admin API
 */
@Component
public class IamRestApiProvider {

    private static final Logger log = LoggerFactory.getLogger(IamRestApiProvider.class);

    private final String keycloakBaseUrl;
    private final String adminUsername;
    private final String adminPassword;
    private final String adminClientId;

    private final ConcurrentHashMap<String, Keycloak> realmClients = new ConcurrentHashMap<>();

    public IamRestApiProvider(
            @Value("${keycloak.base-url:http://localhost:8080}") String keycloakBaseUrl,
            @Value("${keycloak.admin.username:admin}") String adminUsername,
            @Value("${keycloak.admin.password:admin}") String adminPassword,
            @Value("${keycloak.admin.client-id:admin-cli}") String adminClientId) {
        this.keycloakBaseUrl = keycloakBaseUrl.endsWith("/")
                ? keycloakBaseUrl.substring(0, keycloakBaseUrl.length() - 1)
                : keycloakBaseUrl;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
        this.adminClientId = adminClientId;
    }

    public Keycloak getAdminClient() {
        return realmClients.computeIfAbsent("master", realm ->
                KeycloakBuilder.builder()
                        .serverUrl(keycloakBaseUrl)
                        .realm("master")
                        .grantType(OAuth2Constants.PASSWORD)
                        .clientId(adminClientId)
                        .username(adminUsername)
                        .password(adminPassword)
                        .build());
    }

    /**
     * Gets a Keycloak Admin client using token exchange for the specified realm.
     * Grant type: urn:ietf:params:oauth:grant-type:token-exchange
     */
    public Keycloak getTokenExchangeClient(String subjectToken, String targetRealm,
                                           String clientId, String clientSecret) {
        return KeycloakBuilder.builder()
                .serverUrl(keycloakBaseUrl)
                .realm(targetRealm)
                .grantType("urn:ietf:params:oauth:grant-type:token-exchange")
                .clientId(clientId)
                .clientSecret(clientSecret)
                .authorization("Bearer " + subjectToken)
                .build();
    }

    public RealmResource getRealmResource() {
        return getAdminClient().realm(TenantContextHolder.getTenant());
    }

    public RealmResource getRealmResource(String realm) {
        return getAdminClient().realm(realm);
    }

    /**
     * Searches for role composites where the attribute 'permission' is set to 'true'.
     */
    public List<String> searchPermissionByRoleName(String roleName) {
        return searchPermissionByRoleName(TenantContextHolder.getTenant(), roleName);
    }

    public List<String> searchPermissionByRoleName(String realm, String roleName) {
        try {
            RealmResource realmResource = getAdminClient().realm(realm);
            RolesResource rolesResource = realmResource.roles();

            RoleRepresentation role = rolesResource.get(roleName).toRepresentation();
            if (role == null) {
                log.warn("Role '{}' not found in realm '{}'", roleName, realm);
                return Collections.emptyList();
            }

            if (!Boolean.TRUE.equals(role.isComposite())) {
                if (isPermissionRole(role)) {
                    return List.of(role.getName());
                }
                return Collections.emptyList();
            }

            Set<RoleRepresentation> composites = rolesResource.get(roleName).getRoleComposites();

            return composites.stream()
                    .filter(this::isPermissionRole)
                    .map(RoleRepresentation::getName)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Failed to search permissions for role '{}' in realm '{}': {}",
                    roleName, realm, e.getMessage());
            return Collections.emptyList();
        }
    }

    public List<String> getUserRealmRoles(String userId) {
        return getUserRealmRoles(TenantContextHolder.getTenant(), userId);
    }

    public List<String> getUserRealmRoles(String realm, String userId) {
        try {
            return getAdminClient().realm(realm)
                    .users().get(userId)
                    .roles().realmLevel().listEffective()
                    .stream()
                    .map(RoleRepresentation::getName)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to fetch realm roles for user '{}' in realm '{}': {}", userId, realm, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Fetches a user attribute from Keycloak (e.g. lastLoggedInFacility).
     */
    public String getUserAttribute(String userId, String attributeName) {
        return getUserAttribute(TenantContextHolder.getTenant(), userId, attributeName);
    }

    public String getUserAttribute(String realm, String userId, String attributeName) {
        try {
            UserRepresentation user = getAdminClient().realm(realm)
                    .users().get(userId).toRepresentation();

            Map<String, List<String>> attributes = user.getAttributes();
            if (attributes != null && attributes.containsKey(attributeName)) {
                List<String> values = attributes.get(attributeName);
                return (values != null && !values.isEmpty()) ? values.get(0) : null;
            }
            return null;
        } catch (Exception e) {
            log.error("Failed to fetch attribute '{}' for user '{}' in realm '{}': {}",
                    attributeName, userId, realm, e.getMessage());
            return null;
        }
    }

    /**
     * Fetches roles associated with a specific facility (group) in Keycloak.
     * Used for Provider Portal: roles resolved from user's lastLoggedInFacility.
     */
    public List<String> getRolesForFacility(String userId, String facilityId) {
        return getRolesForFacility(TenantContextHolder.getTenant(), userId, facilityId);
    }

    public List<String> getRolesForFacility(String realm, String userId, String facilityId) {
        try {
            RealmResource realmResource = getAdminClient().realm(realm);

            var groups = realmResource.groups().groups(facilityId, 0, 1);
            if (groups.isEmpty()) {
                log.warn("Facility group '{}' not found in realm '{}'", facilityId, realm);
                return Collections.emptyList();
            }

            String groupId = groups.get(0).getId();

            var userGroups = realmResource.users().get(userId).groups();
            boolean isMember = userGroups.stream()
                    .anyMatch(g -> g.getId().equals(groupId));

            if (!isMember) {
                log.debug("User '{}' is not a member of facility group '{}'", userId, facilityId);
                return Collections.emptyList();
            }

            return realmResource.groups().group(groupId).roles().realmLevel().listEffective()
                    .stream()
                    .map(RoleRepresentation::getName)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Failed to fetch facility roles for user '{}', facility '{}' in realm '{}': {}",
                    userId, facilityId, realm, e.getMessage());
            return Collections.emptyList();
        }
    }

    private boolean isPermissionRole(RoleRepresentation role) {
        Map<String, List<String>> attributes = role.getAttributes();
        if (attributes == null) return false;
        List<String> permissionAttr = attributes.get("permission");
        return permissionAttr != null && permissionAttr.contains("true");
    }
}
