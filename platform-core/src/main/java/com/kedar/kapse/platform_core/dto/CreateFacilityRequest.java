package com.kedar.kapse.platform_core.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateFacilityRequest {

    @NotBlank(message = "Tenant ID is required")
    private String tenantId;

    @NotBlank(message = "Facility name is required")
    @Size(max = 150, message = "Name must be under 150 characters")
    private String name;

    @NotBlank(message = "Facility code is required")
    @Size(min = 3, max = 20, message = "Code must be 3–20 characters")
    @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Code must be alphanumeric (hyphens and underscores allowed)")
    private String facilityCode;

    private String facilityType;
    private String address;
    private String city;
    private String state;
    private String zipCode;
    private String phone;
    private String email;
    private Integer totalBeds;
}
