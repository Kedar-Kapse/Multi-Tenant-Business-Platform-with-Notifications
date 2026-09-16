package com.kedar.kapse.access_security_service.config;

import com.kedar.kapse.platform_core.event.EventTopics;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the Kafka topics this service produces to.
 * KafkaAdmin and @EnableKafka are provided by SharedKafkaAdminConfig in platform-core.
 */
@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic otpRequestedTopic() {
        return new NewTopic(EventTopics.OTP_REQUESTED, 3, (short) 1);
    }

    @Bean
    public NewTopic patientCreatedTopic() {
        return new NewTopic(EventTopics.PATIENT_CREATED, 3, (short) 1);
    }
}
