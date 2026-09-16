package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.service.OtpService;
import com.kedar.kapse.platform_core.dto.OtpGenerateRequest;
import com.kedar.kapse.platform_core.dto.OtpVerifyRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * Public OTP endpoints used by the Patient Portal during registration / forgot-password.
 * No auth required — the security of the flow depends on OTP delivery + TTL + rate-limits.
 */
@RestController
@RequestMapping("/api/auth/otp")
@RequiredArgsConstructor
@Slf4j
public class OtpController {

    private final OtpService otpService;

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generate(@Valid @RequestBody OtpGenerateRequest request) {
        otpService.generate(request);
        return ResponseEntity.ok(Map.of(
                "status", "sent",
                "channel", request.getChannel().name(),
                "message", "OTP has been dispatched via " + request.getChannel().name().toLowerCase()
        ));
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(@Valid @RequestBody OtpVerifyRequest request) {
        UUID token = otpService.verify(request);
        return ResponseEntity.ok(Map.of(
                "status", "verified",
                "verificationToken", token.toString()
        ));
    }

    @PostMapping("/resend")
    public ResponseEntity<Map<String, Object>> resend(@Valid @RequestBody OtpGenerateRequest request) {
        otpService.generate(request);
        return ResponseEntity.ok(Map.of("status", "sent"));
    }
}
