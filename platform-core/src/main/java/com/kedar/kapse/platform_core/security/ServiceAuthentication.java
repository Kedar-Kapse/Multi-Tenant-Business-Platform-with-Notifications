package com.kedar.kapse.platform_core.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Service-to-Service authentication using SHA-256 Code Challenge / Code Verifier.
 *
 * PROTOCOL (inspired by PKCE / RFC 7636):
 *   1. Calling service generates a random Code Verifier
 *   2. Calling service computes Code Challenge = BASE64URL(SHA256(verifier))
 *   3. Calling service sends X-CODE-CHALLENGE header with the challenge
 *   4. Calling service sends X-CODE-VERIFIER header with the verifier
 *   5. Receiving service re-computes SHA256(verifier), base64url-encodes it,
 *      and compares with the received challenge
 *
 * This provides a simple proof that the caller possesses the verifier that
 * produced the challenge, preventing replay attacks on the challenge alone.
 */
public class ServiceAuthentication {

    private static final Logger log = LoggerFactory.getLogger(ServiceAuthentication.class);

    public static final String CODE_CHALLENGE_HEADER = "X-CODE-CHALLENGE";
    public static final String CODE_VERIFIER_HEADER = "X-CODE-VERIFIER";

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int VERIFIER_LENGTH = 64;

    private ServiceAuthentication() {}

    public static String generateCodeVerifier() {
        byte[] randomBytes = new byte[VERIFIER_LENGTH];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    public static String computeCodeChallenge(String codeVerifier) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(codeVerifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    /**
     * Verifies that the Code Challenge matches the Code Verifier.
     * Uses constant-time comparison to prevent timing attacks.
     */
    public static boolean verify(String codeChallenge, String codeVerifier) {
        if (codeChallenge == null || codeVerifier == null
                || codeChallenge.isBlank() || codeVerifier.isBlank()) {
            log.debug("S2S auth failed: challenge or verifier is null/blank");
            return false;
        }

        try {
            String expectedChallenge = computeCodeChallenge(codeVerifier);
            boolean result = MessageDigest.isEqual(
                    expectedChallenge.getBytes(StandardCharsets.US_ASCII),
                    codeChallenge.getBytes(StandardCharsets.US_ASCII));

            if (!result) {
                log.warn("S2S authentication failed: code challenge mismatch");
            } else {
                log.debug("S2S authentication succeeded");
            }
            return result;
        } catch (Exception e) {
            log.error("S2S authentication error: {}", e.getMessage());
            return false;
        }
    }
}
