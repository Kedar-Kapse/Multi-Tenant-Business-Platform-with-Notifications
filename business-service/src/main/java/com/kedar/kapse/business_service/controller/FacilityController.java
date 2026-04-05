package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.platform_core.dto.*;
import com.kedar.kapse.platform_core.entity.Facility;
import com.kedar.kapse.platform_core.entity.Tenant;
import com.kedar.kapse.platform_core.enums.FacilityStatus;
import com.kedar.kapse.platform_core.repository.FacilityRepository;
import com.kedar.kapse.platform_core.repository.TenantRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inventory/facilities")
@RequiredArgsConstructor
@Slf4j
public class FacilityController {

    private final FacilityRepository facilityRepo;
    private final TenantRepository tenantRepo;

    @GetMapping
    public List<FacilityResponse> getAll() {
        return facilityRepo.findAll().stream()
                .map(FacilityResponse::fromEntity).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public FacilityResponse getById(@PathVariable UUID id) {
        return FacilityResponse.fromEntity(facilityRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Facility not found")));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FacilityResponse create(@RequestBody CreateFacilityRequest req) {
        Tenant tenant = tenantRepo.findById(UUID.fromString(req.getTenantId()))
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + req.getTenantId()));

        Facility f = Facility.builder()
                .tenant(tenant)
                .name(req.getName())
                .facilityCode(req.getFacilityCode().toUpperCase())
                .facilityType(req.getFacilityType())
                .address(req.getAddress()).city(req.getCity()).state(req.getState()).zipCode(req.getZipCode())
                .phone(req.getPhone()).email(req.getEmail()).totalBeds(req.getTotalBeds())
                .status(FacilityStatus.ACTIVE)
                .build();
        f = facilityRepo.save(f);
        log.info("Created facility: {}", f.getName());
        return FacilityResponse.fromEntity(f);
    }

    @PutMapping("/{id}")
    public FacilityResponse update(@PathVariable UUID id, @RequestBody UpdateFacilityRequest req) {
        Facility f = facilityRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Facility not found"));
        if (req.getName() != null) f.setName(req.getName());
        if (req.getFacilityType() != null) f.setFacilityType(req.getFacilityType());
        if (req.getAddress() != null) f.setAddress(req.getAddress());
        if (req.getCity() != null) f.setCity(req.getCity());
        if (req.getState() != null) f.setState(req.getState());
        if (req.getZipCode() != null) f.setZipCode(req.getZipCode());
        if (req.getPhone() != null) f.setPhone(req.getPhone());
        if (req.getEmail() != null) f.setEmail(req.getEmail());
        if (req.getTotalBeds() != null) f.setTotalBeds(req.getTotalBeds());
        return FacilityResponse.fromEntity(facilityRepo.save(f));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable UUID id) {
        Facility f = facilityRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Facility not found"));
        f.setStatus(FacilityStatus.INACTIVE);
        facilityRepo.save(f);
    }

    @PatchMapping("/{id}/activate")
    public FacilityResponse activate(@PathVariable UUID id) {
        Facility f = facilityRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Facility not found"));
        f.setStatus(FacilityStatus.ACTIVE);
        return FacilityResponse.fromEntity(facilityRepo.save(f));
    }
}
