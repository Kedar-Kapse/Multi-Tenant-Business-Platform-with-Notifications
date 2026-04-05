package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.repository.*;
import com.kedar.kapse.platform_core.enums.BedStatus;
import com.kedar.kapse.platform_core.enums.MedicineStatus;
import com.kedar.kapse.platform_core.repository.BedRepository;
import com.kedar.kapse.platform_core.repository.PharmacyStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ClaimRepository claimRepo;
    private final BedRepository bedRepo;
    private final PharmacyStockRepository pharmacyRepo;
    private final AppointmentRepository apptRepo;
    private final InvoiceRepository invoiceRepo;

    @GetMapping("/kpis")
    public Map<String, Object> getKpis() {
        long totalClaims = claimRepo.count();
        long paidClaims = claimRepo.countByStatus("PAID");
        long totalBeds = bedRepo.count();
        long occupiedBeds = bedRepo.findAll().stream().filter(b -> b.getStatus() == BedStatus.OCCUPIED).count();
        long totalAppts = apptRepo.count();
        long scheduledAppts = apptRepo.findAll().stream().filter(a -> "SCHEDULED".equals(a.getStatus())).count();

        double occupancyRate = totalBeds > 0 ? Math.round((double) occupiedBeds / totalBeds * 1000.0) / 10.0 : 0;
        double paidRevenue = claimRepo.findAll().stream()
                .filter(c -> "PAID".equals(c.getStatus()) && c.getPaidAmount() != null)
                .mapToDouble(c -> c.getPaidAmount().doubleValue()).sum();

        return Map.of(
                "patientVolume", totalAppts, "patientChange", 8.5,
                "revenueMtd", paidRevenue, "revenueChange", 12.3,
                "bedOccupancy", occupancyRate, "bedChange", -1.5,
                "noShowRate", 3.2, "noShowChange", -0.5
        );
    }

    @GetMapping("/revenue-trend")
    public List<Map<String, Object>> getRevenueTrend() {
        // Compute from real claims data grouped by month
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
        Map<String, Long> counts = claims.stream().collect(Collectors.groupingBy(c -> c.getStatus() != null ? c.getStatus() : "UNKNOWN", Collectors.counting()));

        Map<String, String> colors = Map.of("PAID", "#16a34a", "SUBMITTED", "#3b82f6", "IN_REVIEW", "#f59e0b", "DENIED", "#e11d48", "APPROVED", "#0d9488", "APPEALED", "#a855f7");
        return counts.entrySet().stream()
                .map(e -> Map.of("name", (Object) e.getKey().replace("_", " "), "value", (Object) e.getValue(), "color", (Object) colors.getOrDefault(e.getKey(), "#94a3b8")))
                .collect(Collectors.toList());
    }

    @GetMapping("/bed-occupancy")
    public List<Map<String, Object>> getBedOccupancy() {
        var beds = bedRepo.findAll();
        Map<String, int[]> wards = new LinkedHashMap<>();
        for (var bed : beds) {
            String ward = bed.getWardName() != null ? bed.getWardName() : "Other";
            wards.computeIfAbsent(ward, k -> new int[]{0, 0});
            int[] vals = wards.get(ward);
            vals[1]++; // total
            if (bed.getStatus() == BedStatus.OCCUPIED) vals[0]++; // occupied
        }
        return wards.entrySet().stream()
                .map(e -> Map.of("unit", (Object) e.getKey(), "occupied", (Object) e.getValue()[0], "total", (Object) e.getValue()[1]))
                .collect(Collectors.toList());
    }

    @GetMapping("/alerts")
    public List<Map<String, Object>> getAlerts() {
        List<Map<String, Object>> alerts = new ArrayList<>();
        // Low stock pharmacy alerts
        var stocks = pharmacyRepo.findAll();
        for (var s : stocks) {
            if (s.getStatus() == MedicineStatus.LOW_STOCK) {
                alerts.add(Map.of("id", alerts.size() + 1, "msg", "Pharmacy stock low: " + s.getMedicineName() + " (" + s.getQuantity() + " units)", "severity", "warning", "time", "Recent"));
            }
            if (s.getStatus() == MedicineStatus.OUT_OF_STOCK) {
                alerts.add(Map.of("id", alerts.size() + 1, "msg", "OUT OF STOCK: " + s.getMedicineName(), "severity", "danger", "time", "Recent"));
            }
            if (s.getStatus() == MedicineStatus.EXPIRED) {
                alerts.add(Map.of("id", alerts.size() + 1, "msg", "EXPIRED: " + s.getMedicineName() + " (batch " + s.getBatchNumber() + ")", "severity", "danger", "time", "Recent"));
            }
        }
        // Overdue invoices
        var invoices = invoiceRepo.findAll();
        for (var inv : invoices) {
            if ("OVERDUE".equals(inv.getStatus())) {
                alerts.add(Map.of("id", alerts.size() + 1, "msg", "Invoice " + inv.getInvoiceNumber() + " overdue — ₹" + inv.getAmount(), "severity", "warning", "time", "Recent"));
            }
        }
        // Bed occupancy warnings
        var beds = bedRepo.findAll();
        long occupied = beds.stream().filter(b -> b.getStatus() == BedStatus.OCCUPIED).count();
        long total = beds.size();
        if (total > 0 && (double) occupied / total > 0.75) {
            alerts.add(Map.of("id", alerts.size() + 1, "msg", "Bed occupancy at " + Math.round((double) occupied / total * 100) + "% — above 75% threshold", "severity", "info", "time", "Recent"));
        }
        return alerts;
    }
}
