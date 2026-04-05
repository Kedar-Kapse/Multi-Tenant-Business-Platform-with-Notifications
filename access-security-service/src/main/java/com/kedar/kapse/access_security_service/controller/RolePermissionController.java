package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.service.KeycloakService;
import com.kedar.kapse.platform_core.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.RolesResource;
import org.keycloak.representations.idm.RoleRepresentation;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@Slf4j
public class RolePermissionController {

    private final Keycloak keycloakAdmin;

    @GetMapping
    public List<Map<String, Object>> getRoles() {
        String realm = TenantContext.getTenantId();
        if (realm == null) realm = "test";

        RealmResource realmResource = keycloakAdmin.realm(realm);
        RolesResource rolesResource = realmResource.roles();

        List<RoleRepresentation> allRoles = rolesResource.list();

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

                    // Get composites (permissions) for this role
                    Map<String, List<String>> permissions = new LinkedHashMap<>();
                    try {
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
    public Map<String, Object> createRole(@RequestBody Map<String, String> body) {
        String realm = TenantContext.getTenantId();
        if (realm == null) realm = "test";

        String name = body.get("name");
        String description = body.getOrDefault("description", "");

        RoleRepresentation role = new RoleRepresentation();
        role.setName(name);
        role.setDescription(description);

        keycloakAdmin.realm(realm).roles().create(role);
        log.info("Created role '{}' in realm '{}'", name, realm);

        RoleRepresentation created = keycloakAdmin.realm(realm).roles().get(name).toRepresentation();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", created.getId());
        result.put("name", created.getName());
        result.put("description", created.getDescription());
        result.put("permissions", getDefaultPermissions(name));
        return result;
    }

    @DeleteMapping("/{roleName}")
    public void deleteRole(@PathVariable String roleName) {
        String realm = TenantContext.getTenantId();
        if (realm == null) realm = "test";

        keycloakAdmin.realm(realm).roles().deleteRole(roleName);
        log.info("Deleted role '{}' from realm '{}'", roleName, realm);
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
        switch (roleName.toUpperCase()) {
            case "ADMIN":
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
            case "PHYSICIAN":
                perms.put("Dashboard", List.of("view"));
                perms.put("Staff", List.of("view"));
                perms.put("EHR", List.of("view", "create", "edit"));
                perms.put("Inventory", List.of("view"));
                perms.put("Claims", List.of("view"));
                break;
            case "THERAPIST":
                perms.put("Dashboard", List.of("view"));
                perms.put("EHR", List.of("view", "create", "edit"));
                perms.put("Inventory", List.of("view"));
                break;
            case "NURSE":
                perms.put("Dashboard", List.of("view"));
                perms.put("EHR", List.of("view", "create", "edit"));
                perms.put("Inventory", List.of("view"));
                break;
            case "PATIENT":
                perms.put("Dashboard", List.of("view"));
                perms.put("EHR", List.of("view"));
                break;
            case "PROVIDER":
                perms.put("Dashboard", List.of("view"));
                perms.put("Staff", List.of("view", "create", "edit"));
                perms.put("EHR", List.of("view", "create", "edit"));
                perms.put("Inventory", List.of("view", "edit"));
                perms.put("Claims", List.of("view", "create"));
                break;
            default:
                perms.put("Dashboard", List.of("view"));
                break;
        }
        return perms;
    }
}
