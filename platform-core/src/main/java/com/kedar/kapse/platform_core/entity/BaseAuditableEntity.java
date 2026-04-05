package com.kedar.kapse.platform_core.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * Extended base entity with audit fields (createdBy, updatedBy).
 * Use this for entities that need audit trail tracking.
 */
@MappedSuperclass
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public abstract class BaseAuditableEntity extends BaseEntity {

    @Column(length = 100)
    private String createdBy;

    @Column(length = 100)
    private String updatedBy;

    @Override
    @PrePersist
    protected void onCreate() {
        super.onCreate();
    }

    @Override
    @PreUpdate
    protected void onUpdate() {
        super.onUpdate();
    }
}
