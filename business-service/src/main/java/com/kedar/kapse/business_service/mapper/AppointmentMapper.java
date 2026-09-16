package com.kedar.kapse.business_service.mapper;

import com.kedar.kapse.business_service.entity.Appointment;
import com.kedar.kapse.platform_core.dto.AppointmentResponse;
import com.kedar.kapse.platform_core.dto.BookAppointmentRequest;
import com.kedar.kapse.platform_core.dto.UpdateAppointmentRequest;

/**
 * Maps between the Appointment entity and its API DTOs.
 * Follows the static-method convention established by {@link InventoryResponseMapper}.
 */
public final class AppointmentMapper {

    private AppointmentMapper() {}

    public static AppointmentResponse toResponse(Appointment a) {
        if (a == null) return null;
        return AppointmentResponse.builder()
                .id(a.getId())
                .patientId(a.getPatientId())
                .patientName(a.getPatientName())
                .providerId(a.getProviderId())
                .providerName(a.getProviderName())
                .providerSpecialty(a.getProviderSpecialty())
                .appointmentDate(a.getAppointmentDate())
                .startTime(a.getStartTime())
                .endTime(a.getEndTime())
                .status(a.getStatus())
                .type(a.getType())
                .reason(a.getReason())
                .notes(a.getNotes())
                .facilityName(a.getFacilityName())
                .facilityAddress(a.getFacilityAddress())
                .mode(a.getMode())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }

    /**
     * Builds a new entity from a booking request. The id is left null and
     * status defaults to SCHEDULED; type/mode fall back to their entity defaults
     * when the client omits them.
     */
    public static Appointment toEntity(BookAppointmentRequest req) {
        Appointment.AppointmentBuilder builder = Appointment.builder()
                .patientId(req.getPatientId())
                .patientName(req.getPatientName())
                .providerId(req.getProviderId())
                .providerName(req.getProviderName())
                .providerSpecialty(req.getProviderSpecialty())
                .appointmentDate(req.getAppointmentDate())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .reason(req.getReason())
                .notes(req.getNotes())
                .facilityName(req.getFacilityName())
                .facilityAddress(req.getFacilityAddress())
                .status("SCHEDULED");
        if (req.getType() != null) builder.type(req.getType());
        if (req.getMode() != null) builder.mode(req.getMode());
        return builder.build();
    }

    /** Applies non-null fields from an update request onto an existing entity (partial update). */
    public static void applyUpdate(Appointment appt, UpdateAppointmentRequest req) {
        if (req.getStatus() != null) appt.setStatus(req.getStatus());
        if (req.getAppointmentDate() != null) appt.setAppointmentDate(req.getAppointmentDate());
        if (req.getStartTime() != null) appt.setStartTime(req.getStartTime());
        if (req.getEndTime() != null) appt.setEndTime(req.getEndTime());
        if (req.getNotes() != null) appt.setNotes(req.getNotes());
        if (req.getReason() != null) appt.setReason(req.getReason());
    }
}
