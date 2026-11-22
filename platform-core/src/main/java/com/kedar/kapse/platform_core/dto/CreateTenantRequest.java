package com.kedar.kapse.platform_core.dto;

import jakarta.validation.constraints.Email;
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

    // The hospital's first administrator. Created together with the hospital and
    // given a one-time temporary password, so the hospital can be used right away.
    @NotBlank(message = "Admin username is required")
    @Pattern(regexp = "^[A-Za-z0-9._-]{3,50}$",
            message = "Admin username: 3-50 letters, digits, dots, dashes or underscores")
    private String adminUsername;

    @NotBlank(message = "Admin email is required")
    @Email(message = "Admin email is not valid")
    @Size(max = 100)
    private String adminEmail;
}
