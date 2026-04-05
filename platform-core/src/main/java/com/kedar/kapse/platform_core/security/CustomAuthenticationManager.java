package com.kedar.kapse.platform_core.security;

import com.nimbusds.jwt.JWTClaimsSet;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthentication;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthenticationToken;
import org.springframework.security.oauth2.server.resource.introspection.OAuth2IntrospectionAuthenticatedPrincipal;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.text.ParseException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Custom AuthenticationManager for opaque token flow.
 *
 * Wired into the SecurityFilterChain via:
 *   .oauth2ResourceServer(oauth2 -> oauth2
 *       .opaqueToken(opaque -> opaque
 *           .authenticationManager(new CustomAuthenticationManager(baseUrl))))
 *
 * FLOW:
 *   1. Spring Security extracts the Bearer token from the Authorization header
 *   2. This manager receives a BearerTokenAuthenticationToken
 *   3. We call ValidateToken.isAuthorize(token) for manual Nimbus validation
 *   4. If valid, parse the JWT claims and build an authenticated principal
 *   5. Return authentication with setAuthenticated(true)
 */
public class CustomAuthenticationManager implements AuthenticationManager {

    private static final Logger log = LoggerFactory.getLogger(CustomAuthenticationManager.class);

    private final ValidateToken validateToken;

    public CustomAuthenticationManager(String keycloakBaseUrl) {
        this.validateToken = new ValidateToken(keycloakBaseUrl);
    }

    public CustomAuthenticationManager(ValidateToken validateToken) {
        this.validateToken = validateToken;
    }

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String token;
        if (authentication instanceof BearerTokenAuthenticationToken bearerToken) {
            token = bearerToken.getToken();
        } else {
            token = extractTokenFromRequest();
        }

        if (token == null || token.isBlank()) {
            throw new BadCredentialsException("No Bearer token found in request");
        }

        // Validate the token using manual Nimbus-based validator
        JWTClaimsSet claims = validateToken.parseAndValidate(token);
        if (claims == null) {
            throw new BadCredentialsException("Token validation failed — invalid signature, expired, or realm mismatch");
        }

        // Extract authorities (realm roles + client roles) from the JWT claims
        Collection<GrantedAuthority> authorities = extractAuthorities(claims);

        // Build the authenticated principal
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", claims.getSubject());
        attributes.put("iss", claims.getIssuer());
        attributes.put("preferred_username", claims.getClaim("preferred_username"));
        attributes.put("email", claims.getClaim("email"));
        attributes.put("realm_access", claims.getClaim("realm_access"));
        attributes.put("resource_access", claims.getClaim("resource_access"));
        attributes.put("azp", claims.getClaim("azp"));
        attributes.put("scope", claims.getClaim("scope"));

        Object lastFacility = claims.getClaim("lastLoggedInFacility");
        if (lastFacility != null) {
            attributes.put("lastLoggedInFacility", lastFacility);
        }

        OAuth2IntrospectionAuthenticatedPrincipal principal =
                new OAuth2IntrospectionAuthenticatedPrincipal(
                        getUsername(claims), attributes, authorities);

        Instant issuedAt = claims.getIssueTime() != null ? claims.getIssueTime().toInstant() : Instant.now();
        Instant expiresAt = claims.getExpirationTime() != null ? claims.getExpirationTime().toInstant() : null;

        OAuth2AccessToken accessToken = new OAuth2AccessToken(
                OAuth2AccessToken.TokenType.BEARER, token, issuedAt, expiresAt);

        BearerTokenAuthentication authenticatedToken =
                new BearerTokenAuthentication(principal, accessToken, authorities);
        authenticatedToken.setAuthenticated(true);

        log.debug("Authenticated user '{}' with {} authorities in realm '{}'",
                getUsername(claims), authorities.size(), TenantContextHolder.getTenant());

        return authenticatedToken;
    }

    public ValidateToken getValidateToken() {
        return validateToken;
    }

    @SuppressWarnings("unchecked")
    private Collection<GrantedAuthority> extractAuthorities(JWTClaimsSet claims) {
        Set<GrantedAuthority> authorities = new HashSet<>();

        try {
            Map<String, Object> realmAccess = claims.getJSONObjectClaim("realm_access");
            if (realmAccess != null && realmAccess.containsKey("roles")) {
                List<String> realmRoles = (List<String>) realmAccess.get("roles");
                realmRoles.stream()
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                        .forEach(authorities::add);
            }

            Map<String, Object> resourceAccess = claims.getJSONObjectClaim("resource_access");
            if (resourceAccess != null) {
                for (Map.Entry<String, Object> entry : resourceAccess.entrySet()) {
                    Map<String, Object> clientData = (Map<String, Object>) entry.getValue();
                    if (clientData.containsKey("roles")) {
                        List<String> clientRoles = (List<String>) clientData.get("roles");
                        clientRoles.stream()
                                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                                .forEach(authorities::add);
                    }
                }
            }

            String scope = claims.getStringClaim("scope");
            if (scope != null) {
                Arrays.stream(scope.split("\\s+"))
                        .map(s -> new SimpleGrantedAuthority("SCOPE_" + s))
                        .forEach(authorities::add);
            }
        } catch (ParseException e) {
            log.warn("Error extracting authorities from JWT claims: {}", e.getMessage());
        }

        return authorities;
    }

    private String getUsername(JWTClaimsSet claims) {
        try {
            String username = claims.getStringClaim("preferred_username");
            return username != null ? username : claims.getSubject();
        } catch (ParseException e) {
            return claims.getSubject();
        }
    }

    private String extractTokenFromRequest() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;

            HttpServletRequest request = attrs.getRequest();
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                return authHeader.substring(7);
            }
        } catch (Exception e) {
            log.debug("Could not extract token from request: {}", e.getMessage());
        }
        return null;
    }
}
