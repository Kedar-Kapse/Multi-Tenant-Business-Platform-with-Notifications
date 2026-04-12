# Patient Management & Onboarding

End-to-end flow for creating patients from staff-facing portals, the email/OTP/password
self-registration they complete from the patient portal, and the backing data model.

## Architecture at a glance

```
Admin Portal  ─┐
Provider Portal┤──▶ API Gateway ──▶ access-security-service ──▶ Postgres (patients, otp_verification, …)
                │                           │
Patient Portal ─┘                           ├─▶ Keycloak (tenant realm: user + PATIENT role)
                                            │
                                            └─▶ Kafka (patient.created, otp.requested)
                                                       ▼
                                             notification-service
                                                       ▼
                                          📧 Email / 📞 IVR call (mock)
```

## User journey

1. **Staff creates the patient** from admin-portal `/patients` or provider-portal `/patients`.
   - `POST /api/v1/patients` (admin) or `POST /api/v1/patients/by-provider/{providerId}` (provider).
   - Backend creates a disabled Keycloak user, assigns `PATIENT` role, writes `Patient` row
     with `status=PENDING_REGISTRATION`, saves optional `patient_provider_mapping`,
     records an `audit_logs` row, and publishes `patient.created` to Kafka.
2. **notification-service** consumes `patient.created` and logs a mock registration email
   with a link like `http://localhost:3002/register?email=…&tenant=…`.
3. **Patient opens the link** in the patient portal and lands on `/register`:
   - Step 1: confirm email, pick channel (EMAIL or CALL), hit *Send OTP*.
   - Step 2: enter the 6-digit OTP (60s TTL, 3 attempts, 30s resend cooldown).
   - Step 3: set a password that satisfies upper+lower+digit+special, 8+ chars.
   - Backend flips the Keycloak user to enabled and the `Patient` row to `ACTIVE`.
4. **Patient logs in** via `/login` (existing flow) or resets their password at
   `/forgot-password`, which reuses the same OTP machinery with `purpose=FORGOT_PASSWORD`.

## Data model (access-security-service)

Liquibase changelog: `access-security-service/src/main/resources/db/changelog/002-patient-otp-schema.yaml`

| Table | Purpose |
| ----- | ------- |
| `patients` | Core PII + Keycloak mapping + status + soft-delete |
| `patient_provider_mapping` | Many-to-many between patients and provider staff |
| `otp_verification` | OTP codes with identifier/purpose/status, attempt tracking, expiry |
| `audit_logs` | Append-only record of patient-affecting actions |

All tables use UUID PKs and `BaseEntity` (`createdAt` / `updatedAt`). `patients` also
carries `createdBy` / `updatedBy` via `BaseAuditableEntity` and supports soft delete via
`deleted_at`.

## REST API

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| POST   | `/api/v1/patients` | ADMIN or PROVIDER role | Create patient (admin portal) |
| POST   | `/api/v1/patients/by-provider/{providerId}` | PROVIDER/ADMIN | Create + auto-map to provider |
| GET    | `/api/v1/patients` | authenticated | Paginated search (`query`, `status`) |
| GET    | `/api/v1/patients/{id}` | authenticated | Fetch by id |
| DELETE | `/api/v1/patients/{id}` | ADMIN | Soft delete (disables Keycloak user) |
| POST   | `/api/auth/otp/generate` | public | `{identifier, channel, purpose}` |
| POST   | `/api/auth/otp/verify`   | public | returns `verificationToken` on success |
| POST   | `/api/auth/otp/resend`   | public | alias for generate, respects cooldown |
| POST   | `/api/auth/register/complete` | public | `{verificationToken, password}` |
| POST   | `/api/auth/forgot-password/complete` | public | `{verificationToken, password}` |

## Kafka topics

| Topic | Producer | Consumer | Payload |
| ----- | -------- | -------- | ------- |
| `patient.created` | access-security-service | notification-service | `PatientCreatedPayload` |
| `otp.requested`   | access-security-service | notification-service | `OtpRequestedPayload` |

Payloads are wrapped in `BaseEvent<T>` (tenantId, eventId, eventType, timestamp).
If `KafkaTemplate` is unavailable (tests / Kafka down), the publisher degrades to
logging so the rest of the flow continues.

## OTP configuration (access-security-service `application.yml`)

```yaml
otp:
  length: 6
  ttl-seconds: 60
  max-attempts: 3
  resend-cooldown-seconds: 30
  max-per-window: 5
  rate-window-minutes: 10
```

## Password policy

Enforced by `SetPasswordRequest` via Bean Validation:
`^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$`

## Mock email / call dispatcher

Lives in `notification-service` (`EmailService`, `CallService`). They log a formatted
block so you can grep the logs for OTP codes or registration links during development.
Swap in JavaMailSender / Twilio / Exotel without touching the publishing side.

## Running a manual smoke test

1. `docker compose up --build -d` (or start the services individually).
2. Log into admin-portal (`http://localhost:3000`) → **Patients** → *Add Patient*.
3. Tail notification-service logs: `docker logs -f notification-service`.
   You'll see a `📧 MOCK EMAIL (Registration)` block with the registration link.
4. Open the link in a browser (patient-portal, port 3002).
5. Choose EMAIL channel, send OTP, grab the code from notification-service logs,
   enter it, then set a password.
6. Log in from the patient portal with the new credentials.

## Tests

`OtpServiceTest` covers: generate → rate-limit, resend cooldown, verify success,
verify expiry, verify max-attempts lock-out, and consumeVerificationToken guards.
Run `mvn -pl access-security-service test` or just that class from the IDE.
