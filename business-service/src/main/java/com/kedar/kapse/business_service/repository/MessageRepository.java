package com.kedar.kapse.business_service.repository;

import com.kedar.kapse.business_service.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {
    @Query("SELECT m FROM Message m WHERE m.senderId = :userId OR m.recipientId = :userId ORDER BY m.sentAt DESC")
    List<Message> findByUserId(String userId);

    List<Message> findByRecipientIdAndReadFalseOrderBySentAtDesc(String recipientId);

    @Query("SELECT m FROM Message m WHERE m.threadId = :threadId ORDER BY m.sentAt ASC")
    List<Message> findByThread(String threadId);

    long countByRecipientIdAndReadFalse(String recipientId);
}
