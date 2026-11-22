package com.kedar.kapse.business_service.entity;

import org.hibernate.annotations.TenantId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "fee_schedules", uniqueConstraints =
        @UniqueConstraint(columnNames = {"tenant_realm", "code"}, name = "uk_fee_tenant_code"))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FeeSchedule {
    /** Owning hospital (Keycloak realm). Set and filtered by Hibernate -- see TenantIdentifierResolver. */
    @TenantId
    @Column(name = "tenant_realm", length = 64, nullable = false, updatable = false)
    private String tenantRealm;

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 20)
    private String code;

    @Column(nullable = false, length = 300)
    private String description;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal fee;

    @Column(precision = 10, scale = 2)
    private BigDecimal medicareRate;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    private LocalDateTime createdAt;
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
