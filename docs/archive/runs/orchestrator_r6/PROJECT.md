# Project: Sberbank Acquiring Async Payment Webhook Receiver

Working Directory: C:/Clinic_MVP/dental-crm
Scope: Secure async webhook route in Fastify for Sberbank Acquiring (`POST /api/sberbank/webhook`), cryptographic signature verification guard, atomic ledger state machine (`pending` -> `success`), and integration test suite.

## Architecture
- Fastify route handler in `apps/api/src/routes/sberbank.ts` at `POST /api/sberbank/webhook`.
- Early cryptographic verification guard using HMAC-SHA256 checksum over sorted payload parameters and `timingSafeSecretEqual` against `SBERBANK_WEBHOOK_SECRET` / `DENTE_WEBHOOK_SECRET` without touching the DB.
- Atomic state machine using Drizzle ORM `db.transaction(...)` with `.for("update")` row locking on `sberbankTransactions`.
- State transition: `pending` -> `success` updates `sberbankTransactions.status` and inserts a new row into `payments` table (`amountRub: transaction.amount / 100`, `method: "card"`, `status: "paid"`).
- Multi-tenant context via `withTenantCtx(transaction.organizationId, ...)`.
- Automated integration test suite in `apps/api/src/tests/routes/sberbankWebhook.test.ts`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Webhook Route Endpoint | `POST /api/sberbank/webhook` Fastify route registration and parameter extraction | M1 | R1, survey |
| 2 | Cryptographic Verification Guard | HMAC-SHA256 signature verification & timing-safe equality check rejecting bad signatures with HTTP 400/401 before DB access | M1 | R2, survey |
| 3 | Atomic Ledger State Machine | Thread-safe `pending` -> `success` transition on `sberbankTransactions` with row locking and `payments` row creation (`amountRub = amount / 100`) | M1 | R3, survey |
| 4 | Integration Test Suite | Automated integration tests in `apps/api/src/tests/routes/sberbankWebhook.test.ts` covering invalid signatures, valid payments, and repeat callbacks | M2 | R5, survey |
| 5 | Monorepo Quality Gates | Passing `tsc --noEmit` and `check:stub-overrides` checks | M2 | R5, survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Webhook Route & Core Logic Implementation | `apps/api/src/routes/sberbank.ts` (route `POST /api/sberbank/webhook`, crypto verification, atomic state machine) | Survey | DONE |
| 2 | Integration Testing & Quality Gates Verification | `apps/api/src/tests/routes/sberbankWebhook.test.ts`, running `check:stub-overrides` and `tsc --noEmit` | M1 | DONE |

## Interface Contracts
### Client / Sberbank Webhook ↔ Fastify API
- `POST /api/sberbank/webhook`:
  - Request Body / Query Params: `{ orderId: string, mdOrder?: string, status: string, checksum: string, amount?: number, ... }`
  - Headers: optional signature headers
  - Error Responses:
    - HTTP 503 `{ error: "WebhookSecretNotConfigured" }` if secret key is unconfigured in production.
    - HTTP 400 `{ error: "MissingChecksum" }` or `{ error: "InvalidChecksum" }` if signature is missing.
    - HTTP 401 `{ error: "InvalidChecksum" }` if signature verification fails (zero DB access).
    - HTTP 404 `{ error: "TransactionNotFound" }` if orderId not found in `sberbankTransactions`.
  - Success Response: HTTP 200 `{ success: true }` or `{ success: true, processed: false, reason: "already_processed" }` for duplicate callbacks.

### Database Ledger Contracts
- `sberbankTransactions` table:
  - `id`: UUID (v7)
  - `organizationId`: UUID
  - `orderId`: text
  - `amount`: integer (kopecks)
  - `status`: text ("pending", "success", "failed")
- `payments` table insertion:
  - `organizationId`: UUID
  - `patientId`: UUID
  - `method`: "card"
  - `status`: "paid"
  - `amountRub`: `transaction.amount / 100` (numeric decimal)

## Code Layout
- `apps/api/src/routes/sberbank.ts`: Fastify route handlers for `/api/sberbank/*`.
- `apps/api/src/security/webhookAuth.ts`: Timing-safe signature / secret verification helpers.
- `apps/api/src/db/schema.ts`: Drizzle ORM schema for `sberbankTransactions` and `payments`.
- `apps/api/src/tests/routes/sberbankWebhook.test.ts`: Integration test suite for webhook.
