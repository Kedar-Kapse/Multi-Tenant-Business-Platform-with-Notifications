# Data Models

## Database: PostgreSQL

### Tenant Entity (`tenants` table)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, not null | `@GeneratedValue(strategy = GenerationType.UUID)` |
| name | VARCHAR(255) | NOT NULL, UNIQUE | Tenant display name |
| tenant_code | VARCHAR(255) | NOT NULL, UNIQUE | Short code (3-10 chars) |
| status | VARCHAR(50) | NOT NULL | Enum: `ACTIVE`, `INACTIVE` |
| created_at | TIMESTAMP | - | `@CreationTimestamp` |
| updated_at | TIMESTAMP | - | `@UpdateTimestamp` |

### User Entity (`users` table)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | `@GeneratedValue(strategy = GenerationType.UUID)` |
| username | VARCHAR | - | - |
| email | VARCHAR | - | - |
| first_name | VARCHAR | - | - |
| last_name | VARCHAR | - | - |
| keycloak_id | VARCHAR | - | ID from Keycloak |
| status | VARCHAR | - | Enum: `ACTIVE`, `DISABLED` |
| tenant_id | UUID | FK → tenants | `@ManyToOne` |

### Role Entity (`roles` table)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Generated |
| name | VARCHAR | - | Role name |
| tenant_id | UUID | FK → tenants | `@ManyToOne` |

### Relationships

- `Tenant` 1:N `User` (via tenant_id FK)
- `Tenant` 1:N `Role` (via tenant_id FK)
- `User` N:M `Role` (via join table)

## DTOs / Request-Response Objects

### CreateTenantRequest (response package)

| Field | Type | Validation |
|-------|------|------------|
| name | String | `@NotBlank` |
| tenantCode | String | `@NotBlank`, `@Size(min=3, max=10)` |

### UpdateTenantRequest (response package)

| Field | Type |
|-------|------|
| name | String |

### TenantResponse

| Field | Type |
|-------|------|
| id | UUID |
| name | String |
| tenantCode | String |
| status | TenantStatus |

### CreateUserRequest (response package)

| Field | Type |
|-------|------|
| username | String |
| email | String |
| firstName | String |
| lastName | String |
| password | String |
| tenantId | UUID |

### UserResponse

| Field | Type |
|-------|------|
| id | UUID |
| username | String |
| email | String |
| firstName | String |
| lastName | String |
| tenantName | String |

### UserDTO (platform-core, record)

| Field | Type |
|-------|------|
| username | String |
| email | String |
| password | String |
| firstName | String |
| lastName | String |

## Event Models

### BaseEvent\<T\> (platform-core)

| Field | Type | Notes |
|-------|------|-------|
| eventId | String | Unique event ID |
| tenantId | String | Tenant context |
| eventType | String | Event classification |
| source | String | Originating service |
| timestamp | LocalDateTime | When event was created |
| payload | T | Generic payload |

- Uses Lombok `@Builder`, `@Data`
- Serialized as JSON for Kafka transport

## Schema Management

- **Liquibase**: `access-security-service/src/main/resources/db/changelog/`
  - `db.changelog-master.yaml` → includes `001-initial-schema.yaml`
  - `001-initial-schema.yaml`: Creates `tenants` table (baseline)
- **Hibernate ddl-auto**: `update` (auto-creates remaining tables from JPA entities)
