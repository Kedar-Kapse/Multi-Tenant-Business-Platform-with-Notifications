package com.kedar.kapse.business_service.repository;

import com.kedar.kapse.business_service.entity.FeeSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FeeScheduleRepository extends JpaRepository<FeeSchedule, UUID> {
    boolean existsByCode(String code);
}
