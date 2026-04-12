package com.kedar.kapse.platform_core.entity;

import jakarta.persistence.*;
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

    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    @Column(name = "provider_id", nullable = false)
    private UUID providerId;

    @Column(length = 100)
    private String locationCode;

    @Column(name = "is_primary", nullable = false)
    @lombok.Builder.Default
    private Boolean isPrimary = false;
}
