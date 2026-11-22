package com.kedar.kapse.platform_core.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * What a staff member may change about THEMSELVES (provider portal "My Profile").
 * Name, email, role and status are managed by an admin and are not here.
 * A field left null is not changed; an empty string clears it.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMyStaffProfileRequest {

    @Pattern(regexp = "^$|^[+]?[0-9\\-\\s()]{7,20}$", message = "Invalid phone number format")
    private String phone;

    @Size(max = 100)
    private String specialization;

    @Size(max = 50)
    private String licenseNumber;

    @Min(value = 0, message = "Experience cannot be negative")
    @Max(value = 70, message = "Experience looks too high")
    private Integer experienceYears;

    @Size(max = 255)
    private String addressLine1;

    @Size(max = 255)
    private String addressLine2;

    @Size(max = 100)
    private String city;

    @Size(max = 100)
    private String state;

    @Size(max = 100)
    private String country;

    @Size(max = 20)
    private String zipCode;
}
