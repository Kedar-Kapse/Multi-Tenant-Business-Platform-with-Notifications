package com.kedar.kapse.platform_core.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpRequestedPayload {
    private String identifier;
    private String channel;       // EMAIL | CALL
    private String purpose;       // REGISTRATION | FORGOT_PASSWORD | LOGIN_MFA
    private String otpCode;
    private Integer ttlSeconds;
    private String tenantRealm;
}
