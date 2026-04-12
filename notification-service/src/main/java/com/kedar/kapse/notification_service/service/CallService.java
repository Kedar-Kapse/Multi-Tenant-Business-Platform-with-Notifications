package com.kedar.kapse.notification_service.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Mock voice-call OTP dispatcher.
 * Replace with Twilio / Exotel / Plivo integration in production.
 */
@Service
@Slf4j
public class CallService {

    public void placeOtpCall(String toPhone, String otpCode, String purpose, int ttlSeconds, String tenantRealm) {
        log.info("""

                ───── 📞 MOCK IVR CALL (OTP) ─────
                To        : {}
                Tenant    : {}
                Purpose   : {}
                Script    : "Your verification code is {}. Valid for {} seconds."
                ──────────────────────────────────
                """, toPhone, tenantRealm, purpose, spaced(otpCode), ttlSeconds);
    }

    /** Insert spaces between digits so log reads like an IVR prompt. */
    private static String spaced(String code) {
        StringBuilder sb = new StringBuilder(code.length() * 2);
        for (int i = 0; i < code.length(); i++) {
            if (i > 0) sb.append(' ');
            sb.append(code.charAt(i));
        }
        return sb.toString();
    }
}
