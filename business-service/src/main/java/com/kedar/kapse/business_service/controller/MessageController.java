package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.entity.Message;
import com.kedar.kapse.business_service.repository.MessageRepository;
import com.kedar.kapse.platform_core.security.CurrentUser;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/**
 * Secure messaging. The caller is ALWAYS taken from the login token:
 *  - you only list your own inbox/outbox and open threads you take part in;
 *  - the sender of a message is you (name/role from the token), it cannot be faked;
 *  - only the recipient can mark a message read.
 * (An old ?userId= parameter from older clients is ignored.)
 */
@RestController @RequestMapping("/api/messages") @RequiredArgsConstructor
public class MessageController {

    private final MessageRepository repo;
    private final com.kedar.kapse.business_service.service.NotificationPublisher notifications;

    @GetMapping
    public List<Message> getAll() {
        return repo.findByUserId(CurrentUser.get().id());
    }

    @GetMapping("/unread")
    public List<Message> getUnread() {
        return repo.findByRecipientIdAndReadFalseOrderBySentAtDesc(CurrentUser.get().id());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", repo.countByRecipientIdAndReadFalse(CurrentUser.get().id()));
    }

    @GetMapping("/thread/{threadId}")
    public List<Message> getThread(@PathVariable String threadId) {
        requireParticipant(threadId, CurrentUser.get());
        return repo.findByThread(threadId);
    }

    /** Mark everything sent to me in this thread as read. */
    @PatchMapping("/thread/{threadId}/read")
    @Transactional
    public Map<String, Integer> markThreadRead(@PathVariable String threadId) {
        CurrentUser me = CurrentUser.get();
        List<Message> unread = repo.findByThreadIdAndRecipientIdAndReadFalse(threadId, me.id());
        unread.forEach(m -> m.setRead(true));
        repo.saveAll(unread);
        return Map.of("updated", unread.size());
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Message send(@RequestBody Message req) {
        CurrentUser me = CurrentUser.get();
        if (req.getRecipientId() == null || req.getRecipientId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient is required");
        }
        if (req.getRecipientId().equals(me.id())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot message yourself");
        }
        if (req.getBody() == null || req.getBody().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message text is required");
        }
        if (me.isPatient() && "PATIENT".equalsIgnoreCase(req.getRecipientRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Patients can only message their care team");
        }
        String threadId = req.getThreadId();
        if (threadId != null) {
            requireParticipant(threadId, me);
        } else {
            threadId = "thread-" + UUID.randomUUID();
        }
        Message msg = Message.builder()
                .senderId(me.id())
                .senderName(me.name() != null ? me.name() : me.username())
                .senderRole(me.primaryRole())
                .recipientId(req.getRecipientId())
                .recipientName(req.getRecipientName() != null ? req.getRecipientName() : "Unknown")
                .recipientRole(req.getRecipientRole() != null ? req.getRecipientRole().toUpperCase() : "USER")
                .subject(req.getSubject() != null && !req.getSubject().isBlank() ? req.getSubject().trim() : "(no subject)")
                .body(req.getBody().trim())
                .threadId(threadId)
                .build();
        Message saved = repo.save(msg);
        notifications.notify(saved.getRecipientId(), "MESSAGE_RECEIVED", "New message from " + saved.getSenderName(),
                saved.getSubject(), "/messages");
        return saved;
    }

    @PatchMapping("/{id}/read")
    public Message markRead(@PathVariable UUID id) {
        Message msg = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Message not found"));
        if (!msg.getRecipientId().equals(CurrentUser.get().id())) {
            throw new EntityNotFoundException("Message not found");
        }
        msg.setRead(true);
        return repo.save(msg);
    }

    private void requireParticipant(String threadId, CurrentUser me) {
        if (!repo.existsByThreadIdAndSenderIdOrThreadIdAndRecipientId(threadId, me.id(), threadId, me.id())) {
            throw new EntityNotFoundException("Conversation not found");
        }
    }
}
