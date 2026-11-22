package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.service.AuditService;
import com.kedar.kapse.platform_core.enums.AuditAction;
import com.kedar.kapse.platform_core.enums.AuditEntityType;
import com.kedar.kapse.platform_core.security.CurrentUser;
import com.kedar.kapse.platform_core.dto.UpdateMyStaffProfileRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import com.kedar.kapse.access_security_service.service.StaffService;
import com.kedar.kapse.platform_core.dto.CreateStaffRequest;
import com.kedar.kapse.platform_core.dto.StaffResponse;
import com.kedar.kapse.platform_core.dto.UpdateStaffRequest;
import com.kedar.kapse.platform_core.enums.StaffRole;
import com.kedar.kapse.platform_core.enums.StaffStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/v1/staff")
@RequiredArgsConstructor
@Slf4j
public class StaffController {

    /** Everyone who works at the hospital may look staff up; only ADMIN changes staff. */
    private static final String STAFF = "hasAnyRole('ADMIN','PROVIDER','PHYSICIAN','NURSE','THERAPIST')";

    private final StaffService staffService;
    private final AuditService auditService;

    /** The logged-in staff member's own record (provider portal "My Profile"). */
    @GetMapping("/me")
    @PreAuthorize(STAFF)
    public StaffResponse getMyProfile() {
        return staffService.getMyProfile(CurrentUser.get().id());
    }

    /** A staff member edits their own contact/professional details (not name, role or status). */
    @PatchMapping("/me")
    @PreAuthorize(STAFF)
    public StaffResponse updateMyProfile(@Valid @RequestBody UpdateMyStaffProfileRequest request) {
        StaffResponse me = staffService.updateMyProfile(CurrentUser.get().id(), request);
        auditService.recordByCurrentUser(AuditEntityType.STAFF, me.getId().toString(), AuditAction.STAFF_PROFILE_UPDATED, "Own profile");
        return me;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public StaffResponse createStaff(@Valid @RequestBody CreateStaffRequest request) {
        log.info("POST /api/admin/v1/staff — creating staff '{}' '{}'", request.getFirstName(), request.getLastName());
        StaffResponse created = staffService.createStaff(request);
        auditService.recordByCurrentUser(AuditEntityType.STAFF, created.getId().toString(), AuditAction.STAFF_CREATED,
                created.getFirstName() + " " + created.getLastName() + " (" + created.getRole() + ")");
        return created;
    }

    @GetMapping
    @PreAuthorize(STAFF)
    public Page<StaffResponse> getAllStaff(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        return staffService.getAllStaff(PageRequest.of(page, size, sort));
    }

    @GetMapping("/{id}")
    @PreAuthorize(STAFF)
    public StaffResponse getStaffById(@PathVariable UUID id) {
        return staffService.getStaffById(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public StaffResponse updateStaff(@PathVariable UUID id, @Valid @RequestBody UpdateStaffRequest request) {
        StaffResponse updated = staffService.updateStaff(id, request);
        auditService.recordByCurrentUser(AuditEntityType.STAFF, id.toString(), AuditAction.STAFF_UPDATED,
                updated.getFirstName() + " " + updated.getLastName() + " (" + updated.getRole() + ", " + updated.getStatus() + ")");
        return updated;
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivateStaff(@PathVariable UUID id) {
        staffService.deactivateStaff(id);
        auditService.recordByCurrentUser(AuditEntityType.STAFF, id.toString(), AuditAction.STAFF_DELETED, "Deactivated");
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public StaffResponse activateStaff(@PathVariable UUID id) {
        log.info("PATCH /api/admin/v1/staff/{}/activate — activating staff", id);
        StaffResponse activated = staffService.activateStaff(id);
        auditService.recordByCurrentUser(AuditEntityType.STAFF, id.toString(), AuditAction.STAFF_ACTIVATED,
                activated.getFirstName() + " " + activated.getLastName());
        return activated;
    }

    @GetMapping("/search")
    @PreAuthorize(STAFF)
    public Page<StaffResponse> searchStaff(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) StaffRole role,
            @RequestParam(required = false) StaffStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return staffService.searchStaff(query, role, status, PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }
}
