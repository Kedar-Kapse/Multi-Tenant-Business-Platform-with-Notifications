package com.kedar.kapse.business_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "claims")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Claim {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 20)
    private String claimId;

    @Column(nullable = false, length = 150)
    private String patientName;

    @Column(length = 100)
    private String patientId;

    @Column(nullable = false, length = 150)
    private String payerName;

    @Column(length = 150)
    private String provider;

    @Column(length = 20)
    private String cptCode;

    @Column(length = 20)
    private String icdCode;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(precision = 12, scale = 2)
    private BigDecimal allowedAmount;

    @Column(precision = 12, scale = 2)
    private BigDecimal paidAmount;

    private LocalDate dateSubmitted;
    private LocalDate dateProcessed;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "SUBMITTED";

    @Column(length = 500)
    private String denialReason;

    @CreationTimestamp
    private LocalDateTime createdAt;
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
