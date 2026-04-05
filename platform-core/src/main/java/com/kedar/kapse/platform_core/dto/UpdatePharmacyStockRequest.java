package com.kedar.kapse.platform_core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePharmacyStockRequest {
    private String medicineName;
    private String category;
    private String batchNumber;
    private String manufacturer;
    private String dosageForm;
    private String strength;
    private Integer quantity;
    private Integer minimumStockLevel;
    private LocalDate expiryDate;
    private BigDecimal unitPrice;
    private String storageCondition;
    private String scheduleClass;
    private String notes;
}
