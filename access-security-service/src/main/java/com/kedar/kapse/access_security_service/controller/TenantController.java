package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.platform_core.dto.CreateTenantRequest;
import com.kedar.kapse.platform_core.dto.TenantResponse;
import com.kedar.kapse.platform_core.dto.UpdateTenantRequest;
import com.kedar.kapse.access_security_service.service.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/v1/tenants")
@RequiredArgsConstructor
@Slf4j
public class TenantController {

    private final TenantService tenantService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public TenantResponse createTenant(@Valid @RequestBody CreateTenantRequest request) {
        log.info("POST /api/admin/v1/tenants — creating tenant '{}'", request.getName());
        return tenantService.createTenant(request);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<TenantResponse> listTenants() {
        log.info("GET /api/admin/v1/tenants — listing all tenants");
        return tenantService.listTenants();
    }

    @GetMapping("/{tenantId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER')")
    public TenantResponse getTenantById(@PathVariable UUID tenantId) {
        log.info("GET /api/admin/v1/tenants/{} — fetching tenant", tenantId);
        return tenantService.getTenantById(tenantId);
    }

    @PutMapping("/{tenantId}")
    @PreAuthorize("hasRole('ADMIN')")
    public TenantResponse updateTenant(@PathVariable UUID tenantId,
                                       @Valid @RequestBody UpdateTenantRequest request) {
        log.info("PUT /api/admin/v1/tenants/{} — updating tenant", tenantId);
        return tenantService.updateTenant(tenantId, request);
    }

    @DeleteMapping("/{tenantId}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivateTenant(@PathVariable UUID tenantId) {
        log.info("DELETE /api/admin/v1/tenants/{} — deactivating tenant", tenantId);
        tenantService.deactivateTenant(tenantId);
    }

    @PatchMapping("/{tenantId}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public TenantResponse activateTenant(@PathVariable UUID tenantId) {
        log.info("PATCH /api/admin/v1/tenants/{}/activate — activating tenant", tenantId);
        return tenantService.activateTenant(tenantId);
    }
}
