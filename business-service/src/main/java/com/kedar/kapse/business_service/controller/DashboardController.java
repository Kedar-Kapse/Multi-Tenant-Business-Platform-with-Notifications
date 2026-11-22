package com.kedar.kapse.business_service.controller;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;

/**
 * Admin dashboard numbers, all computed from the hospital's real data with
 * aggregate queries (rows are limited to the caller's hospital by @TenantId).
 * A "change" is null when there is nothing to compare with.
 */
@PreAuthorize("hasAnyRole('ADMIN','PROVIDER','PHYSICIAN','NURSE','THERAPIST')")
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardController {

    private static final Map<String, String> CLAIM_COLORS = Map.of(
            "PAID", "#16a34a", "SUBMITTED", "#3b82f6", "IN_REVIEW", "#f59e0b",
            "DENIED", "#e11d48", "APPROVED", "#0d9488", "APPEALED", "#a855f7");

    private final EntityManager em;

    @GetMapping("/kpis")
    public Map<String, Object> getKpis() {
        LocalDate today = LocalDate.now();
        YearMonth thisMonth = YearMonth.from(today);
        YearMonth lastMonth = thisMonth.minusMonths(1);

        long apptsThis = appointmentsIn(thisMonth.atDay(1), thisMonth.atEndOfMonth());
        long apptsLast = appointmentsIn(lastMonth.atDay(1), lastMonth.atEndOfMonth());

        double revenueThis = paidIn(thisMonth.atDay(1), thisMonth.atEndOfMonth());
        double revenueLast = paidIn(lastMonth.atDay(1), lastMonth.atEndOfMonth());

        long beds = count("SELECT COUNT(b) FROM Bed b", Map.of());
        long occupied = count("SELECT COUNT(b) FROM Bed b WHERE b.status = com.kedar.kapse.platform_core.enums.BedStatus.OCCUPIED", Map.of());

        Double noShowNow = noShowRate(today.minusDays(30), today);
        Double noShowBefore = noShowRate(today.minusDays(60), today.minusDays(31));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("patientVolume", apptsThis);                 // appointments this month (not cancelled)
        out.put("patientChange", change(apptsThis, apptsLast));
        out.put("revenueMtd", revenueThis);                  // paid claims this month
        out.put("revenueChange", change(revenueThis, revenueLast));
        out.put("bedOccupancy", beds == 0 ? null : round1(100.0 * occupied / beds));
        out.put("bedsTotal", beds);
        out.put("bedsOccupied", occupied);
        out.put("bedChange", null);
        out.put("noShowRate", noShowNow);
        out.put("noShowChange", noShowNow == null || noShowBefore == null ? null : round1(noShowNow - noShowBefore));
        return out;
    }

    /** Last 6 months, oldest first: paid revenue and number of claims submitted. */
    @GetMapping("/revenue-trend")
    public List<Map<String, Object>> getRevenueTrend() {
        YearMonth now = YearMonth.now();
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = now.minusMonths(i);
            LocalDate from = ym.atDay(1);
            LocalDate to = ym.atEndOfMonth();
            long submitted = count("SELECT COUNT(c) FROM Claim c WHERE c.dateSubmitted BETWEEN :f AND :t", Map.of("f", from, "t", to));
            out.add(Map.of(
                    "month", ym.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + ym.getYear(),
                    "revenue", paidIn(from, to),
                    "claims", submitted));
        }
        return out;
    }

    /** Claims per status: count and share of all claims (percent). */
    @GetMapping("/claims-distribution")
    public List<Map<String, Object>> getClaimsDistribution() {
        List<Object[]> rows = em.createQuery("SELECT c.status, COUNT(c) FROM Claim c GROUP BY c.status", Object[].class).getResultList();
        long total = rows.stream().mapToLong(r -> (Long) r[1]).sum();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : rows) {
            String status = r[0] != null ? r[0].toString() : "UNKNOWN";
            long n = (Long) r[1];
            out.add(Map.of("name", status.replace('_', ' '), "value", n,
                    "percent", total == 0 ? 0 : round1(100.0 * n / total),
                    "color", CLAIM_COLORS.getOrDefault(status, "#94a3b8")));
        }
        out.sort(Comparator.comparing(m -> -((Long) m.get("value"))));
        return out;
    }

    /** Per ward: total beds, occupied beds and occupancy percent. */
    @GetMapping("/bed-occupancy")
    public List<Map<String, Object>> getBedOccupancy() {
        List<Object[]> rows = em.createQuery(
                "SELECT b.wardName, COUNT(b), SUM(CASE WHEN b.status = com.kedar.kapse.platform_core.enums.BedStatus.OCCUPIED THEN 1 ELSE 0 END) " +
                "FROM Bed b GROUP BY b.wardName ORDER BY b.wardName", Object[].class).getResultList();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : rows) {
            long total = (Long) r[1];
            long occ = r[2] == null ? 0 : ((Number) r[2]).longValue();
            out.add(Map.of("ward", r[0], "total", total, "occupied", occ,
                    "occupancy", total == 0 ? 0 : round1(100.0 * occ / total)));
        }
        return out;
    }

    /** Overdue invoices and medicines below their minimum stock. */
    @GetMapping("/alerts")
    public List<Map<String, Object>> getAlerts() {
        List<Map<String, Object>> alerts = new ArrayList<>();
        LocalDate today = LocalDate.now();
        List<Object[]> overdue = em.createQuery(
                "SELECT i.invoiceNumber, i.amount, i.paidAmount, i.dueDate FROM Invoice i " +
                "WHERE i.status = 'OVERDUE' OR (i.status IN ('PENDING','PARTIALLY_PAID') AND i.dueDate < :today) " +
                "ORDER BY i.dueDate", Object[].class).setParameter("today", today).setMaxResults(10).getResultList();
        for (Object[] r : overdue) {
            BigDecimal amount = (BigDecimal) r[1];
            BigDecimal paid = r[2] != null ? (BigDecimal) r[2] : BigDecimal.ZERO;
            alerts.add(Map.of("id", "inv-" + r[0], "type", "INVOICE_OVERDUE", "severity", "warning",
                    "msg", "Invoice " + r[0] + " overdue", "amountDue", amount.subtract(paid),
                    "date", String.valueOf(r[3])));
        }
        List<Object[]> lowStock = em.createQuery(
                "SELECT s.medicineName, s.quantity, s.minimumStockLevel FROM PharmacyStock s " +
                "WHERE s.quantity <= s.minimumStockLevel ORDER BY s.quantity", Object[].class).setMaxResults(10).getResultList();
        for (Object[] r : lowStock) {
            alerts.add(Map.of("id", "stock-" + r[0], "type", "LOW_STOCK", "severity", ((Integer) r[1]) == 0 ? "danger" : "warning",
                    "msg", r[0] + " is low: " + r[1] + " left (minimum " + r[2] + ")", "date", today.toString()));
        }
        return alerts;
    }

    // ------------------------------------------------------------------ helpers

    private long appointmentsIn(LocalDate from, LocalDate to) {
        return count("SELECT COUNT(a) FROM Appointment a WHERE a.appointmentDate BETWEEN :f AND :t AND a.status <> 'CANCELLED'",
                Map.of("f", from, "t", to));
    }

    /** Paid claim money in a period, dated by processing date (or submission date if not set). */
    private double paidIn(LocalDate from, LocalDate to) {
        BigDecimal sum = em.createQuery(
                "SELECT COALESCE(SUM(c.paidAmount), 0) FROM Claim c WHERE c.status = 'PAID' AND " +
                "COALESCE(c.dateProcessed, c.dateSubmitted) BETWEEN :f AND :t", BigDecimal.class)
                .setParameter("f", from).setParameter("t", to).getSingleResult();
        return sum == null ? 0 : sum.doubleValue();
    }

    /** NO_SHOW / (COMPLETED + NO_SHOW) in a period, percent; null if no finished appointments. */
    private Double noShowRate(LocalDate from, LocalDate to) {
        Map<String, Object> p = Map.of("f", from, "t", to);
        long noShow = count("SELECT COUNT(a) FROM Appointment a WHERE a.status = 'NO_SHOW' AND a.appointmentDate BETWEEN :f AND :t", p);
        long done = count("SELECT COUNT(a) FROM Appointment a WHERE a.status = 'COMPLETED' AND a.appointmentDate BETWEEN :f AND :t", p);
        return noShow + done == 0 ? null : round1(100.0 * noShow / (noShow + done));
    }

    private long count(String jpql, Map<String, Object> params) {
        TypedQuery<Long> q = em.createQuery(jpql, Long.class);
        params.forEach(q::setParameter);
        return q.getSingleResult();
    }

    private static Double change(double now, double before) {
        return before == 0 ? null : round1(100.0 * (now - before) / before);
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
