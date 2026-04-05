package com.kedar.kapse.platform_core.security;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Roles eligible for Enterprise Portal access.
 *
 * When a request targets an Enterprise Portal URI (contains "/v2/admins"),
 * CustomAccess validates that the user holds one of these realm-level roles.
 *
 * Provider Portal users (physicians, nurses, therapists) are handled
 * separately via lastLoggedInFacility-based role resolution.
 */
public enum EnterpriseEligibleRole {

    SUPER_ADMIN("super-admin"),
    ADMIN("ADMIN"),
    PROVIDER("PROVIDER"),
    ENTERPRISE_ADMIN("ENTERPRISE_ADMIN"),
    TENANT_ADMIN("TENANT_ADMIN"),
    BILLING_ADMIN("BILLING_ADMIN"),
    COMPLIANCE_OFFICER("COMPLIANCE_OFFICER");

    private final String roleName;

    EnterpriseEligibleRole(String roleName) {
        this.roleName = roleName;
    }

    public String getRoleName() {
        return roleName;
    }

    public static Set<String> allRoleNames() {
        return Arrays.stream(values())
                .map(EnterpriseEligibleRole::getRoleName)
                .collect(Collectors.toSet());
    }

    public static boolean isEligible(String roleName) {
        return allRoleNames().contains(roleName);
    }
}
