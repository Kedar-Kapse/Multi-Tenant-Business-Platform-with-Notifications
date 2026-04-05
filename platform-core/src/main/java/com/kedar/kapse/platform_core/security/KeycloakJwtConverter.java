package com.kedar.kapse.platform_core.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import org.springframework.lang.NonNull;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Extracts roles and permissions from Keycloak JWT tokens.
 *
 * Keycloak stores roles in two JWT claims:
 *
 * 1. REALM ROLES (realm_access.roles):
 *    Global roles: ADMIN, PROVIDER, THERAPIST, PHYSICIAN, NURSE, PATIENT
 *    Mapped to Spring authority: ROLE_ADMIN, ROLE_PROVIDER, etc.
 *
 * 2. CLIENT ROLES (resource_access.platform-backend.roles):
 *    Permissions: READ_PATIENT, UPDATE_PATIENT, MANAGE_STAFF, etc.
 *    Mapped to Spring authority: ROLE_READ_PATIENT, ROLE_UPDATE_PATIENT, etc.
 *
 * MULTI-TENANT NOTE:
 * The JWT's "iss" (issuer) claim contains the tenant's realm:
 *   http://keycloak:8080/realms/hospital-a
 * The realm name IS the tenant identifier.
 */
public class KeycloakJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(@NonNull Jwt jwt) {
        Collection<GrantedAuthority> authorities = Stream.concat(
                extractRealmRoles(jwt).stream(),
                extractClientRoles(jwt).stream()
        ).collect(Collectors.toSet());

        // Set tenant context from the JWT issuer if not already set by TenantFilter
        String issuer = jwt.getClaimAsString("iss");
        if (issuer != null && TenantContext.getTenantId() == null) {
            int realmsIndex = issuer.indexOf("/realms/");
            if (realmsIndex >= 0) {
                TenantContext.setTenantId(issuer.substring(realmsIndex + 8));
            }
        }

        return new JwtAuthenticationToken(jwt, authorities, jwt.getClaimAsString("preferred_username"));
    }

    private Collection<GrantedAuthority> extractRealmRoles(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null || !realmAccess.containsKey("roles")) {
            return Collections.emptyList();
        }

        @SuppressWarnings("unchecked")
        Collection<String> roles = (Collection<String>) realmAccess.get("roles");

        return roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                .collect(Collectors.toList());
    }

    private Collection<GrantedAuthority> extractClientRoles(Jwt jwt) {
        Map<String, Object> resourceAccess = jwt.getClaimAsMap("resource_access");
        if (resourceAccess == null) {
            return Collections.emptyList();
        }

        return resourceAccess.entrySet().stream()
                .flatMap(entry -> {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> clientData = (Map<String, Object>) entry.getValue();
                    @SuppressWarnings("unchecked")
                    Collection<String> roles = (Collection<String>) clientData.getOrDefault("roles", Collections.emptyList());
                    return roles.stream()
                            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
                })
                .collect(Collectors.toList());
    }
}
