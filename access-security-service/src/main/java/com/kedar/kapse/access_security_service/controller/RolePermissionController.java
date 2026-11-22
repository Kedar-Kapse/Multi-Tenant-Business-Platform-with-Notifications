package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.service.AuditService;
import com.kedar.kapse.platform_core.enums.AuditAction;
import com.kedar.kapse.platform_core.enums.AuditEntityType;
import com.kedar.kapse.platform_core.enums.KeycloakRole;
import com.kedar.kapse.platform_core.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.RolesResource;
import org.keycloak.representations.idm.RoleRepresentation;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Roles of the caller's hospital (Keycloak realm) and their permission grid.
 * ADMIN only. The grid is stored on the role itself (attributes "perm.<Module>")
 * so it survives restarts and is the same for every admin.
 */
@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@Slf4j
public class RolePermissionController {

    private final Keycloak keycloakAdmin;
    private final AuditService auditService;

    @GetMapping
    public List<Map<String, Object>> getRoles() {
        String realm = TenantContext.getRequiredTenantId();

        RealmResource realmResource = keycloakAdmin.realm(realm);
        RolesResource rolesResource = realmResource.roles();

        List<RoleRepresentation> allRoles = rolesResource.list(false); // full form: includes saved permission attributes

        // Filter out default Keycloak roles
        Set<String> systemRoles = Set.of("offline_access", "uma_authorization", "default-roles-" + realm);

        return allRoles.stream()
                .filter(r -> !systemRoles.contains(r.getName()))
                .map(r -> {
                    Map<String, Object> roleMap = new LinkedHashMap<>();
                    roleMap.put("id", r.getId());
                    roleMap.put("name", r.getName());
                    roleMap.put("description", r.getDescription() != null ? r.getDescription() : "");
                    roleMap.put("composite", r.isComposite());

                    // 1. Permissions saved from the Permissions page (role attributes)
                    Map<String, List<String>> permissions = storedPermissions(r);
                    roleMap.put("builtIn", BUILT_IN.contains(r.getName().toUpperCase()));
                    if (permissions.isEmpty()) try {
                        if (r.isComposite()) {
                            Set<RoleRepresentation> composites = rolesResource.get(r.getName()).getRoleComposites();
                            for (RoleRepresentation comp : composites) {
                                String module = mapPermissionToModule(comp.getName());
                                String action = mapPermissionToAction(comp.getName());
                                permissions.computeIfAbsent(module, k -> new ArrayList<>()).add(action);
                            }
                        }
                    } catch (Exception e) {
                        log.debug("Could not fetch composites for role '{}': {}", r.getName(), e.getMessage());
                    }

                    // Default permissions based on role name
                    if (permissions.isEmpty()) {
                        permissions = getDefaultPermissions(r.getName());
                    }

                    roleMap.put("permissions", permissions);
                    return roleMap;
                })
                .collect(Collectors.toList());
    }

    @PostMapping
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public Map<String, Object> createRole(@RequestBody Map<String, String> body) {
        String realm = TenantContext.getRequiredTenantId();

        String name = body.get("name") == null ? "" : body.get("name").trim().toUpperCase().replace(' ', '_');
        if (!name.matches("^[A-Z][A-Z0-9_]{1,39}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Role name must be 2-40 letters, digits or underscores, starting with a letter");
        }
        if (name.startsWith("DEFAULT-ROLES") || name.equals("SUPER-ADMIN") || name.equals("SUPER_ADMIN")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That role name is reserved");
        }
        String description = body.getOrDefault("description", "");
        if (keycloakAdmin.realm(realm).roles().list().stream().anyMatch(r -> r.getName().equalsIgnoreCase(name))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role '" + name + "' already exists");
        }

        RoleRepresentation role = new RoleRepresentation();
        role.setName(name);
        role.setDescription(description);

        keycloakAdmin.realm(realm).roles().create(role);
        log.info("Created role '{}' in realm '{}'", name, realm);
        auditService.recordByCurrentUser(AuditEntityType.ROLE, name, AuditAction.ROLE_CREATED, description);

        RoleRepresentation created = keycloakAdmin.realm(realm).roles().get(name).toRepresentation();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", created.getId());
        result.put("name", created.getName());
        result.put("description", created.getDescription());
        result.put("permissions", getDefaultPermissions(name));
        return result;
    }

    @DeleteMapping("/{roleName}")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRole(@PathVariable String roleName) {
        String realm = TenantContext.getRequiredTenantId();
        if (BUILT_IN.contains(roleName.toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Built-in role '" + roleName + "' cannot be deleted");
        }

        keycloakAdmin.realm(realm).roles().deleteRole(roleName);
        log.info("Deleted role '{}' from realm '{}'", roleName, realm);
        auditService.recordByCurrentUser(AuditEntityType.ROLE, roleName, AuditAction.ROLE_DELETED, null);
    }

    /** Save a role's permission grid, e.g. {"EHR": ["view","edit"], "Staff": ["view"]}. */
    @PutMapping("/{roleName}/permissions")
    public Map<String, Object> updatePermissions(@PathVariable String roleName,
                                                 @RequestBody Map<String, List<String>> grid) {
        String realm = TenantContext.getRequiredTenantId();
        var roleResource = keycloakAdmin.realm(realm).roles().get(roleName);
        RoleRepresentation role;
        try {
            role = roleResource.toRepresentation();
        } catch (jakarta.ws.rs.NotFoundException e) {
            throw new jakarta.persistence.EntityNotFoundException("Role not found");
        }
        Map<String, List<String>> attrs = new HashMap<>(role.getAttributes() != null ? role.getAttributes() : Map.of());
        attrs.keySet().removeIf(k -> k.startsWith(PERM_PREFIX));
        grid.forEach((module, actions) -> {
            if (module == null || !module.matches("^[A-Za-z][A-Za-z ]{0,30}$")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid module " + module);
            }
            List<String> clean = actions == null ? List.of() : actions.stream()
                    .map(String::toLowerCase).filter(ACTIONS::contains).distinct().toList();
            attrs.put(PERM_PREFIX + module, clean.isEmpty() ? List.of("") : clean);
        });
        role.setAttributes(attrs);
        roleResource.update(role);
        log.info("Updated permissions of role '{}' in realm '{}'", roleName, realm);
        auditService.recordByCurrentUser(AuditEntityType.ROLE, roleName, AuditAction.ROLE_PERMISSIONS_UPDATED, grid.toString());
        return Map.of("name", roleName, "permissions", storedPermissions(roleResource.toRepresentation()));
    }

    private static final String PERM_PREFIX = "perm.";
    private static final Set<String> ACTIONS = Set.of("view", "create", "edit", "delete", "export");
    private static final Set<String> BUILT_IN = Arrays.stream(KeycloakRole.values()).map(Enum::name).collect(Collectors.toSet());

    private static Map<String, List<String>> storedPermissions(RoleRepresentation r) {
        Map<String, List<String>> out = new LinkedHashMap<>();
        if (r.getAttributes() == null) return out;
        r.getAttributes().forEach((k, v) -> {
            if (k.startsWith(PERM_PREFIX)) {
                out.put(k.substring(PERM_PREFIX.length()), v.stream().filter(a -> !a.isBlank()).toList());
            }
        });
        return out;
    }

    @GetMapping("/permissions")
    public List<String> getPermissions() {
        return List.of(
            "READ_PATIENT", "CREATE_PATIENT", "UPDATE_PATIENT", "DELETE_PATIENT",
            "MANAGE_STAFF", "MANAGE_FACILITY", "VIEW_REPORTS", "MANAGE_PHARMACY"
        );
    }

    private String mapPermissionToModule(String permission) {
        if (permission == null) return "General";
        String p = permission.toUpperCase();
        if (p.contains("PATIENT")) return "EHR";
        if (p.contains("STAFF")) return "Staff";
        if (p.contains("FACILITY")) return "Inventory";
        if (p.contains("PHARMACY")) return "Inventory";
        if (p.contains("REPORT")) return "Dashboard";
        return "General";
    }

    private String mapPermissionToAction(String permission) {
        if (permission == null) return "view";
        String p = permission.toUpperCase();
        if (p.startsWith("READ") || p.startsWith("VIEW")) return "view";
        if (p.startsWith("CREATE")) return "create";
        if (p.startsWith("UPDATE") || p.startsWith("MANAGE")) return "edit";
        if (p.startsWith("DELETE")) return "delete";
        return "view";
    }

    private Map<String, List<String>> getDefaultPermissions(String roleName) {
        Map<String, List<String>> perms = new LinkedHashMap<>();
        KeycloakRole role;
        try {
            role = KeycloakRole.valueOf(roleName.toUpperCase());
        } catch (IllegalArgumentException e) {
            perms.put("Dashboard", List.of("view"));
            return perms;
        }
        switch (role) {
            case ADMIN:
                perms.put("Dashboard", List.of("view", "export"));
                perms.put("Staff", List.of("view", "create", "edit", "delete"));
                perms.put("Tenants", List.of("view", "create", "edit", "delete"));
                perms.put("EHR", List.of("view", "create", "edit", "delete"));
                perms.put("Inventory", List.of("view", "create", "edit", "delete"));
                perms.put("Claims", List.of("view", "create", "edit", "delete", "export"));
                perms.put("Fee Schedule", List.of("view", "create", "edit", "delete"));
                perms.put("Audit Logs", List.of("view", "export"));
                perms.put("Permissions", List.of("view", "create", "edit", "delete"));
                break;
            case PHYSICIAN:
                perms.put("Dashboard", List.of("view"));
                perms.put("Staff", List.of("view"));
                perms.put("EHR", List.of("view", "create", "edit"));
                perms.put("Inventory", List.of("view"));
                perms.put("Claims", List.of("view"));
                break;
            case THERAPIST:
                perms.put("Dashboard", List.of("view"));
                perms.put("EHR", List.of("view", "create", "edit"));
                perms.put("Inventory", List.of("view"));
                break;
            case NURSE:
                perms.put("Dashboard", List.of("view"));
                perms.put("EHR", List.of("view", "create", "edit"));
                perms.put("Inventory", List.of("view"));
                break;
            case PATIENT:
                perms.put("Dashboard", List.of("view"));
                perms.put("EHR", List.of("view"));
                break;
            case PROVIDER:
                perms.put("Dashboard", List.of("view"));
                perms.put("Staff", List.of("view", "create", "edit"));
                perms.put("EHR", List.of("view", "create", "edit"));
                perms.put("Inventory", List.of("view", "edit"));
                perms.put("Claims", List.of("view", "create"));
                break;
        }
        return perms;
    }
}
