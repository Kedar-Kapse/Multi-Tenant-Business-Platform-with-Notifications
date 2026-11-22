package com.kedar.kapse.business_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.TenantId;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A clinician's note about a patient visit. DRAFT can be edited by its author;
 * SIGNED is final (the legal record) and is what the patient can see.
 */
@Entity
@Table(name = "clinical_notes", indexes = {
        @Index(name = "idx_note_patient", columnList = "patientId, createdAt"),
        @Index(name = "idx_note_provider", columnList = "providerId, createdAt")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ClinicalNote {

    /** Owning hospital (Keycloak realm). Set and filtered by Hibernate -- see TenantIdentifierResolver. */
    @TenantId
    @Column(name = "tenant_realm", length = 64, nullable = false, updatable = false)
    private String tenantRealm;

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** patients.id */
    @Column(nullable = false)
    private UUID patientId;

    @Column(nullable = false, length = 150)
    private String patientName;

    /** Keycloak user id of the author */
    @Column(nullable = false, length = 100)
    private String providerId;

    @Column(nullable = false, length = 150)
    private String providerName;

    private UUID templateId;

    @Column(length = 150)
    private String templateName;

    private UUID appointmentId;

    /** Comma-separated codes, e.g. "E11.9, I10" */
    @Column(length = 300)
    private String icdCodes;

    @Column(length = 300)
    private String cptCodes;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT";

    private LocalDateTime signedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
