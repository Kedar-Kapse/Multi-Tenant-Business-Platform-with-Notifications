package com.kedar.kapse.platform_core.entity;

import com.kedar.kapse.platform_core.enums.Gender;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "patients", uniqueConstraints = {
        @UniqueConstraint(columnNames = "email", name = "uk_patient_email")
})
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Patient extends BaseAuditableEntity {

    @Column(nullable = false, length = 50)
    private String firstName;

    @Column(nullable = false, length = 50)
    private String lastName;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(length = 20)
    private String phone;

    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(length = 255)
    private String addressLine1;

    @Column(length = 255)
    private String addressLine2;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 100)
    private String country;

    @Column(length = 20)
    private String zipCode;

    @Column(length = 100)
    private String keycloakUserId;

    @Column(length = 50)
    private String tenantRealm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @lombok.Builder.Default
    private PatientStatus status = PatientStatus.PENDING_REGISTRATION;

    private LocalDateTime registrationCompletedAt;

    private LocalDateTime deletedAt;
}
