package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.platform_core.security.CurrentUser;
import com.kedar.kapse.business_service.service.PatientService;
import com.kedar.kapse.platform_core.dto.CreatePatientRequest;
import com.kedar.kapse.platform_core.dto.PatientResponse;
import com.kedar.kapse.platform_core.dto.UpdatePatientProfileRequest;
import com.kedar.kapse.platform_core.enums.PatientStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
@Slf4j
public class PatientController {

    private final PatientService patientService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER', 'PHYSICIAN', 'NURSE', 'THERAPIST')")
    public ResponseEntity<Page<PatientResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) PatientStatus status,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), sort);
        // mine=true: only patients linked to the calling provider ("My Patients")
        if (mine) {
            return ResponseEntity.ok(patientService.searchPatientsOfProvider(query, status,
                    UUID.fromString(CurrentUser.get().id()), pageable));
        }
        return ResponseEntity.ok(patientService.searchPatients(query, status, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER', 'PHYSICIAN', 'NURSE', 'THERAPIST')")
    public ResponseEntity<PatientResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(patientService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER', 'PHYSICIAN', 'NURSE', 'THERAPIST')")
    public ResponseEntity<PatientResponse> create(@Valid @RequestBody CreatePatientRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(patientService.createPatient(request));
    }

    @PostMapping("/by-provider/{providerId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER', 'PHYSICIAN', 'NURSE', 'THERAPIST')")
    public ResponseEntity<PatientResponse> createForProvider(
            @PathVariable UUID providerId,
            @Valid @RequestBody CreatePatientRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(patientService.createPatientForProvider(providerId, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        patientService.deletePatient(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/pcc-sync")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER', 'PHYSICIAN', 'NURSE', 'THERAPIST')")
    public ResponseEntity<PatientResponse> triggerPccSync(@PathVariable UUID id) {
        return ResponseEntity.ok(patientService.triggerPccSync(id));
    }

    /**
     * Returns the profile of the currently authenticated patient.
     * Identified by the Keycloak user ID extracted from the JWT subject claim.
     */
    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PatientResponse> getMyProfile() {
        // The Keycloak user id ("sub"), which is what patients.keycloak_user_id stores.
        // authentication.getName() is the username, so it never matched.
        String keycloakUserId = CurrentUser.get().id();
        log.debug("GET /api/patients/me — keycloakUserId={}", keycloakUserId);
        return ResponseEntity.ok(patientService.getMyProfile(keycloakUserId));
    }

    /**
     * Updates the profile of the currently authenticated patient.
     * Only non-null fields in the request body are applied (partial update).
     * Email, MRN, and SSN are excluded from self-service updates.
     */
    @PatchMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PatientResponse> updateMyProfile(
            @Valid @RequestBody UpdatePatientProfileRequest request) {
        String keycloakUserId = CurrentUser.get().id();
        log.info("PATCH /api/patients/me — keycloakUserId={}", keycloakUserId);
        return ResponseEntity.ok(patientService.updateMyProfile(keycloakUserId, request));
    }
}
