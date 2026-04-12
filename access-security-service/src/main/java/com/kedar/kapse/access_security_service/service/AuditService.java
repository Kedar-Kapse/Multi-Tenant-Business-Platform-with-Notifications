package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.entity.AuditLog;
import com.kedar.kapse.platform_core.repository.AuditLogRepository;
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
    public void record(String entityType, String entityId, String action, String actorId, String details) {
        try {
            AuditLog entry = AuditLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
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
