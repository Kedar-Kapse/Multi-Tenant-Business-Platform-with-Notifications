package com.kedar.kapse.platform_core.entity;

import com.kedar.kapse.platform_core.enums.BedStatus;
import com.kedar.kapse.platform_core.enums.BedType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "beds", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"facility_id", "wardName", "roomNumber", "bedNumber"}, name = "uk_bed_location")
})
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Bed extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facility_id", nullable = false)
    private Facility facility;

    @Column(nullable = false, length = 100)
    private String wardName;

    @Column(nullable = false, length = 20)
    private String roomNumber;

    @Column(nullable = false, length = 20)
    private String bedNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BedType bedType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @lombok.Builder.Default
    private BedStatus status = BedStatus.AVAILABLE;

    @Column(length = 100)
    private String assignedPatientId;

    @Column(length = 200)
    private String assignedPatientName;

    @Column(length = 500)
    private String notes;
}
