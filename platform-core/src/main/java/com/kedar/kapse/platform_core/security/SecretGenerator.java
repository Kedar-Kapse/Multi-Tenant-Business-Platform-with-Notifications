package com.kedar.kapse.platform_core.security;

import java.security.SecureRandom;
import java.util.Base64;

/** Random, unguessable secrets (e.g. a new hospital's Keycloak client secret). */
public final class SecretGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();

    private SecretGenerator() {
    }

    /** 32 random bytes, URL-safe text (43 characters). */
    public static String newSecret() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
