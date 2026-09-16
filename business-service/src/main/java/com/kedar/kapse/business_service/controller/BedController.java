package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.service.BedService;
import com.kedar.kapse.platform_core.dto.BedResponse;
import com.kedar.kapse.platform_core.dto.CreateBedRequest;
import com.kedar.kapse.platform_core.dto.UpdateBedRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory/beds")
@RequiredArgsConstructor
public class BedController {

    private final BedService bedService;

    @GetMapping
    public List<BedResponse> getAll(@RequestParam(required = false) UUID facilityId,
                                    @RequestParam(required = false) String query,
                                    @RequestParam(required = false) String status,
                                    @RequestParam(required = false) String ward,
                                    @RequestParam(required = false) String type) {
        if (facilityId == null) return bedService.listBedsByFacility(null);
        if (query != null)  return bedService.searchBeds(facilityId, query);
        if (status != null) return bedService.filterBedsByStatus(facilityId, status);
        if (ward != null)   return bedService.filterBedsByWard(facilityId, ward);
        if (type != null)   return bedService.filterBedsByType(facilityId, type);
        return bedService.listBedsByFacility(facilityId);
    }

    @GetMapping("/{id}")
    public BedResponse getById(@PathVariable UUID id) {
        return bedService.getBedById(id);
    }

    @GetMapping("/wards")
    public List<String> getWards(@RequestParam UUID facilityId) {
        return bedService.getWardsByFacility(facilityId);
    }

    @GetMapping("/statistics")
    public Map<String, Long> getStatistics(@RequestParam UUID facilityId) {
        return bedService.getBedStatistics(facilityId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BedResponse create(@RequestParam UUID facilityId, @RequestBody CreateBedRequest req) {
        return bedService.createBed(facilityId, req);
    }

    @PutMapping("/{id}")
    public BedResponse update(@PathVariable UUID id, @RequestBody UpdateBedRequest req) {
        return bedService.updateBed(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        bedService.deleteBed(id);
    }
}
