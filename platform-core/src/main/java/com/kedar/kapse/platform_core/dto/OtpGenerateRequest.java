package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.enums.OtpChannel;
import com.kedar.kapse.platform_core.enums.OtpPurpose;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpGenerateRequest {

    @NotBlank(message = "Identifier (email or phone) is required")
    private String identifier;

    @NotNull(message = "Channel is required")
    private OtpChannel channel;

    @NotNull(message = "Purpose is required")
    private OtpPurpose purpose;
}
