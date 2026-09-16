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
public class BedResponse {

    private UUID id;
    private UUID facilityId;
    private String facilityName;
    private String wardName;
    private String roomNumber;
    private String bedNumber;
    private String bedType;
    private String status;
    private String assignedPatientId;
    private String assignedPatientName;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String bedLabel;

}
