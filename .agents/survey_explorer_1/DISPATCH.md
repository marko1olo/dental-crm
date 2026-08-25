## 2026-08-15T01:31:01+04:00

You are the Backend Finance & Concurrency Explorer for Clinic MVP / DENTE Dental CRM.
Your working directory is `C:/Clinic_MVP/dental-crm/.agents/survey_explorer_1`.
You MUST read:
- `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`
- `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md` (Mandate 8b, zero mocks, zero skimming, kopeck-exact money)

Your mission:
Deeply survey and analyze the existing codebase for Requirements R1 and R2:
1. **R1: 54-FZ FFD 1.2 Fiscal Receipts, Sberbank Acquiring & SBP QR Settlement**:
   - Inspect `apps/api/src/routes/sberbank.ts`, `apps/api/src/routes/sbpQr.ts`, `apps/api/src/routes/payments/`, `apps/api/src/routes/documents/`, `apps/api/src/db/schema.ts`.
   - Analyze webhook & callback idempotency, signature verification, transition to `deposited`/`confirmed`.
   - Check transactional linking to `visitId` and `documentId`, updating `generatedDocuments` status to `issued`, decrementing patient visit balance.
   - Check 54-FZ FFD 1.2 tag compliance: Tag 1054 (признак расчета), Tag 1212 (признак предмета расчета), Tag 1214 (признак способа расчета), Tag 1199 (ставка НДС), Tag 2108 (мера количества предмета расчета).
   - Check Tax Deduction Certificate («Справка для налогового вычета по форме КНД 1151156», Art. 219 NK RF) implementation and document generation.
2. **R2: Schedule Concurrency & Chair / Doctor Overlap Prevention**:
   - Inspect `apps/api/src/routes/appointments/`, `apps/api/src/db/appointmentsQuery.ts`, `apps/api/src/routes/publicBooking.ts`.
   - Analyze interval overlap logic $[T_{start}, T_{end})$ for physical chair (`chairId`) and doctor (`doctorUserId`).
   - Check PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) ordering by `chairId` / `doctorUserId` to prevent `40P01` deadlocks.

Write a complete, structured analysis report to `C:/Clinic_MVP/dental-crm/.agents/survey_explorer_1/report.md` including exact file paths, current implementation status, gaps, and precise technical implementation recommendations. Then send a message to parent with summary and file path.
