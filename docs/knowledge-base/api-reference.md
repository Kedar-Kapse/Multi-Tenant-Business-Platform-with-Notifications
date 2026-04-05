# API Reference

## Gateway Routes

| Route ID | Path Pattern | Target Service | Rewrite |
|----------|-------------|----------------|---------|
| access-security-service | `/access-security/**` | lb://access-security-service | `/access-security/{segment}` -> `/{segment}` |
| (discovery locator) | `/{service-id}/**` | Auto-discovered via Eureka | Lower-case service ID |

## access-security-service (port 8082)

### Auth Controller (`/auth`)

| Method | Path | Auth | Handler | Notes |
|--------|------|------|---------|-------|
| - | `/auth/**` | - | `AuthController` | Login/logout methods currently commented out |

### Tenant Controller (`/tenants`)

| Method | Path | Auth | Handler | Description |
|--------|------|------|---------|-------------|
| POST | `/tenants` | PLATFORM_ADMIN | `TenantController.createTenant()` | Create tenant + Keycloak group |
| GET | `/tenants` | PLATFORM_ADMIN | `TenantController.getAllTenants()` | List all tenants |
| GET | `/tenants/{id}` | PLATFORM_ADMIN | `TenantController.getTenantById()` | Get tenant by UUID |
| PUT | `/tenants/{id}` | PLATFORM_ADMIN | `TenantController.updateTenant()` | Update tenant name |
| DELETE | `/tenants/{id}` | PLATFORM_ADMIN | `TenantController.deleteTenant()` | Delete tenant |

### User Controller (`/users`)

| Method | Path | Auth | Handler | Description |
|--------|------|------|---------|-------------|
| POST | `/users` | TENANT_ADMIN | `UserController.createUser()` | Create user + Keycloak user |
| GET | `/users` | TENANT_ADMIN | `UserController.getAllUsers()` | List all users |
| GET | `/users/{id}` | TENANT_ADMIN | `UserController.getUserById()` | Get user by UUID |
| DELETE | `/users/{id}` | TENANT_ADMIN | `UserController.deleteUser()` | Delete user |
| GET | `/users/tenant/{tenantId}` | TENANT_ADMIN | `UserController.getUsersByTenant()` | List users by tenant |

### Security Config

- Public paths: `/auth/**`
- All other paths: authenticated (OAuth2 JWT)
- Role extraction: Keycloak `realm_access.roles` claim -> `ROLE_` prefixed authorities

## business-service (port 8081)

| Method | Path | Auth | Handler | Description |
|--------|------|------|---------|-------------|
| GET | `/greet` | None | `GreetController.greet()` | Calls access-security-service via Feign |
| GET | `/mono` | None | `MonoFluxExampleController` | Reactive Mono example |
| GET | `/flux` | None | `MonoFluxExampleController` | Reactive Flux streaming |
| POST | `/redis/set?key=&value=` | None | `RedisDemoController.set()` | Set Redis key-value |
| GET | `/redis/get?key=` | None | `RedisDemoController.get()` | Get Redis value |
| POST | `/kafka/send?message=` | None | `TestKafkaController.send()` | Publish Kafka message to test-topic |

### Feign Client

| Client | Target Service | Endpoint |
|--------|---------------|----------|
| `DemoApiClient` | `access-security-service` | `GET /greet` |

## notification-service (port 8083)

- No REST endpoints exposed
- **Kafka consumer**: topic `test-topic`, group `notification-group`
- Consumes `BaseEvent<?>` messages and logs them

## admin-service (port 8084)

- Spring Boot Admin dashboard (auto-discovers services via Eureka)
- No custom REST endpoints
