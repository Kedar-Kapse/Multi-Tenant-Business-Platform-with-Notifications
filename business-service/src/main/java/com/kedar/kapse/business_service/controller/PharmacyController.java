package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.platform_core.dto.*;
import com.kedar.kapse.platform_core.entity.Facility;
import com.kedar.kapse.platform_core.entity.PharmacyStock;
import com.kedar.kapse.platform_core.enums.MedicineStatus;
import com.kedar.kapse.platform_core.repository.FacilityRepository;
import com.kedar.kapse.platform_core.repository.PharmacyStockRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inventory/pharmacy")
@RequiredArgsConstructor
@Slf4j
public class PharmacyController {

    private final PharmacyStockRepository stockRepo;
    private final FacilityRepository facilityRepo;

    @GetMapping
    public List<PharmacyStockResponse> getAll(@RequestParam(required = false) UUID facilityId) {
        List<PharmacyStock> stocks = facilityId != null
                ? stockRepo.findByFacilityId(facilityId) : stockRepo.findAll();
        return stocks.stream().map(PharmacyStockResponse::fromEntity).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public PharmacyStockResponse getById(@PathVariable UUID id) {
        return PharmacyStockResponse.fromEntity(stockRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Stock not found")));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PharmacyStockResponse create(@RequestBody CreatePharmacyStockRequest req) {
        Facility facility = facilityRepo.findById(UUID.fromString(req.getFacilityId()))
                .orElseThrow(() -> new EntityNotFoundException("Facility not found"));

        PharmacyStock stock = PharmacyStock.builder()
                .facility(facility)
                .medicineName(req.getMedicineName())
                .category(req.getCategory())
                .batchNumber(req.getBatchNumber())
                .manufacturer(req.getManufacturer())
                .dosageForm(req.getDosageForm())
                .strength(req.getStrength())
                .quantity(req.getQuantity())
                .minimumStockLevel(req.getMinimumStockLevel() != null ? req.getMinimumStockLevel() : 50)
                .expiryDate(req.getExpiryDate())
                .unitPrice(req.getUnitPrice() != null ? req.getUnitPrice() : BigDecimal.ZERO)
                .storageCondition(req.getStorageCondition())
                .scheduleClass(req.getScheduleClass())
                .notes(req.getNotes())
                .status(MedicineStatus.IN_STOCK)
                .build();
        stock = stockRepo.save(stock);
        log.info("Created pharmacy stock: {} (batch: {})", stock.getMedicineName(), stock.getBatchNumber());
        return PharmacyStockResponse.fromEntity(stock);
    }

    @PutMapping("/{id}")
    public PharmacyStockResponse update(@PathVariable UUID id, @RequestBody UpdatePharmacyStockRequest req) {
        PharmacyStock stock = stockRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Stock not found"));
        if (req.getMedicineName() != null) stock.setMedicineName(req.getMedicineName());
        if (req.getCategory() != null) stock.setCategory(req.getCategory());
        if (req.getBatchNumber() != null) stock.setBatchNumber(req.getBatchNumber());
        if (req.getManufacturer() != null) stock.setManufacturer(req.getManufacturer());
        if (req.getDosageForm() != null) stock.setDosageForm(req.getDosageForm());
        if (req.getStrength() != null) stock.setStrength(req.getStrength());
        if (req.getQuantity() != null) stock.setQuantity(req.getQuantity());
        if (req.getMinimumStockLevel() != null) stock.setMinimumStockLevel(req.getMinimumStockLevel());
        if (req.getExpiryDate() != null) stock.setExpiryDate(req.getExpiryDate());
        if (req.getUnitPrice() != null) stock.setUnitPrice(req.getUnitPrice());
        if (req.getStorageCondition() != null) stock.setStorageCondition(req.getStorageCondition());
        if (req.getScheduleClass() != null) stock.setScheduleClass(req.getScheduleClass());
        if (req.getNotes() != null) stock.setNotes(req.getNotes());
        return PharmacyStockResponse.fromEntity(stockRepo.save(stock));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        stockRepo.deleteById(id);
    }
}
