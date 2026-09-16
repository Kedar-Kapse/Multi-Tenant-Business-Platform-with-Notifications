package com.kedar.kapse.platform_core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Outbound representation of an Appointment.
 * Mirrors the current entity JSON 1:1 to preserve backward compatibility,
 * while decoupling the API contract from the persistence layer.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentResponse {

    private UUID id;
    private String patientId;
    private String patientName;
    private String providerId;
    private String providerName;
    private String providerSpecialty;
    private LocalDate appointmentDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String status;
    private String type;
    private String reason;
    private String notes;
    private String facilityName;
    private String facilityAddress;
    private String mode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
