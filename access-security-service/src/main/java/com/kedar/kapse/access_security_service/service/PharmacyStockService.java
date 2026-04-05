package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.CreatePharmacyStockRequest;
import com.kedar.kapse.platform_core.dto.PharmacyStockResponse;
import com.kedar.kapse.platform_core.dto.UpdatePharmacyStockRequest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface PharmacyStockService {
    PharmacyStockResponse createStock(CreatePharmacyStockRequest request);
    List<PharmacyStockResponse> listStockByFacility(UUID facilityId);
    PharmacyStockResponse getStockById(UUID medicineId);
    PharmacyStockResponse updateStock(UUID medicineId, UpdatePharmacyStockRequest request);
    void deleteStock(UUID medicineId);
    List<PharmacyStockResponse> searchStock(UUID facilityId, String query);
    List<PharmacyStockResponse> filterByStatus(UUID facilityId, String status);
    List<PharmacyStockResponse> filterByCategory(UUID facilityId, String category);
    List<PharmacyStockResponse> getLowStock(UUID facilityId);
    List<PharmacyStockResponse> getExpiringSoon(UUID facilityId, int days);
    List<String> getCategoriesByFacility(UUID facilityId);
    Map<String, Long> getStockStatistics(UUID facilityId);
}
