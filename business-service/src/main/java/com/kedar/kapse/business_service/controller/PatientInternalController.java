package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.service.PatientInternalService;
import com.kedar.kapse.platform_core.dto.InternalPatientDto;
import com.kedar.kapse.platform_core.dto.ProvisionPatientRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/internal/patients")
@RequiredArgsConstructor
public class PatientInternalController {

    private final PatientInternalService patientInternalService;

    @GetMapping("/by-email/{email}")
    public ResponseEntity<InternalPatientDto> findByEmail(@PathVariable String email) {
        return patientInternalService.findByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/provision")
    public ResponseEntity<InternalPatientDto> provision(@RequestBody ProvisionPatientRequest request) {
        InternalPatientDto created = patientInternalService.provision(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}/link-keycloak")
    public ResponseEntity<InternalPatientDto> linkKeycloak(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(patientInternalService.linkKeycloak(
                id, body.get("keycloakUserId"), body.get("tenantRealm")));
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<Void> activate(@PathVariable UUID id) {
        patientInternalService.activate(id);
        return ResponseEntity.noContent().build();
    }
}
