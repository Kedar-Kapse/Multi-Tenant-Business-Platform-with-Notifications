package com.kedar.kapse.access_security_service;

import com.kedar.kapse.access_security_service.config.PortalConfig;
import com.kedar.kapse.platform_core.security.SharedSecurityConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Access Security Service — Authentication, Tenant, User, Staff, Facility management.
 *
 * Excludes SharedSecurityConfig because this service defines its OWN SecurityFilterChain
 * with custom public endpoints (login, refresh, logout).
 */
@SpringBootApplication
@EnableScheduling
@EnableFeignClients(basePackages = "com.kedar.kapse.access_security_service.client")
@EnableConfigurationProperties({PortalConfig.class})
@ComponentScan(
        basePackages = "com.kedar.kapse",
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = SharedSecurityConfig.class
        )
)
@EntityScan(basePackages = "com.kedar.kapse.access_security_service.entity")
@EnableJpaRepositories(basePackages = "com.kedar.kapse.access_security_service.repository")
public class AccessSecurityServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(AccessSecurityServiceApplication.class, args);
	}

}
