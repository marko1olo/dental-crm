# Handoff Report — Explorer Subagent (Milestone 3)

**Task**: Milestone 3: Kopeck-Exact Financial Accounting & Ledger Audit for DENTE Dental CRM
**Location**: `C:\Clinic_MVP\dental-crm`
**Metadata Directory**: `C:\Clinic_MVP\dental-crm\.agents\explorer_m3`
**Date**: 2026-08-01

---

## 1. Observation

Direct code observations, verbatim lines, exact file paths, line numbers, and tool commands:

### A. Shared Money Utility Standard (`packages/shared/src/utils/money.ts`)
- **File**: `packages/shared/src/utils/money.ts`
- **Lines 26–28**: `export type Kopecks = number; const KOPECKS_IN_RUBLE = 100;`
- **Lines 53–76**: `parseKopecks(value)` parses strings via regex `/^(-)?(\d+)(?:\.(\d{1,2}))?$/` to avoid binary float errors.
- **Lines 92–99**: `kopecksToNumericString(kopecks)` formats integer kopecks to `"150.50"` string for DB `numeric(12, 2)` column storage.
- **Lines 169–188**: `splitKopecks(total, parts)` splits totals into installment tuples preserving exact remainder kopecks.

### B. Database Schema & Type Adapter (`apps/api/src/db/`)
- **File**: `apps/api/src/db/schema.ts`
  - Line 528: `basePriceRub: numeric("base_price_rub", { precision: 12, scale: 2, mode: "number" })`
  - Line 551: `priceRub: numeric("price_rub", { precision: 12, scale: 2, mode: "number" })`
  - Line 641: `amountRub: numeric("amount_rub", { precision: 12, scale: 2, mode: "number" })`
  - Line 1937: `balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0.00")` (`family_groups` balance).
- **File**: `apps/api/src/db/moneyTypeParsers.ts`
  - Lines 34–57: `parseNumericMoney(value)` converts `numeric(12, 2)` strings into JS `number` iff `asNumber.toFixed(scale) === trimmed`.

### C. Backend Routes (`apps/api/src/routes/finance_family.ts` & `apps/api/src/documents/guards.ts`)
- **File**: `apps/api/src/routes/finance_family.ts`
  - Lines 456, 490–497:
    ```typescript
    const [family] = await tx.select().from(familyGroups)...for("update");
    const currentKopecks = parseKopecks(family.balance);
    const amountKopecks = rublesToKopecks(payload.amountRub);
    const newBalance = kopecksToNumericString(currentKopecks - amountKopecks);
    ```
  - Lines 596, 626–632: Top-up executes kopeck addition under `.for("update")`.
- **File**: `apps/api/src/documents/guards.ts`
  - Line 841: `return Math.max(0, Math.round((line.quantity * line.unitPriceRub - line.discountRub) * 100) / 100);`
  - Line 856: `if (Math.abs(line.totalRub - expectedTotalRub) > 0.01)`

### D. Frontend Components (`apps/web/src/`)
- **File**: `apps/web/src/components/plan/planPricing.ts` & `treatmentEstimatorPricing.ts`
  - Uses `parseKopecks`, `sumKopecks`, `multiplyKopecks`, `percentageOfKopecks` from `@dental/shared`. Removed hardcoded pricing fallbacks (4000, 35000).
- **File**: `apps/web/src/useAppLogic.tsx`
  - Line 5089–5090: `const roundToKopecks = (value: number) => Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;`
  - Line 5168: `insuranceCoverageRub += roundToKopecks((treatmentLineTotal(item) * pct) / 100);`
- **File**: `apps/web/src/PaymentCapture.tsx`
  - Line 346: `const downPayment = Math.round((totalAmount * downPaymentPercent) / 100);`
  - Line 348: `const monthlyPayment = months > 0 ? Math.floor(remaining / months) : 0;`
- **File**: `apps/web/src/components/finance/cashDaySummary.ts`
  - Line 102: `function addRub(total: number, addition: number): number { return Math.round((total + addition) * 100) / 100; }`
- **File**: `apps/web/src/components/inventory/useInventoryLogic.ts`
  - Line 771: `const cost = parseFloat(item.unitCostRub || "0") || 0;`

---

## 2. Logic Chain

1. **Database Schema Storage**:
   - Observation A & B show that PostgreSQL stores money as decimal rubles `numeric(12, 2)` or `numeric(10, 2)`, not raw integer kopecks in PostgreSQL column DDL.
   - Drivers deliver `numeric` as strings or parse to JS numbers via `moneyTypeParsers.ts`.
2. **Kopeck Precision Enforcement in Core Financial Transactions**:
   - Observation A & C confirm that `packages/shared/src/utils/money.ts` and `apps/api/src/routes/finance_family.ts` enforce integer kopeck calculations (`parseKopecks`, `rublesToKopecks`, `kopecksToNumericString`) under row-level database locks (`.for("update")`).
   - This prevents binary floating-point drift (e.g. `0.1 + 0.2 === 0.30000000000000004`) during family wallet debits and top-ups.
3. **Surviving Non-Integer / Float Rounding Patterns**:
   - Observation C & D show that while core shared math uses `packages/shared/src/utils/money.ts`, several frontend components (`useAppLogic.tsx:5089`, `PaymentCapture.tsx:346`, `cashDaySummary.ts:102`) and server document guards (`documents/guards.ts:841`) still rely on floating-point arithmetic with `Math.round(x * 100) / 100`, `Math.floor`, or `parseFloat`.
   - In `PaymentCapture.tsx`, installment division uses `Math.floor(remaining / months)` with remainder adjustment instead of `splitKopecks()`.
   - In `useAppLogic.tsx`, insurance coverage accumulation uses float multiplication `(treatmentLineTotal(item) * pct) / 100` before calling `roundToKopecks`.

---

## 3. Caveats

- **Read-Only Constraint**: As an Explorer subagent, no source code changes were made during this turn.
- **Unexplored Scope**: External payment gateway integrations (e.g., online acquiring, bank webhooks) were not inspected beyond the internal `payments` and `family_groups` ledger routes.

---

## 4. Conclusion

- **Overall Integrity Assessment**: Core backend financial transactions (`finance_family.ts`, `billingQuery.ts`) and shared pricing modules (`planPricing.ts`, `treatmentEstimatorPricing.ts`) strictly comply with integer kopeck arithmetic and pessimistic row-locking standards.
- **Refactoring Opportunities**:
  1. Refactor `apps/api/src/documents/guards.ts` (lines 841, 847) to use `parseKopecks` / `sumKopecks` instead of `Math.round(... * 100) / 100` float logic.
  2. Refactor `apps/web/src/useAppLogic.tsx` (lines 5089–5170) to calculate treatment totals and insurance coverage in integer kopecks via `packages/shared/src/utils/money.ts`.
  3. Refactor `apps/web/src/PaymentCapture.tsx` (line 346) to use `splitKopecks()` for installment schedules.
  4. Refactor `apps/web/src/components/finance/cashDaySummary.ts` (line 102) to use `sumKopecks()` for daily cash tallying.
  5. Refactor `apps/web/src/components/inventory/useInventoryLogic.ts` (line 771) to parse unit costs via `parseKopecks()`.

---

## 5. Verification Method

### Status Split
#### ПРОВЕРЕНО (Verified via Commands & Output)
- `npm run test -w @dental/shared` — 185 tests passed, verifying kopeck parsing, formatting, percentage calculation, and installment splitting.
- Database schema inspection of `apps/api/src/db/schema.ts` — verified column definitions (`numeric(12, 2)`).
- Backend transaction inspection of `apps/api/src/routes/finance_family.ts` — verified pessimistic locking `.for("update")` and kopeck arithmetic.

#### НЕ ПРОВЕРЕНО (Known Float Math Patterns Remaining in Source)
- Floating-point calculations in `apps/api/src/documents/guards.ts:841`.
- Floating-point calculations in `apps/web/src/useAppLogic.tsx:5089`.
- Floating-point installment calculation in `apps/web/src/PaymentCapture.tsx:346`.
- Floating-point cash day summary in `apps/web/src/components/finance/cashDaySummary.ts:102`.

### Execution Command
```bash
npm run test -w @dental/shared
```
Output log excerpt:
```
✔ parseKopecks (2.0737ms)
✔ kopecksToNumericString (0.8729ms)
✔ rublesToKopecks / kopecksToWholeRubles (0.5211ms)
✔ multiplyKopecks (0.2877ms)
✔ percentageOfKopecks (0.2261ms)
✔ splitKopecks (2.2162ms)
✔ formatKopecksRu (0.7931ms)
ℹ tests 185 | pass 185 | fail 0
```
