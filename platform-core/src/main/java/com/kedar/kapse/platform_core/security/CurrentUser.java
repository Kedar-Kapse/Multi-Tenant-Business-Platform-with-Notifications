package com.kedar.kapse.platform_core.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.OAuth2AuthenticatedPrincipal;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * Who is calling, taken from the verified access token -- never from request
 * parameters. Use this instead of trusting ids such as ?patientId= or senderId
 * sent by the browser.
 *
 *   CurrentUser me = CurrentUser.get();
 *   me.id()       // Keycloak user id ("sub"), the id other tables store
 *   me.isPatient()
 */
public record CurrentUser(String id, String username, String name, String email, Set<String> roles) {

    /** Clinical / back-office roles: everyone who works at the hospital. */
    public static final Set<String> STAFF_ROLES = Set.of("ADMIN", "PROVIDER", "PHYSICIAN", "NURSE", "THERAPIST");

    public static CurrentUser get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || !(auth.getPrincipal() instanceof OAuth2AuthenticatedPrincipal p)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        String sub = str(p.getAttribute("sub"));
        if (sub == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token has no subject");
        }
        Set<String> roles = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5).toUpperCase())
                .collect(Collectors.toUnmodifiableSet());
        String username = str(p.getAttribute("preferred_username"));
        String name = str(p.getAttribute("name"));
        if (name == null) {
            String given = str(p.getAttribute("given_name"));
            String family = str(p.getAttribute("family_name"));
            name = (given != null || family != null)
                    ? ((given == null ? "" : given) + " " + (family == null ? "" : family)).trim()
                    : username;
        }
        return new CurrentUser(sub, username, name, str(p.getAttribute("email")), roles);
    }

    public boolean hasRole(String role) {
        return roles.contains(role.toUpperCase());
    }

    public boolean isPatient() {
        return hasRole("PATIENT") && !isStaff();
    }

    public boolean isStaff() {
        return roles.stream().anyMatch(STAFF_ROLES::contains);
    }

    public boolean isAdmin() {
        return hasRole("ADMIN");
    }

    /** The highest role, for display fields such as senderRole. */
    public String primaryRole() {
        for (String r : new String[]{"ADMIN", "PHYSICIAN", "PROVIDER", "NURSE", "THERAPIST", "PATIENT"}) {
            if (hasRole(r)) return r;
        }
        return "USER";
    }

    public static ResponseStatusException forbidden() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this record.");
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }
}
