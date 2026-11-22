package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.enums.StaffRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A care-team member as patients may see them: no email, phone, address,
 * date of birth or licence number. "id" is the Keycloak user id used for
 * appointments and messages.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderDirectoryEntry {
    private String id;
    private String firstName;
    private String lastName;
    private StaffRole role;
    private String specialization;
    private Integer experienceYears;
    private String profilePhotoUrl;
}
