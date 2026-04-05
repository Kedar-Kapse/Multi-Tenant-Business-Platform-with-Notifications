package com.kedar.kapse.platform_core.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateBedRequest {

    @NotBlank(message = "Ward name is required")
    @Size(max = 100, message = "Ward name must be under 100 characters")
    private String wardName;

    @NotBlank(message = "Room number is required")
    @Size(max = 20, message = "Room number must be under 20 characters")
    private String roomNumber;

    @NotBlank(message = "Bed number is required")
    @Size(max = 20, message = "Bed number must be under 20 characters")
    private String bedNumber;

    @NotNull(message = "Bed type is required")
    private String bedType; // ICU, GENERAL, PRIVATE, SEMI_PRIVATE, EMERGENCY, etc.

    private String status; // AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE
    private String assignedPatientId;
    private String assignedPatientName;
    private String notes;
}
