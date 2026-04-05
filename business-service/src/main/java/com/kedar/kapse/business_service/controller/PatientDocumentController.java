package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.entity.PatientDocument;
import com.kedar.kapse.business_service.repository.PatientDocumentRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/patient-documents") @RequiredArgsConstructor
public class PatientDocumentController {

    private final PatientDocumentRepository repo;

    @GetMapping
    public List<PatientDocument> getAll(@RequestParam(required = false) String patientId, @RequestParam(required = false) String category) {
        if (patientId != null && category != null) return repo.findByPatientIdAndCategoryOrderByUploadedAtDesc(patientId, category);
        if (patientId != null) return repo.findByPatientIdOrderByUploadedAtDesc(patientId);
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public PatientDocument getById(@PathVariable UUID id) {
        return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Document not found"));
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public PatientDocument upload(@RequestBody PatientDocument doc) {
        doc.setId(null);
        return repo.save(doc);
    }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        repo.deleteById(id);
    }
}
