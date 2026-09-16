package com.kedar.kapse.platform_core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PharmacyStockResponse {

    private UUID id;
    private UUID facilityId;
    private String facilityName;
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
    private String status;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private boolean lowStock;
    private boolean expired;
    private long daysUntilExpiry;

}
