package com.kedar.kapse.platform_core.config;

import org.apache.kafka.clients.admin.AdminClientConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.core.KafkaAdmin;

import java.util.HashMap;
import java.util.Map;

/**
 * Shared Kafka admin configuration for all services that use Kafka.
 *
 * Only activates when spring-kafka is on the classpath (@ConditionalOnClass).
 * Each service's own KafkaTopicConfig only needs to declare its NewTopic beans —
 * KafkaAdmin and @EnableKafka are provided here, no duplication needed.
 */
@Configuration
@EnableKafka
@ConditionalOnClass(KafkaAdmin.class)
public class SharedKafkaAdminConfig {

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Bean
    @ConditionalOnMissingBean
    public KafkaAdmin kafkaAdmin() {
        Map<String, Object> config = new HashMap<>();
        config.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, 3000);
        config.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, 3000);
        KafkaAdmin admin = new KafkaAdmin(config);
        admin.setFatalIfBrokerNotAvailable(false);
        return admin;
    }
}
