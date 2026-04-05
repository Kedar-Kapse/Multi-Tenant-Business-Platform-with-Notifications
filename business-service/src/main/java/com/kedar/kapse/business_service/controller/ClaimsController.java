package com.kedar.kapse.business_service.controller;

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
        claim.setId(null);
        if (claim.getDateSubmitted() == null) claim.setDateSubmitted(LocalDate.now());
        if (claim.getStatus() == null) claim.setStatus("SUBMITTED");
        return repo.save(claim);
    }

    @PutMapping("/{id}")
    public Claim update(@PathVariable UUID id, @RequestBody Claim update) {
        Claim claim = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Claim not found"));
        if (update.getStatus() != null) claim.setStatus(update.getStatus());
        if (update.getPaidAmount() != null) claim.setPaidAmount(update.getPaidAmount());
        if (update.getAllowedAmount() != null) claim.setAllowedAmount(update.getAllowedAmount());
        if (update.getDenialReason() != null) claim.setDenialReason(update.getDenialReason());
        if (update.getDateProcessed() != null) claim.setDateProcessed(update.getDateProcessed());
        return repo.save(claim);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
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
        return Map.of("total", total, "submitted", submitted, "inReview", inReview, "approved", approved, "paid", paid, "denied", denied);
    }
}
