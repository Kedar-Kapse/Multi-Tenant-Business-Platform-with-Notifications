package com.kedar.kapse.business_service.repository;

import com.kedar.kapse.business_service.entity.CptCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CptCodeRepository extends JpaRepository<CptCode, UUID> {

    @Query("SELECT c FROM CptCode c WHERE LOWER(c.code) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%',:q,'%')) ORDER BY c.code")
    List<CptCode> search(String q);

    boolean existsByCode(String code);
}
