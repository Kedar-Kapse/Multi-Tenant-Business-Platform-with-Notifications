package com.kedar.kapse.business_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "appointments") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Appointment {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false, length = 100) private String patientId;
    @Column(nullable = false, length = 150) private String patientName;
    @Column(nullable = false, length = 100) private String providerId;
    @Column(nullable = false, length = 150) private String providerName;
    @Column(length = 100) private String providerSpecialty;
    @Column(nullable = false) private LocalDate appointmentDate;
    @Column(nullable = false) private LocalTime startTime;
    @Column(nullable = false) private LocalTime endTime;
    @Column(nullable = false, length = 30) @Builder.Default private String status = "SCHEDULED";
    @Column(nullable = false, length = 50) @Builder.Default private String type = "CONSULTATION";
    @Column(length = 500) private String reason;
    @Column(length = 500) private String notes;
    @Column(length = 100) private String facilityName;
    @Column(length = 200) private String facilityAddress;
    @Column(length = 30) @Builder.Default private String mode = "IN_PERSON";
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp private LocalDateTime updatedAt;
}
