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

## Email delivery (real SMTP)

`notification-service` uses `JavaMailSender` with a Thymeleaf-free inline HTML template
to deliver OTP and registration-link emails over SMTP. SMTP is configured from
`spring.mail.*` properties in `application.yml` and can be overridden by env vars.

### Local dev (default): MailDev
The docker-compose stack ships a `maildev` container — a zero-config SMTP sink
with a web inbox. No credentials, no external accounts, real SMTP.

- SMTP: `maildev:1025` (or `localhost:1025` from the host)
- Web UI: http://localhost:1080

Every OTP and registration email is visible in that inbox within a second of
sending.

### Switching to Mailtrap / Gmail / SES
Set these env vars in your shell or `.env` before `docker compose up`:

```bash
MAIL_HOST=smtp.mailtrap.io         # or smtp.gmail.com, email-smtp.<region>.amazonaws.com, …
MAIL_PORT=587
MAIL_USERNAME=<user>
MAIL_PASSWORD=<app-password>
MAIL_SMTP_AUTH=true
MAIL_SMTP_STARTTLS=true
MAIL_FROM=no-reply@yourdomain.com
```

No code changes required. Both `notification-service` and
`access-security-service` (fallback sender) pick up the same vars.

### Fail-safe fallback
If Kafka is unreachable, the publisher in `access-security-service` catches the
failed producer future and delivers the email itself via `FallbackMailSender`,
so OTPs and registration links are never silently dropped.

## Kafka (KRaft mode, no Zookeeper)

The compose file runs a single-node KRaft broker (`confluentinc/cp-kafka:7.6.1`)
with `KAFKA_PROCESS_ROLES=broker,controller`. A fixed `CLUSTER_ID` is set via
env (override with `KAFKA_CLUSTER_ID` if you want to reset state).

Topics `patient.created` and `otp.requested` are auto-created at startup by
`KafkaTopicConfig` (3 partitions, replication 1). Auto-create is also on at
the broker level as a safety net.

### Producer tuning (access-security-service)
```yaml
spring.kafka.producer.properties:
  max.block.ms: 500
  request.timeout.ms: 1000
  delivery.timeout.ms: 2000
  retries: 0
  acks: "1"
```
Tight timeouts + async send + fallback = OTP generation never blocks on Kafka.

### Consumer (notification-service)
Binds to the `notification-group` consumer group. `JsonDeserializer` with
`spring.json.trusted.packages=*` deserializes `BaseEvent<T>` payloads, then
the listener uses Jackson's `ObjectMapper.convertValue` to narrow the inner
payload type for routing.

## Running a manual smoke test

1. `docker compose up --build -d`
2. Open the MailDev inbox at http://localhost:1080 and keep it open.
3. Log into admin-portal (http://localhost:3000) → **Patients** → *Add Patient*.
   A "Welcome to Invision" email arrives in MailDev within a second.
4. Click the *Complete registration* button in the email (opens
   http://localhost:3002/register?email=…&tenant=…).
5. Confirm email → pick EMAIL → click *Send OTP*. A "Your verification code"
   email arrives in MailDev.
6. Enter the OTP → set a password that matches the policy (e.g. `Passw0rd!`).
7. Log in from the patient portal with the new credentials.

### OTP security
- OTPs are **BCrypt-hashed** before storage (`otp_verification.otp_code` is the
  hash, never the raw code). Verification uses
  `BCryptPasswordEncoder.matches(raw, hash)`.
- The raw code exists only in memory long enough to be published (to Kafka or
  to the fallback mailer). Even a full DB dump does not expose live OTPs.
- 60s TTL, 3 attempts, 30s resend cooldown, 5/10-min per-identifier rate limit.

## Tests

- `OtpServiceTest` (access-security-service): asserts that generate stores a
  BCrypt hash (never raw digits), that verify matches via BCrypt semantics, plus
  rate-limit, resend cooldown, expiry, max-attempts lock-out, and
  consumeVerificationToken guards.
- `OtpNotificationListenerTest` (notification-service): Kafka listener routing —
  EMAIL → EmailService, CALL → CallService, malformed events dropped.

Run both suites:
```bash
mvn -pl access-security-service,notification-service -am test
```
