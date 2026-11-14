package com.kedar.kapse.notification_service.config;

import com.kedar.kapse.platform_core.event.EventTopics;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.TopicPartition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.ExponentialBackOff;

/**
 * Kafka topic declarations and error handling for notification-service.
 * KafkaAdmin + @EnableKafka are provided by SharedKafkaAdminConfig in platform-core.
 *
 * Previously, OtpNotificationListener / PatientNotificationListener caught mail
 * failures and silently dropped the event (see git history) — no retry, no DLQ,
 * matching neither of this project's own "gold standard" pattern in
 * business-service's KafkaTopicConfig (pcc.sync.requested). This config brings
 * notification-service up to that same standard.
 *
 * Retry strategy for otp.requested / patient.created:
 *   ExponentialBackOff: 2s -> 4s, capped at ~10s total elapsed. Deliberately SHORT
 *   compared to pcc.sync's ~2 minutes — an OTP email is only useful while the OTP's
 *   own TTL (~60s) is still valid, so a long retry window would just waste time
 *   retrying something the user can no longer use anyway.
 *   After exhausting retries -> DeadLetterPublishingRecoverer -> "<topic>.dlq"
 *   (the DLQ topic name is derived generically from the source topic name, so this
 *   one handler covers both otp.requested.dlq and patient.created.dlq).
 */
@Configuration
public class NotificationKafkaConfig {

    @Bean
    public NewTopic otpRequestedDlqTopic() {
        return new NewTopic(EventTopics.OTP_REQUESTED_DLQ, 1, (short) 1);
    }

    @Bean
    public NewTopic patientCreatedDlqTopic() {
        return new NewTopic(EventTopics.PATIENT_CREATED_DLQ, 1, (short) 1);
    }

    @SuppressWarnings("unchecked")
    @Bean
    public DefaultErrorHandler notificationErrorHandler(KafkaTemplate<String, Object> kafkaTemplate) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                kafkaTemplate,
                (record, ex) -> new TopicPartition(record.topic() + ".dlq", 0));

        ExponentialBackOff backOff = new ExponentialBackOff(2_000L, 2.0);
        backOff.setMaxInterval(4_000L);
        backOff.setMaxElapsedTime(10_000L);

        return new DefaultErrorHandler(recoverer, backOff);
    }
}
