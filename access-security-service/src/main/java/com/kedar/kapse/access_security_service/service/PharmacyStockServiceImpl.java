package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.CreatePharmacyStockRequest;
import com.kedar.kapse.platform_core.dto.PharmacyStockResponse;
import com.kedar.kapse.platform_core.dto.UpdatePharmacyStockRequest;
import com.kedar.kapse.platform_core.entity.Facility;
import com.kedar.kapse.platform_core.entity.PharmacyStock;
import com.kedar.kapse.platform_core.repository.FacilityRepository;
import com.kedar.kapse.platform_core.repository.PharmacyStockRepository;
import com.kedar.kapse.platform_core.enums.MedicineStatus;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PharmacyStockServiceImpl implements PharmacyStockService {

    private final PharmacyStockRepository pharmacyStockRepository;
    private final FacilityRepository facilityRepository;

    @Override
    @Transactional
    public PharmacyStockResponse createStock(CreatePharmacyStockRequest request) {
        UUID facilityId = UUID.fromString(request.getFacilityId());
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new EntityNotFoundException("Facility not found: " + facilityId));

        log.info("Adding medicine '{}' batch '{}' to facility '{}'",
                request.getMedicineName(), request.getBatchNumber(), facility.getName());

        PharmacyStock stock = PharmacyStock.builder()
                .facility(facility)
                .medicineName(request.getMedicineName())
                .category(request.getCategory())
                .batchNumber(request.getBatchNumber())
                .manufacturer(request.getManufacturer())
                .dosageForm(request.getDosageForm())
                .strength(request.getStrength())
                .quantity(request.getQuantity())
                .minimumStockLevel(request.getMinimumStockLevel() != null ? request.getMinimumStockLevel() : 50)
                .expiryDate(request.getExpiryDate())
                .unitPrice(request.getUnitPrice())
                .storageCondition(request.getStorageCondition())
                .scheduleClass(request.getScheduleClass())
                .notes(request.getNotes())
                .build();

        stock = pharmacyStockRepository.save(stock);
        log.info("Medicine '{}' added with id={}, status={}", stock.getMedicineName(), stock.getId(), stock.getStatus());
        return PharmacyStockResponse.fromEntity(stock);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyStockResponse> listStockByFacility(UUID facilityId) {
        return pharmacyStockRepository.findByFacilityId(facilityId).stream()
                .map(PharmacyStockResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PharmacyStockResponse getStockById(UUID medicineId) {
        PharmacyStock stock = pharmacyStockRepository.findById(medicineId)
                .orElseThrow(() -> new EntityNotFoundException("Medicine not found: " + medicineId));
        return PharmacyStockResponse.fromEntity(stock);
    }

    @Override
    @Transactional
    public PharmacyStockResponse updateStock(UUID medicineId, UpdatePharmacyStockRequest request) {
        PharmacyStock stock = pharmacyStockRepository.findById(medicineId)
                .orElseThrow(() -> new EntityNotFoundException("Medicine not found: " + medicineId));

        if (request.getMedicineName() != null) stock.setMedicineName(request.getMedicineName());
        if (request.getCategory() != null) stock.setCategory(request.getCategory());
        if (request.getBatchNumber() != null) stock.setBatchNumber(request.getBatchNumber());
        if (request.getManufacturer() != null) stock.setManufacturer(request.getManufacturer());
        if (request.getDosageForm() != null) stock.setDosageForm(request.getDosageForm());
        if (request.getStrength() != null) stock.setStrength(request.getStrength());
        if (request.getQuantity() != null) stock.setQuantity(request.getQuantity());
        if (request.getMinimumStockLevel() != null) stock.setMinimumStockLevel(request.getMinimumStockLevel());
        if (request.getExpiryDate() != null) stock.setExpiryDate(request.getExpiryDate());
        if (request.getUnitPrice() != null) stock.setUnitPrice(request.getUnitPrice());
        if (request.getStorageCondition() != null) stock.setStorageCondition(request.getStorageCondition());
        if (request.getScheduleClass() != null) stock.setScheduleClass(request.getScheduleClass());
        if (request.getNotes() != null) stock.setNotes(request.getNotes());

        stock = pharmacyStockRepository.save(stock);
        log.info("Medicine '{}' updated (status={})", stock.getMedicineName(), stock.getStatus());
        return PharmacyStockResponse.fromEntity(stock);
    }

    @Override
    @Transactional
    public void deleteStock(UUID medicineId) {
        PharmacyStock stock = pharmacyStockRepository.findById(medicineId)
                .orElseThrow(() -> new EntityNotFoundException("Medicine not found: " + medicineId));
        pharmacyStockRepository.delete(stock);
        log.info("Medicine '{}' batch '{}' deleted", stock.getMedicineName(), stock.getBatchNumber());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyStockResponse> searchStock(UUID facilityId, String query) {
        return pharmacyStockRepository.searchByFacility(facilityId, query).stream()
                .map(PharmacyStockResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyStockResponse> filterByStatus(UUID facilityId, String status) {
        return pharmacyStockRepository.findByFacilityIdAndStatus(facilityId, MedicineStatus.valueOf(status)).stream()
                .map(PharmacyStockResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyStockResponse> filterByCategory(UUID facilityId, String category) {
        return pharmacyStockRepository.findByFacilityIdAndCategory(facilityId, category).stream()
                .map(PharmacyStockResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyStockResponse> getLowStock(UUID facilityId) {
        return pharmacyStockRepository.findLowStockByFacility(facilityId).stream()
                .map(PharmacyStockResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PharmacyStockResponse> getExpiringSoon(UUID facilityId, int days) {
        LocalDate today = LocalDate.now();
        LocalDate endDate = today.plusDays(days);
        return pharmacyStockRepository.findExpiringSoonByFacility(facilityId, today, endDate).stream()
                .map(PharmacyStockResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getCategoriesByFacility(UUID facilityId) {
        return pharmacyStockRepository.findDistinctCategoriesByFacility(facilityId);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getStockStatistics(UUID facilityId) {
        Map<String, Long> stats = new LinkedHashMap<>();
        long total = 0;
        for (MedicineStatus status : MedicineStatus.values()) {
            long count = pharmacyStockRepository.countByFacilityAndStatus(facilityId, status);
            stats.put(status.name().toLowerCase(), count);
            total += count;
        }
        stats.put("total", total);
        return stats;
    }
}
