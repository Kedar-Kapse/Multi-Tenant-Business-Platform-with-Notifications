package com.kedar.kapse.business_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "icd_codes", indexes = {
    @Index(name = "idx_icd_code", columnList = "code"),
    @Index(name = "idx_icd_description", columnList = "description")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IcdCode {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(length = 100)
    private String subcategory;
}
