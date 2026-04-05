package com.kedar.kapse.business_service.Conttrollers;

import com.kedar.kapse.business_service.kafka.KafkaProducerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController                    // Tells Spring this class handles Web URLs
@RequiredArgsConstructor          // Connects our ProducerService automatically
public class TestKafkaController {

    private final KafkaProducerService producerService;

    // URL: http://localhost:8082/send?message=HelloKafka
    @GetMapping("/send")
    public String sendMessage(@RequestParam("message") String message) {
        producerService.sendTestMessage(message); // Calls our Kafka Producer
        return "Message sent to Kafka: " + message;
    }
}
