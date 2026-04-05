package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.entity.Tenant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantResponse {

    private UUID id;
    private String name;
    private String tenantCode;
    private String realmName;
    private String schemaName;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TenantResponse fromEntity(Tenant tenant) {
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
