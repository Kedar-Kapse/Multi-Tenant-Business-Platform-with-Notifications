package com.kedar.kapse.platform_core.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePharmacyStockRequest {

    @NotBlank(message = "Facility ID is required")
    private String facilityId;

    @NotBlank(message = "Medicine name is required")
    @Size(max = 200, message = "Medicine name must be under 200 characters")
    private String medicineName;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Batch number is required")
    @Size(max = 50, message = "Batch number must be under 50 characters")
    private String batchNumber;

    private String manufacturer;
    private String dosageForm;
    private String strength;

    @NotNull(message = "Quantity is required")
    @Min(value = 0, message = "Quantity cannot be negative")
    private Integer quantity;

    @Min(value = 1, message = "Minimum stock level must be at least 1")
    private Integer minimumStockLevel;

    @NotNull(message = "Expiry date is required")
    @Future(message = "Expiry date must be in the future")
    private LocalDate expiryDate;

    private BigDecimal unitPrice;
    private String storageCondition;
    private String scheduleClass;
    private String notes;
}
