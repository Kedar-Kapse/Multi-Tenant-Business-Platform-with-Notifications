package com.kedar.kapse.notification_service.kafka;

import com.kedar.kapse.platform_core.event.BaseEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class KafkaConsumerService {

    @KafkaListener(topics = "test-topic", groupId = "notification-group")
    public void consume(BaseEvent<String> event) {
        log.info("📩 Received Event in Notification Service!");
        log.info("Event ID: {}", event.getEventId());
        log.info("Source: {}", event.getSource());
        log.info("Payload: {}", event.getPayload());
    }
}