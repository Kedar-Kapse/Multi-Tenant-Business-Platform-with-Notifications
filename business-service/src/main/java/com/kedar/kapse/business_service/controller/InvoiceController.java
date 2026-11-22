package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.entity.Invoice;
import com.kedar.kapse.business_service.repository.InvoiceRepository;
import com.kedar.kapse.platform_core.security.CurrentUser;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Patient bills.
 *  - Staff create invoices and RECORD payments (e.g. paid at the front desk).
 *  - Patients only see their own invoices (/me). There is no online payment yet:
 *    that needs a payment gateway, so a patient cannot mark a bill paid.
 */
@RestController @RequestMapping("/api/invoices") @RequiredArgsConstructor
public class InvoiceController {

    private static final String STAFF = "hasAnyRole('ADMIN','PROVIDER','PHYSICIAN','NURSE','THERAPIST')";
    private static final Set<String> METHODS = Set.of("CASH", "CARD", "UPI", "BANK_TRANSFER", "INSURANCE");

    private final InvoiceRepository repo;
    private final com.kedar.kapse.business_service.service.NotificationPublisher notifications;

    @GetMapping
    @PreAuthorize(STAFF)
    public List<Invoice> getAll(@RequestParam(required = false) String patientId) {
        if (patientId != null) return repo.findByPatientIdOrderByIssueDateDesc(patientId);
        return repo.findAll();
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public List<Invoice> mine() {
        return repo.findByPatientIdOrderByIssueDateDesc(CurrentUser.get().id());
    }

    @GetMapping("/me/summary")
    @PreAuthorize("hasRole('PATIENT')")
    public Map<String, Object> mySummary() {
        return summaryFor(CurrentUser.get().id());
    }

    @GetMapping("/{id}")
    public Invoice getById(@PathVariable UUID id) {
        Invoice inv = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Invoice not found"));
        CurrentUser me = CurrentUser.get();
        if (!me.isStaff() && !(me.hasRole("PATIENT") && me.id().equals(inv.getPatientId()))) {
            throw new EntityNotFoundException("Invoice not found");
        }
        return inv;
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(STAFF)
    public Invoice create(@RequestBody Invoice req) {
        if (req.getPatientId() == null || req.getPatientName() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "patientId and patientName are required");
        }
        if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be greater than 0");
        }
        Invoice inv = Invoice.builder()
                .invoiceNumber("INV-" + LocalDate.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .patientId(req.getPatientId())
                .patientName(req.getPatientName())
                .providerName(req.getProviderName() != null ? req.getProviderName() : CurrentUser.get().name())
                .description(req.getDescription())
                .amount(req.getAmount())
                .issueDate(req.getIssueDate() != null ? req.getIssueDate() : LocalDate.now())
                .dueDate(req.getDueDate() != null ? req.getDueDate() : LocalDate.now().plusDays(30))
                .build();
        Invoice saved = repo.save(inv);
        notifications.notify(saved.getPatientId(), "INVOICE_CREATED", "New bill " + saved.getInvoiceNumber(),
                "Amount " + saved.getAmount() + ", due " + saved.getDueDate(), "/billing");
        return saved;
    }

    /** Staff record a payment received (full, or partial with "amount"). */
    @PatchMapping("/{id}/pay")
    @PreAuthorize(STAFF)
    public Invoice recordPayment(@PathVariable UUID id, @RequestBody(required = false) Map<String, String> body) {
        Invoice inv = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Invoice not found"));
        if ("PAID".equals(inv.getStatus())) throw new IllegalStateException("Invoice is already paid");
        Map<String, String> b = body != null ? body : Map.of();
        String method = b.getOrDefault("paymentMethod", "CASH").toUpperCase();
        if (!METHODS.contains(method)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown payment method " + method);
        }
        BigDecimal alreadyPaid = inv.getPaidAmount() != null ? inv.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal due = inv.getAmount().subtract(alreadyPaid);
        BigDecimal pay = b.containsKey("amount") ? new BigDecimal(b.get("amount")) : due;
        if (pay.compareTo(BigDecimal.ZERO) <= 0 || pay.compareTo(due) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment must be between 0 and " + due);
        }
        inv.setPaidAmount(alreadyPaid.add(pay));
        inv.setPaymentMethod(method);
        inv.setPaidDate(LocalDate.now());
        inv.setStatus(inv.getPaidAmount().compareTo(inv.getAmount()) >= 0 ? "PAID" : "PARTIALLY_PAID");
        return repo.save(inv);
    }

    @GetMapping("/summary")
    @PreAuthorize(STAFF)
    public Map<String, Object> summary(@RequestParam String patientId) {
        return summaryFor(patientId);
    }

    private Map<String, Object> summaryFor(String patientId) {
        return Map.of(
            "pending", repo.countByPatientIdAndStatus(patientId, "PENDING"),
            "partiallyPaid", repo.countByPatientIdAndStatus(patientId, "PARTIALLY_PAID"),
            "paid", repo.countByPatientIdAndStatus(patientId, "PAID"),
            "overdue", repo.countByPatientIdAndStatus(patientId, "OVERDUE")
        );
    }
}
