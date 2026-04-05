package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.CreateStaffRequest;
import com.kedar.kapse.platform_core.dto.StaffResponse;
import com.kedar.kapse.platform_core.dto.UpdateStaffRequest;
import com.kedar.kapse.platform_core.enums.StaffRole;
import com.kedar.kapse.platform_core.enums.StaffStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface StaffService {

    StaffResponse createStaff(CreateStaffRequest request);

    Page<StaffResponse> getAllStaff(Pageable pageable);

    StaffResponse getStaffById(UUID id);

    StaffResponse updateStaff(UUID id, UpdateStaffRequest request);

    void deactivateStaff(UUID id);

    StaffResponse activateStaff(UUID id);

    Page<StaffResponse> searchStaff(String query, StaffRole role, StaffStatus status, Pageable pageable);
}
