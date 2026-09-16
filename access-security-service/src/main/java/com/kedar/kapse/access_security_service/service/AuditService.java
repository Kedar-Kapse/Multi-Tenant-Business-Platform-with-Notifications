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

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuditEntityType entityType, String entityId, AuditAction action, String actorId, String details) {
        try {
            AuditLog entry = AuditLog.builder()
                    .entityType(entityType.name())
                    .entityId(entityId)
                    .action(action.name())
                    .actorId(actorId)
                    .tenantRealm(TenantContext.getTenantId())
                    .details(details)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("Audit write failed for {}:{} action={}: {}", entityType, entityId, action, e.getMessage());
        }
    }
}
