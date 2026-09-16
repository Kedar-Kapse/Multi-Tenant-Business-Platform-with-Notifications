package com.kedar.kapse.business_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
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
