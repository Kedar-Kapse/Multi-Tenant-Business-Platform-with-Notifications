package com.kedar.kapse.platform_core.constant;

/**
 * System-wide constants shared across all microservices.
 */
public final class SystemConstants {

    private SystemConstants() {}

    // Pagination defaults
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    public static final String DEFAULT_SORT_FIELD = "createdAt";
    public static final String DEFAULT_SORT_DIRECTION = "desc";

    // Medicine stock thresholds
    public static final int DEFAULT_MINIMUM_STOCK_LEVEL = 50;
    public static final int EXPIRY_WARNING_DAYS = 90;

    // Healthcare domain
    public static final String[] HEALTHCARE_ROLES = {
        "ADMIN", "PROVIDER", "THERAPIST", "PHYSICIAN", "NURSE", "PATIENT"
    };
}
