package com.kedar.kapse.business_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "patient_documents") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PatientDocument {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false, length = 100) private String patientId;
    @Column(nullable = false, length = 200) private String fileName;
    @Column(nullable = false, length = 50) private String fileType;
    @Column(nullable = false, length = 100) private String category;
    @Column(length = 500) private String description;
    @Column(length = 150) private String uploadedBy;
    @Column(length = 50) @Builder.Default private String status = "ACTIVE";
    private Long fileSize;
    @CreationTimestamp private LocalDateTime uploadedAt;
}
