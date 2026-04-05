package com.kedar.kapse.business_service.Practice;

import org.apache.kafka.common.Uuid;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepo extends JpaRepository<TaskTest , Uuid> {
}
