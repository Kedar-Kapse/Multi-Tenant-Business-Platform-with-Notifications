package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.entity.AuditLog;
import com.kedar.kapse.access_security_service.repository.AuditLogRepository;
import com.kedar.kapse.platform_core.enums.AuditAction;
import com.kedar.kapse.platform_core.enums.AuditEntityType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Who did what, when -- for the caller's hospital only (rows are tenant-filtered).
 * ADMIN only. Filters: action, entityType, from/to (dates, inclusive), free text.
 */
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AuditLogController {

    private static final int EXPORT_LIMIT = 5000;

    private final AuditLogRepository repo;

    @GetMapping
    public Page<AuditLog> search(@RequestParam(required = false) String action,
                                 @RequestParam(required = false) String entityType,
                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                 @RequestParam(required = false) String query,
                                 @RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "25") int size) {
        return find(action, entityType, from, to, query,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending()));
    }

    /** Values for the filter dropdowns. */
    @GetMapping("/filters")
    public Map<String, List<String>> filters() {
        return Map.of(
                "actions", Arrays.stream(AuditAction.values()).map(Enum::name).toList(),
                "entityTypes", Arrays.stream(AuditEntityType.values()).map(Enum::name).toList());
    }

    /** Same filters, as a CSV download (newest first, at most 5000 rows). */
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(@RequestParam(required = false) String action,
                                         @RequestParam(required = false) String entityType,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                         @RequestParam(required = false) String query) {
        List<AuditLog> rows = find(action, entityType, from, to, query,
                PageRequest.of(0, EXPORT_LIMIT, Sort.by("createdAt").descending())).getContent();
        StringBuilder csv = new StringBuilder("time,action,entity_type,entity_id,actor,details\n");
        for (AuditLog a : rows) {
            csv.append(cell(String.valueOf(a.getCreatedAt()))).append(',')
               .append(cell(a.getAction())).append(',')
               .append(cell(a.getEntityType())).append(',')
               .append(cell(a.getEntityId())).append(',')
               .append(cell(a.getActorName() != null ? a.getActorName() : a.getActorId())).append(',')
               .append(cell(a.getDetails())).append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit-log-" + LocalDate.now() + ".csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    private Page<AuditLog> find(String action, String entityType, LocalDate from, LocalDate to, String query,
                                PageRequest pageable) {
        LocalDateTime f = from != null ? from.atStartOfDay() : null;
        LocalDateTime t = to != null ? to.plusDays(1).atStartOfDay() : null;
        return repo.search(blank(action), blank(entityType), f, t, blank(query), pageable);
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    /** CSV cell, quoted; a leading = + - @ is neutralised so spreadsheets don't run it as a formula. */
    private static String cell(String v) {
        if (v == null) return "";
        String s = v.replace("\"", "\"\"").replace("\r", " ").replace("\n", " ");
        if (!s.isEmpty() && "=+-@".indexOf(s.charAt(0)) >= 0) s = "'" + s;
        return "\"" + s + "\"";
    }
}
