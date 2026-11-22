package com.kedar.kapse.business_service.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import com.kedar.kapse.business_service.service.PharmacyStockService;
import com.kedar.kapse.platform_core.dto.CreatePharmacyStockRequest;
import com.kedar.kapse.platform_core.dto.PharmacyStockResponse;
import com.kedar.kapse.platform_core.dto.UpdatePharmacyStockRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@PreAuthorize("hasAnyRole('ADMIN','PROVIDER','PHYSICIAN','NURSE','THERAPIST')") // all hospital staff; writes below may require ADMIN
@RestController
@RequestMapping("/api/inventory/pharmacy")
@RequiredArgsConstructor
public class PharmacyController {

    private final PharmacyStockService pharmacyStockService;

    @GetMapping
    public List<PharmacyStockResponse> getAll(@RequestParam(required = false) UUID facilityId,
                                               @RequestParam(required = false) String query,
                                               @RequestParam(required = false) String status,
                                               @RequestParam(required = false) String category) {
        if (facilityId == null) return pharmacyStockService.listStockByFacility(null);
        if (query != null)    return pharmacyStockService.searchStock(facilityId, query);
        if (status != null)   return pharmacyStockService.filterByStatus(facilityId, status);
        if (category != null) return pharmacyStockService.filterByCategory(facilityId, category);
        return pharmacyStockService.listStockByFacility(facilityId);
    }

    @GetMapping("/{id}")
    public PharmacyStockResponse getById(@PathVariable UUID id) {
        return pharmacyStockService.getStockById(id);
    }

    @GetMapping("/low-stock")
    public List<PharmacyStockResponse> getLowStock(@RequestParam UUID facilityId) {
        return pharmacyStockService.getLowStock(facilityId);
    }

    @GetMapping("/expiring-soon")
    public List<PharmacyStockResponse> getExpiringSoon(@RequestParam UUID facilityId,
                                                        @RequestParam(defaultValue = "30") int days) {
        return pharmacyStockService.getExpiringSoon(facilityId, days);
    }

    @GetMapping("/categories")
    public List<String> getCategories(@RequestParam UUID facilityId) {
        return pharmacyStockService.getCategoriesByFacility(facilityId);
    }

    @GetMapping("/statistics")
    public Map<String, Long> getStatistics(@RequestParam UUID facilityId) {
        return pharmacyStockService.getStockStatistics(facilityId);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PharmacyStockResponse create(@Valid @RequestBody CreatePharmacyStockRequest req) {
        return pharmacyStockService.createStock(req);
    }

    @PutMapping("/{id}")
    public PharmacyStockResponse update(@PathVariable UUID id, @Valid @RequestBody UpdatePharmacyStockRequest req) {
        return pharmacyStockService.updateStock(id, req);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        pharmacyStockService.deleteStock(id);
    }
}
