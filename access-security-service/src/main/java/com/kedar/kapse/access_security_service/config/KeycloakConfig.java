package com.kedar.kapse.access_security_service.config;

import org.keycloak.OAuth2Constants;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Keycloak Admin Client configuration for multi-tenant operations.
 *
 * MULTI-TENANT STRATEGY:
 * We authenticate to Keycloak's MASTER realm using admin credentials.
 * The master realm admin can manage ALL tenant realms (create realms,
 * users, roles, clients, etc.).
 *
 * This is the recommended approach for a platform that manages multiple
 * tenant realms programmatically.
 *
 * AUTHENTICATION:
 * Uses PASSWORD grant with the Keycloak admin credentials.
 * The admin-cli client in the master realm supports this by default.
 */
@Configuration
public class KeycloakConfig {

    @Value("${keycloak.admin.server-url:http://localhost:8080}")
    private String serverUrl;

    @Value("${keycloak.admin.username:admin}")
    private String adminUsername;

    @Value("${keycloak.admin.password:admin}")
    private String adminPassword;

    /**
     * Creates a Keycloak Admin Client connected to the MASTER realm.
     * This client can manage all tenant realms.
     */
    @Bean
    public Keycloak keycloakAdminClient() {
        return KeycloakBuilder.builder()
                .serverUrl(serverUrl)
                .realm("master")
                .grantType(OAuth2Constants.PASSWORD)
                .clientId("admin-cli")
                .username(adminUsername)
                .password(adminPassword)
                .build();
    }
}
