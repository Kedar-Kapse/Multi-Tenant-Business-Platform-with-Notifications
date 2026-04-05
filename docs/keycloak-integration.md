# Keycloak Multi-Tenant Integration Guide

## 1. System Architecture

```
                                  +------------------+
                                  |   Admin Portal   |
                                  |   (React/Angular |
                                  |    port 3000)    |
                                  +--------+---------+
                                           |
                                  X-TENANT-ID: hospital-a
                                  Authorization: Bearer <JWT>
                                           |
                                           v
+------------------+            +----------+-----------+
|                  |            |                      |
|    Keycloak      |<---------->|    API Gateway       |
|  Auth Server     |   JWKS    |    (port 8085)       |
|  (port 8080)     |  Fetch    |                      |
|                  |            | - TenantRelayFilter  |
|  Realms:         |            | - Multi-tenant JWT   |
|  - hospital-a    |            | - Route to services  |
|  - hospital-b    |            +---+----+----+---+----+
|  - master        |                |    |    |   |
+------------------+                |    |    |   |
                                    v    v    v   v
                    +----------+ +--+--+ +---+-+ +-+--------+
                    | access-  | |biz- | |notif| | admin-   |
                    | security | |svc  | |svc  | | service  |
                    | service  | |8081 | |8083 | | 8084     |
                    | 8082     | +-----+ +-----+ +----------+
                    +----+-----+
                         |
                    +----v-----+          +-----------+
                    | PostgreSQL|          | Service   |
                    | (5432)   |          | Registry  |
                    +----------+          | (8761)    |
                                          +-----------+
```

## 2. Authentication & Token Flow

```
Step 1: LOGIN
=============
  Frontend                  API Gateway              Access-Security       Keycloak
     |                          |                     Service (8082)     (hospital-a realm)
     |-- POST /access-security/api/auth/login ------->|                        |
     |   Headers:                                     |                        |
     |     X-TENANT-ID: hospital-a                    |                        |
     |   Body:                                        |                        |
     |     { username, password }                     |                        |
     |                          |                     |                        |
     |                          |  (routes to svc) -->|                        |
     |                          |                     |-- POST /realms/        |
     |                          |                     |   hospital-a/protocol/ |
     |                          |                     |   openid-connect/token |
     |                          |                     |   grant_type=password  |
     |                          |                     |                        |
     |                          |                     |<-- access_token -------|
     |                          |                     |    refresh_token       |
     |                          |                     |    expires_in: 300     |
     |<------ { access_token, refresh_token } --------|                        |

Step 2: AUTHENTICATED API CALL
==============================
  Frontend                  API Gateway              Business Service     Keycloak
     |                          |                        (8081)          (hospital-a)
     |-- GET /business/api/v1/secured/me ------------->|                      |
     |   Headers:                                      |                      |
     |     Authorization: Bearer <JWT>                 |                      |
     |     X-TENANT-ID: hospital-a                     |                      |
     |                          |                      |                      |
     |                    1. TenantRelayFilter          |                      |
     |                       propagates headers         |                      |
     |                    2. Extract realm from JWT     |                      |
     |                    3. Fetch JWKS for hospital-a -->|                    |
     |                    4. Validate JWT signature     |<-- public key ------|
     |                    5. Extract roles              |                      |
     |                    6. Route to business-service  |                      |
     |                          |                      |                      |
     |                          |--- forwarded ------->|                      |
     |                          |                      |                      |
     |                          |                1. TenantFilter extracts     |
     |                          |                   X-TENANT-ID               |
     |                          |                2. MultiTenantJwtDecoder     |
     |                          |                   validates JWT             |
     |                          |                3. KeycloakJwtConverter      |
     |                          |                   extracts roles            |
     |                          |                4. @PreAuthorize checks      |
     |                          |                   permission                |
     |                          |                                             |
     |<---------- { user data, tenant info } ----------|                      |

Step 3: TOKEN REFRESH
=====================
  Frontend                  API Gateway              Access-Security       Keycloak
     |                          |                     Service              (hospital-a)
     |-- POST /access-security/api/auth/refresh ------>|                       |
     |   Headers:                                      |                       |
     |     X-TENANT-ID: hospital-a                     |                       |
     |   Body:                                         |                       |
     |     { refresh_token }                           |                       |
     |                          |                      |-- grant_type=         |
     |                          |                      |   refresh_token ----->|
     |                          |                      |                       |
     |<------- { new access_token, new refresh_token } |<-- new tokens -------|
```

## 3. Multi-Tenant Realm Setup

```
+------------------------------------------------------------------+
|                    KEYCLOAK SERVER                                 |
|                                                                   |
|  +-------------------+  +-------------------+  +--------------+   |
|  | MASTER REALM      |  | hospital-a REALM  |  | hospital-b   |   |
|  | (admin only)      |  | (Tenant A)        |  | REALM        |   |
|  |                   |  |                   |  | (Tenant B)   |   |
|  | Users:            |  | Users:            |  |              |   |
|  |   admin           |  |   admin-a         |  | Users:       |   |
|  |                   |  |   dr.smith        |  |   admin-b    |   |
|  | Purpose:          |  |   therapist.jane  |  |   dr.jones   |   |
|  |   Manage all      |  |   nurse.mary      |  |   nurse.alex |   |
|  |   tenant realms   |  |   patient.bob     |  |              |   |
|  +-------------------+  |                   |  | Clients:     |   |
|                         | Clients:          |  |   platform-  |   |
|                         |   platform-       |  |   backend    |   |
|                         |   backend         |  |   platform-  |   |
|                         |   (confidential)  |  |   frontend   |   |
|                         |   platform-       |  |              |   |
|                         |   frontend        |  | Roles:       |   |
|                         |   (public)        |  |   (same as   |   |
|                         |                   |  |    hospital-a)|  |
|                         | Roles:            |  +--------------+   |
|                         |   ADMIN           |                     |
|                         |   PROVIDER        |  +---------------+  |
|                         |   THERAPIST       |  | hospital-c    |  |
|                         |   PHYSICIAN       |  | (created via  |  |
|                         |   NURSE           |  |  API at       |  |
|                         |   PATIENT         |  |  runtime)     |  |
|                         +-------------------+  +---------------+  |
+------------------------------------------------------------------+

Tenant Isolation:
- Each tenant = separate Keycloak realm
- Users in hospital-a CANNOT access hospital-b
- Roles/permissions are per-realm
- JWT issuer identifies the tenant: http://keycloak:8080/realms/hospital-a
```

## 4. Roles & Permissions Mapping

```
+------------------------------------------------------------------+
|                    ROLES (Realm-level)                             |
+------------------------------------------------------------------+
| Role       | Description                    | Access Level        |
|------------|--------------------------------|---------------------|
| ADMIN      | Platform administrator         | Full access         |
| PROVIDER   | Healthcare provider org        | Manage staff/facility|
| PHYSICIAN  | Doctor, supervises treatment   | Read/update patients|
| THERAPIST  | Conducts therapy sessions      | Read/update patients|
| NURSE      | Patient care assistance        | Read patients       |
| PATIENT    | End user                       | Own data only       |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|            PERMISSIONS (Client-level on platform-backend)          |
+------------------------------------------------------------------+
| Permission      | ADMIN | PROVIDER | PHYSICIAN | THERAPIST | NURSE | PATIENT |
|-----------------|-------|----------|-----------|-----------|-------|---------|
| READ_PATIENT    |   Y   |    -     |     Y     |     Y     |   Y   |    Y    |
| UPDATE_PATIENT  |   Y   |    -     |     Y     |     Y     |   -   |    -    |
| CREATE_PATIENT  |   Y   |    -     |     -     |     -     |   -   |    -    |
| DELETE_PATIENT  |   Y   |    -     |     -     |     -     |   -   |    -    |
| MANAGE_STAFF    |   Y   |    Y     |     -     |     -     |   -   |    -    |
| MANAGE_FACILITY |   Y   |    Y     |     -     |     -     |   -   |    -    |
| VIEW_REPORTS    |   Y   |    Y     |     Y     |     -     |   -   |    -    |
| MANAGE_PHARMACY |   Y   |    -     |     -     |     -     |   -   |    -    |
+------------------------------------------------------------------+

JWT Token Structure:
{
  "iss": "http://keycloak:8080/realms/hospital-a",  <-- Identifies tenant
  "sub": "user-uuid",
  "preferred_username": "dr.smith",
  "realm_access": {
    "roles": ["PHYSICIAN"]                          <-- Realm roles
  },
  "resource_access": {
    "platform-backend": {
      "roles": ["READ_PATIENT", "UPDATE_PATIENT", "VIEW_REPORTS"]  <-- Permissions
    }
  }
}
```

## 5. Backend Security Flow

```
+------------------------------------------------------------------+
|                  REQUEST PROCESSING PIPELINE                       |
+------------------------------------------------------------------+

  Incoming HTTP Request
        |
        v
  +-------------------+
  | TenantFilter      |  (Order: HIGHEST_PRECEDENCE)
  | Extract X-TENANT- |
  | ID header, store  |
  | in TenantContext   |
  +--------+----------+
           |
           v
  +-------------------+
  | Spring Security   |
  | OAuth2 Resource   |
  | Server Filter     |
  |                   |
  | 1. Extract Bearer |
  |    token from     |
  |    Authorization  |
  |    header         |
  +--------+----------+
           |
           v
  +-------------------+
  | MultiTenantJwt    |
  | Decoder           |
  |                   |
  | 1. Read tenant    |
  |    from context   |
  | 2. OR extract     |
  |    from JWT iss   |
  | 3. Build JWKS URL:|
  |    /realms/{tenant}|
  |    /protocol/...  |
  | 4. Fetch public   |
  |    key (cached)   |
  | 5. Validate JWT:  |
  |    - Signature    |
  |    - Expiry       |
  |    - Issuer       |
  +--------+----------+
           |
           v
  +-------------------+
  | KeycloakJwt       |
  | Converter         |
  |                   |
  | 1. Extract realm  |
  |    roles ->       |
  |    ROLE_ADMIN etc |
  | 2. Extract client |
  |    roles ->       |
  |    ROLE_READ_     |
  |    PATIENT etc    |
  | 3. Set tenant in  |
  |    context if     |
  |    missing        |
  +--------+----------+
           |
           v
  +-------------------+
  | @PreAuthorize     |
  | Method Security   |
  |                   |
  | hasRole('ADMIN')  |
  | hasRole('READ_    |
  |   PATIENT')       |
  | hasAnyRole(...)   |
  +--------+----------+
           |
      +----+----+
      |         |
  PASS ✓    FAIL ✗
      |         |
      v         v
  Controller   403
  Method      Forbidden
```

## 6. Quick Start

### Prerequisites
- Docker & Docker Compose
- Java 17
- Maven

### Step 1: Start Infrastructure
```bash
docker-compose up -d postgres keycloak redis zookeeper kafka
```
Wait for Keycloak to be healthy (~60 seconds). Keycloak auto-imports `hospital-a` and `hospital-b` realms.

### Step 2: Verify Keycloak
Open http://localhost:8080/admin and login with `admin`/`admin`.
You should see realms: master, hospital-a, hospital-b.

### Step 3: Start Services
```bash
docker-compose up -d
```

### Step 4: Test Login (Hospital A)
```bash
# Login as admin of Hospital A
curl -X POST http://localhost:8085/access-security/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-TENANT-ID: hospital-a" \
  -d '{
    "username": "admin-a",
    "password": "admin123",
    "client_secret": "hospital-a-secret-change-me"
  }'
```

Response contains `access_token` and `refresh_token`.

### Step 5: Access Secured Endpoint
```bash
# Use the access_token from Step 4
TOKEN="<paste-access-token-here>"

# Get current user info
curl http://localhost:8085/business/api/v1/secured/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-TENANT-ID: hospital-a"

# Admin-only endpoint
curl http://localhost:8085/business/api/v1/secured/admin-only \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-TENANT-ID: hospital-a"

# Patient records (requires READ_PATIENT permission)
curl http://localhost:8085/business/api/v1/secured/patient-records \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-TENANT-ID: hospital-a"
```

### Step 6: Test Cross-Tenant Isolation
```bash
# Login as Hospital B admin
curl -X POST http://localhost:8085/access-security/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-TENANT-ID: hospital-b" \
  -d '{
    "username": "admin-b",
    "password": "admin123",
    "client_secret": "hospital-b-secret-change-me"
  }'

# Hospital B token will NOT work with hospital-a realm
# (JWT issuer mismatch = 401)
```

### Step 7: Test Role-Based Access
```bash
# Login as nurse (limited permissions)
curl -X POST http://localhost:8085/access-security/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-TENANT-ID: hospital-a" \
  -d '{
    "username": "nurse.mary",
    "password": "nurse123",
    "client_secret": "hospital-a-secret-change-me"
  }'

NURSE_TOKEN="<paste-nurse-token>"

# This works (nurse has READ_PATIENT)
curl http://localhost:8085/business/api/v1/secured/patient-records \
  -H "Authorization: Bearer $NURSE_TOKEN" \
  -H "X-TENANT-ID: hospital-a"

# This fails with 403 (nurse lacks ADMIN role)
curl http://localhost:8085/business/api/v1/secured/admin-only \
  -H "Authorization: Bearer $NURSE_TOKEN" \
  -H "X-TENANT-ID: hospital-a"

# This fails with 403 (nurse lacks MANAGE_STAFF)
curl http://localhost:8085/business/api/v1/secured/staff-management \
  -H "Authorization: Bearer $NURSE_TOKEN" \
  -H "X-TENANT-ID: hospital-a"
```

### Step 8: Create New Tenant Realm via API
```bash
# Create a new realm programmatically
curl -X POST http://localhost:8085/access-security/api/realms \
  -H "Content-Type: application/json" \
  -d '{
    "realmName": "hospital-c",
    "displayName": "Hospital C - Regional Medical",
    "clientSecret": "hospital-c-secret"
  }'

# List all tenant realms
curl http://localhost:8085/access-security/api/realms
```

### Step 9: Token Refresh
```bash
REFRESH_TOKEN="<paste-refresh-token-from-login>"

curl -X POST http://localhost:8085/access-security/api/auth/refresh \
  -H "Content-Type: application/json" \
  -H "X-TENANT-ID: hospital-a" \
  -d "{
    \"refresh_token\": \"$REFRESH_TOKEN\",
    \"client_secret\": \"hospital-a-secret-change-me\"
  }"
```

## 7. Sample Test Users

### Hospital A (realm: hospital-a)
| Username       | Password     | Role       | Permissions                                        |
|----------------|--------------|------------|----------------------------------------------------|
| admin-a        | admin123     | ADMIN      | All permissions                                    |
| dr.smith       | doctor123    | PHYSICIAN  | READ_PATIENT, UPDATE_PATIENT, VIEW_REPORTS         |
| therapist.jane | therapist123 | THERAPIST  | READ_PATIENT, UPDATE_PATIENT                       |
| nurse.mary     | nurse123     | NURSE      | READ_PATIENT                                       |
| patient.bob    | patient123   | PATIENT    | READ_PATIENT (own data)                            |

### Hospital B (realm: hospital-b)
| Username   | Password  | Role      | Permissions                                        |
|------------|-----------|-----------|-----------------------------------------------------|
| admin-b    | admin123  | ADMIN     | All permissions                                    |
| dr.jones   | doctor123 | PHYSICIAN | READ_PATIENT, UPDATE_PATIENT, VIEW_REPORTS         |
| nurse.alex | nurse123  | NURSE     | READ_PATIENT                                       |

## 8. Key Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Infrastructure with Keycloak, realm auto-import |
| `.env` | Environment variables (secrets, URLs) |
| `keycloak/realms/hospital-a-realm.json` | Hospital A realm config (auto-imported) |
| `keycloak/realms/hospital-b-realm.json` | Hospital B realm config (auto-imported) |
| `platform-core/.../security/TenantContext.java` | ThreadLocal tenant holder |
| `platform-core/.../security/TenantFilter.java` | Extracts X-TENANT-ID header |
| `platform-core/.../security/MultiTenantJwtDecoder.java` | Dynamic JWKS resolution |
| `platform-core/.../security/KeycloakJwtConverter.java` | Role/permission extraction |
| `platform-core/.../security/SharedSecurityConfig.java` | Default security for all services |
| `platform-core/.../security/SecurityConstants.java` | Role & permission constants |
| `api-gateway/.../GatewaySecurityConfig.java` | Reactive multi-tenant gateway security |
| `api-gateway/.../TenantRelayFilter.java` | Propagates X-TENANT-ID downstream |
| `access-security/.../AuthController.java` | Multi-tenant login/refresh/logout |
| `access-security/.../RealmController.java` | Create/list tenant realms |
| `access-security/.../KeycloakService.java` | Keycloak admin operations |
