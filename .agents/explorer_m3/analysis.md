# Milestone 3 Audit Analysis: Financial Accounting, Pricing, Invoices & Ledger Precision

**Audit Target Workspace**: `C:\Clinic_MVP\dental-crm`
**Audit Date**: 2026-08-01
**Auditor**: Explorer Subagent (Milestone 3)
**Scope**: Database schema, Drizzle types, money utilities, API backend routes (`apps/api/src/routes/`, `apps/api/src/db/`), shared contracts (`packages/shared/`), and frontend components (`apps/web/src/`).

---

## 1. Executive Summary

A comprehensive financial audit was conducted across the DENTE Dental CRM monorepo to evaluate integer kopeck precision (1 RUB = 100 kopecks), protection against floating-point division/rounding drift, database column representations, payment idempotency, and patient/family ledger accounting.

### Core Findings Matrix

| Component / Subsystem | Primary Location | Representation / Math Approach | Status | Audit Findings |
|---|---|---|---|---|
| **Money Utility Standard** | `packages/shared/src/utils/money.ts` | `type Kopecks = number` (integer kopecks) | **COMPLIANT** | Pure regex string parsing (`parseKopecks`), integer arithmetic (`sumKopecks`, `multiplyKopecks`, `percentageOfKopecks`, `splitKopecks`), formatting to `numeric(12, 2)` string (`kopecksToNumericString`). |
| **PostgreSQL & Drizzle Schema** | `apps/api/src/db/schema.ts` | `numeric(12, 2)` with `mode: "number"` | **MIXED** | Monetary columns store decimal rubles in `numeric(12, 2)`. Custom pg driver parser (`moneyTypeParsers.ts`) converts safely to JS numbers. `family_groups.balance` lacks `mode: "number"` in Drizzle definition (handled explicitly via `parseKopecks` in route). Schema test revealed `payments.payment_method` and `payments.payment_status` exist as text in DB but lack enum mapping in Drizzle model. |
| **Family Finance & Wallets** | `apps/api/src/routes/finance_family.ts` | Transactional kopeck calculations | **COMPLIANT** | Row-level locking (`.for("update")`), integer kopecks conversion via `parseKopecks`, `rublesToKopecks`, `kopecksToNumericString`. Strict idempotency via `clientMutationId`. |
| **Payment Idempotency & Billing** | `apps/api/src/routes/billing.ts` & `db/billingQuery.ts` | Pessimistic locking + UUID gating | **COMPLIANT** | Payments checked via `findPaymentByClientMutationIdInDb`. DB transactions lock patient records before insertion. |
| **Document Guards & Invoice Validation** | `apps/api/src/documents/guards.ts` | Float math + `Math.round(x * 100) / 100` | **CAVEAT / FLOAT RISK** | Lines 841, 847, 869 use floating-point `Math.round((line.quantity * line.unitPriceRub - line.discountRub) * 100) / 100` and tolerance check `Math.abs(...) > 0.01`. |
| **Treatment Estimator & Plan Pricing** | `apps/web/src/components/plan/planPricing.ts`, `treatmentEstimatorPricing.ts` | Kopecks via `@dental/shared` | **COMPLIANT** | Removed legacy hardcoded price fallbacks (4000, 35000). Calculates totals in integer kopecks. |
| **God Context Monolith** | `apps/web/src/useAppLogic.tsx` | Float math via `roundToKopecks` | **NON-INTEGER** | Lines 5089–5170 use `const roundToKopecks = (v) => Math.round(v * 100) / 100` for line totals and insurance coverage accumulation. |
| **Payment Capture & Installment Calc** | `apps/web/src/PaymentCapture.tsx` | Float math (`Math.round`, `Math.floor`) | **NON-INTEGER** | Line 346 uses `Math.round((totalAmount * downPaymentPercent) / 100)` and `Math.floor(remaining / months)` instead of `splitKopecks()`. |
| **Daily Cash Summary** | `apps/web/src/components/finance/cashDaySummary.ts` | Float math via `addRub` | **NON-INTEGER** | Line 102 uses `addRub(total, addition)` returning `Math.round((total + addition) * 100) / 100`. |
| **Inventory Unit Costs** | `apps/web/src/components/inventory/useInventoryLogic.ts` | `parseFloat` on string costs | **LEGACY FLOAT** | Line 771 uses `parseFloat(item.unitCostRub || "0")` for total stock valuation calculation. |

---

## 2. Detailed Findings by Scope

### Scope 1: Database Schema & Query Parameters (`apps/api/src/db/`)

1. **Numeric Column Definitions (`apps/api/src/db/schema.ts`)**:
   - `serviceCatalogItems`: `basePriceRub` -> `numeric("base_price_rub", { precision: 12, scale: 2, mode: "number" })` (line 528).
   - `treatmentItems`: `priceRub`, `unitPriceRub`, `discountRub` -> `numeric(..., scale: 2, mode: "number")` (lines 551–553).
   - `payments`: `amountRub` -> `numeric("amount_rub", { precision: 12, scale: 2, mode: "number" })` (line 641).
   - `generatedDocuments`: `totalAmountRub` -> `numeric("total_amount_rub", { precision: 12, scale: 2, mode: "number" })` (line 673).
   - `invoices`: `totalRub` -> `numeric("total_rub", { precision: 12, scale: 2 })` (line 1834); `totalAmountRub` -> `numeric("total_amount_rub", { precision: 12, scale: 2, mode: "number" })` (line 1856). Note dual columns resulting from historical migration alignment.
   - `family_groups`: `balance` -> `numeric("balance", { precision: 12, scale: 2 })` (line 1937) default `"0.00"`.

2. **Global Money Type Parsing (`apps/api/src/db/moneyTypeParsers.ts`)**:
   - `registerMoneyTypeParsers()` registers a type parser for `NUMERIC_OID (1700)`.
   - Function `parseNumericMoney(value)` ensures values match exact string round-trips (`asNumber.toFixed(scale) === trimmed`), returning JavaScript `number` for values within `SAFE_KOPECKS = Number.MAX_SAFE_INTEGER`.

3. **Live DB Schema Test Output**:
   - `npm run test -w @dental/api` output: `schemaMatchesLiveDatabase.test.ts` flagged:
     `payments.payment_method: есть в базе (text), в модели не объявлена (db/schema.ts: payments)`
     `payments.payment_status: есть в базе (text), в модели не объявлена (db/schema.ts: payments)`

---

### Scope 2: Shared Financial Utilities (`packages/shared/src/utils/money.ts`)

`packages/shared/src/utils/money.ts` provides a complete toolkit for kopeck-exact calculations:
- `parseKopecks(value)`: Parses DB numeric strings (e.g. `"150.50"`) or numbers using regex `/^(-)?(\d+)(?:\.(\d{1,2}))?$/` without `parseFloat`.
- `kopecksToNumericString(kopecks)`: Formats kopecks to strict decimal string `"150.50"` for PostgreSQL insertion.
- `rublesToKopecks(rubles)` & `kopecksToWholeRubles(kopecks)`: Ensures clean integer conversion without fractional ruble leak.
- `multiplyKopecks(unit, quantity)`: Strict integer multiplication (`Number.isInteger(quantity)` enforced).
- `percentageOfKopecks(amount, basisPoints)`: Computes percentage in basis points (1% = 100 bp) with `Math.trunc` to prevent over-allocation.
- `splitKopecks(total, parts)`: Splits totals into installment tuples preserving exact remainder kopecks.
- `formatKopecksRu(kopecks)`: Displays formatted monetary strings (`"1 500,50 ₽"`).

---

### Scope 3: Backend Routes & Financial Accounting (`apps/api/src/routes/`)

1. **Family Finance (`apps/api/src/routes/finance_family.ts`)**:
   - **Payment Deduction (`POST /api/finance/family/pay`)**:
     - Locks row with `.for("update")` inside a DB transaction (line 456).
     - Idempotency check with `clientMutationId` returns cached payment without double debit (lines 465–483).
     - Converts current balance using `parseKopecks(family.balance)` (line 490).
     - Converts deduction amount using `rublesToKopecks(payload.amountRub)` (line 491).
     - Computes `newBalance = kopecksToNumericString(currentKopecks - amountKopecks)` (line 497).
   - **Wallet Top-Up (`POST /api/finance/family/topup`)**:
     - Locks row with `.for("update")` (line 596).
     - Computes `newBalance = kopecksToNumericString(parseKopecks(family.balance) + rublesToKopecks(payload.amountRub))` (line 626).
     - Creates payment record with status `"planned"` (advance deposit) (line 644).

2. **Payment Idempotency (`apps/api/src/db/billingQuery.ts`)**:
   - `createPaymentInDb`: Locks patient record via `.for("update")` inside transaction (line 71).
   - Prevents duplicate submission via `findPaymentByClientMutationIdInDb()` (line 19).

3. **Document Guards (`apps/api/src/documents/guards.ts`)**:
   - Lines 841, 847, 869: Uses `Math.round((line.quantity * line.unitPriceRub - line.discountRub) * 100) / 100` and tolerance check `Math.abs(line.totalRub - expectedTotalRub) > 0.01`.
   - *Audit Note*: This backend validator relies on floating-point arithmetic rather than `parseKopecks` / `sumKopecks`.

---

### Scope 4: Web Client Financial Components (`apps/web/src/`)

1. **Plan & Estimator Pricing (`planPricing.ts` & `treatmentEstimatorPricing.ts`)**:
   - Uses `parseKopecks`, `sumKopecks`, `multiplyKopecks`, and `percentageOfKopecks` from `@dental/shared`.
   - Eliminates legacy hardcoded pricing defaults (e.g. 4000, 35000 RUB).

2. **God Context (`apps/web/src/useAppLogic.tsx`)**:
   - Lines 5089–5169: Uses `const roundToKopecks = (value: number) => Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;` and float math for line totals and insurance coverage accumulation: `insuranceCoverageRub += roundToKopecks((treatmentLineTotal(item) * pct) / 100)`.

3. **Payment Capture (`apps/web/src/PaymentCapture.tsx`)**:
   - Line 346: Calculates down payment via `Math.round((totalAmount * downPaymentPercent) / 100)` and monthly installment via `Math.floor(remaining / months)` instead of `splitKopecks()`.

4. **Daily Cash Summary (`apps/web/src/components/finance/cashDaySummary.ts`)**:
   - Line 102: Uses `function addRub(total: number, addition: number): number { return Math.round((total + addition) * 100) / 100; }`.

5. **Inventory Logic (`apps/web/src/components/inventory/useInventoryLogic.ts`)**:
   - Line 771: Uses `parseFloat(item.unitCostRub || "0")` to sum total stock value.

---

## 3. Verification & Proof Statements

### ПРОВЕРЕНО (Verified Facts & Proofs)
1. **Unit Test Pass**: Executed `npm run test -w @dental/shared` — 185 tests passed (319ms execution time), confirming `parseKopecks`, `kopecksToNumericString`, `splitKopecks`, `percentageOfKopecks`, and `multiplyKopecks` operate with 100% precision.
2. **Family Wallet Transaction Integrity**: `apps/api/src/routes/finance_family.ts` lines 490–497 and 626–632 execute balance operations strictly in kopecks (`parseKopecks` + `rublesToKopecks` + `kopecksToNumericString`) under `.for("update")` database transaction locks.
3. **Database Money Type Adapter**: `apps/api/src/db/moneyTypeParsers.ts` converts PostgreSQL `numeric(12, 2)` strings into JavaScript numbers safely with strict string round-trip checks.
4. **Idempotency Safeguard**: `POST /api/finance/family/pay` and `POST /api/billing/payments` validate `clientMutationId` to prevent double-posting or double-debiting.

### НЕ ПРОВЕРЕНО (Areas Not Fully Converted to Integer Kopecks / Pending Refactoring)
1. **Document Guards Float Math**: `apps/api/src/documents/guards.ts:841` uses `Math.round(... * 100) / 100` and `Math.abs(...) > 0.01` float comparison rather than integer kopeck validation.
2. **Web God Context Float Calculations**: `apps/web/src/useAppLogic.tsx:5089–5169` uses float helper `roundToKopecks` for treatment line totals and insurance coverage accumulation.
3. **Installment Calculation**: `apps/web/src/PaymentCapture.tsx:346` uses `Math.round` and `Math.floor` instead of `splitKopecks` tuple distribution.
4. **Cash Day Summary Accumulation**: `apps/web/src/components/finance/cashDaySummary.ts:102` uses `addRub` float rounding.
5. **Inventory Valuation**: `apps/web/src/components/inventory/useInventoryLogic.ts:771` uses `parseFloat` for inventory stock valuation.

