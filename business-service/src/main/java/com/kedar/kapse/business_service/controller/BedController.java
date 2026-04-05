package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.platform_core.dto.*;
import com.kedar.kapse.platform_core.entity.Bed;
import com.kedar.kapse.platform_core.entity.Facility;
import com.kedar.kapse.platform_core.enums.BedStatus;
import com.kedar.kapse.platform_core.enums.BedType;
import com.kedar.kapse.platform_core.repository.BedRepository;
import com.kedar.kapse.platform_core.repository.FacilityRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inventory/beds")
@RequiredArgsConstructor
@Slf4j
public class BedController {

    private final BedRepository bedRepo;
    private final FacilityRepository facilityRepo;

    @GetMapping
    public List<BedResponse> getAll(@RequestParam(required = false) UUID facilityId) {
        List<Bed> beds = facilityId != null ? bedRepo.findByFacilityId(facilityId) : bedRepo.findAll();
        return beds.stream().map(BedResponse::fromEntity).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public BedResponse getById(@PathVariable UUID id) {
        return BedResponse.fromEntity(bedRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Bed not found")));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BedResponse create(@RequestParam UUID facilityId, @RequestBody CreateBedRequest req) {
        Facility facility = facilityRepo.findById(facilityId)
                .orElseThrow(() -> new EntityNotFoundException("Facility not found"));

        Bed bed = Bed.builder()
                .facility(facility)
                .wardName(req.getWardName())
                .roomNumber(req.getRoomNumber())
                .bedNumber(req.getBedNumber())
                .bedType(BedType.valueOf(req.getBedType()))
                .status(req.getStatus() != null ? BedStatus.valueOf(req.getStatus()) : BedStatus.AVAILABLE)
                .notes(req.getNotes())
                .build();
        bed = bedRepo.save(bed);
        log.info("Created bed: {}-{}-{}", bed.getWardName(), bed.getRoomNumber(), bed.getBedNumber());
        return BedResponse.fromEntity(bed);
    }

    @PutMapping("/{id}")
    public BedResponse update(@PathVariable UUID id, @RequestBody UpdateBedRequest req) {
        Bed bed = bedRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Bed not found"));
        if (req.getWardName() != null) bed.setWardName(req.getWardName());
        if (req.getRoomNumber() != null) bed.setRoomNumber(req.getRoomNumber());
        if (req.getBedNumber() != null) bed.setBedNumber(req.getBedNumber());
        if (req.getBedType() != null) bed.setBedType(BedType.valueOf(req.getBedType()));
        if (req.getStatus() != null) {
            BedStatus newStatus = BedStatus.valueOf(req.getStatus());
            bed.setStatus(newStatus);
            if (newStatus == BedStatus.AVAILABLE || newStatus == BedStatus.MAINTENANCE) {
                bed.setAssignedPatientId(null);
                bed.setAssignedPatientName(null);
            }
        }
        if (req.getAssignedPatientId() != null) {
            bed.setAssignedPatientId(req.getAssignedPatientId());
            bed.setStatus(BedStatus.OCCUPIED);
        }
        if (req.getAssignedPatientName() != null) bed.setAssignedPatientName(req.getAssignedPatientName());
        if (req.getNotes() != null) bed.setNotes(req.getNotes());
        return BedResponse.fromEntity(bedRepo.save(bed));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        Bed bed = bedRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Bed not found"));
        if (bed.getStatus() == BedStatus.OCCUPIED) {
            throw new IllegalStateException("Cannot delete an occupied bed");
        }
        bedRepo.delete(bed);
    }
}
