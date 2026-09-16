package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.service.FacilityService;
import com.kedar.kapse.platform_core.dto.CreateFacilityRequest;
import com.kedar.kapse.platform_core.dto.FacilityResponse;
import com.kedar.kapse.platform_core.dto.UpdateFacilityRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory/facilities")
@RequiredArgsConstructor
public class FacilityController {

    private final FacilityService facilityService;

    @GetMapping
    public List<FacilityResponse> getAll(@RequestParam(required = false) UUID tenantId,
                                         @RequestParam(required = false) String query) {
        if (tenantId != null && query != null) return facilityService.searchFacilities(tenantId, query);
        if (tenantId != null)                  return facilityService.listFacilitiesByTenant(tenantId);
        return facilityService.listFacilities();
    }

    @GetMapping("/{id}")
    public FacilityResponse getById(@PathVariable UUID id) {
        return facilityService.getFacilityById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FacilityResponse create(@RequestBody CreateFacilityRequest req) {
        return facilityService.createFacility(req);
    }

    @PutMapping("/{id}")
    public FacilityResponse update(@PathVariable UUID id, @RequestBody UpdateFacilityRequest req) {
        return facilityService.updateFacility(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable UUID id) {
        facilityService.deactivateFacility(id);
    }

    @PatchMapping("/{id}/activate")
    public FacilityResponse activate(@PathVariable UUID id) {
        return facilityService.activateFacility(id);
    }
}
