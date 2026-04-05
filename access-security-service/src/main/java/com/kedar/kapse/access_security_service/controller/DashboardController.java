package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public dashboard statistics endpoints for the admin portal login page.
 * These return only aggregate counts — no sensitive data.
 * No authentication required (displayed before login).
 */
@RestController
@RequestMapping("/api/admin/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/tenant-count")
    public ResponseEntity<Map<String, Long>> getTenantCount() {
        long count = dashboardService.getActiveTenantCount();
        return ResponseEntity.ok(Map.of("count", count));
    }

    @GetMapping("/staff-count")
    public ResponseEntity<Map<String, Long>> getStaffCount() {
        long count = dashboardService.getStaffCount();
        return ResponseEntity.ok(Map.of("count", count));
    }

    @GetMapping("/patient-count")
    public ResponseEntity<Map<String, Long>> getPatientCount() {
        long count = dashboardService.getPatientCount();
        return ResponseEntity.ok(Map.of("count", count));
    }
}
