package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.enums.Gender;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import com.kedar.kapse.platform_core.enums.PccSyncStatus;
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

    private String mrn;
    private PccSyncStatus pccSyncStatus;
    private String pccPatientId;
    /** Last PCC sync error message — populated only when pccSyncStatus = FAILED. */
    private String pccLastError;
    private int pccRetryCount;

    // Patient self-service profile fields
    private String bloodGroup;
    private String emergencyContact;
    private String allergies;
    private String chronicConditions;
    private String insuranceProvider;
    private String policyNumber;
}
