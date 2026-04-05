package com.kedar.kapse.business_service.repository;

import com.kedar.kapse.business_service.entity.Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ClaimRepository extends JpaRepository<Claim, UUID> {
    boolean existsByClaimId(String claimId);
    long countByStatus(String status);
}
