package com.kedar.kapse.business_service.config;

import com.kedar.kapse.business_service.exception.PccNonRetryableException;
import com.kedar.kapse.platform_core.event.EventTopics;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.TopicPartition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.ExponentialBackOff;

/**
 * Kafka topic declarations and error handling for business-service.
 * KafkaAdmin + @EnableKafka are provided by SharedKafkaAdminConfig in platform-core.
 *
 * Retry strategy for pcc.sync.requested:
 *   ExponentialBackOff: 2s → 4s → 8s → 16s → 32s (max), up to ~2 minutes total.
 *   After exhausting retries → DeadLetterPublishingRecoverer → pcc.sync.requested.dlq
 *
 * Non-retryable fast-path:
 *   PccNonRetryableException (4xx client errors) and CallNotPermittedException (circuit open)
 *   skip all retries and go directly to DLQ on the first failure.
 *
 * patient.created lives HERE (not access-security-service) because this service is
 * the one that actually produces it (see createPatient() in PatientServiceImpl) — a
 * topic's NewTopic bean should live with its producer.
 */
@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic pccSyncRequestedTopic() {
        return new NewTopic(EventTopics.PCC_SYNC_REQUESTED, 3, (short) 1);
    }

    @Bean
    public NewTopic pccSyncRequestedDlqTopic() {
        return new NewTopic(EventTopics.PCC_SYNC_REQUESTED_DLQ, 1, (short) 1);
    }

    @Bean
    public NewTopic patientCreatedTopic() {
        return new NewTopic(EventTopics.PATIENT_CREATED, 3, (short) 1);
    }

    /**
     * Exponential backoff: starts at 2s, multiplies by 2 each retry, caps at 32s.
     * Max elapsed time ~2 minutes — after that, routes to DLQ.
     * Total attempts before DLQ: ~6 (2 + 4 + 8 + 16 + 32 + 32 = ~94s).
     *
     * Non-retryable exceptions bypass the backoff entirely and land in DLQ immediately.
     * This prevents burning the full retry budget on errors that will never succeed
     * (e.g. malformed payload, bad patient data, circuit already open).
     */
    @SuppressWarnings("unchecked")
    @Bean
    public DefaultErrorHandler pccSyncErrorHandler(KafkaTemplate<String, Object> kafkaTemplate) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                kafkaTemplate,
                (record, ex) -> new TopicPartition(EventTopics.PCC_SYNC_REQUESTED_DLQ, 0));

        ExponentialBackOff backOff = new ExponentialBackOff(2_000L, 2.0);
        backOff.setMaxInterval(32_000L);
        backOff.setMaxElapsedTime(120_000L);

        DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, backOff);

        // Skip retries for these — they will always fail regardless of how many times we try.
        handler.addNotRetryableExceptions(PccNonRetryableException.class);
        // Circuit open: PCC is unavailable; retrying immediately just burns the retry budget.
        // Admin re-triggers sync manually after circuit closes.
        handler.addNotRetryableExceptions(CallNotPermittedException.class);

        return handler;
    }
}
