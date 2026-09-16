package com.kedar.kapse.platform_core.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Inbound payload for booking an appointment.
 * Only client-settable fields are accepted. Server-owned fields
 * (id, status, createdAt, updatedAt) are deliberately excluded to
 * prevent over-posting / mass-assignment.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookAppointmentRequest {

    @NotBlank(message = "Patient id is required")
    @Size(max = 100)
    private String patientId;

    @NotBlank(message = "Patient name is required")
    @Size(max = 150)
    private String patientName;

    @NotBlank(message = "Provider id is required")
    @Size(max = 100)
    private String providerId;

    @NotBlank(message = "Provider name is required")
    @Size(max = 150)
    private String providerName;

    @Size(max = 100)
    private String providerSpecialty;

    @NotNull(message = "Appointment date is required")
    private LocalDate appointmentDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    @Size(max = 50)
    private String type; // defaults to CONSULTATION when null

    @Size(max = 500)
    private String reason;

    @Size(max = 500)
    private String notes;

    @Size(max = 100)
    private String facilityName;

    @Size(max = 200)
    private String facilityAddress;

    @Size(max = 30)
    private String mode; // defaults to IN_PERSON when null
}
