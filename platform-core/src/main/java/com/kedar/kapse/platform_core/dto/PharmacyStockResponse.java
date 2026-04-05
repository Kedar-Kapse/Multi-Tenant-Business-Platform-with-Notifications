package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.entity.PharmacyStock;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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

    public static PharmacyStockResponse fromEntity(PharmacyStock stock) {
        if (stock == null) return null;
        LocalDate today = LocalDate.now();
        long daysUntil = stock.getExpiryDate() != null
                ? ChronoUnit.DAYS.between(today, stock.getExpiryDate())
                : 0;

        return PharmacyStockResponse.builder()
                .id(stock.getId())
                .facilityId(stock.getFacility() != null ? stock.getFacility().getId() : null)
                .facilityName(stock.getFacility() != null ? stock.getFacility().getName() : null)
                .medicineName(stock.getMedicineName())
                .category(stock.getCategory())
                .batchNumber(stock.getBatchNumber())
                .manufacturer(stock.getManufacturer())
                .dosageForm(stock.getDosageForm())
                .strength(stock.getStrength())
                .quantity(stock.getQuantity())
                .minimumStockLevel(stock.getMinimumStockLevel())
                .expiryDate(stock.getExpiryDate())
                .unitPrice(stock.getUnitPrice())
                .storageCondition(stock.getStorageCondition())
                .scheduleClass(stock.getScheduleClass())
                .status(stock.getStatus() != null ? stock.getStatus().name() : null)
                .notes(stock.getNotes())
                .lowStock(stock.getQuantity() != null && stock.getQuantity() <= stock.getMinimumStockLevel())
                .expired(stock.getExpiryDate() != null && stock.getExpiryDate().isBefore(today))
                .daysUntilExpiry(daysUntil)
                .createdAt(stock.getCreatedAt())
                .updatedAt(stock.getUpdatedAt())
                .build();
    }
}
