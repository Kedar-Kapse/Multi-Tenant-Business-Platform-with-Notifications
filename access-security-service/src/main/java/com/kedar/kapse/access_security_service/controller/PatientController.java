package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.service.PatientService;
import com.kedar.kapse.platform_core.dto.CreatePatientRequest;
import com.kedar.kapse.platform_core.dto.PatientResponse;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
@Slf4j
public class PatientController {

    private final PatientService patientService;

    /** Admin-initiated patient creation. */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROVIDER','PHYSICIAN','NURSE','THERAPIST')")
    @ResponseStatus(HttpStatus.CREATED)
    public PatientResponse createPatient(@Valid @RequestBody CreatePatientRequest request) {
        log.info("POST /api/v1/patients — creating patient {} ({})", request.getEmail(), request.getProviderId());
        return patientService.createPatient(request, null);
    }

    /** Provider-initiated patient creation — auto-binds mapping to the provider's staff UUID. */
    @PostMapping("/by-provider/{providerId}")
    @PreAuthorize("hasAnyRole('PROVIDER','PHYSICIAN','NURSE','THERAPIST','ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public PatientResponse createPatientForProvider(
            @PathVariable UUID providerId,
            @Valid @RequestBody CreatePatientRequest request) {
        log.info("POST /api/v1/patients/by-provider/{} — creating patient {}", providerId, request.getEmail());
        return patientService.createPatient(request, providerId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public PatientResponse getPatient(@PathVariable UUID id) {
        return patientService.getPatient(id);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Page<PatientResponse> searchPatients(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) PatientStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        return patientService.searchPatients(query, status, PageRequest.of(page, size, sort));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePatient(@PathVariable UUID id) {
        patientService.softDelete(id);
    }
}
