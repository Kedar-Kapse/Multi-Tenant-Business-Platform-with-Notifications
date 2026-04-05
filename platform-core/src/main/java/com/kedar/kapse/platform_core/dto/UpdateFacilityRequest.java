package com.kedar.kapse.platform_core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateFacilityRequest {
    private String name;
    private String facilityType;
    private String address;
    private String city;
    private String state;
    private String zipCode;
    private String phone;
    private String email;
    private Integer totalBeds;
    private String status;
}
