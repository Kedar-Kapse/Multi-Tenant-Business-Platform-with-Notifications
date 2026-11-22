package com.kedar.kapse.business_service.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import com.kedar.kapse.business_service.entity.Claim;
import com.kedar.kapse.business_service.repository.ClaimRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@PreAuthorize("hasAnyRole('ADMIN','PROVIDER','PHYSICIAN','NURSE','THERAPIST')") // all hospital staff; writes below may require ADMIN
@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
public class ClaimsController {

    private final ClaimRepository repo;

    @GetMapping
    public List<Claim> getAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public Claim getById(@PathVariable UUID id) {
        return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Claim not found"));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Claim submit(@RequestBody Claim claim) {
        validate(claim, true);
        claim.setId(null);
        // Claim number is made by the server (unique), never by the browser.
        claim.setClaimId("CLM-" + LocalDate.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        if (claim.getDateSubmitted() == null) claim.setDateSubmitted(LocalDate.now());
        claim.setStatus(claim.getStatus() == null ? "SUBMITTED" : status(claim.getStatus()));
        claim.setPaidAmount(claim.getPaidAmount() == null ? java.math.BigDecimal.ZERO : claim.getPaidAmount());
        return repo.save(claim);
    }

    @PutMapping("/{id}")
    public Claim update(@PathVariable UUID id, @RequestBody Claim update) {
        Claim claim = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Claim not found"));
        validate(update, false);
        // Every editable field is applied (previously only the status fields were saved
        // while the UI reported the whole edit as successful).
        if (update.getPatientName() != null) claim.setPatientName(update.getPatientName());
        if (update.getPatientId() != null) claim.setPatientId(update.getPatientId());
        if (update.getPayerName() != null) claim.setPayerName(update.getPayerName());
        if (update.getProvider() != null) claim.setProvider(update.getProvider());
        if (update.getCptCode() != null) claim.setCptCode(update.getCptCode());
        if (update.getIcdCode() != null) claim.setIcdCode(update.getIcdCode());
        if (update.getDescription() != null) claim.setDescription(update.getDescription());
        if (update.getAmount() != null) claim.setAmount(update.getAmount());
        if (update.getDateSubmitted() != null) claim.setDateSubmitted(update.getDateSubmitted());
        if (update.getStatus() != null) claim.setStatus(status(update.getStatus()));
        if (update.getPaidAmount() != null) claim.setPaidAmount(update.getPaidAmount());
        if (update.getAllowedAmount() != null) claim.setAllowedAmount(update.getAllowedAmount());
        if (update.getDenialReason() != null) claim.setDenialReason(update.getDenialReason());
        if (update.getDateProcessed() != null) claim.setDateProcessed(update.getDateProcessed());
        return repo.save(claim);
    }

    private static final java.util.Set<String> STATUSES =
            java.util.Set.of("SUBMITTED", "IN_REVIEW", "APPROVED", "DENIED", "APPEALED", "PAID");

    private static String status(String s) {
        String v = s.trim().toUpperCase().replace(' ', '_');
        if (!STATUSES.contains(v)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown claim status " + s);
        }
        return v;
    }

    private static void validate(Claim c, boolean creating) {
        java.util.function.Consumer<String> bad = m -> {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, m);
        };
        if (creating) {
            if (c.getPatientName() == null || c.getPatientName().isBlank()) bad.accept("Patient name is required");
            if (c.getPayerName() == null || c.getPayerName().isBlank()) bad.accept("Payer is required");
            if (c.getAmount() == null) bad.accept("Amount is required");
        }
        if (c.getAmount() != null && c.getAmount().signum() <= 0) bad.accept("Amount must be greater than 0");
        if (c.getPaidAmount() != null && c.getPaidAmount().signum() < 0) bad.accept("Paid amount cannot be negative");
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        if (!repo.existsById(id)) throw new EntityNotFoundException("Claim not found");
        repo.deleteById(id);
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        long total = repo.count();
        long submitted = repo.countByStatus("SUBMITTED");
        long inReview = repo.countByStatus("IN_REVIEW");
        long approved = repo.countByStatus("APPROVED");
        long paid = repo.countByStatus("PAID");
        long denied = repo.countByStatus("DENIED");
        long appealed = repo.countByStatus("APPEALED");
        return Map.of("total", total, "submitted", submitted, "inReview", inReview, "approved", approved,
                "paid", paid, "denied", denied, "appealed", appealed);
    }
}
