package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.CreateFacilityRequest;
import com.kedar.kapse.platform_core.dto.FacilityResponse;
import com.kedar.kapse.platform_core.dto.UpdateFacilityRequest;
import com.kedar.kapse.platform_core.entity.Facility;
import com.kedar.kapse.platform_core.entity.Tenant;
import com.kedar.kapse.platform_core.repository.FacilityRepository;
import com.kedar.kapse.platform_core.repository.TenantRepository;
import com.kedar.kapse.platform_core.enums.FacilityStatus;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FacilityServiceImpl implements FacilityService {

    private final FacilityRepository facilityRepository;
    private final TenantRepository tenantRepository;

    @Override
    @Transactional
    public FacilityResponse createFacility(CreateFacilityRequest request) {
        UUID tenantId = UUID.fromString(request.getTenantId());
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found: " + tenantId));

        log.info("Creating facility '{}' for tenant '{}'", request.getName(), tenant.getTenantCode());

        Facility facility = Facility.builder()
                .tenant(tenant)
                .name(request.getName())
                .facilityCode(request.getFacilityCode().toUpperCase())
                .facilityType(request.getFacilityType())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .zipCode(request.getZipCode())
                .phone(request.getPhone())
                .email(request.getEmail())
                .totalBeds(request.getTotalBeds())
                .status(FacilityStatus.ACTIVE)
                .build();

        facility = facilityRepository.save(facility);
        log.info("Facility '{}' created with id={}", facility.getFacilityCode(), facility.getId());
        return FacilityResponse.fromEntity(facility);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FacilityResponse> listFacilities() {
        return facilityRepository.findAll().stream()
                .map(FacilityResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FacilityResponse> listFacilitiesByTenant(UUID tenantId) {
        return facilityRepository.findByTenantId(tenantId).stream()
                .map(FacilityResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public FacilityResponse getFacilityById(UUID facilityId) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new EntityNotFoundException("Facility not found: " + facilityId));
        return FacilityResponse.fromEntity(facility);
    }

    @Override
    @Transactional
    public FacilityResponse updateFacility(UUID facilityId, UpdateFacilityRequest request) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new EntityNotFoundException("Facility not found: " + facilityId));

        if (request.getName() != null) facility.setName(request.getName());
        if (request.getFacilityType() != null) facility.setFacilityType(request.getFacilityType());
        if (request.getAddress() != null) facility.setAddress(request.getAddress());
        if (request.getCity() != null) facility.setCity(request.getCity());
        if (request.getState() != null) facility.setState(request.getState());
        if (request.getZipCode() != null) facility.setZipCode(request.getZipCode());
        if (request.getPhone() != null) facility.setPhone(request.getPhone());
        if (request.getEmail() != null) facility.setEmail(request.getEmail());
        if (request.getTotalBeds() != null) facility.setTotalBeds(request.getTotalBeds());
        if (request.getStatus() != null) facility.setStatus(FacilityStatus.valueOf(request.getStatus()));

        facility = facilityRepository.save(facility);
        log.info("Facility '{}' updated", facility.getFacilityCode());
        return FacilityResponse.fromEntity(facility);
    }

    @Override
    @Transactional
    public void deactivateFacility(UUID facilityId) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new EntityNotFoundException("Facility not found: " + facilityId));
        facility.setStatus(FacilityStatus.INACTIVE);
        facilityRepository.save(facility);
        log.info("Facility '{}' deactivated", facility.getFacilityCode());
    }

    @Override
    @Transactional
    public FacilityResponse activateFacility(UUID facilityId) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new EntityNotFoundException("Facility not found: " + facilityId));
        facility.setStatus(FacilityStatus.ACTIVE);
        facility = facilityRepository.save(facility);
        log.info("Facility '{}' activated", facility.getFacilityCode());
        return FacilityResponse.fromEntity(facility);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FacilityResponse> searchFacilities(UUID tenantId, String query) {
        return facilityRepository.searchByTenant(tenantId, query).stream()
                .map(FacilityResponse::fromEntity)
                .collect(Collectors.toList());
    }
}
