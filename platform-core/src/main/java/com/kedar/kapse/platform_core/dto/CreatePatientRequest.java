package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.enums.Gender;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePatientRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 50)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 50)
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 100)
    private String email;

    @Pattern(regexp = "^$|^[+]?[0-9\\-\\s()]{7,20}$", message = "Invalid phone number format")
    private String phone;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    private Gender gender;

    @Size(max = 255) private String addressLine1;
    @Size(max = 255) private String addressLine2;
    @Size(max = 100) private String city;
    @Size(max = 100) private String state;
    @Size(max = 100) private String country;
    @Size(max = 20)  private String zipCode;

    @NotBlank(message = "MRN is required")
    @Size(max = 50)
    private String mrn;

    /** Accepted formats: "123-45-6789" or "123456789". Stored encrypted at rest; never returned in responses. */
    @NotBlank(message = "SSN is required")
    @Pattern(regexp = "^\\d{3}-\\d{2}-\\d{4}$|^\\d{9}$",
             message = "SSN must be in format 123-45-6789 or 9 consecutive digits")
    private String ssn;

    /** When created from Provider Portal, the logged-in provider's staff ID; optional for Admin. */
    private UUID providerId;

    @Size(max = 100)
    private String locationCode;

    /** When true, a PCC sync event is published immediately after patient creation. Defaults to false. */
    @lombok.Builder.Default
    private boolean pccSyncRequired = false;
}
