package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.service.RegistrationService;
import com.kedar.kapse.platform_core.dto.SetPasswordRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public endpoints for patient self-service auth flows.
 *
 * - /register/complete          — after OTP verify, set password + activate
 * - /forgot-password/complete   — after OTP verify, reset password
 *
 * OTP generation/verification lives under /api/auth/otp/*.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class RegistrationController {

    private final RegistrationService registrationService;

    @PostMapping("/register/complete")
    public ResponseEntity<Map<String, Object>> completeRegistration(@Valid @RequestBody SetPasswordRequest req) {
        registrationService.completeRegistration(req.getVerificationToken(), req.getPassword());
        return ResponseEntity.ok(Map.of(
                "status", "registered",
                "message", "Registration complete. You can now log in."
        ));
    }

    @PostMapping("/forgot-password/complete")
    public ResponseEntity<Map<String, Object>> forgotPassword(@Valid @RequestBody SetPasswordRequest req) {
        registrationService.resetPassword(req.getVerificationToken(), req.getPassword());
        return ResponseEntity.ok(Map.of(
                "status", "password_reset",
                "message", "Password has been reset. You can now log in."
        ));
    }
}
