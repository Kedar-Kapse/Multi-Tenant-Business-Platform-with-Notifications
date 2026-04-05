package com.kedar.kapse.business_service.controller;

import com.kedar.kapse.business_service.entity.Message;
import com.kedar.kapse.business_service.repository.MessageRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequestMapping("/api/messages") @RequiredArgsConstructor
public class MessageController {

    private final MessageRepository repo;

    @GetMapping
    public List<Message> getAll(@RequestParam String userId) {
        return repo.findByUserId(userId);
    }

    @GetMapping("/unread")
    public List<Message> getUnread(@RequestParam String userId) {
        return repo.findByRecipientIdAndReadFalseOrderBySentAtDesc(userId);
    }

    @GetMapping("/thread/{threadId}")
    public List<Message> getThread(@PathVariable String threadId) {
        return repo.findByThread(threadId);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@RequestParam String userId) {
        return Map.of("count", repo.countByRecipientIdAndReadFalse(userId));
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Message send(@RequestBody Message msg) {
        msg.setId(null);
        if (msg.getThreadId() == null) msg.setThreadId("thread-" + UUID.randomUUID().toString().substring(0, 8));
        return repo.save(msg);
    }

    @PatchMapping("/{id}/read")
    public Message markRead(@PathVariable UUID id) {
        Message msg = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Message not found"));
        msg.setRead(true);
        return repo.save(msg);
    }
}
