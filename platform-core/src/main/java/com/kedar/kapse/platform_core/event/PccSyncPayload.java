package com.kedar.kapse.platform_core.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PccSyncPayload {
    private String patientId;
    private String tenantRealm;
}
