package com.kedar.kapse.access_security_service.config;

import com.kedar.kapse.platform_core.event.EventTopics;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaAdmin;

import java.util.Map;

/**
 * Declares the Kafka topics this service produces to. {@link KafkaAdmin} will
 * create any missing topics at startup (no-op if they already exist).
 */
@Configuration
public class KafkaTopicConfig {

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Bean
    public KafkaAdmin kafkaAdmin() {
        KafkaAdmin admin = new KafkaAdmin(Map.of(
                AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers,
                AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, 3000,
                AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, 3000
        ));
        // Don't fail app startup if Kafka is unreachable; the fallback mailer covers that case.
        admin.setFatalIfBrokerNotAvailable(false);
        return admin;
    }

    @Bean
    public NewTopic patientCreatedTopic() {
        return new NewTopic(EventTopics.PATIENT_CREATED, 3, (short) 1);
    }

    @Bean
    public NewTopic otpRequestedTopic() {
        return new NewTopic(EventTopics.OTP_REQUESTED, 3, (short) 1);
    }
}
