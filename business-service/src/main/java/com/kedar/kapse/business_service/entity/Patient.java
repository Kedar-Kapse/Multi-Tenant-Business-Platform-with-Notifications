package com.kedar.kapse.business_service.entity;

import com.kedar.kapse.platform_core.entity.BaseAuditableEntity;
import com.kedar.kapse.platform_core.enums.Gender;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import com.kedar.kapse.platform_core.enums.PccSyncStatus;
import com.kedar.kapse.platform_core.security.SsnEncryptor;
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
        @UniqueConstraint(columnNames = "email",    name = "uk_patient_email"),
        @UniqueConstraint(columnNames = "mrn",      name = "uk_patient_mrn"),
        @UniqueConstraint(columnNames = "ssn_hash", name = "uk_patient_ssn_hash")
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

    @Column(length = 50, unique = true)
    private String mrn;

    /** Encrypted at rest via AES-256-GCM. Never expose in API responses or logs. */
    @Convert(converter = SsnEncryptor.class)
    @Column(name = "ssn", length = 100)
    private String ssn;

    /** SHA-256 of normalized (digits-only) SSN — used for uniqueness checks since ssn column is encrypted. */
    @Column(name = "ssn_hash", length = 64, unique = true)
    private String ssnHash;

    @Column(length = 100)
    private String pccPatientId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private PccSyncStatus pccSyncStatus;

    private LocalDateTime pccSyncedAt;
    private LocalDateTime pccFailedAt;

    /** Timestamp set when a consumer atomically claims this patient for processing.
     *  Recovery scheduler uses this to detect stuck IN_PROGRESS rows (claimed but never resolved). */
    private LocalDateTime pccSyncClaimedAt;

    /** Last PCC sync error stored for UI display. Cleared on successful sync. */
    @Column(name = "pcc_last_error", length = 500)
    private String pccLastError;

    /** Total number of failed PCC sync attempts across all retries. */
    @Column(name = "pcc_retry_count", nullable = false)
    @lombok.Builder.Default
    private int pccRetryCount = 0;

    // ======================== PATIENT SELF-SERVICE PROFILE FIELDS ========================

    @Column(length = 10)
    private String bloodGroup;

    @Column(length = 500)
    private String emergencyContact;

    /** Comma-separated list of known allergies (e.g. "Penicillin, Sulfa drugs"). */
    @Column(columnDefinition = "TEXT")
    private String allergies;

    /** Comma-separated list of chronic conditions (e.g. "Hypertension, Pre-diabetes"). */
    @Column(columnDefinition = "TEXT")
    private String chronicConditions;

    @Column(length = 200)
    private String insuranceProvider;

    @Column(length = 100)
    private String policyNumber;
}
