package com.kedar.kapse.platform_core.security;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticatedPrincipal;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/**
 * Custom AuthorizationManager with multi-portal decision logic.
 *
 * DECISION FLOW (in order):
 *
 *   1. SERVICE ACCOUNT BYPASS:
 *      If the JWT's "azp" (client_id) is "smart_link_client" or "pcc_client",
 *      allow access when no specific permission is required.
 *
 *   2. S2S SECURITY (Service-to-Service):
 *      If X-CODE-CHALLENGE and X-CODE-VERIFIER headers are present,
 *      verify using SHA-256 challenge/verifier (ServiceAuthentication).
 *
 *   3. SUPER ADMIN BYPASS:
 *      If the user has the "super-admin" role, automatically allow access.
 *
 *   4. PORTAL SPLIT:
 *      a) Enterprise Portal (URI contains "/v2/admins"):
 *         Fetch realm roles -> validate against EnterpriseEligibleRole.
 *      b) Provider Portal (all other URIs):
 *         Fetch roles from the user's lastLoggedInFacility attribute
 *         via the Keycloak Admin API (IamRestApiProvider).
 */
@Component
public class CustomAccess implements AuthorizationManager<RequestAuthorizationContext> {

    private static final Logger log = LoggerFactory.getLogger(CustomAccess.class);

    private static final Set<String> SERVICE_ACCOUNT_CLIENTS = Set.of(
            "smart_link_client", "pcc_client"
    );
    private static final String SUPER_ADMIN_ROLE = "ROLE_SUPER-ADMIN";

    private final IamRestApiProvider iamProvider;

    public CustomAccess(IamRestApiProvider iamProvider) {
        this.iamProvider = iamProvider;
    }

    @Override
    public AuthorizationDecision check(Supplier<Authentication> authenticationSupplier,
                                       RequestAuthorizationContext context) {
        HttpServletRequest request = context.getRequest();
        Authentication authentication = authenticationSupplier.get();

        if (authentication == null || !authentication.isAuthenticated()) {
            log.debug("Access denied: not authenticated");
            return new AuthorizationDecision(false);
        }

        // 1. SERVICE ACCOUNT BYPASS
        String clientId = extractClientId(authentication);
        if (clientId != null && SERVICE_ACCOUNT_CLIENTS.contains(clientId)) {
            log.debug("Access granted: service account client '{}'", clientId);
            return new AuthorizationDecision(true);
        }

        // 2. S2S SECURITY (Code Challenge)
        String codeChallenge = request.getHeader(ServiceAuthentication.CODE_CHALLENGE_HEADER);
        String codeVerifier = request.getHeader(ServiceAuthentication.CODE_VERIFIER_HEADER);

        if (codeChallenge != null && codeVerifier != null) {
            if (ServiceAuthentication.verify(codeChallenge, codeVerifier)) {
                log.debug("Access granted: valid S2S code challenge/verifier");
                return new AuthorizationDecision(true);
            } else {
                log.warn("Access denied: invalid S2S code challenge/verifier");
                return new AuthorizationDecision(false);
            }
        }

        // 3. SUPER ADMIN BYPASS
        if (hasRole(authentication, SUPER_ADMIN_ROLE)) {
            log.debug("Access granted: user has super-admin role");
            return new AuthorizationDecision(true);
        }

        // 4. PORTAL SPLIT
        String uri = request.getRequestURI();

        if (uri.contains("/v2/admins")) {
            return checkEnterpriseAccess(authentication);
        } else {
            return checkProviderAccess(authentication);
        }
    }

    private AuthorizationDecision checkEnterpriseAccess(Authentication authentication) {
        Set<String> userRoles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(a -> a.startsWith("ROLE_") ? a.substring(5) : a)
                .collect(Collectors.toSet());

        boolean hasEligibleRole = userRoles.stream()
                .anyMatch(EnterpriseEligibleRole::isEligible);

        if (hasEligibleRole) {
            log.debug("Enterprise Portal access granted: user has eligible role from {}",
                    userRoles.stream().filter(EnterpriseEligibleRole::isEligible).toList());
            return new AuthorizationDecision(true);
        }

        log.debug("Enterprise Portal access denied: no eligible roles (user has: {})", userRoles);
        return new AuthorizationDecision(false);
    }

    private AuthorizationDecision checkProviderAccess(Authentication authentication) {
        String userId = extractUserId(authentication);
        if (userId == null) {
            log.warn("Provider Portal access denied: cannot extract user ID");
            return new AuthorizationDecision(false);
        }

        String facilityId = extractLastLoggedInFacility(authentication);

        if (facilityId == null || facilityId.isBlank()) {
            facilityId = iamProvider.getUserAttribute(userId, "lastLoggedInFacility");
        }

        if (facilityId == null || facilityId.isBlank()) {
            log.debug("Provider Portal: no lastLoggedInFacility, falling back to JWT roles");
            return new AuthorizationDecision(authentication.isAuthenticated()
                    && !authentication.getAuthorities().isEmpty());
        }

        List<String> facilityRoles = iamProvider.getRolesForFacility(userId, facilityId);

        if (facilityRoles.isEmpty()) {
            log.debug("Provider Portal access denied: no roles for facility '{}'", facilityId);
            return new AuthorizationDecision(false);
        }

        log.debug("Provider Portal access granted: user '{}' has roles {} for facility '{}'",
                userId, facilityRoles, facilityId);
        return new AuthorizationDecision(true);
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equalsIgnoreCase(role));
    }

    private String extractClientId(Authentication authentication) {
        if (authentication.getPrincipal() instanceof OAuth2AuthenticatedPrincipal principal) {
            Object azp = principal.getAttribute("azp");
            if (azp instanceof String s) return s;
        }
        return null;
    }

    private String extractUserId(Authentication authentication) {
        if (authentication.getPrincipal() instanceof OAuth2AuthenticatedPrincipal principal) {
            Object sub = principal.getAttribute("sub");
            if (sub instanceof String s) return s;
        }
        return null;
    }

    private String extractLastLoggedInFacility(Authentication authentication) {
        if (authentication.getPrincipal() instanceof OAuth2AuthenticatedPrincipal principal) {
            Object facility = principal.getAttribute("lastLoggedInFacility");
            if (facility instanceof String s) return s;
        }
        return null;
    }
}
