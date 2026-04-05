package com.kedar.kapse.business_service.repository;

import com.kedar.kapse.business_service.entity.EhrTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EhrTemplateRepository extends JpaRepository<EhrTemplate, UUID> {
    List<EhrTemplate> findAllByOrderByNameAsc();
    List<EhrTemplate> findByCategoryIgnoreCaseOrderByNameAsc(String category);
    long countByActiveTrue();
}
