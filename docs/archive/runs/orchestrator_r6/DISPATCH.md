# DISPATCH

## 2026-08-13T19:18:46Z

You are the Project Orchestrator for the Sberbank Acquiring async payment webhook implementation task in DENTE CRM.

Working Directory: C:/Clinic_MVP/dental-crm
Your workspace directory: C:/Clinic_MVP/dental-crm/.agents/orchestrator_r6
Original request file: C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md

Your mission:
Eradicate race conditions in payment capturing by implementing a secure async webhook receiver for Sberbank Acquiring.

Key Requirements:
1. R1. Webhook Endpoint: Fastify route in `apps/api/src/routes/sberbank.ts` at `POST /api/sberbank/webhook` to receive Sberbank callbacks.
2. R2. Cryptographic Verification Guard: Webhook must reject unverified payloads immediately via signature validation according to Sberbank Acquiring standards without touching the DB.
3. R3. Ledger State Machine: Look up `sberbankTransactions` row upon successful payment. If transition is `pending` -> `success`, strictly insert a new row into `payments` table (schema: id, organizationId, patientId, method: "card", status: "paid", amountRub: transaction.amount / 100).
4. R4. ZERO MOCKS: Pure, sound logic. No TODO stubs.
5. Acceptance Criteria & Automated Tests:
   - Integration test in `apps/api/src/tests/routes/sberbankWebhook.test.ts`
   - Invalid checksum rejected with 400 or 401 without updating DB
   - Valid payload updates `sberbankTransactions` and inserts ledger record into `payments`
   - `check:stub-overrides` and `tsc --noEmit` checks must pass completely.

Dispatch specialists as needed to analyze existing sberbank routes/schemas, implement the webhook route and verification logic, add unit/integration tests, and run verification gates. Record progress in your `progress.md`. When all milestones are complete and verified, report completion back to Sentinel.

## 2026-08-13T20:12:33Z

You are the Project Orchestrator for DENTE CRM (C:/Clinic_MVP/dental-crm).

Your task:
1. Read ORIGINAL_REQUEST.md at C:/Clinic_MVP/dental-crm/ORIGINAL_REQUEST.md.
2. Check existing progress in C:/Clinic_MVP/dental-crm/.agents/orchestrator_r6/ and subagent handoffs in C:/Clinic_MVP/dental-crm/.agents/. Note: The implementation of `POST /api/sberbank/webhook` in `apps/api/src/routes/sberbank.ts`, the integration tests in `apps/api/src/tests/routes/sberbankWebhook.test.ts`, and forensic audit reports in `auditor_sberbank_webhook_1` may already be complete.
3. Verify all requirements and quality gates (`check:stub-overrides`, `tsc --noEmit`, test suite) pass cleanly.
4. If everything is complete and verified, finalize your decomposition, update your progress.md and BRIEFING.md, and output your final handoff.md claiming victory.
5. Notify the Sentinel (parent) via send_message when victory is claimed.

