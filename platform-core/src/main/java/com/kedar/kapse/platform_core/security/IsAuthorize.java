package com.kedar.kapse.platform_core.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Custom method-level security annotation.
 *
 * Applied to controller or service methods to enforce permission checks
 * via the Keycloak Admin API (role composites with permission=true attribute).
 *
 * USAGE:
 *   @IsAuthorize(permission = "READ_PATIENT")
 *   public PatientDTO getPatient(@PathVariable String id) { ... }
 *
 * BYPASS:
 *   Users with the "super-admin" role automatically bypass all @IsAuthorize checks.
 *
 * PROCESSING:
 *   IsAuthorizeAspect intercepts methods annotated with @IsAuthorize and:
 *   1. Checks if the user has super-admin role -> bypass
 *   2. Calls IamRestApiProvider.searchPermissionByRoleName() to fetch role composites
 *   3. Verifies the required permission exists in the composites
 *   4. Throws AccessDeniedException if the check fails
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface IsAuthorize {

    String permission() default "";

    String role() default "";

    String description() default "";
}
