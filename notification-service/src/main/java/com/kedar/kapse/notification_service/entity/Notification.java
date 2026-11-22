package com.kedar.kapse.notification_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.TenantId;

import java.time.LocalDateTime;
import java.util.UUID;

/** One in-app notification for one user (bell + Notifications page). */
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notif_recipient", columnList = "recipientId, read, createdAt")
}, uniqueConstraints = @UniqueConstraint(name = "uk_notif_event", columnNames = "eventId"))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    /** Owning hospital (Keycloak realm). Set and filtered by Hibernate -- see TenantIdentifierResolver. */
    @TenantId
    @Column(name = "tenant_realm", length = 64, nullable = false, updatable = false)
    private String tenantRealm;

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** The Kafka event it came from (a redelivered event is stored once). */
    @Column(nullable = false, length = 64)
    private String eventId;

    /** Keycloak user id of the person who should see it. */
    @Column(nullable = false, length = 100)
    private String recipientId;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String body;

    /** Path inside the recipient's portal, e.g. "/appointments". */
    @Column(length = 200)
    private String link;

    @Column(nullable = false)
    @Builder.Default
    private boolean read = false;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
