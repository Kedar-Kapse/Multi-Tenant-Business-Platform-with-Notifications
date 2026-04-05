package com.kedar.kapse.platform_core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBedRequest {
    private String wardName;
    private String roomNumber;
    private String bedNumber;
    private String bedType;
    private String status;
    private String assignedPatientId;
    private String assignedPatientName;
    private String notes;
}
