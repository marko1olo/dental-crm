# BRIEFING — 2026-08-13T19:22:00Z

## Mission
Implement `POST /api/sberbank/webhook` async callback endpoint in `@dental/api` with HMAC/checksum verification guard, atomic database state transition with row locking, idempotency protection, and ledger entry insertion into `payments`, plus comprehensive integration test suite.

## 🔒 My Identity
- Archetype: implementer/qa/specialist
- Roles: implementer, qa, specialist
- Working directory: C:/Clinic_MVP/dental-crm/.agents/worker_sberbank_webhook
- Original parent: 542da25c-6c81-478d-bfa2-6e1c9022942c
- Milestone: Sberbank Async Webhook Implementation

## 🔒 Key Constraints
- Reject unverified or missing signatures immediately with HTTP 400/401 before any DB query.
- Use atomic transaction `db.transaction(...)` with `.for("update")` locking on `sberbankTransactions`.
- Insert paid ledger row into `payments` table upon transition from `pending` -> `success`.
- Handle repeat callbacks idempotently (HTTP 200 OK, zero duplicate payments).
- Return HTTP 404 for unknown `orderId`.
- Strictly follow RLS compliance (`withTenantCtx`).
- ZERO mocks, zero stub overrides, zero hardcoding.
- Pass `npm run typecheck -w @dental/api`, `npm run check:stub-overrides`, and integration tests.

## Current Parent
- Conversation ID: 542da25c-6c81-478d-bfa2-6e1c9022942c
- Updated: 2026-08-13T19:22:00Z

## Task Summary
- **What to build**: `POST /api/sberbank/webhook` endpoint in `apps/api/src/routes/sberbank.ts` and test suite `apps/api/src/tests/routes/sberbankWebhook.test.ts`.
- **Success criteria**: All gates passing, exact cryptographic verification, atomic state machine, idempotent behavior, RLS safe.
- **Interface contracts**: `PROJECT.md` & explorer handoffs.
- **Code layout**: `apps/api/src/routes/sberbank.ts`, `apps/api/src/tests/routes/sberbankWebhook.test.ts`.

## Change Tracker
- **Files modified**: [TBD]
- **Build status**: [TBD]
- **Pending issues**: None

## Quality Status
- **Build/test result**: [TBD]
- **Lint status**: [TBD]
- **Tests added/modified**: [TBD]

## Loaded Skills
- None explicitly assigned in prompt.

## Key Decisions Made
- Starting task reading required files.

## Artifact Index
- `C:/Clinic_MVP/dental-crm/.agents/worker_sberbank_webhook/DISPATCH.md` — Dispatch prompt instructions
- `C:/Clinic_MVP/dental-crm/.agents/worker_sberbank_webhook/BRIEFING.md` — Current working memory briefing
- `C:/Clinic_MVP/dental-crm/.agents/worker_sberbank_webhook/progress.md` — Heartbeat progress tracking
