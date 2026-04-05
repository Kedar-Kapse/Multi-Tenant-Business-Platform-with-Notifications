package com.kedar.kapse.platform_core.dto;

import com.kedar.kapse.platform_core.entity.Facility;
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
public class FacilityResponse {

    private UUID id;
    private UUID tenantId;
    private String tenantName;
    private String name;
    private String facilityCode;
    private String facilityType;
    private String address;
    private String city;
    private String state;
    private String zipCode;
    private String phone;
    private String email;
    private Integer totalBeds;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FacilityResponse fromEntity(Facility facility) {
        if (facility == null) return null;
        return FacilityResponse.builder()
                .id(facility.getId())
                .tenantId(facility.getTenant() != null ? facility.getTenant().getId() : null)
                .tenantName(facility.getTenant() != null ? facility.getTenant().getName() : null)
                .name(facility.getName())
                .facilityCode(facility.getFacilityCode())
                .facilityType(facility.getFacilityType())
                .address(facility.getAddress())
                .city(facility.getCity())
                .state(facility.getState())
                .zipCode(facility.getZipCode())
                .phone(facility.getPhone())
                .email(facility.getEmail())
                .totalBeds(facility.getTotalBeds())
                .status(facility.getStatus() != null ? facility.getStatus().name() : null)
                .createdAt(facility.getCreatedAt())
                .updatedAt(facility.getUpdatedAt())
                .build();
    }
}
