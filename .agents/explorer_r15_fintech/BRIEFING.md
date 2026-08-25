# BRIEFING — 2026-08-17T22:31:00+04:00

## Mission
Investigate and verify DENTE Dental CRM FinTech 54-FZ, Kopeck-exact integer arithmetic, 0% installment plans, 13% NDFL tax deduction certificates (KND 1151156 XML 5.01), 54-FZ cashier receipts idempotency & FFD 1.2 tags, and related unit/integration test suites.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Explorer 2 (FinTech & Billing Explorer)
- Working directory: C:\Clinic_MVP\dental-crm\.agents\explorer_r15_fintech
- Original parent: e9ee082c-83f1-420c-a1c8-075067df613e
- Milestone: FinTech & Billing Deep Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code
- Full reading / zero skimming of relevant authority files and source
- Report exact file paths, line numbers, and test command results
- Maintain 5-component handoff report (Observation, Logic Chain, Caveats, Conclusion, Verification Method)

## Current Parent
- Conversation ID: e9ee082c-83f1-420c-a1c8-075067df613e
- Updated: 2026-08-17T22:31:00+04:00

## Investigation State
- **Explored paths**:
  - `packages/shared/src/utils/money.ts` & `packages/shared/src/money.ts`
  - `packages/shared/src/tests/money.test.ts` & `packages/shared/src/tests/money-contract-kopecks.test.ts`
  - `apps/web/src/components/perspectives/casePresentationPricing.ts` & `apps/web/src/tests/casePresentationPricing.test.ts`
  - `apps/api/src/money/patientDebt.ts`
  - `apps/api/src/db/schema/billing.ts` & `apps/api/src/db/billingQuery.ts`
  - `apps/api/src/routes/billing.ts` & `apps/api/src/routes/sbpQr.ts` & `apps/api/src/routes/documents/ndflCalculator.ts` & `apps/api/src/documents/taxXml.ts`
  - `apps/api/src/tests/routes/fiscalReceiptQueue.test.ts` & `sbpQrFiscalEngine.test.ts` & `sberbankWebhookIdempotency.test.ts` & `guards.test.ts` & `moneyTextMustNotThrow.test.ts`
- **Key findings**:
  - Kopeck-exact integer arithmetic is fully implemented in `@dental/shared` and strictly enforces no floating-point calculations across financial operations.
  - 0% installment plans use `splitKopecks` with exact invariant `sum(parts) === total` where remaining kopecks are distributed across the initial installments.
  - 1-click NDFL calculation correctly distinguishes Code 01 (capped at 150k RUB / 19.5k refund) vs Code 02 (uncapped expensive treatment), backed by `buildKnd1151156Xml()` (XML 5.01, KND 1184043) and `GET /api/documents/ndfl-calculator`.
  - 54-FZ cashier receipts support `clientMutationId` deduplication (DB unique index `payments_org_client_mutation_unique`), FFD 1.2 tags (1054, 1055, 1212, 1214, 1199, 2108), and physical KKT fallback buffering via table `fiscal_receipt_queue` and retry endpoints.
  - Test suites: `@dental/shared` passes 185/185 unit tests; `@dental/web` passes 1349/1349 unit tests; target financial/fiscal `@dental/api` tests pass 100%.
- **Unexplored areas**: None within the allocated FinTech scope.

## Key Decisions Made
- Executed comprehensive multi-package audit across shared, web, and api workspaces.
- Documented findings with exact file paths, line numbers, and test execution proofs in `handoff.md`.

## Artifact Index
- C:\Clinic_MVP\dental-crm\.agents\explorer_r15_fintech\DISPATCH.md
- C:\Clinic_MVP\dental-crm\.agents\explorer_r15_fintech\BRIEFING.md
- C:\Clinic_MVP\dental-crm\.agents\explorer_r15_fintech\progress.md
- C:\Clinic_MVP\dental-crm\.agents\explorer_r15_fintech\handoff.md
