package com.kedar.kapse.notification_service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * Notification Service — Handles email, SMS, and push notifications.
 *
 * Security is re-enabled (SecurityAutoConfiguration no longer excluded).
 * platform-core's SharedSecurityConfig provides default JWT validation.
 * It now has a small database table of its own (in-app notifications, see entity/).
 */
@SpringBootApplication(scanBasePackages = {"com.kedar.kapse", "com.restore.core"})
@org.springframework.data.jpa.repository.config.EnableJpaRepositories(
        basePackages = "com.kedar.kapse.notification_service.repository",
        repositoryBaseClass = com.kedar.kapse.platform_core.tenancy.TenantAwareJpaRepository.class)
@org.springframework.boot.autoconfigure.domain.EntityScan("com.kedar.kapse.notification_service.entity")
@EnableDiscoveryClient
@Slf4j
public class NotificationServiceApplication implements CommandLineRunner {

	@Value("${spring.application.name}")
	private String appName;

	public static void main(String[] args) {
		SpringApplication.run(NotificationServiceApplication.class, args);
	}

	@Override
	public void run(String... args) throws Exception {
		log.info("Eureka registration enabled for {}", appName);
	}

}
