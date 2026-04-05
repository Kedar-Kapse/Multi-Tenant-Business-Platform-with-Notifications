package com.kedar.kapse.business_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "messages") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Message {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false, length = 100) private String senderId;
    @Column(nullable = false, length = 150) private String senderName;
    @Column(nullable = false, length = 20) private String senderRole;
    @Column(nullable = false, length = 100) private String recipientId;
    @Column(nullable = false, length = 150) private String recipientName;
    @Column(nullable = false, length = 20) private String recipientRole;
    @Column(nullable = false, length = 200) private String subject;
    @Column(nullable = false, columnDefinition = "TEXT") private String body;
    @Column(nullable = false) @Builder.Default private boolean read = false;
    @Column(length = 100) private String threadId;
    @CreationTimestamp private LocalDateTime sentAt;
}
