## 2026-08-13T15:22:00Z
<USER_REQUEST>
You are teamwork_preview_worker (Worker: Sberbank Async Webhook Implementation).
Working Directory: C:/Clinic_MVP/dental-crm/.agents/worker_sberbank_webhook
Project Root: C:/Clinic_MVP/dental-crm

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Required Inputs to Read:
1. `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md`
2. `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`
3. `C:/Clinic_MVP/dental-crm/.agents/orchestrator_r6/PROJECT.md`
4. Explorer 1 Handoff Report: `C:/Clinic_MVP/dental-crm/.agents/explorer_sberbank_routes/handoff.md`
5. Explorer 2 Handoff Report: `C:/Clinic_MVP/dental-crm/.agents/explorer_db_schema/handoff.md`
6. Explorer 3 Handoff Report: `C:/Clinic_MVP/dental-crm/.agents/explorer_test_infra/handoff.md`

Your Assignment:
1. Implement `POST /api/sberbank/webhook` route in `apps/api/src/routes/sberbank.ts`:
   - Cryptographic verification guard: Verify incoming webhook parameters/checksum against secret (`SBERBANK_WEBHOOK_SECRET` || `DENTE_WEBHOOK_SECRET`). Unverified or missing signatures MUST be rejected immediately (HTTP 400/401) with ZERO database queries/connections.
   - Atomic Ledger State Machine: If verification succeeds, look up `sberbankTransactions` row by `orderId` inside `db.transaction(...)` with `.for("update")` row locking. If state transition is `pending` -> `success`, set status to `success` and strictly insert a new ledger row into `payments` table (`organizationId`, `patientId`, `method: "card"`, `status: "paid"`, `amountRub: transaction.amount / 100`).
   - Idempotency Guarantee: If transaction is already `success`, handle repeat webhooks safely by returning HTTP 200 OK without creating duplicate rows in `payments`.
   - RLS Compliance: Ensure database queries run inside appropriate tenant context (`withTenantCtx`).
   - ZERO MOCKS: Pure, sound logic. No TODO stubs.

2. Create Integration Test Suite in `apps/api/src/tests/routes/sberbankWebhook.test.ts`:
   - Implement test cases for:
     a. Invalid checksum/signature rejected (HTTP 400/401) with DB completely untouched.
     b. Valid webhook payload updates `sberbankTransactions` to `success` and creates ledger record in `payments`.
     c. Duplicate repeat callback handled safely without duplicate `payments` rows.
     d. Unknown orderId returns 404.

3. Run Verification Gates:
   - Execute `npm run typecheck -w @dental/api` and ensure 0 TypeScript errors.
   - Execute `npm run check:stub-overrides` and ensure 0 overrides detected.
   - Execute `node --import tsx --test apps/api/src/tests/routes/sberbankWebhook.test.ts` (or `npm run test -w @dental/api`) and document passing output.

Output Requirements:
Write your complete implementation report and test results to `C:/Clinic_MVP/dental-crm/.agents/worker_sberbank_webhook/handoff.md`.
Send a message to parent when complete with status and evidence.
</USER_REQUEST>
