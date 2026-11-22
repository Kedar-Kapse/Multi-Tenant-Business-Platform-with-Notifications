package com.kedar.kapse.business_service.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import com.kedar.kapse.business_service.service.FacilityService;
import com.kedar.kapse.platform_core.dto.CreateFacilityRequest;
import com.kedar.kapse.platform_core.dto.FacilityResponse;
import com.kedar.kapse.platform_core.dto.UpdateFacilityRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@PreAuthorize("hasAnyRole('ADMIN','PROVIDER','PHYSICIAN','NURSE','THERAPIST')") // all hospital staff; writes below may require ADMIN
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

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FacilityResponse create(@Valid @RequestBody CreateFacilityRequest req) {
        return facilityService.createFacility(req);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public FacilityResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateFacilityRequest req) {
        return facilityService.updateFacility(id, req);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable UUID id) {
        facilityService.deactivateFacility(id);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/activate")
    public FacilityResponse activate(@PathVariable UUID id) {
        return facilityService.activateFacility(id);
    }
}
