package com.kedar.kapse.notification_service.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Prevents duplicate emails when Kafka redelivers the same message — normal
 * "at-least-once" behavior (e.g. consumer restart before offset commit, or a
 * rebalance), not a bug. Backed by Redis so it works across restarts and
 * across however many notification-service instances are running.
 *
 * Usage pattern: check isAlreadyProcessed() BEFORE doing the work, and only
 * call markProcessed() AFTER it succeeds. Marking too early (e.g. before the
 * email actually sends) would make retries after a failure look like
 * duplicates and get skipped instead of retried.
 */
@Service
@RequiredArgsConstructor
public class EventIdempotencyService {

    private static final Duration PROCESSED_TTL = Duration.ofHours(24);
    private static final String KEY_PREFIX = "notif:processed-event:";

    private final StringRedisTemplate redisTemplate;

    public boolean isAlreadyProcessed(String eventId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_PREFIX + eventId));
    }

    public void markProcessed(String eventId) {
        redisTemplate.opsForValue().set(KEY_PREFIX + eventId, "1", PROCESSED_TTL);
    }
}
