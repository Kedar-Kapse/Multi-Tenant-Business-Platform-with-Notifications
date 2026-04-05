package com.kedar.kapse.business_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ehr_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EhrTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false)
    private int fieldCount;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(length = 50)
    private String specialty;

    @Column(length = 20)
    private String version;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
