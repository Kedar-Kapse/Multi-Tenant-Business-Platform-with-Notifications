package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.entity.Appointment;
import com.kedar.kapse.business_service.repository.AppointmentRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController @RequestMapping("/api/appointments") @RequiredArgsConstructor @Slf4j
public class AppointmentController {

    private final AppointmentRepository repo;

    @GetMapping
    public List<Appointment> getAll(@RequestParam(required = false) String patientId, @RequestParam(required = false) String providerId) {
        if (patientId != null) return repo.findByPatientIdOrderByAppointmentDateDescStartTimeDesc(patientId);
        if (providerId != null) return repo.findByProviderIdOrderByAppointmentDateDescStartTimeDesc(providerId);
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public Appointment getById(@PathVariable UUID id) {
        return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Appointment not found"));
    }

    @GetMapping("/upcoming")
    public List<Appointment> getUpcoming(@RequestParam String patientId) {
        return repo.findByPatientIdAndStatusOrderByAppointmentDateAscStartTimeAsc(patientId, "SCHEDULED");
    }

    @GetMapping("/slots")
    public List<Map<String, String>> getAvailableSlots(@RequestParam String providerId, @RequestParam String date) {
        LocalDate d = LocalDate.parse(date);
        List<Appointment> booked = repo.findByProviderIdAndAppointmentDate(providerId, d);
        Set<String> bookedTimes = booked.stream().map(a -> a.getStartTime().toString()).collect(Collectors.toSet());

        List<Map<String, String>> slots = new ArrayList<>();
        for (int h = 9; h <= 17; h++) {
            String time = String.format("%02d:00", h);
            if (!bookedTimes.contains(time)) {
                slots.add(Map.of("time", time, "endTime", String.format("%02d:00", h + 1), "available", "true"));
            }
        }
        return slots;
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Appointment book(@RequestBody Appointment appt) {
        appt.setId(null);
        if (appt.getStatus() == null) appt.setStatus("SCHEDULED");
        // Check conflict
        List<Appointment> existing = repo.findByProviderIdAndAppointmentDate(appt.getProviderId(), appt.getAppointmentDate());
        boolean conflict = existing.stream().anyMatch(e -> e.getStartTime().equals(appt.getStartTime()) && "SCHEDULED".equals(e.getStatus()));
        if (conflict) throw new IllegalStateException("This slot is already booked");
        log.info("Appointment booked: {} with {} on {}", appt.getPatientName(), appt.getProviderName(), appt.getAppointmentDate());
        return repo.save(appt);
    }

    @PutMapping("/{id}")
    public Appointment update(@PathVariable UUID id, @RequestBody Appointment update) {
        Appointment appt = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Not found"));
        if (update.getStatus() != null) appt.setStatus(update.getStatus());
        if (update.getAppointmentDate() != null) appt.setAppointmentDate(update.getAppointmentDate());
        if (update.getStartTime() != null) appt.setStartTime(update.getStartTime());
        if (update.getEndTime() != null) appt.setEndTime(update.getEndTime());
        if (update.getNotes() != null) appt.setNotes(update.getNotes());
        if (update.getReason() != null) appt.setReason(update.getReason());
        return repo.save(appt);
    }

    @PatchMapping("/{id}/cancel")
    public Appointment cancel(@PathVariable UUID id) {
        Appointment appt = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Not found"));
        appt.setStatus("CANCELLED");
        log.info("Appointment cancelled: {}", id);
        return repo.save(appt);
    }

    @GetMapping("/summary")
    public Map<String, Object> summary(@RequestParam String patientId) {
        return Map.of(
            "scheduled", repo.countByPatientIdAndStatus(patientId, "SCHEDULED"),
            "completed", repo.countByPatientIdAndStatus(patientId, "COMPLETED"),
            "cancelled", repo.countByPatientIdAndStatus(patientId, "CANCELLED")
        );
    }
}
