package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.service.StaffService;
import com.kedar.kapse.platform_core.dto.ProviderDirectoryEntry;
import com.kedar.kapse.platform_core.enums.StaffRole;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

/**
 * Care-team directory for any logged-in user (patients use it to find, book and
 * message a clinician). Only safe public fields are returned -- see ProviderDirectoryEntry.
 */
@RestController
@RequestMapping("/api/providers")
@RequiredArgsConstructor
public class ProviderDirectoryController {

    private final StaffService staffService;

    @GetMapping
    public Page<ProviderDirectoryEntry> directory(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) StaffRole role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        return staffService.providerDirectory(query, role,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                        Sort.by("lastName").ascending().and(Sort.by("firstName"))));
    }
}
