package com.kedar.kapse.platform_core.security;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * AOP Aspect that intercepts @IsAuthorize annotations for method-level security.
 *
 * FLOW:
 *   1. Extract the current authenticated user from SecurityContext
 *   2. Platform admin (see PlatformAccess) -> bypass
 *   3. If a specific role is specified, search composites for that role
 *   4. Otherwise, iterate all user roles and search composites for each
 *   5. Check if the required permission exists in any composite set
 *   6. Throw AccessDeniedException if the permission is not found
 */
@Aspect
@Component
public class IsAuthorizeAspect {

    private static final Logger log = LoggerFactory.getLogger(IsAuthorizeAspect.class);

    private final IamRestApiProvider iamProvider;
    private final PlatformAccess platformAccess;

    public IsAuthorizeAspect(IamRestApiProvider iamProvider, PlatformAccess platformAccess) {
        this.iamProvider = iamProvider;
        this.platformAccess = platformAccess;
    }

    @Before("@annotation(com.kedar.kapse.platform_core.security.IsAuthorize)")
    public void checkAuthorization(JoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        IsAuthorize annotation = method.getAnnotation(IsAuthorize.class);

        if (annotation == null) return;

        String requiredPermission = annotation.permission();
        String requiredRole = annotation.role();

        if (requiredPermission.isBlank()) return;

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Not authenticated");
        }

        // PLATFORM ADMIN BYPASS -- "super-admin" only counts from the platform realm
        if (platformAccess.isPlatformAdmin(authentication)) {
            log.debug("@IsAuthorize bypass: platform admin (method: {}.{})",
                    joinPoint.getTarget().getClass().getSimpleName(), method.getName());
            return;
        }

        // PERMISSION CHECK VIA KEYCLOAK ADMIN API
        Set<String> userRoles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5))
                .collect(Collectors.toSet());

        Set<String> allPermissions = new HashSet<>();

        if (!requiredRole.isBlank()) {
            if (userRoles.contains(requiredRole.toUpperCase())) {
                allPermissions.addAll(iamProvider.searchPermissionByRoleName(requiredRole));
            }
        } else {
            for (String role : userRoles) {
                allPermissions.addAll(iamProvider.searchPermissionByRoleName(role));
            }
        }

        allPermissions.addAll(userRoles);

        if (allPermissions.contains(requiredPermission) ||
                allPermissions.contains(requiredPermission.toUpperCase())) {
            log.debug("@IsAuthorize granted: permission '{}' found (method: {}.{})",
                    requiredPermission, joinPoint.getTarget().getClass().getSimpleName(), method.getName());
            return;
        }

        log.warn("@IsAuthorize denied: permission '{}' not found for user roles {} (method: {}.{})",
                requiredPermission, userRoles,
                joinPoint.getTarget().getClass().getSimpleName(), method.getName());

        throw new AccessDeniedException(
                "Access denied: missing permission '" + requiredPermission
                        + "' (required by @IsAuthorize on " + method.getName() + ")");
    }
}
