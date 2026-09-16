package com.kedar.kapse.business_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "practice_bank_transfers")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PracticeBankTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "holder_name", nullable = false, length = 150)
    private String holderName;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;
}
