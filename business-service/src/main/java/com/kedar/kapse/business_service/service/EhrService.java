package com.kedar.kapse.business_service.service;

import com.kedar.kapse.business_service.entity.CptCode;
import com.kedar.kapse.business_service.entity.EhrTemplate;
import com.kedar.kapse.business_service.entity.IcdCode;
import com.kedar.kapse.business_service.repository.CptCodeRepository;
import com.kedar.kapse.business_service.repository.EhrTemplateRepository;
import com.kedar.kapse.business_service.repository.IcdCodeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EhrService {

    private final EhrTemplateRepository templateRepo;
    private final IcdCodeRepository icdRepo;
    private final CptCodeRepository cptRepo;

    // ======================== TEMPLATES ========================

    @Transactional(readOnly = true)
    public List<EhrTemplate> getAllTemplates() {
        return templateRepo.findAllByOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    public List<EhrTemplate> getTemplatesByCategory(String category) {
        return templateRepo.findByCategoryIgnoreCaseOrderByNameAsc(category);
    }

    @Transactional
    public EhrTemplate createTemplate(EhrTemplate template) {
        template.setId(null);
        log.info("Creating EHR template: {}", template.getName());
        return templateRepo.save(template);
    }

    @Transactional
    public EhrTemplate updateTemplate(UUID id, EhrTemplate update) {
        EhrTemplate existing = templateRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Template not found: " + id));
        existing.setName(update.getName());
        existing.setDescription(update.getDescription());
        existing.setCategory(update.getCategory());
        existing.setFieldCount(update.getFieldCount());
        existing.setSpecialty(update.getSpecialty());
        existing.setVersion(update.getVersion());
        log.info("Updated EHR template: {}", existing.getName());
        return templateRepo.save(existing);
    }

    @Transactional
    public EhrTemplate toggleTemplate(UUID id) {
        EhrTemplate template = templateRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Template not found: " + id));
        template.setActive(!template.isActive());
        log.info("Toggled template '{}' to {}", template.getName(), template.isActive() ? "ACTIVE" : "DRAFT");
        return templateRepo.save(template);
    }

    @Transactional
    public void deleteTemplate(UUID id) {
        if (!templateRepo.existsById(id)) {
            throw new EntityNotFoundException("Template not found: " + id);
        }
        templateRepo.deleteById(id);
        log.info("Deleted template: {}", id);
    }

    // ======================== ICD CODES ========================

    @Transactional(readOnly = true)
    public List<IcdCode> searchIcdCodes(String query) {
        if (query == null || query.length() < 2) return List.of();
        return icdRepo.search(query);
    }

    @Transactional
    public IcdCode createIcdCode(IcdCode code) {
        if (icdRepo.existsByCode(code.getCode())) {
            throw new IllegalArgumentException("ICD code '" + code.getCode() + "' already exists");
        }
        code.setId(null);
        log.info("Created ICD code: {} - {}", code.getCode(), code.getDescription());
        return icdRepo.save(code);
    }

    @Transactional
    public void deleteIcdCode(UUID id) {
        icdRepo.deleteById(id);
    }

    // ======================== CPT CODES ========================

    @Transactional(readOnly = true)
    public List<CptCode> searchCptCodes(String query) {
        if (query == null || query.length() < 2) return List.of();
        return cptRepo.search(query);
    }

    @Transactional
    public CptCode createCptCode(CptCode code) {
        if (cptRepo.existsByCode(code.getCode())) {
            throw new IllegalArgumentException("CPT code '" + code.getCode() + "' already exists");
        }
        code.setId(null);
        log.info("Created CPT code: {} - {}", code.getCode(), code.getDescription());
        return cptRepo.save(code);
    }

    @Transactional
    public void deleteCptCode(UUID id) {
        cptRepo.deleteById(id);
    }
}
