# Handoff Report: Financial & Billing Modules Survey (Requirement R2)

**Git HEAD Commit**: `ef11e5fd30abde73b9660847177925b4c6b22577`  
**Date**: 2026-08-14  
**Author**: Explorer Agent (`explorer_survey_fin`)  
**Target Scope**: Requirement R2 (Integer Kopeck Arithmetic, Sberbank Acquiring Gateway, NDFL KND 1151156 Certificates, Doctor Yield / Payroll Calculations)

---

## 1. Observation

Direct code inspections and empirical evidence across the backend API, shared libraries, and web frontend:

### Area 1: Integer Kopeck Arithmetic & Monetary Integrity

1. **Shared Money Contract (`packages/shared/src/money.ts:1-36`)**:
   - `moneyRubSchema` enforces 2 decimal places precision:
     ```typescript
     export const moneyRubSchema = z.number().refine(
       (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6,
       { message: "Сумма в рублях может содержать максимум 2 знака после запятой (копейки)" }
     );
     ```
   - Exact conversion functions: `parseKopecks(amountRub: number | string): number` converts via `Math.round(num * 100)` or string splitting, throwing on 3+ decimals.
   - `kopecksToNumericString(kopecks: number): string` outputs format `"1000.50"` without floating point artifacts.
   - `sumKopecks(amounts: number[]): number` performs exact integer addition.

2. **Database Numeric Parser (`apps/api/src/db/moneyTypeParsers.ts:1-67`)**:
   - Explicit PostgreSQL type parser registered for `NUMERIC_OID = 1700` (`pg.types.setTypeParser(1700, parseNumericMoney)`).
   - Validates strings against regular expression `/^-?\d+(\.\d{1,2})?$/`, safely converting numeric strings to numbers within `SAFE_KOPECKS = 90_000_000_000_000_00` (900 billion rubles).

3. **Patient Debt Calculation Engine (`apps/api/src/money/patientDebt.ts:1-800`)**:
   - Uses nominal type `type Kopecks = number & { readonly __brand: "Kopecks" }`.
   - `chargeLineKopecks(line)` and `discountedChargeLineKopecks(line)` calculate itemized costs using integer arithmetic: `toKopecks(line.priceRub) * line.quantity`.
   - `buildPatientLedgers(...)` aggregates charges, payments, and discounts in integer kopecks to compute `debtKopecks`, completely eliminating `0.1 + 0.2 !== 0.3` floating point errors.

4. **Billing Routes & Pessimistic Locks (`apps/api/src/routes/billing.ts` & `apps/api/src/db/billingQuery.ts`)**:
   - `createPaymentInDb` (`billingQuery.ts:163-315`) locks patient row with `for("update")`.
   - When paying against a visit or document, locks the visit/document, calculates charged kopecks vs already paid kopecks (`chargedVisitKopecks - paidVisitKopecks`), and throws `BillingOverpaymentError` if `amountKopecks > remainingDebtKopecks`.
   - Enforces unique `clientMutationId` per organization (`payments_org_client_mutation_unique`).

5. **Family Wallet Routes (`apps/api/src/routes/finance_family.ts:1-800`)**:
   - `POST /api/finance/family/pay` and `POST /api/finance/family/topup` lock `familyGroups` with `for("update")`.
   - Validates `currentKopecks < amountKopecks` before debiting.
   - Idempotency verification via `payments.clientMutationId`.
   - Emits WebSocket event `FAMILY_BALANCE_UPDATED` with updated string balance.

6. **54-FZ SBP QR Fiscalization (`apps/api/src/routes/sbpQr.ts:1-402`)**:
   - Validates FFD 1.2 fiscal tags: 1054 (признак расчета), 1212 (признак предмета расчета), 1214 (признак способа расчета), 1199 (ставка НДС).
   - Verifies integer kopeck splits across payment methods.

7. **Frontend Cash Day Tally (`apps/web/src/components/finance/CashDayTally.tsx` & `cashDaySummary.ts:1-240`)**:
   - `summarizeCashDay` aggregates payments strictly in kopecks (`parseKopecks`).
   - Categorizes payments: `paid` (received revenue), `planned` (advances for family wallets), `refunded` (returned to patients), `family_wallet` (internal wallet debits).
   - Eliminates false cash register discrepancy by accounting for the fact that `refunded` is a status transition on the same row.

---

### Area 2: Sberbank Acquiring Gateway Response Parsing

1. **Sberbank API Client (`apps/api/src/services/sberbankClient.ts:1-136`)**:
   - Calls Sberbank REST API `register.do` and `getOrderStatusExtended.do`.
   - Parses response: `orderId`, `formUrl`, `errorCode`, `errorMessage`, `orderStatus`.

2. **Sberbank Route Handlers (`apps/api/src/routes/sberbank.ts:1-558`)**:
   - `POST /api/sberbank/pay`: registers order, creates transaction record in `sberbankTransactions` with status `pending`.
   - `GET /api/sberbank/status/:orderId`: queries Sberbank status, maps code to status:
     - `2` -> `"success"`
     - `3` or `6` -> `"failed"`
     - `1` -> `"approved"`
     - `4` -> `"refunded"`
     - other -> `"pending"`
     - Response format (`sberbank.ts:283-287`):
       ```typescript
       return reply.send({
         success: true,
         status: mappedStatus, // "success" | "failed" | "approved" | "refunded" | "pending"
         amount: lockedTx.amount,
       });
       ```
   - `POST /api/sberbank/webhook`: verifies HMAC-SHA256 checksum across standard and checksum-prefixed payloads, executes `withTenantCtx` transaction, transitions status, and inserts payment ledger row with `clientMutationId: sberbank:${orderId}`.

3. **Frontend Sberbank Terminal Modal (`apps/web/src/components/finance/SberbankTerminalPaymentModal.tsx:1-290`)**:
   - Modal triggers polling loop in `pollStatus` (`lines 135-190`):
     ```typescript
     // Lines 154-175:
     const data = await res.json();
     if (data.status === "PAID" || data.status === "CONFIRMED") {
       setStatus("success");
       // ... success toast
     } else if (
       data.status === "FAILED" ||
       data.status === "DECLINED" ||
       data.status === "EXPIRED"
     ) {
       setStatus("failed");
       // ... error toast
     }
     ```
   - **CRITICAL DEFECT #1 IDENTIFIED**:
     - The backend `GET /api/sberbank/status/:orderId` returns `{ success: true, status: "success" }` or `{ success: true, status: "failed" }` (lowercase).
     - The frontend checks for uppercase `"PAID"`, `"CONFIRMED"`, `"FAILED"`, `"DECLINED"`, `"EXPIRED"`.
     - Result: When a terminal or QR payment completes successfully, the polling loop NEVER matches `"success"`, causing the frontend modal to spin indefinitely until the user manually closes it!

---

### Area 3: NDFL Tax Certificate KND 1151156 Generation

1. **NDFL Calculator Route (`apps/api/src/routes/documents/ndflCalculator.ts:1-108`)**:
   - `GET /api/documents/ndfl-calculator`: validates `patientId`, `startDate`, `endDate`.
   - Checks patient debt: `if (debtRub > 0)` returns `isBlocked: true, debtRub, code1TotalRub: 0, code2TotalRub: 0`.
   - Sums payments grouped by `taxDeductionCode` in integer kopecks via `toKopecks` and `rublesFromKopecks`.
   - Code 1 = standard medical treatment; Code 2 = expensive medical treatment.

2. **Electronic XML Generation for FNS (`apps/api/src/documents/taxXml.ts:1-739`)**:
   - Form KND 1151156, XML KND 1184043, format version 5.01, FNS order ЕА-7-11/824@.
   - Attributes:
     - `ИдФайл="UT_SVOPLMEDUSL_DENTE_{taxYear}_{documentNumber}"`
     - `КодНО` (4-digit tax authority code).
     - `ОтчГод` (tax year >= 2024).
     - `ПрПациент="1"` if taxpayer is patient, `"0"` if payer is relative.
     - Payer node `<НППлатМедУсл>`: FIO, birth date, 12-digit INN or identity document (passport series/number and date of issue).
     - Patient node `<Пациент>`: included ONLY when `ПрПациент="0"`.
     - Medical expense node `<СведРасхУсл>`: `СуммаКод1` and/or `СуммаКод2` formatted via `kopecksToNumericString` (exact kopecks).
   - Strict refusal policy: If `document.issuedAt` is missing, returns HTTP 409 error instead of fabricating today's date, preventing tax year misattribution.
   - Comprehensive draft validation via `validateKnd1151156XmlDraft`.

3. **HTML & PDF Print Rendering (`apps/api/src/documents/renderDocument.ts:2128-2260` & `4590-4710`)**:
   - `tax_deduction_certificate`: renders KND 1151156 print layout with official header, clinic details, taxpayer/patient tables, and fiscal receipt registry.
   - `legacy_tax_deduction_certificate`: renders pre-2024 Минздрав/МНС 289/БГ-3-04/256 form.
   - Block reasons: validates that all payments in the certificate belong to the same taxpayer identity key (`taxpayerIdentityKey`), have valid 12-digit INN, and have paid status.

4. **Frontend NDFL Modal (`apps/web/src/components/documents/NdflCalculatorModal.tsx:1-198`)**:
   - Connects to `/api/documents/ndfl-calculator`.
   - Displays debt warning banner when blocked (`isBlocked: true`).
   - Displays Code 1 and Code 2 totals.

---

### Area 4: Doctor Yield / Payroll Calculations

1. **Doctor Payout Engine (`apps/api/src/services/finance/doctorPayouts.ts:1-1103`)**:
   - Payment-to-Doctor linking chain: `payments.visit_id → visits.appointment_id → appointments.doctor_user_id`.
   - Rate resolution: `doctor_commissions.commission_pct` by `user_id` (ignores legacy/unused `commission_percent` and `doctor_id`).
   - If commission rate is missing, returns explicit `state: "rate_missing"` rather than fabricating 0%.
   - Mathematical formula:
     - `accruedRub = percentOfMoney(revenueRub, commissionPct)` using `decimal.js` with `ROUND_HALF_UP` to 2 decimals.
     - `withheldMaterialRub = percentOfMoney(materialCostRub, materialDeductionPct)` based on `inventory_transactions` (`auto_deduct`) joined to paid visits.
     - `withheldLabRub = percentOfMoney(labCostRub, labDeductionPct ?? commissionPct)` based on `lab_orders` (`status: 'received' | 'completed'`).
     - Total payout: `payoutRub = roundMoney(accruedRub - (withheldMaterialRub + withheldLabRub))`.
     - Preserves negative payouts (doctor debt to clinic when material/lab costs exceed accrued commission).
   - Multi-tenant and permission isolation: SQL applies tenant filter on every joined table (`payments`, `visits`, `appointments`, `inventory_transactions`, `lab_orders`), and filters by `onlyDoctorUserId` when user has only `payroll.read.own`.

2. **Frontend Doctor Payout Dashboard (`apps/web/src/pages/DoctorPayoutDashboard.tsx:1-919`)**:
   - Uses `payoutMonthCalendarBounds` to send calendar date `YYYY-MM-DD` strings to the server, letting the server resolve boundaries using clinic timezone (`clinics.timezone`).
   - Allows setting commission rate inline via `PUT /api/settings/staff/:id/commission` with `auth.settingsAccessHeaders`.
   - **DEFECT/GAP #2 IDENTIFIED**:
     - The backend `doctorPayouts.ts` recently incorporated dental lab order deductions (`labCostRub`, `labOrdersCount`, `withheldLabRub`, `labDeductionPct`).
     - In `DoctorPayoutDashboard.tsx:583-590` & `733-760`: The table columns are: `Врач`, `Касса`, `Ставка`, `Начислено`, `Материалы`, `Удержано`, `К выплате`.
     - The `Удержано` column renders `{money(row.withheldMaterialRub)}` and `row.materialDeductionPct`. It completely omits `withheldLabRub` and lab order statistics.
     - Result: When a doctor has lab deductions, `Начислено - Удержано` does not equal `К выплате`, creating visual arithmetic confusion for clinic managers.

3. **Negative Payout Explanations (`apps/api/src/services/finance/payoutNegativeExplain.ts:1-423`)**:
   - Decomposes net negative payouts into separate positive obligations (`payoutDueRub`) and doctor debt (`debtToClinicRub`).
   - Replaces `payoutRowNote` placeholder text with detailed breakdown.
   - **DEFECT #3 IDENTIFIED**:
     - In `payoutNegativeExplain.ts:101-103`: `SUPERSEDED_METHOD_SENTENCE` is defined as:
       `"Начислено процентом от кассы, затем удержана доля себестоимости материалов."`
     - In `doctorPayouts.ts:403`: When dental lab orders were integrated, the sentence was updated to:
       `"Начислено процентом от кассы, затем удержана доля себестоимости материалов и лаборатории (ЗТЛ)."`
     - Result: `payoutNegativeExplain.test.ts:227` fails because the string replacement no longer finds the obsolete sentence, leaving duplicate text in negative payout notes.

---

## 2. Logic Chain

1. **Monetary Integrity**:
   - *Premise*: Financial CRM systems must guarantee 100% kopeck exactness and prevent floating point rounding drift.
   - *Observation*: `packages/shared/src/money.ts`, `apps/api/src/db/moneyTypeParsers.ts`, and `apps/api/src/money/patientDebt.ts` strictly enforce integer kopeck representations (`parseKopecks`, `Kopecks`, `toKopecks`, `sumKopecks`) across all calculations.
   - *Inference*: The core arithmetic foundation is rock-solid and compliant with financial mandates.

2. **Acquiring Gateway Loop Defect**:
   - *Premise*: Sberbank acquiring modal must reflect successful card/terminal and QR payments immediately when the gateway confirms payment.
   - *Observation*: Backend `apps/api/src/routes/sberbank.ts:283` returns `status: "success"` (lowercase), while `apps/web/src/components/finance/SberbankTerminalPaymentModal.tsx:155` checks for `data.status === "PAID" || data.status === "CONFIRMED"` (uppercase).
   - *Inference*: The equality check fails, leaving the frontend polling modal in an eternal waiting state.

3. **NDFL KND 1151156 Compliance**:
   - *Premise*: Russian Federal Tax Service (FNS) order ЕА-7-11/824@ mandates strict data structures, distinction between patient and payer, 12-digit INN/passport series, and exact Code 1 vs Code 2 sums.
   - *Observation*: `apps/api/src/documents/taxXml.ts` and `ndflCalculator.ts` strictly enforce all XSD constraints, validate Russian date formats, isolate taxpayer identities, and refuse drafts lacking issue dates.
   - *Inference*: NDFL calculation and electronic XML generation comply fully with official tax authority requirements.

4. **Doctor Payroll Breakdown & Test Regression**:
   - *Premise*: Doctor payout dashboard and negative payout explanations must match the latest formula including ЗТЛ (lab orders).
   - *Observation*: `doctorPayouts.ts` incorporates `withheldLabRub`, but `DoctorPayoutDashboard.tsx` misses the lab column in the table, and `payoutNegativeExplain.ts` holds an un-updated `SUPERSEDED_METHOD_SENTENCE`.
   - *Inference*: Both files need synchronization with the ЗТЛ addition.

---

## 3. Caveats

1. **Sberbank Test Credentials**: Sberbank integration unit tests (`apps/api/src/tests/routes/sberbank.test.ts`) test the API routing and HMAC verification; live terminal hardware and live acquiring gateways require active Sberbank merchant credentials (`SBERBANK_MERCHANT_LOGIN`, `SBERBANK_MERCHANT_PASSWORD`, `SBERBANK_SECRET_KEY`).
2. **PostgreSQL Version**: Database type parser for OID 1700 is configured for node-postgres against PostgreSQL 18.
3. **No Other Caveats**: All examined code paths were inspected in source down to exact line numbers.

---

## 4. Conclusion

The financial and billing module of DENTE CRM is architecturally mature, with strict integer kopeck math and comprehensive compliance features (54-FZ FFD 1.2, NDFL KND 1151156, doctor commission and deduction pipelines).

Three specific remediations are required:
1. **Fix Sberbank modal status mapping** in `apps/web/src/components/finance/SberbankTerminalPaymentModal.tsx` to handle `"success"`, `"failed"`, `"approved"`, `"refunded"`.
2. **Add Lab / ЗТЛ deductions** to `apps/web/src/pages/DoctorPayoutDashboard.tsx` so that `withheldLabRub` and lab order counts are visible alongside materials.
3. **Update `SUPERSEDED_METHOD_SENTENCE`** in `apps/api/src/services/finance/payoutNegativeExplain.ts` to include `" и лаборатории (ЗТЛ)"` to restore sync with `doctorPayouts.ts` and pass unit tests.

---

## 5. Remediation Plan

### Remediation #1: Sberbank Acquiring Status Alignment

- **Target File**: `apps/web/src/components/finance/SberbankTerminalPaymentModal.tsx`
- **Lines**: 154–175
- **Proposed Patch**:
  ```typescript
  // In SberbankTerminalPaymentModal.tsx:
  const normalizedStatus = typeof data.status === "string" ? data.status.toLowerCase() : "";
  if (
    normalizedStatus === "paid" ||
    normalizedStatus === "confirmed" ||
    normalizedStatus === "success" ||
    normalizedStatus === "approved"
  ) {
    setStatus("success");
    showToast("Оплата через терминал успешно принята", "success");
    if (onPaymentSuccess) onPaymentSuccess();
    onClose();
  } else if (
    normalizedStatus === "failed" ||
    normalizedStatus === "declined" ||
    normalizedStatus === "expired"
  ) {
    setStatus("failed");
    showToast("Оплата отклонена терминалом или банком", "error");
  }
  ```

### Remediation #2: Doctor Payout Dashboard Lab Deduction Display

- **Target File**: `apps/web/src/pages/DoctorPayoutDashboard.tsx`
- **Lines**: 72–105, 583–590, 733–747, 830–838
- **Proposed Changes**:
  1. Update `DoctorPayoutRow` interface to include `labCostRub: number`, `labOrdersCount: number`, `withheldLabRub: number | null`, `labDeductionPct?: number | null`.
  2. Update table columns to display Lab deductions (`ЗТЛ (лаборатория)`) or total withheld amount (`withheldMaterialRub + withheldLabRub`) with clear subtext.
  3. Update summary metrics cards (`ops-metrics`) to display total withheld including lab expenses.

### Remediation #3: Negative Payout Explanation String Synchronization

- **Target File**: `apps/api/src/services/finance/payoutNegativeExplain.ts`
- **Line**: 101–103
- **Proposed Change**:
  ```typescript
  export const SUPERSEDED_METHOD_SENTENCE =
    "Начислено процентом от кассы, затем удержана доля себестоимости материалов и лаборатории (ЗТЛ).";
  ```


---

## 6. Verification Method

To independently verify all findings and test remediations:

1. **Verify Money Contract Tests**:
   ```bash
   node --test packages/shared/src/tests/money-contract-kopecks.test.ts
   ```
2. **Verify Sberbank Routes & Webhook HMAC Tests**:
   ```bash
   node --test apps/api/src/tests/routes/sberbank.test.ts
   node --test apps/api/src/tests/routes/sberbankWebhook.test.ts
   ```
3. **Verify NDFL XML Generation Tests**:
   ```bash
   node --test apps/api/src/documents/taxXml.test.ts
   ```
4. **Verify Doctor Payout & Negative Explain Tests**:
   ```bash
   node --test apps/api/src/services/finance/doctorPayouts.test.ts
   node --test apps/api/src/services/finance/payoutNegativeExplain.test.ts
   ```
5. **Verify TypeScript Compilation**:
   ```bash
   npm run check-types
   ```
