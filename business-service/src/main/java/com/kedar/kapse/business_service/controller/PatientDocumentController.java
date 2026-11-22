package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.entity.PatientDocument;
import com.kedar.kapse.business_service.repository.PatientDocumentRepository;
import com.kedar.kapse.platform_core.security.CurrentUser;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/**
 * Medical-record entries (metadata). Staff add and remove them for a patient;
 * patients only list their own (/me).
 */
@RestController @RequestMapping("/api/patient-documents") @RequiredArgsConstructor
public class PatientDocumentController {

    private static final String STAFF = "hasAnyRole('ADMIN','PROVIDER','PHYSICIAN','NURSE','THERAPIST')";

    private final PatientDocumentRepository repo;

    @GetMapping
    @PreAuthorize(STAFF)
    public List<PatientDocument> getAll(@RequestParam String patientId, @RequestParam(required = false) String category) {
        return category != null
                ? repo.findByPatientIdAndCategoryOrderByUploadedAtDesc(patientId, category)
                : repo.findByPatientIdOrderByUploadedAtDesc(patientId);
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public List<PatientDocument> mine(@RequestParam(required = false) String category) {
        String me = CurrentUser.get().id();
        return category != null
                ? repo.findByPatientIdAndCategoryOrderByUploadedAtDesc(me, category)
                : repo.findByPatientIdOrderByUploadedAtDesc(me);
    }

    @GetMapping("/{id}")
    public PatientDocument getById(@PathVariable UUID id) {
        PatientDocument doc = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Document not found"));
        CurrentUser me = CurrentUser.get();
        if (!me.isStaff() && !(me.hasRole("PATIENT") && me.id().equals(doc.getPatientId()))) {
            throw new EntityNotFoundException("Document not found");
        }
        return doc;
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(STAFF)
    public PatientDocument create(@RequestBody PatientDocument req) {
        if (req.getPatientId() == null || req.getFileName() == null || req.getFileType() == null || req.getCategory() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "patientId, fileName, fileType and category are required");
        }
        PatientDocument doc = PatientDocument.builder()
                .patientId(req.getPatientId())
                .fileName(req.getFileName())
                .fileType(req.getFileType())
                .category(req.getCategory())
                .description(req.getDescription())
                .fileSize(req.getFileSize())
                .uploadedBy(CurrentUser.get().name())
                .build();
        return repo.save(doc);
    }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(STAFF)
    public void delete(@PathVariable UUID id) {
        if (!repo.existsById(id)) throw new EntityNotFoundException("Document not found");
        repo.deleteById(id);
    }
}
