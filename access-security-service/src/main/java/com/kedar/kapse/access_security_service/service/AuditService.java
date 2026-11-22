package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.access_security_service.entity.AuditLog;
import com.kedar.kapse.access_security_service.repository.AuditLogRepository;
import com.kedar.kapse.platform_core.enums.AuditAction;
import com.kedar.kapse.platform_core.enums.AuditEntityType;
import com.kedar.kapse.platform_core.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /** Record an action done by the logged-in user (actor taken from their token). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordByCurrentUser(AuditEntityType entityType, String entityId, AuditAction action, String details) {
        String actorId = null;
        String actorName = null;
        try {
            com.kedar.kapse.platform_core.security.CurrentUser me = com.kedar.kapse.platform_core.security.CurrentUser.get();
            actorId = me.id();
            actorName = me.name();
        } catch (Exception ignored) {
            // no logged-in user (e.g. self-registration): actor stays empty
        }
        write(entityType, entityId, action, actorId, actorName, details);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuditEntityType entityType, String entityId, AuditAction action, String actorId, String details) {
        write(entityType, entityId, action, actorId, null, details);
    }

    private void write(AuditEntityType entityType, String entityId, AuditAction action,
                       String actorId, String actorName, String details) {
        try {
            AuditLog entry = AuditLog.builder()
                    .entityType(entityType.name())
                    .entityId(entityId)
                    .action(action.name())
                    .actorId(actorId)
                    .actorName(actorName)
                    .tenantRealm(TenantContext.getTenantId())
                    .details(details)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("Audit write failed for {}:{} action={}: {}", entityType, entityId, action, e.getMessage());
        }
    }
}
