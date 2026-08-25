# Progress — Explorer 2 (FinTech & Billing)

Last visited: 2026-08-17T22:31:00+04:00

- [x] Initialized workspace and briefing
- [x] Read MANDATORY authority files:
  - [x] `ORIGINAL_REQUEST.md`
  - [x] `AGENTS.md`
  - [x] `BILLING_AND_FINANCE.md`
- [x] Investigate Kopeck-Exact Integer Arithmetic:
  - [x] `packages/shared/src/utils/money.ts` (`parseKopecks`, `rublesToKopecks`, `kopecksToNumericString`, `sumKopecks`, `multiplyKopecks`, `percentageOfKopecks`, `splitKopecks`, `formatKopecksRu`)
  - [x] `packages/shared/src/money.ts` (`moneyRubSchema`, `positiveMoneyRubSchema`, `nonNegativeMoneyRubSchema`)
  - [x] `apps/api/src/money/patientDebt.ts` (`toKopecks`, `rublesFromKopecks`, `chargeLineKopecks`, `buildPatientLedgers`)
  - [x] `apps/api/src/db/schema/billing.ts` (`numeric("amount_rub", { precision: 12, scale: 2, mode: "number" })`)
  - [x] Tested via `packages/shared/src/tests/money.test.ts` & `packages/shared/src/tests/money-contract-kopecks.test.ts` (185/185 unit tests passing)
- [x] Investigate 0% Installment Plans:
  - [x] Split algorithms (3, 6, 12, 24 months) in `packages/shared/src/utils/money.ts:splitKopecks`
  - [x] Invariant check: `sum(parts) == T`, remainder distributed to the first `remainder` installments
  - [x] Integrated in `apps/web/src/components/perspectives/casePresentationPricing.ts:calculateInstallmentMonthly` & `PaymentCapture.tsx`
  - [x] Tested in `apps/web/src/tests/casePresentationPricing.test.ts`
- [x] Investigate 1-Click NDFL Tax Deduction (13%):
  - [x] Code 01 (capped at 150k RUB / 19.5k refund) vs Code 02 (expensive treatment uncapped) in `casePresentationPricing.ts:calculateNdflRefund`
  - [x] Aggregation route `GET /api/documents/ndfl-calculator` in `apps/api/src/routes/documents/ndflCalculator.ts`
  - [x] KND 1151156 XML 5.01 generation schema and compliance in `apps/api/src/documents/taxXml.ts:buildKnd1151156Xml`
  - [x] Tested in `casePresentationPricing.test.ts`, `guards.test.ts`, `moneyTextMustNotThrow.test.ts`
- [x] Investigate 54-FZ Cashier Receipts & FFD 1.2:
  - [x] `clientMutationId` idempotency in `apps/api/src/routes/billing.ts`, `apps/api/src/routes/sbpQr.ts`, and DB unique constraint `payments_org_client_mutation_unique`
  - [x] FFD 1.2 tags: 1054 (`resolveTag1054`), 1055 (`resolveTag1055`), 1212 (`resolveTag1212`), 1214 (`resolveTag1214`), 1199 (`resolveTag1199`), 2108 (`resolveTag2108`) in `apps/api/src/routes/sbpQr.ts`
  - [x] Offline queue (`fiscal_receipt_queue`, hardware offline fallback) in `apps/api/src/routes/sbpQr.ts` & `apps/api/src/routes/billing.ts` (`pending`, `retry`, `retry-all`)
  - [x] Tested in `fiscalReceiptQueue.test.ts` (7/7 pass), `sbpQrFiscalEngine.test.ts` (6/6 pass), `sberbankWebhookIdempotency.test.ts` (8/8 pass)
- [x] Check & Run Tests:
  - [x] `npm test -w @dental/shared` -> 185/185 pass
  - [x] `npm test -w @dental/web` -> 1349/1349 pass
  - [x] Target financial & 54-FZ API test suites verified
- [x] Compile 5-Component Handoff Report (`handoff.md`)
- [x] Send coordination message to parent
