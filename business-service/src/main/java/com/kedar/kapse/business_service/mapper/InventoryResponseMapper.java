package com.kedar.kapse.business_service.mapper;

import com.kedar.kapse.business_service.entity.Bed;
import com.kedar.kapse.business_service.entity.Facility;
import com.kedar.kapse.business_service.entity.PharmacyStock;
import com.kedar.kapse.platform_core.dto.BedResponse;
import com.kedar.kapse.platform_core.dto.FacilityResponse;
import com.kedar.kapse.platform_core.dto.PharmacyStockResponse;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class InventoryResponseMapper {

    private InventoryResponseMapper() {}

    public static BedResponse toBedResponse(Bed bed) {
        if (bed == null) return null;
        return BedResponse.builder()
                .id(bed.getId())
                .facilityId(bed.getFacility() != null ? bed.getFacility().getId() : null)
                .facilityName(bed.getFacility() != null ? bed.getFacility().getName() : null)
                .wardName(bed.getWardName())
                .roomNumber(bed.getRoomNumber())
                .bedNumber(bed.getBedNumber())
                .bedType(bed.getBedType() != null ? bed.getBedType().name() : null)
                .status(bed.getStatus() != null ? bed.getStatus().name() : null)
                .assignedPatientId(bed.getAssignedPatientId())
                .assignedPatientName(bed.getAssignedPatientName())
                .notes(bed.getNotes())
                .bedLabel(bed.getWardName() + "-" + bed.getRoomNumber() + "-" + bed.getBedNumber())
                .createdAt(bed.getCreatedAt())
                .updatedAt(bed.getUpdatedAt())
                .build();
    }

    public static FacilityResponse toFacilityResponse(Facility facility) {
        if (facility == null) return null;
        return FacilityResponse.builder()
                .id(facility.getId())
                .tenantId(facility.getTenantId())
                .name(facility.getName())
                .facilityCode(facility.getFacilityCode())
                .facilityType(facility.getFacilityType())
                .address(facility.getAddress())
                .city(facility.getCity())
                .state(facility.getState())
                .zipCode(facility.getZipCode())
                .phone(facility.getPhone())
                .email(facility.getEmail())
                .totalBeds(facility.getTotalBeds())
                .status(facility.getStatus() != null ? facility.getStatus().name() : null)
                .createdAt(facility.getCreatedAt())
                .updatedAt(facility.getUpdatedAt())
                .build();
    }

    public static PharmacyStockResponse toPharmacyStockResponse(PharmacyStock stock) {
        if (stock == null) return null;
        LocalDate today = LocalDate.now();
        long daysUntil = stock.getExpiryDate() != null
                ? ChronoUnit.DAYS.between(today, stock.getExpiryDate()) : 0;
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
