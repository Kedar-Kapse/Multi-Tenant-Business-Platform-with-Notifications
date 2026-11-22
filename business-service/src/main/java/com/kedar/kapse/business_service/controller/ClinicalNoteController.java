package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.entity.ClinicalNote;
import com.kedar.kapse.business_service.entity.Patient;
import com.kedar.kapse.business_service.repository.ClinicalNoteRepository;
import com.kedar.kapse.business_service.repository.PatientRepository;
import com.kedar.kapse.platform_core.security.CurrentUser;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Clinical notes. Clinicians write DRAFT notes and sign them; a signed note can no
 * longer be changed. Patients read their own SIGNED notes (/me).
 */
@RestController
@RequestMapping("/api/clinical-notes")
@RequiredArgsConstructor
public class ClinicalNoteController {

    private static final String STAFF = "hasAnyRole('ADMIN','PROVIDER','PHYSICIAN','NURSE','THERAPIST')";
    private static final String CLINICIAN = "hasAnyRole('PROVIDER','PHYSICIAN','NURSE','THERAPIST')";

    private final ClinicalNoteRepository repo;
    private final PatientRepository patientRepository;
    private final com.kedar.kapse.business_service.service.NotificationPublisher notifications;

    /** Staff list. mine=true: notes I wrote. Filter by patient, status (DRAFT/SIGNED) or text. */
    @GetMapping
    @PreAuthorize(STAFF)
    public Page<ClinicalNote> list(@RequestParam(required = false) UUID patientId,
                                   @RequestParam(defaultValue = "false") boolean mine,
                                   @RequestParam(required = false) String status,
                                   @RequestParam(required = false) String query,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "20") int size) {
        String provider = mine ? CurrentUser.get().id() : null;
        String st = status == null || status.isBlank() ? null : status.toUpperCase();
        return repo.search(patientId, provider, st, query,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending()));
    }

    /** The logged-in patient's signed notes. */
    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public List<ClinicalNote> mine() {
        return patientRepository.findByKeycloakUserIdAndDeletedAtIsNull(CurrentUser.get().id())
                .map(p -> repo.findByPatientIdAndStatusOrderBySignedAtDesc(p.getId(), "SIGNED"))
                .orElse(List.of());
    }

    @GetMapping("/{id}")
    public ClinicalNote get(@PathVariable UUID id) {
        ClinicalNote note = find(id);
        CurrentUser me = CurrentUser.get();
        if (me.isStaff()) return note;
        boolean ownSigned = "SIGNED".equals(note.getStatus()) && patientRepository
                .findByKeycloakUserIdAndDeletedAtIsNull(me.id())
                .map(p -> p.getId().equals(note.getPatientId())).orElse(false);
        if (!ownSigned) throw new EntityNotFoundException("Note not found");
        return note;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(CLINICIAN)
    public ClinicalNote create(@RequestBody ClinicalNote req) {
        if (req.getPatientId() == null) throw bad("Patient is required");
        Patient patient = patientRepository.findById(req.getPatientId())
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> bad("Unknown patient"));
        CurrentUser me = CurrentUser.get();
        ClinicalNote note = ClinicalNote.builder()
                .patientId(patient.getId())
                .patientName(patient.getFirstName() + " " + patient.getLastName())
                .providerId(me.id())
                .providerName(me.name())
                .templateId(req.getTemplateId())
                .templateName(req.getTemplateName())
                .appointmentId(req.getAppointmentId())
                .icdCodes(trimTo(req.getIcdCodes(), 300))
                .cptCodes(trimTo(req.getCptCodes(), 300))
                .title(required(req.getTitle(), "Title", 200))
                .content(required(req.getContent(), "Note text", 100_000))
                .status("DRAFT")
                .build();
        return repo.save(note);
    }

    /** Only the author, only while DRAFT. */
    @PutMapping("/{id}")
    @PreAuthorize(CLINICIAN)
    public ClinicalNote update(@PathVariable UUID id, @RequestBody ClinicalNote req) {
        ClinicalNote note = editable(id);
        if (req.getTitle() != null) note.setTitle(required(req.getTitle(), "Title", 200));
        if (req.getContent() != null) note.setContent(required(req.getContent(), "Note text", 100_000));
        if (req.getIcdCodes() != null) note.setIcdCodes(trimTo(req.getIcdCodes(), 300));
        if (req.getCptCodes() != null) note.setCptCodes(trimTo(req.getCptCodes(), 300));
        if (req.getTemplateId() != null) {
            note.setTemplateId(req.getTemplateId());
            note.setTemplateName(req.getTemplateName());
        }
        return repo.save(note);
    }

    /** Sign = final. Only the author. */
    @PatchMapping("/{id}/sign")
    @PreAuthorize(CLINICIAN)
    public ClinicalNote sign(@PathVariable UUID id) {
        ClinicalNote note = editable(id);
        note.setStatus("SIGNED");
        note.setSignedAt(LocalDateTime.now());
        ClinicalNote saved = repo.save(note);
        patientRepository.findById(saved.getPatientId()).map(Patient::getKeycloakUserId).ifPresent(userId ->
                notifications.notify(userId, "NOTE_SIGNED", "New visit note",
                        saved.getTitle() + " by " + saved.getProviderName(), "/notes"));
        return saved;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(CLINICIAN)
    public void deleteDraft(@PathVariable UUID id) {
        repo.delete(editable(id));
    }

    @GetMapping("/summary")
    @PreAuthorize(STAFF)
    public Map<String, Long> summary() {
        String me = CurrentUser.get().id();
        return Map.of("drafts", repo.countByProviderIdAndStatus(me, "DRAFT"),
                      "signed", repo.countByProviderIdAndStatus(me, "SIGNED"));
    }

    private ClinicalNote find(UUID id) {
        return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Note not found"));
    }

    private ClinicalNote editable(UUID id) {
        ClinicalNote note = find(id);
        if (!note.getProviderId().equals(CurrentUser.get().id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can change this note");
        }
        if (!"DRAFT".equals(note.getStatus())) {
            throw new IllegalStateException("A signed note cannot be changed");
        }
        return note;
    }

    private static ResponseStatusException bad(String m) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, m);
    }

    private static String required(String v, String field, int max) {
        if (v == null || v.isBlank()) throw bad(field + " is required");
        if (v.length() > max) throw bad(field + " is too long");
        return v.trim();
    }

    private static String trimTo(String v, int max) {
        if (v == null) return null;
        String t = v.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }
}
