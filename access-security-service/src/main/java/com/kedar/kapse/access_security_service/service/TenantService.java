package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.CreateTenantRequest;
import com.kedar.kapse.platform_core.dto.TenantResponse;
import com.kedar.kapse.platform_core.dto.UpdateTenantRequest;

import java.util.List;
import java.util.UUID;

public interface TenantService {

    TenantResponse createTenant(CreateTenantRequest request);

    List<TenantResponse> listTenants();

    TenantResponse getTenantById(UUID tenantId);

    TenantResponse updateTenant(UUID tenantId, UpdateTenantRequest request);

    void deactivateTenant(UUID tenantId);

    TenantResponse activateTenant(UUID tenantId);
}
