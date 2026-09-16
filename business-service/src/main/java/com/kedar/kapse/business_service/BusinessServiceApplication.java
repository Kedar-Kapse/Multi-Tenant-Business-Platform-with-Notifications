package com.kedar.kapse.business_service;

import com.kedar.kapse.platform_core.security.SharedSecurityConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ComponentScan(
    basePackages = "com.kedar.kapse",
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE,
        classes = SharedSecurityConfig.class
    )
)
@EnableDiscoveryClient
@EnableFeignClients
@EnableCaching
@EnableScheduling
@EntityScan(basePackages = "com.kedar.kapse.business_service.entity")
@EnableJpaRepositories(basePackages = "com.kedar.kapse.business_service.repository")
@Slf4j
public class BusinessServiceApplication implements CommandLineRunner {

    public static void main(String[] args) {
        SpringApplication.run(BusinessServiceApplication.class, args);
    }

    @Override
    public void run(String... args) {
        log.info("Business Service started successfully");
    }
}
