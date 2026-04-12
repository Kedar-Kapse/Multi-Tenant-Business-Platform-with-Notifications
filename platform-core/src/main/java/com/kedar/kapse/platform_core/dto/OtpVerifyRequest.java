package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.enums.OtpPurpose;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpVerifyRequest {

    @NotBlank(message = "Identifier is required")
    private String identifier;

    @NotBlank(message = "OTP code is required")
    @Pattern(regexp = "^\\d{4,8}$", message = "OTP must be 4–8 digits")
    private String otpCode;

    @NotNull(message = "Purpose is required")
    private OtpPurpose purpose;
}
