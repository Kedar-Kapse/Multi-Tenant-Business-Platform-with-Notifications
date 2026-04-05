package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.entity.FeeSchedule;
import com.kedar.kapse.business_service.repository.FeeScheduleRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/fee-schedules")
@RequiredArgsConstructor
public class FeeScheduleController {

    private final FeeScheduleRepository repo;

    @GetMapping
    public List<FeeSchedule> getAll() {
        return repo.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FeeSchedule create(@RequestBody FeeSchedule fs) {
        fs.setId(null);
        return repo.save(fs);
    }

    @PutMapping("/{id}")
    public FeeSchedule update(@PathVariable UUID id, @RequestBody FeeSchedule update) {
        FeeSchedule fs = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Fee not found"));
        if (update.getDescription() != null) fs.setDescription(update.getDescription());
        if (update.getFee() != null) fs.setFee(update.getFee());
        if (update.getMedicareRate() != null) fs.setMedicareRate(update.getMedicareRate());
        if (update.getCategory() != null) fs.setCategory(update.getCategory());
        fs.setActive(update.isActive());
        return repo.save(fs);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        repo.deleteById(id);
    }
}
