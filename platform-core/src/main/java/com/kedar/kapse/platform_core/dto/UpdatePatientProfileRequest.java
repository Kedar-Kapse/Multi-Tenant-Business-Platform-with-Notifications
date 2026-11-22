package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.enums.Gender;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePatientProfileRequest {

    @Size(max = 50)
    private String firstName;

    @Size(max = 50)
    private String lastName;

    @Pattern(regexp = "^[+\\d\\s\\-()]{0,20}$", message = "Invalid phone number format")
    private String phone;

    @jakarta.validation.constraints.PastOrPresent(message = "Date of birth cannot be in the future")
    private LocalDate dateOfBirth;

    private Gender gender;

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

    @Size(max = 10)
    private String bloodGroup;

    @Size(max = 500)
    private String emergencyContact;

    private String allergies;

    private String chronicConditions;

    @Size(max = 200)
    private String insuranceProvider;

    @Size(max = 100)
    private String policyNumber;
}
