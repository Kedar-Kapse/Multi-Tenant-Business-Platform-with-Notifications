package com.kedar.kapse.platform_core.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Inbound payload for updating an existing appointment.
 * All fields are optional (partial update); only non-null fields are applied,
 * preserving the original controller's patch-style semantics.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAppointmentRequest {

    @Size(max = 30)
    private String status;

    private LocalDate appointmentDate;
    private LocalTime startTime;
    private LocalTime endTime;

    @Size(max = 500)
    private String reason;

    @Size(max = 500)
    private String notes;
}
