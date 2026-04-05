# Patterns & Conventions

## Project Structure

- Each service is an independent Maven project with its own `pom.xml`
- No parent POM aggregator — services built independently
- Shared code in `platform-core` library (included as Maven dependency)
- Package naming: `com.kedar.kapse.<service_name>`

## Coding Conventions

- **Lombok**: `@Data`, `@Builder`, `@AllArgsConstructor`, `@NoArgsConstructor` on entities/DTOs
- **UUID primary keys**: `@GeneratedValue(strategy = GenerationType.UUID)` for all entities
- **Timestamps**: `@CreationTimestamp` / `@UpdateTimestamp` via Hibernate
- **Response DTOs**: Use static `fromEntity()` converter methods (not MapStruct/ModelMapper)
- **Controller layer**: Direct service injection via constructor (Lombok `@RequiredArgsConstructor`)
- **Authorization**: Method-level `@PreAuthorize("hasRole('ROLE_NAME')")` on controllers

## Security Pattern

- `SharedSecurityConfig` in platform-core: reusable OAuth2 resource server config
- JWT role extraction: `realm_access.roles` from Keycloak token → Spring `ROLE_` authorities
- Per-service `SecurityConfig` extends shared config with service-specific rules
- Public endpoints whitelisted via `requestMatchers().permitAll()`

## Communication Patterns

| Pattern | Implementation | Usage |
|---------|---------------|-------|
| Sync (service-to-service) | OpenFeign clients | business-service → access-security-service |
| Async (event-driven) | Kafka (KafkaTemplate / @KafkaListener) | business-service → notification-service |
| Service discovery | Eureka client registration | All services register with service-registry |
| API routing | Spring Cloud Gateway | api-gateway routes to downstream services |

## Kafka Pattern

- **Producer**: `KafkaProducerService` uses `KafkaTemplate<String, BaseEvent<?>>`
- **Consumer**: `@KafkaListener(topics = "test-topic")` in notification-service
- **Event envelope**: `BaseEvent<T>` with tenantId, eventType, source, timestamp, payload
- **Serialization**: `JsonSerializer` / `JsonDeserializer` with trusted packages `*`

## Multi-tenancy Pattern

- Tenant data stored in `tenants` table with unique `tenant_code`
- Users linked to tenants via `tenant_id` FK
- Roles scoped to tenants via `tenant_id` FK
- Keycloak groups per tenant (created via admin API)
- Events carry `tenantId` in BaseEvent envelope

## Naming Conventions

- Controllers: `*Controller.java` (note: `Conttrollers` package typo in business-service)
- Services: `*Service.java`
- Repositories: `*Repository.java`
- Entities: singular nouns (`Tenant`, `User`, `Role`)
- DTOs: `*Request`, `*Response`
- Config: `*Config.java`

## Docker Pattern

- All services: `eclipse-temurin:17-jre-alpine` base image
- Copy JAR → `ENTRYPOINT ["java", "-jar", "app.jar"]`
- Docker Compose for full stack orchestration
- Single `platform-network` bridge network
