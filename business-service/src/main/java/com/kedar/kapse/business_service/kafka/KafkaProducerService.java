package com.kedar.kapse.business_service.kafka;


import com.kedar.kapse.platform_core.event.BaseEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor // Automatically injects the KafkaTemplate
public class KafkaProducerService {

    // KafkaTemplate is the "Phone" we use to send messages
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void sendTestMessage(String data) {
        // 1. We prepare our "Envelope" (BaseEvent)
        BaseEvent<String> event = BaseEvent.<String>builder()
                .eventId(UUID.randomUUID().toString())    // Unique ID for the message
                .eventType("TEST_EVENT")                   // Label for the action
                .source("business-service")               // Who sent it
                .timestamp(System.currentTimeMillis())    // When it was sent
                .payload(data)                            // The actual message: "Hello Kafka!"
                .build();

        // 2. We "Dial" the topic name (test-topic) and send the envelope
        kafkaTemplate.send("test-topic", event);

        System.out.println("Sent Message: " + data);
    }
}