package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.entity.Appointment;
import com.kedar.kapse.business_service.repository.AppointmentRepository;
import com.kedar.kapse.platform_core.security.CurrentUser;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Appointments.
 *  - Hospital staff manage appointments (list / filter / update).
 *  - Patients only ever see and change THEIR OWN appointments: the patient id is
 *    taken from the login token, never from the request.
 */
@RestController @RequestMapping("/api/appointments") @RequiredArgsConstructor @Slf4j
public class AppointmentController {

    private static final String STAFF = "hasAnyRole('ADMIN','PROVIDER','PHYSICIAN','NURSE','THERAPIST')";
    private static final Set<String> STATUSES = Set.of("SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW");
    private static final Set<String> TYPES = Set.of("CONSULTATION", "FOLLOW_UP", "LAB_REVIEW", "PROCEDURE", "TELEHEALTH");

    private final AppointmentRepository repo;
    private final com.kedar.kapse.business_service.service.NotificationPublisher notifications;

    /** Staff view. Filter by provider and/or patient, optionally a date range (from/to, inclusive). */
    @GetMapping
    @PreAuthorize(STAFF)
    public List<Appointment> getAll(@RequestParam(required = false) String patientId,
                                    @RequestParam(required = false) String providerId,
                                    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from != null || to != null) {
            LocalDate f = from != null ? from : to.minusDays(31);
            LocalDate t = to != null ? to : from.plusDays(31);
            List<Appointment> list = providerId != null
                    ? repo.findByProviderIdAndAppointmentDateBetweenOrderByAppointmentDateAscStartTimeAsc(providerId, f, t)
                    : repo.findByAppointmentDateBetweenOrderByAppointmentDateAscStartTimeAsc(f, t);
            return patientId == null ? list : list.stream().filter(a -> patientId.equals(a.getPatientId())).toList();
        }
        if (patientId != null) return repo.findByPatientIdOrderByAppointmentDateDescStartTimeDesc(patientId);
        if (providerId != null) return repo.findByProviderIdOrderByAppointmentDateDescStartTimeDesc(providerId);
        return repo.findAll();
    }

    /** The logged-in patient's own appointments. upcoming=true: scheduled, from today on. */
    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public List<Appointment> mine(@RequestParam(defaultValue = "false") boolean upcoming) {
        String me = CurrentUser.get().id();
        return upcoming
                ? repo.findByPatientIdAndStatusAndAppointmentDateGreaterThanEqualOrderByAppointmentDateAscStartTimeAsc(me, "SCHEDULED", LocalDate.now())
                : repo.findByPatientIdOrderByAppointmentDateDescStartTimeDesc(me);
    }

    @GetMapping("/me/summary")
    @PreAuthorize("hasRole('PATIENT')")
    public Map<String, Object> mySummary() {
        return summaryFor(CurrentUser.get().id());
    }

    @GetMapping("/{id}")
    public Appointment getById(@PathVariable UUID id) {
        return readable(find(id));
    }

    @GetMapping("/upcoming")
    @PreAuthorize(STAFF)
    public List<Appointment> getUpcoming(@RequestParam String patientId) {
        return repo.findByPatientIdAndStatusAndAppointmentDateGreaterThanEqualOrderByAppointmentDateAscStartTimeAsc(patientId, "SCHEDULED", LocalDate.now());
    }

    /** Free one-hour slots 09:00-17:00 for a provider on a date (past times excluded). */
    @GetMapping("/slots")
    public List<Map<String, String>> getAvailableSlots(@RequestParam String providerId, @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date.isBefore(LocalDate.now())) return List.of();
        Set<LocalTime> booked = repo.findByProviderIdAndAppointmentDate(providerId, date).stream()
                .filter(a -> "SCHEDULED".equals(a.getStatus()))
                .map(Appointment::getStartTime)
                .collect(Collectors.toSet());
        LocalTime now = LocalTime.now();
        List<Map<String, String>> slots = new ArrayList<>();
        for (int h = 9; h <= 17; h++) {
            LocalTime t = LocalTime.of(h, 0);
            if (booked.contains(t)) continue;
            if (date.equals(LocalDate.now()) && !t.isAfter(now)) continue;
            slots.add(Map.of("time", t.toString(), "endTime", t.plusHours(1).toString(), "available", "true"));
        }
        return slots;
    }

    /**
     * Book. Patients book for themselves (identity from the token). Staff book for a
     * patient given in the body; a clinician booking without a provider books themselves.
     */
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Appointment book(@RequestBody Appointment req) {
        CurrentUser me = CurrentUser.get();
        Appointment appt = new Appointment();
        if (me.isPatient()) {
            appt.setPatientId(me.id());
            appt.setPatientName(me.name());
        } else if (me.isStaff()) {
            appt.setPatientId(required(req.getPatientId(), "patientId"));
            appt.setPatientName(required(req.getPatientName(), "patientName"));
        } else {
            throw CurrentUser.forbidden();
        }
        if (me.isStaff() && !me.isAdmin() && req.getProviderId() == null) {
            appt.setProviderId(me.id());
            appt.setProviderName(me.name());
        } else {
            appt.setProviderId(required(req.getProviderId(), "providerId"));
            appt.setProviderName(required(req.getProviderName(), "providerName"));
        }
        appt.setProviderSpecialty(req.getProviderSpecialty());
        appt.setAppointmentDate(required(req.getAppointmentDate(), "appointmentDate"));
        appt.setStartTime(required(req.getStartTime(), "startTime"));
        appt.setEndTime(req.getEndTime() != null ? req.getEndTime() : appt.getStartTime().plusHours(1));
        if (!appt.getEndTime().isAfter(appt.getStartTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be after start time");
        }
        if (appt.getAppointmentDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointments cannot be booked in the past");
        }
        appt.setType(validType(req.getType()));
        appt.setMode(req.getMode() != null ? req.getMode() : "IN_PERSON");
        appt.setReason(req.getReason());
        appt.setFacilityName(req.getFacilityName());
        appt.setFacilityAddress(req.getFacilityAddress());
        if (me.isStaff()) appt.setNotes(req.getNotes());
        appt.setStatus("SCHEDULED");

        if (repo.existsByProviderIdAndAppointmentDateAndStartTimeAndStatus(
                appt.getProviderId(), appt.getAppointmentDate(), appt.getStartTime(), "SCHEDULED")) {
            throw new IllegalStateException("This slot is already booked");
        }
        log.info("Appointment booked for provider {} on {}", appt.getProviderId(), appt.getAppointmentDate());
        Appointment saved = repo.save(appt);
        String when = saved.getAppointmentDate() + " at " + saved.getStartTime();
        notifications.notify(saved.getProviderId(), "APPOINTMENT_BOOKED", "New appointment",
                saved.getPatientName() + " on " + when, "/schedule");
        if (!me.isPatient()) {
            notifications.notify(saved.getPatientId(), "APPOINTMENT_BOOKED", "Appointment scheduled",
                    "With " + saved.getProviderName() + " on " + when, "/appointments");
        }
        return saved;
    }

    /** Staff only: reschedule, change status, type or notes. */
    @PutMapping("/{id}")
    @PreAuthorize(STAFF)
    public Appointment update(@PathVariable UUID id, @RequestBody Appointment update) {
        Appointment appt = find(id);
        if (update.getStatus() != null) {
            if (!STATUSES.contains(update.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown status " + update.getStatus());
            }
            appt.setStatus(update.getStatus());
        }
        if (update.getType() != null) appt.setType(validType(update.getType()));
        if (update.getAppointmentDate() != null) appt.setAppointmentDate(update.getAppointmentDate());
        if (update.getStartTime() != null) appt.setStartTime(update.getStartTime());
        if (update.getEndTime() != null) appt.setEndTime(update.getEndTime());
        if (!appt.getEndTime().isAfter(appt.getStartTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be after start time");
        }
        if (update.getNotes() != null) appt.setNotes(update.getNotes());
        if (update.getReason() != null) appt.setReason(update.getReason());
        if (update.getMode() != null) appt.setMode(update.getMode());
        return repo.save(appt);
    }

    /** Staff, or the patient who owns the appointment. */
    @PatchMapping("/{id}/cancel")
    public Appointment cancel(@PathVariable UUID id) {
        Appointment appt = readable(find(id));
        if (!"SCHEDULED".equals(appt.getStatus())) {
            throw new IllegalStateException("Only scheduled appointments can be cancelled");
        }
        appt.setStatus("CANCELLED");
        log.info("Appointment cancelled: {}", id);
        Appointment saved = repo.save(appt);
        String when = saved.getAppointmentDate() + " at " + saved.getStartTime();
        if (CurrentUser.get().isPatient()) {
            notifications.notify(saved.getProviderId(), "APPOINTMENT_CANCELLED", "Appointment cancelled",
                    saved.getPatientName() + " cancelled " + when, "/schedule");
        } else {
            notifications.notify(saved.getPatientId(), "APPOINTMENT_CANCELLED", "Appointment cancelled",
                    "Your appointment with " + saved.getProviderName() + " on " + when + " was cancelled", "/appointments");
        }
        return saved;
    }

    @GetMapping("/summary")
    @PreAuthorize(STAFF)
    public Map<String, Object> summary(@RequestParam String patientId) {
        return summaryFor(patientId);
    }

    private Map<String, Object> summaryFor(String patientId) {
        return Map.of(
            "scheduled", repo.countByPatientIdAndStatus(patientId, "SCHEDULED"),
            "completed", repo.countByPatientIdAndStatus(patientId, "COMPLETED"),
            "cancelled", repo.countByPatientIdAndStatus(patientId, "CANCELLED")
        );
    }

    private Appointment find(UUID id) {
        return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Appointment not found"));
    }

    /** Staff see every appointment; a patient only their own (others look "not found"). */
    private Appointment readable(Appointment appt) {
        CurrentUser me = CurrentUser.get();
        if (me.isStaff()) return appt;
        if (me.hasRole("PATIENT") && me.id().equals(appt.getPatientId())) return appt;
        throw new EntityNotFoundException("Appointment not found");
    }

    private static String validType(String type) {
        if (type == null) return "CONSULTATION";
        String t = type.trim().toUpperCase().replace(' ', '_').replace('-', '_');
        if (!TYPES.contains(t)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown appointment type " + type);
        return t;
    }

    private static <T> T required(T value, String field) {
        if (value == null || (value instanceof String s && s.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
        }
        return value;
    }
}
