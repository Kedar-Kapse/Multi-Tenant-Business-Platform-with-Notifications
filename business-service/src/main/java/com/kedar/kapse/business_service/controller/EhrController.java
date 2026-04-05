package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.entity.CptCode;
import com.kedar.kapse.business_service.entity.EhrTemplate;
import com.kedar.kapse.business_service.entity.IcdCode;
import com.kedar.kapse.business_service.service.EhrService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ehr")
@RequiredArgsConstructor
public class EhrController {

    private final EhrService ehrService;

    // ======================== TEMPLATES ========================

    @GetMapping("/templates")
    public List<EhrTemplate> getTemplates(@RequestParam(required = false) String category) {
        if (category != null && !category.isBlank()) {
            return ehrService.getTemplatesByCategory(category);
        }
        return ehrService.getAllTemplates();
    }

    @PostMapping("/templates")
    @ResponseStatus(HttpStatus.CREATED)
    public EhrTemplate createTemplate(@RequestBody EhrTemplate template) {
        return ehrService.createTemplate(template);
    }

    @PutMapping("/templates/{id}")
    public EhrTemplate updateTemplate(@PathVariable UUID id, @RequestBody EhrTemplate template) {
        return ehrService.updateTemplate(id, template);
    }

    @PatchMapping("/templates/{id}/toggle")
    public EhrTemplate toggleTemplate(@PathVariable UUID id) {
        return ehrService.toggleTemplate(id);
    }

    @DeleteMapping("/templates/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTemplate(@PathVariable UUID id) {
        ehrService.deleteTemplate(id);
    }

    // ======================== ICD CODES ========================

    @GetMapping("/icd-codes")
    public List<IcdCode> searchIcdCodes(@RequestParam String q) {
        return ehrService.searchIcdCodes(q);
    }

    @PostMapping("/icd-codes")
    @ResponseStatus(HttpStatus.CREATED)
    public IcdCode createIcdCode(@RequestBody IcdCode code) {
        return ehrService.createIcdCode(code);
    }

    @DeleteMapping("/icd-codes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteIcdCode(@PathVariable UUID id) {
        ehrService.deleteIcdCode(id);
    }

    // ======================== CPT CODES ========================

    @GetMapping("/cpt-codes")
    public List<CptCode> searchCptCodes(@RequestParam String q) {
        return ehrService.searchCptCodes(q);
    }

    @PostMapping("/cpt-codes")
    @ResponseStatus(HttpStatus.CREATED)
    public CptCode createCptCode(@RequestBody CptCode code) {
        return ehrService.createCptCode(code);
    }

    @DeleteMapping("/cpt-codes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCptCode(@PathVariable UUID id) {
        ehrService.deleteCptCode(id);
    }
}
