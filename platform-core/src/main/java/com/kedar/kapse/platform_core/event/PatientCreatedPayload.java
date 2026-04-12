package com.kedar.kapse.platform_core.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientCreatedPayload {
    private String patientId;
    private String email;
    private String firstName;
    private String lastName;
    private String tenantRealm;
    private String registrationLink;
}
