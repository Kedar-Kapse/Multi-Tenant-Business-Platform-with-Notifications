package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.CreateStaffRequest;
import com.kedar.kapse.platform_core.dto.CreateUserRequest;
import com.kedar.kapse.platform_core.dto.StaffResponse;
import com.kedar.kapse.platform_core.dto.UpdateStaffRequest;
import com.kedar.kapse.platform_core.entity.Staff;
import com.kedar.kapse.platform_core.repository.StaffRepository;
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
    private static final Map<StaffRole, String> ROLE_TO_KEYCLOAK = Map.of(
            StaffRole.DOCTOR, "PHYSICIAN",
            StaffRole.THERAPIST, "THERAPIST",
            StaffRole.NURSE, "NURSE",
            StaffRole.PHARMACIST, "PROVIDER",
            StaffRole.TECHNICIAN, "PROVIDER",
            StaffRole.BILLING, "ADMIN",
            StaffRole.ADMIN, "ADMIN"
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
                String keycloakRole = ROLE_TO_KEYCLOAK.getOrDefault(request.getRole(), "PROVIDER");
                keycloakService.assignRoleInRealm(tenantRealm, keycloakUserId, keycloakRole);
                log.info("Assigned Keycloak role '{}' to user '{}' in realm '{}'",
                        keycloakRole, username, tenantRealm);

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
        return StaffResponse.fromEntity(staff);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StaffResponse> getAllStaff(Pageable pageable) {
        return staffRepository.findAll(pageable).map(StaffResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public StaffResponse getStaffById(UUID id) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Staff member not found with id: " + id));
        return StaffResponse.fromEntity(staff);
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
        return StaffResponse.fromEntity(staff);
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
        return StaffResponse.fromEntity(staff);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StaffResponse> searchStaff(String query, StaffRole role, StaffStatus status, Pageable pageable) {
        return staffRepository.searchStaff(query, role, status, pageable).map(StaffResponse::fromEntity);
    }
}
