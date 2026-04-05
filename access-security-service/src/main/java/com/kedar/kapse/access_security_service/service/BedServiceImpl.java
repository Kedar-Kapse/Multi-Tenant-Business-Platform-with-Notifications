package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.BedResponse;
import com.kedar.kapse.platform_core.dto.CreateBedRequest;
import com.kedar.kapse.platform_core.dto.UpdateBedRequest;
import com.kedar.kapse.platform_core.entity.Bed;
import com.kedar.kapse.platform_core.entity.Facility;
import com.kedar.kapse.platform_core.repository.BedRepository;
import com.kedar.kapse.platform_core.repository.FacilityRepository;
import com.kedar.kapse.platform_core.enums.BedStatus;
import com.kedar.kapse.platform_core.enums.BedType;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BedServiceImpl implements BedService {

    private final BedRepository bedRepository;
    private final FacilityRepository facilityRepository;

    @Override
    @Transactional
    public BedResponse createBed(UUID facilityId, CreateBedRequest request) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new EntityNotFoundException("Facility not found: " + facilityId));

        log.info("Creating bed {}-{}-{} in facility '{}'",
                request.getWardName(), request.getRoomNumber(), request.getBedNumber(), facility.getName());

        Bed bed = Bed.builder()
                .facility(facility)
                .wardName(request.getWardName())
                .roomNumber(request.getRoomNumber())
                .bedNumber(request.getBedNumber())
                .bedType(BedType.valueOf(request.getBedType()))
                .status(request.getStatus() != null ? BedStatus.valueOf(request.getStatus()) : BedStatus.AVAILABLE)
                .assignedPatientId(request.getAssignedPatientId())
                .assignedPatientName(request.getAssignedPatientName())
                .notes(request.getNotes())
                .build();

        bed = bedRepository.save(bed);
        log.info("Bed created with id={}", bed.getId());
        return BedResponse.fromEntity(bed);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedResponse> listBedsByFacility(UUID facilityId) {
        return bedRepository.findByFacilityId(facilityId).stream()
                .map(BedResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BedResponse getBedById(UUID bedId) {
        Bed bed = bedRepository.findById(bedId)
                .orElseThrow(() -> new EntityNotFoundException("Bed not found: " + bedId));
        return BedResponse.fromEntity(bed);
    }

    @Override
    @Transactional
    public BedResponse updateBed(UUID bedId, UpdateBedRequest request) {
        Bed bed = bedRepository.findById(bedId)
                .orElseThrow(() -> new EntityNotFoundException("Bed not found: " + bedId));

        if (request.getWardName() != null) bed.setWardName(request.getWardName());
        if (request.getRoomNumber() != null) bed.setRoomNumber(request.getRoomNumber());
        if (request.getBedNumber() != null) bed.setBedNumber(request.getBedNumber());
        if (request.getBedType() != null) bed.setBedType(BedType.valueOf(request.getBedType()));
        if (request.getStatus() != null) {
            BedStatus newStatus = BedStatus.valueOf(request.getStatus());
            bed.setStatus(newStatus);
            if (newStatus == BedStatus.AVAILABLE || newStatus == BedStatus.MAINTENANCE) {
                bed.setAssignedPatientId(null);
                bed.setAssignedPatientName(null);
            }
        }
        if (request.getAssignedPatientId() != null) {
            bed.setAssignedPatientId(request.getAssignedPatientId());
            if (!request.getAssignedPatientId().isBlank()) {
                bed.setStatus(BedStatus.OCCUPIED);
            }
        }
        if (request.getAssignedPatientName() != null) bed.setAssignedPatientName(request.getAssignedPatientName());
        if (request.getNotes() != null) bed.setNotes(request.getNotes());

        bed = bedRepository.save(bed);
        log.info("Bed {} updated (status={})", bed.getId(), bed.getStatus());
        return BedResponse.fromEntity(bed);
    }

    @Override
    @Transactional
    public void deleteBed(UUID bedId) {
        Bed bed = bedRepository.findById(bedId)
                .orElseThrow(() -> new EntityNotFoundException("Bed not found: " + bedId));
        if (bed.getStatus() == BedStatus.OCCUPIED) {
            throw new IllegalStateException("Cannot delete an occupied bed. Discharge patient first.");
        }
        bedRepository.delete(bed);
        log.info("Bed {} deleted", bedId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedResponse> searchBeds(UUID facilityId, String query) {
        return bedRepository.searchByFacility(facilityId, query).stream()
                .map(BedResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedResponse> filterBedsByStatus(UUID facilityId, String status) {
        return bedRepository.findByFacilityIdAndStatus(facilityId, BedStatus.valueOf(status)).stream()
                .map(BedResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedResponse> filterBedsByWard(UUID facilityId, String wardName) {
        return bedRepository.findByFacilityIdAndWardName(facilityId, wardName).stream()
                .map(BedResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BedResponse> filterBedsByType(UUID facilityId, String bedType) {
        return bedRepository.findByFacilityIdAndBedType(facilityId, BedType.valueOf(bedType)).stream()
                .map(BedResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getWardsByFacility(UUID facilityId) {
        return bedRepository.findDistinctWardsByFacility(facilityId);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getBedStatistics(UUID facilityId) {
        Map<String, Long> stats = new LinkedHashMap<>();
        stats.put("total", bedRepository.countByFacility(facilityId));
        for (BedStatus status : BedStatus.values()) {
            stats.put(status.name().toLowerCase(), bedRepository.countByFacilityAndStatus(facilityId, status));
        }
        return stats;
    }
}
