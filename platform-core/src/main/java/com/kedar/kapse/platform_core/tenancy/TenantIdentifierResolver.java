package com.kedar.kapse.platform_core.tenancy;

import com.kedar.kapse.platform_core.security.TenantContext;
import org.hibernate.cfg.AvailableSettings;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Hospital (tenant) data separation for every entity with a {@code @TenantId} field.
 *
 * Hibernate asks this class "which hospital is this?" and then automatically
 *  - fills the entity's tenant column on insert, and
 *  - adds "where tenant_realm = ?" to every query and lookup by id.
 * So hospital A can never read or change hospital B's rows, even if a controller
 * forgets a filter.
 *
 * The hospital comes from TenantContext, which TenantFilter sets from the
 * X-TENANT-ID header -- the same realm the caller's token was validated against,
 * so it cannot be spoofed.
 *
 * No hospital (background jobs, Kafka listeners, startup seeding) = the ROOT
 * tenant, which sees every hospital's rows. Code that creates data in the
 * background must set TenantContext first (see TenantContext.runAs).
 */
@Component
@ConditionalOnClass(CurrentTenantIdentifierResolver.class)
public class TenantIdentifierResolver implements CurrentTenantIdentifierResolver<String>, HibernatePropertiesCustomizer {

    /** Not a real realm name (realm names cannot contain "*"). */
    public static final String ROOT = "*";

    @Override
    public String resolveCurrentTenantIdentifier() {
        String tenant = TenantContext.getTenantId();
        return tenant == null || tenant.isBlank() ? ROOT : tenant;
    }

    @Override
    public boolean isRoot(String tenantId) {
        return ROOT.equals(tenantId);
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return false;
    }

    @Override
    public void customize(Map<String, Object> hibernateProperties) {
        hibernateProperties.put(AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, this);
    }
}
