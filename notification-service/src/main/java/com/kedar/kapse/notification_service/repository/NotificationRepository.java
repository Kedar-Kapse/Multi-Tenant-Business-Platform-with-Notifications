package com.kedar.kapse.notification_service.repository;

import com.kedar.kapse.notification_service.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByRecipientId(String recipientId, Pageable pageable);

    Page<Notification> findByRecipientIdAndReadFalse(String recipientId, Pageable pageable);

    Page<Notification> findByRecipientIdAndType(String recipientId, String type, Pageable pageable);

    long countByRecipientIdAndReadFalse(String recipientId);

    boolean existsByEventId(String eventId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipientId = :recipientId AND n.read = false")
    int markAllRead(@Param("recipientId") String recipientId);
}
