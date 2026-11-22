package com.kedar.kapse.notification_service.controller;

import com.kedar.kapse.notification_service.entity.Notification;
import com.kedar.kapse.notification_service.repository.NotificationRepository;
import com.kedar.kapse.platform_core.security.CurrentUser;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * The logged-in user's own notifications (any role, any portal). Only ever the
 * caller's rows: the recipient is taken from the token.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository repo;

    /** unreadOnly=true for the bell; type= to filter (e.g. MESSAGE_RECEIVED). */
    @GetMapping
    public Page<Notification> mine(@RequestParam(defaultValue = "false") boolean unreadOnly,
                                   @RequestParam(required = false) String type,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "20") int size) {
        String me = CurrentUser.get().id();
        PageRequest p = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending());
        if (unreadOnly) return repo.findByRecipientIdAndReadFalse(me, p);
        if (type != null && !type.isBlank()) return repo.findByRecipientIdAndType(me, type.toUpperCase(), p);
        return repo.findByRecipientId(me, p);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", repo.countByRecipientIdAndReadFalse(CurrentUser.get().id()));
    }

    @PatchMapping("/{id}/read")
    public Notification markRead(@PathVariable UUID id) {
        Notification n = own(id);
        n.setRead(true);
        return repo.save(n);
    }

    @PatchMapping("/read-all")
    @Transactional
    public Map<String, Integer> markAllRead() {
        return Map.of("updated", repo.markAllRead(CurrentUser.get().id()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        repo.delete(own(id));
    }

    private Notification own(UUID id) {
        Notification n = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Notification not found"));
        if (!n.getRecipientId().equals(CurrentUser.get().id())) throw new EntityNotFoundException("Notification not found");
        return n;
    }
}
