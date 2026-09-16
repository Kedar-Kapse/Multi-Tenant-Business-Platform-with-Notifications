package com.kedar.kapse.access_security_service.client;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

/**
 * Feign configuration scoped to PatientProvisioningClient.
 * Adds X-INTERNAL-API-KEY to every outbound call so business-service's
 * InternalApiKeyFilter accepts the request.
 *
 * Not annotated with @Configuration — this is intentional. A class without
 * @Configuration that is referenced via @FeignClient(configuration=...) is
 * instantiated by Spring in a child context and applies ONLY to that client,
 * preventing it from becoming the default config for all Feign clients.
 */
public class InternalFeignConfig {

    static final String INTERNAL_API_KEY_HEADER = "X-INTERNAL-API-KEY";

    @Value("${internal.api-key:}")
    private String internalApiKey;

    @Bean
    public RequestInterceptor internalApiKeyInterceptor() {
        return template -> {
            if (internalApiKey != null && !internalApiKey.isBlank()) {
                template.header(INTERNAL_API_KEY_HEADER, internalApiKey);
            }
        };
    }
}
