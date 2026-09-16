package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.enums.PatientStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalPatientDto {
    private UUID id;
    private String email;
    private String keycloakUserId;
    private String tenantRealm;
    private PatientStatus status;
}
