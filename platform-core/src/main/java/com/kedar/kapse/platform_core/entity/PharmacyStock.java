package com.kedar.kapse.platform_core.entity;

import com.kedar.kapse.platform_core.enums.MedicineStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "pharmacy_stock", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"facility_id", "medicineName", "batchNumber"}, name = "uk_pharmacy_batch")
})
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PharmacyStock extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facility_id", nullable = false)
    private Facility facility;

    @Column(nullable = false, length = 200)
    private String medicineName;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(nullable = false, length = 50)
    private String batchNumber;

    @Column(length = 200)
    private String manufacturer;

    @Column(length = 50)
    private String dosageForm;

    @Column(length = 100)
    private String strength;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    @lombok.Builder.Default
    private Integer minimumStockLevel = 50;

    @Column(nullable = false)
    private LocalDate expiryDate;

    @Column(precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(length = 100)
    private String storageCondition;

    @Column(length = 50)
    private String scheduleClass;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @lombok.Builder.Default
    private MedicineStatus status = MedicineStatus.IN_STOCK;

    @Column(length = 500)
    private String notes;

    @PrePersist
    @Override
    protected void onCreate() {
        super.onCreate();
        recalculateStatus();
    }

    @PreUpdate
    @Override
    protected void onUpdate() {
        super.onUpdate();
        recalculateStatus();
    }

    public void recalculateStatus() {
        if (expiryDate != null && expiryDate.isBefore(LocalDate.now())) {
            this.status = MedicineStatus.EXPIRED;
        } else if (quantity == null || quantity <= 0) {
            this.status = MedicineStatus.OUT_OF_STOCK;
        } else if (quantity <= minimumStockLevel) {
            this.status = MedicineStatus.LOW_STOCK;
        } else {
            this.status = MedicineStatus.IN_STOCK;
        }
    }
}
