package com.kedar.kapse.business_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        // Wiring test only: no real database migrations (they need a reachable DB with the right password).
        "spring.flyway.enabled=false",
        "app.demo-data.enabled=false",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=false",
		// Suppress KafkaAdmin ERROR noise — no broker running in test environments
		"logging.level.org.springframework.kafka.core.KafkaAdmin=OFF",
		"logging.level.com.netflix.discovery=WARN",
		"logging.level.com.netflix.eureka=WARN"
})
class BusinessServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
