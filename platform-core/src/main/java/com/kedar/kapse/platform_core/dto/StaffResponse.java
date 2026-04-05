package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.entity.Staff;
import com.kedar.kapse.platform_core.enums.Gender;
import com.kedar.kapse.platform_core.enums.StaffRole;
import com.kedar.kapse.platform_core.enums.StaffStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffResponse {

    private UUID id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private StaffRole role;
    private LocalDate dateOfBirth;
    private Gender gender;
    private String licenseNumber;
    private String specialization;
    private Integer experienceYears;
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String state;
    private String country;
    private String zipCode;
    private String profilePhotoUrl;
    private String keycloakUserId;
    private StaffStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static StaffResponse fromEntity(Staff staff) {
        if (staff == null) return null;

        return StaffResponse.builder()
                .id(staff.getId())
                .firstName(staff.getFirstName())
                .lastName(staff.getLastName())
                .email(staff.getEmail())
                .phone(staff.getPhone())
                .role(staff.getRole())
                .dateOfBirth(staff.getDateOfBirth())
                .gender(staff.getGender())
                .licenseNumber(staff.getLicenseNumber())
                .specialization(staff.getSpecialization())
                .experienceYears(staff.getExperienceYears())
                .addressLine1(staff.getAddressLine1())
                .addressLine2(staff.getAddressLine2())
                .city(staff.getCity())
                .state(staff.getState())
                .country(staff.getCountry())
                .zipCode(staff.getZipCode())
                .profilePhotoUrl(staff.getProfilePhotoUrl())
                .keycloakUserId(staff.getKeycloakUserId())
                .status(staff.getStatus())
                .createdAt(staff.getCreatedAt())
                .updatedAt(staff.getUpdatedAt())
                .build();
    }
}
