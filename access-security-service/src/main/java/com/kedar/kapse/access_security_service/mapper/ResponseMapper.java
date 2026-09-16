package com.kedar.kapse.access_security_service.mapper;

import com.kedar.kapse.access_security_service.entity.Staff;
import com.kedar.kapse.access_security_service.entity.Tenant;
import com.kedar.kapse.access_security_service.entity.User;
import com.kedar.kapse.platform_core.dto.StaffResponse;
import com.kedar.kapse.platform_core.dto.TenantResponse;
import com.kedar.kapse.platform_core.dto.UserResponse;

public final class ResponseMapper {

    private ResponseMapper() {}

    public static UserResponse toUserResponse(User user) {
        if (user == null) return null;
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .tenantName(user.getTenant() != null ? user.getTenant().getName() : null)
                .build();
    }

    public static StaffResponse toStaffResponse(Staff staff) {
        if (staff == null) return null;
        return StaffResponse.builder()
                .id(staff.getId())
                .firstName(staff.getFirstName())
                .lastName(staff.getLastName())
                .email(staff.getEmail())
                .phone(staff.getPhone())
                .role(staff.getRole())
                .dateOfBirth(staff.getDateOfBirth())
                .gender(staff.getGender())
                .licenseNumber(staff.getLicenseNumber())
                .specialization(staff.getSpecialization())
                .experienceYears(staff.getExperienceYears())
                .addressLine1(staff.getAddressLine1())
                .addressLine2(staff.getAddressLine2())
                .city(staff.getCity())
                .state(staff.getState())
                .country(staff.getCountry())
                .zipCode(staff.getZipCode())
                .profilePhotoUrl(staff.getProfilePhotoUrl())
                .keycloakUserId(staff.getKeycloakUserId())
                .status(staff.getStatus())
                .createdAt(staff.getCreatedAt())
                .updatedAt(staff.getUpdatedAt())
                .build();
    }

    public static TenantResponse toTenantResponse(Tenant tenant) {
        if (tenant == null) return null;
        return TenantResponse.builder()
                .id(tenant.getId())
                .name(tenant.getName())
                .tenantCode(tenant.getTenantCode())
                .realmName(tenant.getRealmName())
                .schemaName(tenant.getSchemaName())
                .status(tenant.getStatus() != null ? tenant.getStatus().name() : null)
                .createdAt(tenant.getCreatedAt())
                .updatedAt(tenant.getUpdatedAt())
                .build();
    }
}
