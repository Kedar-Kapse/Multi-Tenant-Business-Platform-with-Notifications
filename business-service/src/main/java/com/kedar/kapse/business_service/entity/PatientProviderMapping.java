package com.kedar.kapse.business_service.entity;

import com.kedar.kapse.platform_core.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "patient_provider_mapping", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"patient_id", "provider_id"}, name = "uk_patient_provider")
})
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PatientProviderMapping extends BaseEntity {

    // NOTE: patientId stays as UUID (design choice: aggregate root pattern, not JPA FK)
    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    // NOTE: providerId stays as UUID because Staff lives in access-security-service (cross-service ref)
    @Column(name = "provider_id", nullable = false)
    private UUID providerId;

    @Column(length = 100)
    private String locationCode;

    @Column(name = "is_primary", nullable = false)
    @lombok.Builder.Default
    private Boolean isPrimary = false;
}
