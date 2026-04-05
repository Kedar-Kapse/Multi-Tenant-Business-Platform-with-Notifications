package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.platform_core.dto.CreateStaffRequest;
import com.kedar.kapse.platform_core.dto.StaffResponse;
import com.kedar.kapse.platform_core.dto.UpdateStaffRequest;
import com.kedar.kapse.access_security_service.service.StaffService;
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

    private final StaffService staffService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StaffResponse createStaff(@Valid @RequestBody CreateStaffRequest request) {
        log.info("POST /api/admin/v1/staff — creating staff '{}' '{}'", request.getFirstName(), request.getLastName());
        return staffService.createStaff(request);
    }

    @GetMapping
    public Page<StaffResponse> getAllStaff(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        return staffService.getAllStaff(PageRequest.of(page, size, sort));
    }

    @GetMapping("/{id}")
    public StaffResponse getStaffById(@PathVariable UUID id) {
        return staffService.getStaffById(id);
    }

    @PutMapping("/{id}")
    public StaffResponse updateStaff(@PathVariable UUID id, @Valid @RequestBody UpdateStaffRequest request) {
        return staffService.updateStaff(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivateStaff(@PathVariable UUID id) {
        staffService.deactivateStaff(id);
    }

    @PatchMapping("/{id}/activate")
    public StaffResponse activateStaff(@PathVariable UUID id) {
        log.info("PATCH /api/admin/v1/staff/{}/activate — activating staff", id);
        return staffService.activateStaff(id);
    }

    @GetMapping("/search")
    public Page<StaffResponse> searchStaff(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) StaffRole role,
            @RequestParam(required = false) StaffStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return staffService.searchStaff(query, role, status, PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }
}
