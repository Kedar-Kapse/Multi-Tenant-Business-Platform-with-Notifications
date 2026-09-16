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

}
