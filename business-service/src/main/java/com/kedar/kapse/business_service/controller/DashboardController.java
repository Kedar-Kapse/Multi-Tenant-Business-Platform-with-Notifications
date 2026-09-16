package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.repository.AppointmentRepository;
import com.kedar.kapse.business_service.repository.ClaimRepository;
import com.kedar.kapse.business_service.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ClaimRepository claimRepo;
    private final AppointmentRepository apptRepo;
    private final InvoiceRepository invoiceRepo;

    @GetMapping("/kpis")
    public Map<String, Object> getKpis() {
        long totalAppts = apptRepo.count();
        double paidRevenue = claimRepo.findAll().stream()
                .filter(c -> "PAID".equals(c.getStatus()) && c.getPaidAmount() != null)
                .mapToDouble(c -> c.getPaidAmount().doubleValue()).sum();

        return Map.of(
                "patientVolume", totalAppts, "patientChange", 8.5,
                "revenueMtd", paidRevenue, "revenueChange", 12.3,
                "bedOccupancy", 0.0, "bedChange", 0.0,
                "noShowRate", 3.2, "noShowChange", -0.5
        );
    }

    @GetMapping("/revenue-trend")
    public List<Map<String, Object>> getRevenueTrend() {
        var claims = claimRepo.findAll();
        Map<String, double[]> monthly = new LinkedHashMap<>();
        String[] months = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};

        for (var claim : claims) {
            if (claim.getDateSubmitted() != null) {
                int m = claim.getDateSubmitted().getMonthValue() - 1;
                String month = months[m];
                monthly.computeIfAbsent(month, k -> new double[]{0, 0});
                double[] vals = monthly.get(month);
                if (claim.getPaidAmount() != null) vals[0] += claim.getPaidAmount().doubleValue();
                vals[1]++;
            }
        }

        return monthly.entrySet().stream().map(e ->
                Map.of("month", (Object) e.getKey(), "revenue", (Object) e.getValue()[0], "claims", (Object) (int) e.getValue()[1])
        ).collect(Collectors.toList());
    }

    @GetMapping("/claims-distribution")
    public List<Map<String, Object>> getClaimsDistribution() {
        var claims = claimRepo.findAll();
        Map<String, Long> counts = claims.stream().collect(Collectors.groupingBy(
                c -> c.getStatus() != null ? c.getStatus() : "UNKNOWN", Collectors.counting()));

        Map<String, String> colors = Map.of(
                "PAID", "#16a34a", "SUBMITTED", "#3b82f6", "IN_REVIEW", "#f59e0b",
                "DENIED", "#e11d48", "APPROVED", "#0d9488", "APPEALED", "#a855f7");
        return counts.entrySet().stream()
                .map(e -> Map.of("name", (Object) e.getKey().replace("_", " "), "value", (Object) e.getValue(),
                        "color", (Object) colors.getOrDefault(e.getKey(), "#94a3b8")))
                .collect(Collectors.toList());
    }

    @GetMapping("/bed-occupancy")
    public List<Map<String, Object>> getBedOccupancy() {
        return List.of();
    }

    @GetMapping("/alerts")
    public List<Map<String, Object>> getAlerts() {
        List<Map<String, Object>> alerts = new ArrayList<>();
        var invoices = invoiceRepo.findAll();
        for (var inv : invoices) {
            if ("OVERDUE".equals(inv.getStatus())) {
                alerts.add(Map.of("id", alerts.size() + 1, "msg",
                        "Invoice " + inv.getInvoiceNumber() + " overdue — ₹" + inv.getAmount(),
                        "severity", "warning", "time", "Recent"));
            }
        }
        return alerts;
    }
}
