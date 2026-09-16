package com.kedar.kapse.access_security_service.client;

import com.kedar.kapse.platform_core.dto.InternalPatientDto;
import com.kedar.kapse.platform_core.dto.ProvisionPatientRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@FeignClient(
        name = "business-service",
        url = "${business-service.url:http://localhost:8081}",
        fallback = PatientProvisioningClientFallback.class,
        configuration = InternalFeignConfig.class
)
public interface PatientProvisioningClient {

    @GetMapping("/internal/patients/by-email/{email}")
    ResponseEntity<InternalPatientDto> findByEmail(@PathVariable("email") String email);

    @PostMapping("/internal/patients/provision")
    ResponseEntity<InternalPatientDto> provision(@RequestBody ProvisionPatientRequest request);

    @PutMapping("/internal/patients/{id}/link-keycloak")
    ResponseEntity<InternalPatientDto> linkKeycloak(@PathVariable("id") UUID id, @RequestBody Map<String, String> body);

    @PutMapping("/internal/patients/{id}/activate")
    ResponseEntity<Void> activate(@PathVariable("id") UUID id);
}
