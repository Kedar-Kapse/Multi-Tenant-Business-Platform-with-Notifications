package com.kedar.kapse.business_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(name = "access-security-service")
public interface DemoApiClient {

    @GetMapping("/welcome")
    String invokeAccessSecurityServiceWelcomeMessage();
}
