package com.kedar.kapse.platform_core.entity;

import com.kedar.kapse.platform_core.enums.Gender;
import com.kedar.kapse.platform_core.enums.StaffRole;
import com.kedar.kapse.platform_core.enums.StaffStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@Entity
@Table(name = "staff", uniqueConstraints = {
    @UniqueConstraint(columnNames = "email", name = "uk_staff_email")
})
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Staff extends BaseEntity {

    @Column(nullable = false, length = 50)
    private String firstName;

    @Column(nullable = false, length = 50)
    private String lastName;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StaffRole role;

    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(length = 50)
    private String licenseNumber;

    @Column(length = 100)
    private String specialization;

    private Integer experienceYears;

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

    @Column(length = 500)
    private String profilePhotoUrl;

    @Column(length = 100)
    private String keycloakUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @lombok.Builder.Default
    private StaffStatus status = StaffStatus.ACTIVE;
}
