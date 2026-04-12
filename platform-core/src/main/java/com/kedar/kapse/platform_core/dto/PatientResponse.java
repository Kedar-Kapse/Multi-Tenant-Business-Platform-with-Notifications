package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.entity.Patient;
import com.kedar.kapse.platform_core.enums.Gender;
import com.kedar.kapse.platform_core.enums.PatientStatus;
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
public class PatientResponse {

    private UUID id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private LocalDate dateOfBirth;
    private Gender gender;
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String state;
    private String country;
    private String zipCode;
    private String keycloakUserId;
    private String tenantRealm;
    private PatientStatus status;
    private LocalDateTime registrationCompletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PatientResponse fromEntity(Patient p) {
        if (p == null) return null;
        return PatientResponse.builder()
                .id(p.getId())
                .firstName(p.getFirstName())
                .lastName(p.getLastName())
                .email(p.getEmail())
                .phone(p.getPhone())
                .dateOfBirth(p.getDateOfBirth())
                .gender(p.getGender())
                .addressLine1(p.getAddressLine1())
                .addressLine2(p.getAddressLine2())
                .city(p.getCity())
                .state(p.getState())
                .country(p.getCountry())
                .zipCode(p.getZipCode())
                .keycloakUserId(p.getKeycloakUserId())
                .tenantRealm(p.getTenantRealm())
                .status(p.getStatus())
                .registrationCompletedAt(p.getRegistrationCompletedAt())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
