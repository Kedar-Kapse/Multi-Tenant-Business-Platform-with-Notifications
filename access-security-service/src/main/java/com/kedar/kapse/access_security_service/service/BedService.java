package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.BedResponse;
import com.kedar.kapse.platform_core.dto.CreateBedRequest;
import com.kedar.kapse.platform_core.dto.UpdateBedRequest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface BedService {
    BedResponse createBed(UUID facilityId, CreateBedRequest request);
    List<BedResponse> listBedsByFacility(UUID facilityId);
    BedResponse getBedById(UUID bedId);
    BedResponse updateBed(UUID bedId, UpdateBedRequest request);
    void deleteBed(UUID bedId);
    List<BedResponse> searchBeds(UUID facilityId, String query);
    List<BedResponse> filterBedsByStatus(UUID facilityId, String status);
    List<BedResponse> filterBedsByWard(UUID facilityId, String wardName);
    List<BedResponse> filterBedsByType(UUID facilityId, String bedType);
    List<String> getWardsByFacility(UUID facilityId);
    Map<String, Long> getBedStatistics(UUID facilityId);
}
