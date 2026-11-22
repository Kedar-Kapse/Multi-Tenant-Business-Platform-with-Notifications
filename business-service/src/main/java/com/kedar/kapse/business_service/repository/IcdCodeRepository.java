package com.kedar.kapse.business_service.repository;

import com.kedar.kapse.business_service.entity.IcdCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IcdCodeRepository extends JpaRepository<IcdCode, UUID> {

    @Query("SELECT i FROM IcdCode i WHERE LOWER(i.code) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(i.description) LIKE LOWER(CONCAT('%',:q,'%')) ORDER BY i.code")
    List<IcdCode> search(@org.springframework.data.repository.query.Param("q") String q, org.springframework.data.domain.Pageable page);

    boolean existsByCode(String code);
}
