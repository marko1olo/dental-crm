## 2026-08-14T21:36:11Z
You are Worker M1 (Backend Finance & Acquiring) for Clinic MVP / DENTE Dental CRM.
Your working directory is `C:/Clinic_MVP/dental-crm/.agents/worker_m1_finance`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read:
- `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`
- `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md` (Constitutional rules: Mandate 8b, kopeck-exact money, zero mocks, zero skimming, full file reading before editing)
- `C:/Clinic_MVP/dental-crm/PROJECT.md`
- `C:/Clinic_MVP/dental-crm/.agents/survey_explorer_1/report.md`

Your Exclusive File Write Ownership:
- `packages/shared/src/index.ts`
- `apps/api/src/db/schema.ts`
- `apps/api/src/routes/sberbank.ts`
- `apps/api/src/routes/sbpQr.ts`
- `apps/api/src/tests/routes/sberbankWebhook.test.ts`
- `apps/api/src/tests/routes/sbpQrFiscalEngine.test.ts`

Tasks:
1. **Sberbank Acquiring Schema & Pay Route**:
   - In `apps/api/src/db/schema.ts:3849–3870` (`sberbankTransactions`), add optional columns: `visitId` (text), `documentId` (text), `invoiceId` (text).
   - In `apps/api/src/routes/sberbank.ts`:
     - Update `POST /api/sberbank/pay` schema & handler to accept and save `visitId`, `documentId`, `invoiceId`.
     - In `POST /api/sberbank/webhook` on `deposited` / `success`:
       - Link inserted payment to `visitId` (if present) and `documentId` (if present).
       - If `documentId` is present, atomically update `generatedDocuments` status to `"issued"` (`updatedAt = new Date()`).
       - If `visitId` is present, decrement the visit's outstanding balance inside the transaction.
2. **54-FZ FFD 1.2 Tag Compliance & SBP / Fiscal Receipt Linking**:
   - In `packages/shared/src/index.ts` and `apps/api/src/routes/sbpQr.ts`:
     - In `createFiscalReceiptPayloadSchema`, accept optional `visitId` and `documentId`.
     - In `POST /api/billing/fiscalize-receipt`, if `documentId` is provided, update `generatedDocuments` status to `"issued"`.
3. **Verification**:
   - Run `npm run typecheck`
   - Run tests: `node --import tsx --test apps/api/src/tests/routes/sberbankWebhook.test.ts` and `node --import tsx --test apps/api/src/tests/routes/sbpQrFiscalEngine.test.ts`
   - Run `npx biome check` on touched files.

Write your handoff report to `C:/Clinic_MVP/dental-crm/.agents/worker_m1_finance/handoff.md` and send a message when done.
