package com.kedar.kapse.business_service.Practice;

import org.apache.kafka.common.Uuid;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TestRepo extends JpaRepository<TestEntity , UUID> {

}
