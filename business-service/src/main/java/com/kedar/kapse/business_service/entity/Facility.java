package com.kedar.kapse.business_service.entity;

import org.hibernate.annotations.TenantId;
import com.kedar.kapse.platform_core.entity.BaseEntity;
import com.kedar.kapse.platform_core.enums.FacilityStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "facilities", uniqueConstraints = {
    // Facility code is unique within a hospital (see Flyway V2)
    @UniqueConstraint(columnNames = {"tenant_realm", "facility_code"}, name = "uk_facility_realm_code")
})
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Facility extends BaseEntity {
    /** Owning hospital (Keycloak realm). Set and filtered by Hibernate -- see TenantIdentifierResolver. */
    @TenantId
    @Column(name = "tenant_realm", length = 64, nullable = false, updatable = false)
    private String tenantRealm;
    @Column(name = "tenant_id")
    private UUID tenantId;
    @Column(nullable = false, length = 150) private String name;
    @Column(nullable = false, length = 20) private String facilityCode;
    @Column(length = 50) private String facilityType;
    @Column(length = 500) private String address;
    @Column(length = 100) private String city;
    @Column(length = 100) private String state;
    @Column(length = 20) private String zipCode;
    @Column(length = 20) private String phone;
    @Column(length = 100) private String email;
    private Integer totalBeds;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10)
    @lombok.Builder.Default private FacilityStatus status = FacilityStatus.ACTIVE;
}
