package com.kedar.kapse.platform_core.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTenantRequest {

    @NotBlank(message = "Tenant name is required")
    private String name;

    @NotBlank(message = "Tenant code is required")
    @Size(min = 3, max = 10, message = "Tenant code must be between 3 and 10 characters")
    @Pattern(regexp = "^[A-Za-z0-9]+$", message = "Tenant code must be alphanumeric")
    private String tenantCode;
}
