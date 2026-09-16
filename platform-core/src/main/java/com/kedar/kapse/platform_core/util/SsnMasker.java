package com.kedar.kapse.platform_core.util;

/**
 * Masks SSN values before they are written to logs or error messages.
 * Never pass a raw SSN to a logger — always call SsnMasker.mask() first.
 */
public final class SsnMasker {

    private SsnMasker() {}

    /**
     * Returns a log-safe masked representation.
     *   "123-45-6789" → "***-**-6789"
     *   "123456789"   → "*****6789"
     *   null / blank  → "[no SSN]"
     *   anything else → "***[masked]"
     */
    public static String mask(String ssn) {
        if (ssn == null || ssn.isBlank()) return "[no SSN]";
        if (ssn.matches("\\d{3}-\\d{2}-\\d{4}")) return "***-**-" + ssn.substring(7);
        if (ssn.matches("\\d{9}"))               return "*****" + ssn.substring(5);
        return "***[masked]";
    }
}
