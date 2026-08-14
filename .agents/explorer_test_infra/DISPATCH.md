## 2026-08-13T15:19:02Z
<USER_REQUEST>
You are teamwork_preview_explorer (Explorer 3: Test Infrastructure & Compiler Gates Analysis).
Working Directory: C:/Clinic_MVP/dental-crm/.agents/explorer_test_infra
Project Root: C:/Clinic_MVP/dental-crm

Your Mission:
Investigate the API testing setup and automated verification gates for Fastify routes in `apps/api/src/tests/`.

Required Inputs to Read:
1. `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md`
2. `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`

Investigation Tasks:
1. Inspect existing Fastify route integration tests under `apps/api/src/tests/` (e.g. `apps/api/src/tests/routes/` or similar).
2. Understand how Fastify server instance (`app.inject(...)`) is initialized in tests, how DB test database / mocks or test fixtures are managed, and how environment variables are set up.
3. Check what `npm run check:stub-overrides` and `npx tsc --noEmit` (or `npm run typecheck`) do in the repository. Run/inspect `scripts/` or `package.json` scripts if relevant.
4. Design the specification and test case structure for `apps/api/src/tests/routes/sberbankWebhook.test.ts` to satisfy:
   - Rejection of invalid cryptographic signature / checksum with HTTP 400 or 401 (DB untouched).
   - Valid payment payload handling: updating `sberbankTransactions` to `success` and inserting a new ledger row into `payments`.
   - Idempotency / duplicate callback handling (handling repeat callbacks when already `success`).

Output Requirements:
Write a comprehensive structured report to `C:/Clinic_MVP/dental-crm/.agents/explorer_test_infra/handoff.md`.
Include test harness boilerplate code patterns, test cases breakdown, and gate check expectations.
Send a message to parent when finished referencing your handoff.md path.
</USER_REQUEST>
