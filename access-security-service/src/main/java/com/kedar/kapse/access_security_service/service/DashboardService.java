package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.repository.TenantRepository;
import com.kedar.kapse.platform_core.repository.UserRepository;
import com.kedar.kapse.platform_core.enums.TenantStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;

    public long getActiveTenantCount() {
        long count = tenantRepository.countByStatus(TenantStatus.ACTIVE);
        log.debug("Active tenant count: {}", count);
        return count;
    }

    public long getStaffCount() {
        try {
            long count = userRepository.countStaffMembers();
            log.debug("Staff member count: {}", count);
            return count;
        } catch (Exception e) {
            log.warn("Staff count query failed, falling back to total user count: {}", e.getMessage());
            return userRepository.count();
        }
    }

    public long getPatientCount() {
        return 0;
    }
}
