package com.kedar.kapse.platform_core.security;

/**
 * Centralized role and permission constants used across all microservices.
 *
 * HEALTHCARE ROLE HIERARCHY:
 *   ADMIN      -> Full platform control
 *   PROVIDER   -> Healthcare provider organization, manages staff
 *   THERAPIST  -> Conducts therapy sessions with patients
 *   PHYSICIAN  -> Supervises treatment plans, prescribes medication
 *   NURSE      -> Assists with patient care operations
 *   PATIENT    -> Views own appointments and health data
 *
 * PERMISSIONS (Client Roles in Keycloak):
 *   Mapped under resource_access.platform-backend.roles in the JWT.
 *   Extracted by KeycloakJwtConverter and available via @PreAuthorize.
 */
public final class SecurityConstants {

    private SecurityConstants() {}

    // ======================== ROLE NAMES ========================
    // Match Keycloak realm roles exactly

    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_PROVIDER = "PROVIDER";
    public static final String ROLE_THERAPIST = "THERAPIST";
    public static final String ROLE_PHYSICIAN = "PHYSICIAN";
    public static final String ROLE_NURSE = "NURSE";
    public static final String ROLE_PATIENT = "PATIENT";

    // ======================== PERMISSION NAMES ========================
    // Match Keycloak client roles under "platform-backend" client

    public static final String PERM_READ_PATIENT = "READ_PATIENT";
    public static final String PERM_UPDATE_PATIENT = "UPDATE_PATIENT";
    public static final String PERM_CREATE_PATIENT = "CREATE_PATIENT";
    public static final String PERM_DELETE_PATIENT = "DELETE_PATIENT";
    public static final String PERM_MANAGE_STAFF = "MANAGE_STAFF";
    public static final String PERM_MANAGE_FACILITY = "MANAGE_FACILITY";
    public static final String PERM_VIEW_REPORTS = "VIEW_REPORTS";
    public static final String PERM_MANAGE_PHARMACY = "MANAGE_PHARMACY";

    // ======================== TENANT HEADER ========================

    public static final String TENANT_HEADER = "X-TENANT-ID";

    // ======================== PUBLIC ENDPOINTS ========================

    public static final String[] PUBLIC_ENDPOINTS = {
            "/api/auth/**",
            "/actuator/health",
            "/actuator/health/**",
            "/actuator/info"
    };

    // ======================== PROTECTED ACTUATOR ENDPOINTS ========================

    public static final String[] PROTECTED_ACTUATOR_ENDPOINTS = {
            "/actuator/metrics/**",
            "/actuator/loggers/**",
            "/actuator/mappings/**",
            "/actuator/env/**",
            "/actuator/beans/**",
            "/actuator/heapdump/**"
    };
}
