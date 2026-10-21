# BRIEFING — 2026-08-14T16:00:00Z

## Mission
Survey the codebase for Requirement R2 (Financial module & cash discipline, Sberbank acquiring, NDFL KND 1151156 certificates, doctor yield / payroll, integer kopeck arithmetic).

## 🔒 My Identity
- Archetype: Explorer
- Roles: Codebase & architecture investigator, forensic auditor
- Working directory: C:\Clinic_MVP\dental-crm\.agents\explorer_survey_fin
- Original parent: e13da413-3819-467f-ad27-4d03982dd738
- Milestone: Requirement R2 Financial Audit & Remediation Planning

## 🔒 Key Constraints
- Read-only investigation — do NOT modify application source code directly
- Strict kopeck-exact integer arithmetic verification across API & Web
- Mandate 8b: "Compiles" is not "works". Evidence chain with exact file paths and line numbers
- Sberbank acquiring gateway response parsing (formUrl, qrCode/qrUrl, callbacks, idempotency)
- NDFL KND 1151156 tax certificate logic (patient vs payer, code 1 vs 2, sums)
- Doctor yield / payroll math

## Current Parent
- Conversation ID: e13da413-3819-467f-ad27-4d03982dd738
- Updated: 2026-08-14T16:00:00Z

## Investigation State
- **Explored paths**:
  - `packages/shared/src/money.ts`, `packages/shared/src/tests/money-contract-kopecks.test.ts`
  - `apps/api/src/db/moneyTypeParsers.ts`, `apps/api/src/money/patientDebt.ts`
  - `apps/api/src/routes/billing.ts`, `apps/api/src/db/billingQuery.ts`
  - `apps/api/src/routes/finance_family.ts`, `apps/api/src/routes/sbpQr.ts`
  - `apps/api/src/routes/sberbank.ts`, `apps/api/src/services/sberbankClient.ts`
  - `apps/web/src/components/finance/SberbankTerminalPaymentModal.tsx`
  - `apps/api/src/routes/documents/ndflCalculator.ts`, `apps/api/src/documents/taxXml.ts`, `apps/api/src/documents/renderDocument.ts`
  - `apps/web/src/components/documents/NdflCalculatorModal.tsx`
  - `apps/api/src/services/finance/doctorPayouts.ts`, `apps/api/src/services/finance/payoutNegativeExplain.ts`
  - `apps/web/src/pages/DoctorPayoutDashboard.tsx`
- **Key findings**:
  1. Integer kopeck arithmetic is rigorously implemented across the shared money contract, PostgreSQL OID 1700 parser, and patient debt engine.
  2. Sberbank acquiring gateway polling loop bug in `SberbankTerminalPaymentModal.tsx:154-175`: checks uppercase `"PAID"` / `"CONFIRMED"` while backend endpoint `GET /api/sberbank/status/:orderId` returns lowercase `"success"`.
  3. NDFL KND 1151156 XML/PDF generation complies with FNS order ЕА-7-11/824@.
  4. Doctor payout backend calculates both material and lab (ЗТЛ) deductions, but `DoctorPayoutDashboard.tsx` only renders materials in the UI table, causing visual arithmetic discrepancies.
  5. `SUPERSEDED_METHOD_SENTENCE` in `payoutNegativeExplain.ts` is out of sync with `doctorPayouts.ts`, failing `payoutNegativeExplain.test.ts:227`.
- **Unexplored areas**: None for R2.

## Key Decisions Made
- Fully surveyed all 4 requested areas and compiled full evidence chain with remediation plan into `handoff.md`.

## Artifact Index
- `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_fin\BRIEFING.md`
- `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_fin\progress.md`
- `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_fin\handoff.md`
