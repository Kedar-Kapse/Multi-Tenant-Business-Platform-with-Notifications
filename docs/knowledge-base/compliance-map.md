# Compliance & Security Map

## Authentication & Authorization

| Aspect | Implementation | Status |
|--------|---------------|--------|
| Identity Provider | Keycloak 22.0.1 (OAuth2/OIDC) | Configured |
| Token Format | JWT (RS256 via Keycloak) | Active |
| Resource Server | Spring Security OAuth2 Resource Server | Active |
| Role-Based Access | `@PreAuthorize` with Keycloak realm roles | Active |
| Roles Defined | PLATFORM_ADMIN, TENANT_ADMIN | In use |

## Security Observations

| # | Severity | File/Area | Issue | Recommendation |
|---|----------|-----------|-------|----------------|
| 1 | Critical | access-security-service/application.yml | Hardcoded JWT secret key in plain text | Use env variable or vault |
| 2 | Critical | access-security-service/application.yml | Hardcoded DB credentials (postgres/postgres) | Use env variables |
| 3 | Critical | docker-compose.yml | Keycloak admin credentials in plain text | Use Docker secrets |
| 4 | High | access-security-service/application.yml | `keycloak.admin.client-secret: your-actual-client-secret` placeholder | Must be replaced with real secret via env var |
| 5 | High | notification-service/application.yml | `spring.json.trusted.packages: "*"` | Restrict to specific packages |
| 6 | Medium | business-service | No security config — endpoints unprotected | Add OAuth2 resource server |
| 7 | Medium | access-security-service | Hibernate `ddl-auto: update` in production | Use Liquibase-only migrations |
| 8 | Low | api-gateway/DemoFilter | Logs all request headers (may leak auth tokens) | Filter sensitive headers |

## Multi-Tenancy Security

- Tenant isolation: data-level via FK relationships
- No row-level security (RLS) in PostgreSQL
- No tenant context filter on queries (risk of cross-tenant data access)
- Keycloak groups per tenant (created programmatically)

## Healthcare/HIPAA

- **Not applicable** — no healthcare domain indicators detected
- No PHI handling, no FHIR resources, no medical code systems

## Data Protection

- No encryption at rest configuration detected
- No audit logging framework
- Actuator endpoints exposed (health, info, metrics, loggers, mappings) — restrict in production
