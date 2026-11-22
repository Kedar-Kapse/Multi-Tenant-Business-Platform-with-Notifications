package com.kedar.kapse.platform_core.dto;

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

    // Only filled in the response to "create hospital", and never stored by us:
    // the first admin's login details, shown once to the platform admin.
    private String adminUsername;
    private String adminTemporaryPassword;
    private String adminLoginUrl;

}
