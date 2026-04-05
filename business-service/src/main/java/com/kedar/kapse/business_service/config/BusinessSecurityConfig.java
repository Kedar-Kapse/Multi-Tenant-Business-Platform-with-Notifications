package com.kedar.kapse.business_service.config;

import com.kedar.kapse.platform_core.security.CustomAuthenticationManager;
import com.kedar.kapse.platform_core.security.TenantFilter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

@Configuration
@EnableWebSecurity
@Slf4j
public class BusinessSecurityConfig {

    @Value("${keycloak.base-url:http://localhost:8080}")
    private String keycloakBaseUrl;

    @Bean
    public SecurityFilterChain businessSecurityFilterChain(
            HttpSecurity http, TenantFilter tenantFilter) throws Exception {

        CustomAuthenticationManager authManager = new CustomAuthenticationManager(keycloakBaseUrl);

        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterAfter(tenantFilter, BasicAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .opaqueToken(opaque -> opaque.authenticationManager(authManager))
            );

        log.info("Business Service security configured");
        return http.build();
    }
}
