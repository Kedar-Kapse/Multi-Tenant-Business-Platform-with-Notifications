package com.kedar.kapse.notification_service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * Notification Service — Handles email, SMS, and push notifications.
 *
 * Security is re-enabled (SecurityAutoConfiguration no longer excluded).
 * platform-core's SharedSecurityConfig provides default JWT validation.
 * DataSource/JPA excluded because this service uses Kafka, not a database.
 */
@SpringBootApplication(
        scanBasePackages = {"com.kedar.kapse", "com.restore.core"},
        exclude = {DataSourceAutoConfiguration.class, JpaRepositoriesAutoConfiguration.class, HibernateJpaAutoConfiguration.class}
)
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
