package com.kedar.kapse.access_security_service.entity;

import org.hibernate.annotations.TenantId;
import com.kedar.kapse.platform_core.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_entity", columnList = "entityType,entityId"),
        @Index(name = "idx_audit_actor", columnList = "actorId")
        // (tenant_realm, created_at) index: Flyway V1
})
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AuditLog extends BaseEntity {

    @Column(nullable = false, length = 50)
    private String entityType;

    @Column(nullable = false, length = 100)
    private String entityId;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(length = 100)
    private String actorId;

    /** Display name of who did it (from their login), so the log is readable. */
    @Column(length = 150)
    private String actorName;

    /** Owning hospital (Keycloak realm). Set and filtered by Hibernate -- see TenantIdentifierResolver. */
    @TenantId
    @Column(name = "tenant_realm", length = 50, nullable = false, updatable = false)
    private String tenantRealm;

    @Column(columnDefinition = "TEXT")
    private String details;
}
