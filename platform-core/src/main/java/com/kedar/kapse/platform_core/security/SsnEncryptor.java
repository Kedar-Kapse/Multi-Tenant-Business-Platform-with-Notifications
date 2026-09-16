package com.kedar.kapse.platform_core.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM encryption for SSN at rest.
 *
 * Storage format: base64(12-byte IV) + ":" + base64(ciphertext+16-byte auth-tag)
 * Column length of 100 chars is sufficient.
 *
 * Key setup (REQUIRED in production):
 *   export SSN_ENCRYPTION_KEY=$(openssl rand -base64 32)
 *
 * The dev fallback (32 zero-bytes) is intentionally weak — it exists only so the
 * application starts without configuration. Any environment that stores real SSNs
 * MUST set SSN_ENCRYPTION_KEY.
 */
@Converter
public class SsnEncryptor implements AttributeConverter<String, String> {

    private static final String ALGORITHM  = "AES/GCM/NoPadding";
    private static final int    IV_BYTES   = 12;   // GCM recommended IV length
    private static final int    TAG_BITS   = 128;  // GCM authentication tag length
    private static final String KEY_ENV    = "SSN_ENCRYPTION_KEY";

    private static final String DEV_FALLBACK_KEY =
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; // 32 zero-bytes — NOT for production

    private static final SecretKey  SECRET_KEY = loadKey();
    private static final SecureRandom RNG       = new SecureRandom();

    private static SecretKey loadKey() {
        String b64 = System.getenv(KEY_ENV);
        if (b64 == null || b64.isBlank()) {
            b64 = DEV_FALLBACK_KEY;
            // Log warning at startup; can't use SLF4J here (converter loads before Spring)
            System.err.println("[WARN] SSN_ENCRYPTION_KEY not set — using dev placeholder. " +
                               "Set the env var before storing real SSN data.");
        }
        byte[] raw = Base64.getDecoder().decode(b64.trim());
        if (raw.length != 32) {
            throw new IllegalStateException(
                    "SSN_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256). Got: " + raw.length);
        }
        return new SecretKeySpec(raw, "AES");
    }

    @Override
    public String convertToDatabaseColumn(String plainSsn) {
        if (plainSsn == null) return null;
        try {
            byte[] iv = new byte[IV_BYTES];
            RNG.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, SECRET_KEY, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plainSsn.getBytes());
            return Base64.getEncoder().encodeToString(iv)
                    + ":"
                    + Base64.getEncoder().encodeToString(ciphertext);
        } catch (Exception e) {
            throw new IllegalStateException("SSN encryption failed", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbValue) {
        if (dbValue == null) return null;
        try {
            String[] parts = dbValue.split(":", 2);
            byte[] iv         = Base64.getDecoder().decode(parts[0]);
            byte[] ciphertext = Base64.getDecoder().decode(parts[1]);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, SECRET_KEY, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(ciphertext));
        } catch (Exception e) {
            throw new IllegalStateException("SSN decryption failed", e);
        }
    }
}
