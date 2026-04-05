package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.entity.Bed;
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

    public static BedResponse fromEntity(Bed bed) {
        if (bed == null) return null;
        return BedResponse.builder()
                .id(bed.getId())
                .facilityId(bed.getFacility() != null ? bed.getFacility().getId() : null)
                .facilityName(bed.getFacility() != null ? bed.getFacility().getName() : null)
                .wardName(bed.getWardName())
                .roomNumber(bed.getRoomNumber())
                .bedNumber(bed.getBedNumber())
                .bedType(bed.getBedType() != null ? bed.getBedType().name() : null)
                .status(bed.getStatus() != null ? bed.getStatus().name() : null)
                .assignedPatientId(bed.getAssignedPatientId())
                .assignedPatientName(bed.getAssignedPatientName())
                .notes(bed.getNotes())
                .bedLabel(bed.getWardName() + "-" + bed.getRoomNumber() + "-" + bed.getBedNumber())
                .createdAt(bed.getCreatedAt())
                .updatedAt(bed.getUpdatedAt())
                .build();
    }
}
