package com.kedar.kapse.business_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "invoices") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false, unique = true, length = 20) private String invoiceNumber;
    @Column(nullable = false, length = 100) private String patientId;
    @Column(nullable = false, length = 150) private String patientName;
    @Column(length = 150) private String providerName;
    @Column(length = 300) private String description;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(precision = 12, scale = 2) @Builder.Default private BigDecimal paidAmount = BigDecimal.ZERO;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    @Column(length = 30) private String paymentMethod;
    private LocalDate issueDate;
    private LocalDate dueDate;
    private LocalDate paidDate;
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp private LocalDateTime updatedAt;
}
