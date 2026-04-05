# Knowledge Base Index

## Documents

| File | Description |
|------|-------------|
| [overview.md](overview.md) | Tech stack, architecture, services, request flow |
| [api-reference.md](api-reference.md) | All REST endpoints, gateway routes, Feign clients |
| [data-models.md](data-models.md) | JPA entities, DTOs, event models, schema management |
| [patterns.md](patterns.md) | Coding conventions, communication patterns, naming |
| [compliance-map.md](compliance-map.md) | Security config, credential issues, multi-tenancy gaps |
| [frontend-map.md](frontend-map.md) | No frontend — backend-only platform |

## Quick Reference

- **7 services** (6 runtime + 1 shared library)
- **6 infrastructure components** (PostgreSQL, Keycloak, Redis, Kafka, Zookeeper, Zipkin)
- **~44 Java source files** across all services
- **Java 17 / Spring Boot 3.x / Spring Cloud 2023.0.2**
- **Multi-tenant** with Keycloak OAuth2 + JWT
- **Event-driven** via Kafka (BaseEvent envelope pattern)

## Generated

- Date: 2026-03-11
- Mode: Full scan
