package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.entity.Invoice;
import com.kedar.kapse.business_service.repository.InvoiceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController @RequestMapping("/api/invoices") @RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceRepository repo;

    @GetMapping
    public List<Invoice> getAll(@RequestParam(required = false) String patientId) {
        if (patientId != null) return repo.findByPatientIdOrderByIssueDateDesc(patientId);
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public Invoice getById(@PathVariable UUID id) {
        return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Invoice not found"));
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Invoice create(@RequestBody Invoice inv) {
        inv.setId(null);
        if (inv.getIssueDate() == null) inv.setIssueDate(LocalDate.now());
        if (inv.getDueDate() == null) inv.setDueDate(LocalDate.now().plusDays(30));
        return repo.save(inv);
    }

    @PatchMapping("/{id}/pay")
    public Invoice pay(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        Invoice inv = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Invoice not found"));
        inv.setStatus("PAID");
        inv.setPaidAmount(inv.getAmount());
        inv.setPaidDate(LocalDate.now());
        inv.setPaymentMethod(body.getOrDefault("paymentMethod", "CARD"));
        return repo.save(inv);
    }

    @GetMapping("/summary")
    public Map<String, Object> summary(@RequestParam String patientId) {
        return Map.of(
            "pending", repo.countByPatientIdAndStatus(patientId, "PENDING"),
            "paid", repo.countByPatientIdAndStatus(patientId, "PAID"),
            "overdue", repo.countByPatientIdAndStatus(patientId, "OVERDUE")
        );
    }
}
