package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.access_security_service.entity.Staff;
import com.kedar.kapse.access_security_service.mapper.ResponseMapper;
import com.kedar.kapse.access_security_service.repository.StaffRepository;
import com.kedar.kapse.platform_core.dto.CreateStaffRequest;
import com.kedar.kapse.platform_core.dto.CreateUserRequest;
import com.kedar.kapse.platform_core.dto.StaffResponse;
import com.kedar.kapse.platform_core.dto.UpdateStaffRequest;
import com.kedar.kapse.platform_core.enums.KeycloakRole;
import com.kedar.kapse.platform_core.enums.StaffRole;
import com.kedar.kapse.platform_core.enums.StaffStatus;
import com.kedar.kapse.platform_core.security.TenantContext;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaffServiceImpl implements StaffService {

    private final StaffRepository staffRepository;
    private final KeycloakService keycloakService;

    /**
     * Maps StaffRole (app-level) to Keycloak realm role name.
     */
    private static final Map<StaffRole, KeycloakRole> ROLE_TO_KEYCLOAK = Map.of(
            StaffRole.DOCTOR, KeycloakRole.PHYSICIAN,
            StaffRole.THERAPIST, KeycloakRole.THERAPIST,
            StaffRole.NURSE, KeycloakRole.NURSE,
            StaffRole.PHARMACIST, KeycloakRole.PROVIDER,
            StaffRole.TECHNICIAN, KeycloakRole.PROVIDER,
            StaffRole.BILLING, KeycloakRole.ADMIN,
            StaffRole.ADMIN, KeycloakRole.ADMIN
    );

    @Override
    @Transactional
    public StaffResponse createStaff(CreateStaffRequest request) {
        log.info("Creating staff: {} {} ({}), role={}",
                request.getFirstName(), request.getLastName(), request.getEmail(), request.getRole());

        if (staffRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("A staff member with email '" + request.getEmail() + "' already exists");
        }

        String tenantRealm = TenantContext.getTenantId();
        String keycloakUserId = null;

        // Step 1: Create user in Keycloak
        if (tenantRealm != null) {
            try {
                String username = request.getEmail().split("@")[0];
                CreateUserRequest userReq = new CreateUserRequest();
                userReq.setUsername(username);
                userReq.setEmail(request.getEmail());
                userReq.setFirstName(request.getFirstName());
                userReq.setLastName(request.getLastName());
                userReq.setPassword(request.getPassword());

                keycloakUserId = keycloakService.createUserInRealm(tenantRealm, userReq);
                log.info("Created Keycloak user '{}' in realm '{}', id={}", username, tenantRealm, keycloakUserId);

                // Step 2: Assign Keycloak realm role
                KeycloakRole keycloakRole = ROLE_TO_KEYCLOAK.getOrDefault(request.getRole(), KeycloakRole.PROVIDER);
                keycloakService.assignRoleInRealm(tenantRealm, keycloakUserId, keycloakRole);
                log.info("Assigned Keycloak role '{}' to user '{}' in realm '{}'",
                        keycloakRole.name(), username, tenantRealm);

            } catch (Exception e) {
                log.error("Keycloak user creation failed for '{}': {}", request.getEmail(), e.getMessage());
                throw new RuntimeException("Failed to create user in Keycloak: " + e.getMessage(), e);
            }
        }

        // Step 3: Save staff to database
        Staff staff = Staff.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .role(request.getRole())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .licenseNumber(request.getLicenseNumber())
                .specialization(request.getSpecialization())
                .experienceYears(request.getExperienceYears())
                .addressLine1(request.getAddressLine1())
                .addressLine2(request.getAddressLine2())
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .zipCode(request.getZipCode())
                .profilePhotoUrl(request.getProfilePhotoUrl())
                .keycloakUserId(keycloakUserId)
                .status(StaffStatus.ACTIVE)
                .build();

        staff = staffRepository.save(staff);
        log.info("Staff created: id={}, email={}, keycloakId={}", staff.getId(), staff.getEmail(), keycloakUserId);
        return ResponseMapper.toStaffResponse(staff);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StaffResponse> getAllStaff(Pageable pageable) {
        return staffRepository.findAll(pageable).map(ResponseMapper::toStaffResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public StaffResponse getStaffById(UUID id) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Staff member not found with id: " + id));
        return ResponseMapper.toStaffResponse(staff);
    }

    @Override
    @Transactional
    public StaffResponse updateStaff(UUID id, UpdateStaffRequest request) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Staff member not found with id: " + id));

        if (staffRepository.existsByEmailAndIdNot(request.getEmail(), id)) {
            throw new IllegalArgumentException("A staff member with email '" + request.getEmail() + "' already exists");
        }

        staff.setFirstName(request.getFirstName());
        staff.setLastName(request.getLastName());
        staff.setEmail(request.getEmail());
        staff.setPhone(request.getPhone());
        staff.setRole(request.getRole());
        staff.setDateOfBirth(request.getDateOfBirth());
        staff.setGender(request.getGender());
        staff.setLicenseNumber(request.getLicenseNumber());
        staff.setSpecialization(request.getSpecialization());
        staff.setExperienceYears(request.getExperienceYears());
        staff.setAddressLine1(request.getAddressLine1());
        staff.setAddressLine2(request.getAddressLine2());
        staff.setCity(request.getCity());
        staff.setState(request.getState());
        staff.setCountry(request.getCountry());
        staff.setZipCode(request.getZipCode());
        staff.setProfilePhotoUrl(request.getProfilePhotoUrl());

        staff = staffRepository.save(staff);
        return ResponseMapper.toStaffResponse(staff);
    }

    @Override
    @Transactional
    public void deactivateStaff(UUID id) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Staff member not found with id: " + id));

        // Disable in Keycloak
        if (staff.getKeycloakUserId() != null) {
            try {
                keycloakService.disableUser(staff.getKeycloakUserId());
                log.info("Disabled Keycloak user '{}'", staff.getKeycloakUserId());
            } catch (Exception e) {
                log.warn("Failed to disable Keycloak user '{}': {}", staff.getKeycloakUserId(), e.getMessage());
            }
        }

        staff.setStatus(StaffStatus.INACTIVE);
        staffRepository.save(staff);
    }

    @Override
    @Transactional
    public StaffResponse activateStaff(UUID id) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Staff member not found with id: " + id));

        // Re-enable in Keycloak
        if (staff.getKeycloakUserId() != null) {
            try {
                keycloakService.enableUser(staff.getKeycloakUserId());
                log.info("Enabled Keycloak user '{}'", staff.getKeycloakUserId());
            } catch (Exception e) {
                log.warn("Failed to enable Keycloak user '{}': {}", staff.getKeycloakUserId(), e.getMessage());
            }
        }

        staff.setStatus(StaffStatus.ACTIVE);
        staff = staffRepository.save(staff);
        log.info("Staff '{}' activated", staff.getEmail());
        return ResponseMapper.toStaffResponse(staff);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StaffResponse> searchStaff(String query, StaffRole role, StaffStatus status, Pageable pageable) {
        return staffRepository.searchStaff(query, role, status, pageable).map(ResponseMapper::toStaffResponse);
    }

    private static final java.util.List<StaffRole> CLINICAL_ROLES =
            java.util.List.of(StaffRole.DOCTOR, StaffRole.NURSE, StaffRole.THERAPIST);

    private Staff findMine(String keycloakUserId) {
        return staffRepository.findByKeycloakUserId(keycloakUserId)
                .orElseThrow(() -> new EntityNotFoundException("No staff record for this login"));
    }

    @Override
    @Transactional(readOnly = true)
    public StaffResponse getMyProfile(String keycloakUserId) {
        return ResponseMapper.toStaffResponse(findMine(keycloakUserId));
    }

    @Override
    public StaffResponse updateMyProfile(String keycloakUserId,
                                         com.kedar.kapse.platform_core.dto.UpdateMyStaffProfileRequest r) {
        Staff staff = findMine(keycloakUserId);
        if (r.getPhone() != null) staff.setPhone(blankToNull(r.getPhone()));
        if (r.getSpecialization() != null) staff.setSpecialization(blankToNull(r.getSpecialization()));
        if (r.getLicenseNumber() != null) staff.setLicenseNumber(blankToNull(r.getLicenseNumber()));
        if (r.getExperienceYears() != null) staff.setExperienceYears(r.getExperienceYears());
        if (r.getAddressLine1() != null) staff.setAddressLine1(blankToNull(r.getAddressLine1()));
        if (r.getAddressLine2() != null) staff.setAddressLine2(blankToNull(r.getAddressLine2()));
        if (r.getCity() != null) staff.setCity(blankToNull(r.getCity()));
        if (r.getState() != null) staff.setState(blankToNull(r.getState()));
        if (r.getCountry() != null) staff.setCountry(blankToNull(r.getCountry()));
        if (r.getZipCode() != null) staff.setZipCode(blankToNull(r.getZipCode()));
        return ResponseMapper.toStaffResponse(staffRepository.save(staff));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<com.kedar.kapse.platform_core.dto.ProviderDirectoryEntry> providerDirectory(
            String query, StaffRole role, Pageable pageable) {
        java.util.Collection<StaffRole> roles = role != null && CLINICAL_ROLES.contains(role)
                ? java.util.List.of(role) : CLINICAL_ROLES;
        return staffRepository.findDirectory(query, roles, pageable)
                .map(s -> com.kedar.kapse.platform_core.dto.ProviderDirectoryEntry.builder()
                        .id(s.getKeycloakUserId())
                        .firstName(s.getFirstName())
                        .lastName(s.getLastName())
                        .role(s.getRole())
                        .specialization(s.getSpecialization())
                        .experienceYears(s.getExperienceYears())
                        .profilePhotoUrl(s.getProfilePhotoUrl())
                        .build());
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
