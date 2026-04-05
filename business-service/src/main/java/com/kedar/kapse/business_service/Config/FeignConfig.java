package com.kedar.kapse.business_service.Config;

import com.kedar.kapse.platform_core.security.FeignTokenRelayInterceptor;
import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FeignConfig {

    @Bean
    public RequestInterceptor feignTokenRelayInterceptor() {
        return new FeignTokenRelayInterceptor();
    }
}
