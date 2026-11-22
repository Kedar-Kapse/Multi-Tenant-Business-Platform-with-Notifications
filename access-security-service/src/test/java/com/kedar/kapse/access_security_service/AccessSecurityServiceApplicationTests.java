package com.kedar.kapse.access_security_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.oauth2.jwt.JwtDecoder;

@SpringBootTest(properties = {
        // Wiring test only: no real database migrations (they need a reachable DB with the right password).
        "spring.flyway.enabled=false",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=false",
		"jwt.secret-key=7JgaiHPgovzCf1NpDvT0m5Js46ARXS2j7JgaiHPgovzCf1NpDvT0m5Js46ARXS2j",
		// Suppress KafkaAdmin ERROR noise — no broker running in test environments
		"logging.level.org.springframework.kafka.core.KafkaAdmin=OFF",
		"logging.level.com.netflix.discovery=WARN",
		"logging.level.com.netflix.eureka=WARN"
})
class AccessSecurityServiceApplicationTests {

	@MockBean
	private JwtDecoder jwtDecoder;

	@Test
	void contextLoads() {
	}

}