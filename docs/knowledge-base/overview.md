# Overview

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Java 17 |
| Framework | Spring Boot 3.x, Spring Cloud 2023.0.2 |
| Build | Maven (multi-module, per-service pom.xml) |
| Service Discovery | Eureka (Spring Cloud Netflix) |
| API Gateway | Spring Cloud Gateway |
| Auth/Identity | Keycloak 22.0.1, OAuth2 Resource Server, JWT |
| Database | PostgreSQL 15 (Alpine) |
| ORM | Spring Data JPA / Hibernate |
| Schema Mgmt | Liquibase (access-security-service) + Hibernate ddl-auto |
| Caching | Redis (Alpine) |
| Messaging | Apache Kafka (Confluent, with Zookeeper) |
| Monitoring | Spring Boot Admin, Actuator, Zipkin (tracing) |
| Containers | Docker + Docker Compose |
| Packaging | JAR (spring-boot-maven-plugin) |

## Architecture

- **Style**: Microservices with service discovery (Eureka)
- **Domain**: Multi-tenant business platform (learning/generic)
- **Multi-tenancy**: Tenant isolation at data level (tenant_id FK in entities)
- **Auth flow**: Keycloak -> OAuth2 JWT -> per-service resource server validation
- **Messaging**: Kafka event-driven (business-service produces, notification-service consumes)
- **Shared lib**: `platform-core` is a Maven jar dependency (not a runtime service)

## Services

| Service | Port | Purpose | Runtime |
|---------|------|---------|---------|
| service-registry | 8761 | Eureka server (service discovery) | Yes |
| api-gateway | 8085 | Spring Cloud Gateway, route requests | Yes |
| access-security-service | 8082 | Auth, tenant/user CRUD, Keycloak integration | Yes |
| business-service | 8081 | Core business logic, Redis, Kafka producer, Feign | Yes |
| notification-service | 8083 | Kafka consumer, event processing | Yes |
| admin-service | 8084 | Spring Boot Admin monitoring dashboard | Yes |
| platform-core | N/A | Shared library (DTOs, events, security config) | No |

## Request Flow

```
Client -> API Gateway (8085)
  -> Eureka lookup -> Route to target service
  -> access-security-service: validates JWT, checks roles
  -> business-service: executes logic, persists data
  -> Kafka event -> notification-service: processes async
```

## Infrastructure (Docker Compose)

| Component | Image | Purpose |
|-----------|-------|---------|
| PostgreSQL | postgres:15-alpine | Persistence |
| Keycloak | quay.io/keycloak/keycloak:22.0.1 | Identity/auth provider |
| Redis | redis:alpine | Caching |
| Kafka | confluentinc/cp-kafka:latest | Message broker |
| Zookeeper | confluentinc/cp-zookeeper:latest | Kafka coordination |
| Zipkin | zipkin-server-3.5.1-exec.jar | Distributed tracing |

## Package Structure

- Base package: `com.kedar.kapse.<service_name>`
- Exception: service-registry uses `com.kedar_kapse.service_registry`
- Shared core: `com.kedar.kapse.platform_core`
