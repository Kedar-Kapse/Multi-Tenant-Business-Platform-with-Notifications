package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.CreateFacilityRequest;
import com.kedar.kapse.platform_core.dto.FacilityResponse;
import com.kedar.kapse.platform_core.dto.UpdateFacilityRequest;

import java.util.List;
import java.util.UUID;

public interface FacilityService {
    FacilityResponse createFacility(CreateFacilityRequest request);
    List<FacilityResponse> listFacilities();
    List<FacilityResponse> listFacilitiesByTenant(UUID tenantId);
    FacilityResponse getFacilityById(UUID facilityId);
    FacilityResponse updateFacility(UUID facilityId, UpdateFacilityRequest request);
    void deactivateFacility(UUID facilityId);
    FacilityResponse activateFacility(UUID facilityId);
    List<FacilityResponse> searchFacilities(UUID tenantId, String query);
}
