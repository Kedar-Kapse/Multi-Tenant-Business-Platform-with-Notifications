package com.kedar.kapse.platform_core.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.OAuth2AuthenticatedPrincipal;
import org.springframework.stereotype.Component;

/**
 * Who is a platform admin (the owner of the whole platform, above every hospital)?
 *
 * Two things must BOTH be true:
 *   1. the user has the "super-admin" role, and
 *   2. the token was issued by the platform realm (default "platform").
 *
 * The role alone is not enough: a hospital admin can create roles inside their
 * own hospital's realm, so "super-admin" in hospital-a means nothing. Only the
 * platform realm -- which no hospital admin can touch -- can make a platform admin.
 *
 * Use in controllers:  @PreAuthorize("@platformAccess.isPlatformAdmin(authentication)")
 */
@Component("platformAccess")
public class PlatformAccess {

    public static final String SUPER_ADMIN_AUTHORITY = "ROLE_SUPER-ADMIN";

    private final String platformRealm;

    public PlatformAccess(@Value("${platform.realm:platform}") String platformRealm) {
        this.platformRealm = platformRealm;
    }

    public String getPlatformRealm() {
        return platformRealm;
    }

    /** Realm names hospitals may not use: Keycloak's own admin realm and ours. */
    public boolean isReservedRealm(String realmName) {
        return realmName == null
                || realmName.equalsIgnoreCase("master")
                || realmName.equalsIgnoreCase(platformRealm);
    }

    public boolean isPlatformAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        boolean hasRole = authentication.getAuthorities().stream()
                .anyMatch(a -> SUPER_ADMIN_AUTHORITY.equalsIgnoreCase(a.getAuthority()));
        return hasRole && platformRealm.equals(issuerRealm(authentication));
    }

    /** "https://auth.example.com/realms/platform" -> "platform" (null if unknown). */
    private static String issuerRealm(Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof OAuth2AuthenticatedPrincipal principal)) {
            return null;
        }
        Object iss = principal.getAttribute("iss");
        if (iss == null) {
            return null;
        }
        String issuer = iss.toString();
        int i = issuer.lastIndexOf("/realms/");
        return i < 0 ? null : issuer.substring(i + "/realms/".length());
    }
}
