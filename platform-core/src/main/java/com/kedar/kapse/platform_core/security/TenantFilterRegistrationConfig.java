package com.kedar.kapse.platform_core.security;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Prevents Spring Boot from auto-registering TenantFilter as a standalone
 * servlet filter (which it would otherwise do, since TenantFilter is a
 * @Component implementing Filter).
 *
 * TenantFilter must run exactly once per request, wired in explicitly by
 * each service's own SecurityFilterChain via
 * addFilterAfter(tenantFilter, BasicAuthenticationFilter.class), so that it
 * runs at a precise, named position relative to Spring Security's own
 * filters. Without this disable, TenantFilter would ALSO be auto-registered
 * as a separate standalone filter, causing it to run twice per request.
 */
@Configuration
public class TenantFilterRegistrationConfig {

    @Bean
    public FilterRegistrationBean<TenantFilter> tenantFilterRegistration(TenantFilter tenantFilter) {
        FilterRegistrationBean<TenantFilter> registration = new FilterRegistrationBean<>(tenantFilter);
        registration.setEnabled(false);
        return registration;
    }
}
