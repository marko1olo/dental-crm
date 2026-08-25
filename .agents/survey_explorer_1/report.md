# Backend Finance & Concurrency Deep Survey Report (R1 & R2)
**Project**: Clinic MVP / DENTE Dental CRM  
**Git HEAD**: `04f1b8ec1a119359a8f1279f729349c29eb6a5c6`  
**Explorer**: Backend Finance & Concurrency Explorer (`survey_explorer_1`)  
**Date**: 2026-08-15  

---

## 1. Executive Summary

This report delivers an exhaustive, zero-skimming, line-by-line architectural investigation into the backend financial and concurrency systems of DENTE Dental CRM across two core functional requirements:
1. **R1: 54-FZ FFD 1.2 Fiscal Receipts, Sberbank Acquiring & SBP QR Settlement, and Tax Deduction Certificates (Form KND 1151156, Art. 219 NK RF)**.
2. **R2: Schedule Concurrency, Chair & Doctor Double-Booking Prevention, and Deadlock-Free PostgreSQL Row-Level Locking (`SELECT ... FOR UPDATE`)**.

All conclusions in this report are grounded in direct source code citations, exact line references, database schema inspection, and verification of active PostgreSQL exclusion constraints.

---

## 2. Requirement R1: 54-FZ FFD 1.2, Sberbank Acquiring & SBP QR Settlement

### 2.1 Sberbank Acquiring Pipeline (`sberbank.ts`, `sberbankClient.ts`)

#### Current Architecture
- **Order Registration (`POST /api/sberbank/pay`)** (`apps/api/src/routes/sberbank.ts:110-179`):
  - Validates permission `finance.write` and organization context via `requireOrganizationContext`.
  - Instantiates `SberbankClient` (`apps/api/src/services/sberbankClient.ts:42-135`) targeting either `https://3dsec.sberbank.ru/payment/rest/` (test) or `https://securepayments.sberbank.ru/payment/rest/` (production).
  - Calls `client.registerOrder(orderNumber, amount, returnUrl)` with an amount in integer kopecks.
  - Records the pending transaction into `sberbank_transactions` table:
    ```typescript
    await db.insert(sberbankTransactions).values({
      organizationId,
      patientId,
      orderId: res.orderId,
      amount,
      status: "pending",
    });
    ```
- **Webhook Receiver (`POST /api/sberbank/webhook`)** (`apps/api/src/routes/sberbank.ts:299-557`):
  - **Cryptographic Signature Verification** (`apps/api/src/routes/sberbank.ts:22-107`): `verifySberbankChecksum` implements HMAC-SHA256 verification supporting three Sberbank formats:
    1. Standard Sberbank v2 format: alphabetical parameter sorting with trailing semicolon (`key1;val1;key2;val2;...;`).
    2. Format 2: `key1=val1;key2=val2`.
    3. Format 3: URL-encoded query format `key1=val1&key2=val2`.
    - Constant-time secret comparison via `timingSafeSecretEqual` prevents timing side-channel attacks.
    - Zero database queries are performed before signature validation succeeds.
  - **State Machine Transitions & Callback Idempotency** (`apps/api/src/routes/sberbank.ts:411-556`):
    - Acquires pessimistic lock on `sberbank_transactions` using `SELECT ... FOR UPDATE` under tenant context `withTenantCtx(targetTx.organizationId, ...)`.
    - Validates incoming `amount` against `lockedTx.amount` in kopecks.
    - Handles state machine operations:
      - `refunded`: updates `sberbank_transactions.status` to `refunded` and updates linked `payments.status` to `refunded` where `clientMutationId = 'sberbank:' || orderId`.
      - `reversed`: updates `sberbank_transactions.status` to `reversed`.
      - `approved`: updates `sberbank_transactions.status` to `approved` (holding funds).
      - `deposited` / `success` / `2`:
        - If already `success`: returns `{ success: true, processed: false, reason: "already_processed" }`.
        - Updates `sberbank_transactions.status` to `success`.
        - Inserts into `payments` table with `clientMutationId = sberbank:${orderId}` and `.onConflictDoNothing({ target: [payments.organizationId, payments.clientMutationId] })`.
      - `failed`: updates `sberbank_transactions.status` to `failed`.

#### Identified Gaps in Sberbank Acquiring
1. ❌ **Lack of `visitId` & `documentId` Linkage**:
   - `POST /api/sberbank/pay` accepts only `{ patientId, amount }` (`sberbank.ts:131`). It does NOT accept or persist `visitId`, `documentId`, `invoiceId`, or `taxDeductionCode`.
   - `sberbank_transactions` table in `schema.ts:3849-3870` has only: `id`, `organizationId`, `orderId`, `amount`, `status`, `patientId`, `createdAt`, `updatedAt`.
   - When Sberbank fires the webhook on successful settlement (`deposited`), the payment inserted into `payments` table has `visitId: null` and `documentId: null`.
2. ❌ **No Automatic Document Status Issuance**:
   - When a patient pays for an outpatient document (e.g. invoice, contract, act) via Sberbank acquiring, the document remains in `status: "draft"` instead of being transitionally issued to `status: "issued"`.
3. ❌ **Bypassing Visit Balance Decrement & Overpayment Checks**:
   - Webhook insertion into `payments` does not route through `createPaymentInDb` (`db/billingQuery.ts:163-416`), which checks `treatmentItems` charges, calculates remaining visit kopecks, and prevents overpayment.
4. ❌ **Missing 54-FZ Fiscal Receipt Generation on Acquiring Settlement**:
   - The Sberbank webhook creates a raw `payments` record without generating or recording 54-FZ fiscal receipt metadata (`fiscalReceiptNumber`, `fiscalReceipt` JSON with FN/FD/FPD, OFD link).

---

### 2.2 SBP QR Settlement & 54-FZ Fiscal Engine (`sbpQr.ts`, `packages/shared`)

#### Current Architecture
- **NSPK SBP Dynamic QR Generation (`POST /api/billing/sbp/generate-qr`)** (`apps/api/src/routes/sbpQr.ts:128-177`):
  - Uses `SbpQrEngine.buildNspkDynamicPayload` (`packages/shared/src/index.ts:13298-13350`).
  - Computes standard CRC16-CCITT checksum according to GOST R 56042-2014 (polynomial `0x1021`, initial `0xFFFF`).
  - Generates crisp vector SVG QR code via `createTelegramQrSvg(payloadUrl)`.
  - Returns `payloadUrl`, `operationId`, `crc16`, `amountKopecks`, `amountRub`, `qrSvg`, `ttlSeconds`, and `expiresAt`.
- **NSPK QR Payload Validation (`POST /api/billing/sbp/verify-payload`)** (`apps/api/src/routes/sbpQr.ts:180-200`):
  - Validates SBP URL format and recalculates CRC16 to prevent payment URL tampering.
- **54-FZ / FFD 1.2 Fiscal Receipt Creation (`POST /api/billing/fiscalize-receipt`)** (`apps/api/src/routes/sbpQr.ts:203-436`):
  - Validates payload against `createFiscalReceiptPayloadSchema` (`packages/shared/src/index.ts:13246-13293`).
  - Verifies exact kopeck balance matching:
    $$\sum \text{items.amountKopecks} = \text{totalKopecks} = \text{cashKopecks} + \text{electronicCardKopecks} + \text{sbpKopecks} + \text{prepaidKopecks}$$
  - **FFD 1.2 Tag Compliance**:
    - **Tag 1054** (Признак расчета): mapped in `resolveTag1054` (`1 = income/приход`, `2 = income_return/возврат прихода`, `3 = expense/расход`, `4 = expense_return/возврат расхода`).
    - **Tag 1212** (Признак предмета расчета): mapped in `resolveTag1212` (`1 = commodity/товар`, `3 = job/работа`, `4 = service/услуга стоматологии`, `10 = payment/платеж/аванс`).
    - **Tag 1214** (Признак способа расчета): mapped in `resolveTag1214` (`1 = full_prepayment`, `2 = prepayment`, `3 = advance`, `4 = full_payment`, `5 = partial_payment_and_credit`, `6 = credit_handover`, `7 = credit_payment`).
    - **Tag 1199** (Ставка НДС): mapped in `resolveTag1199` (`1 = 20%`, `2 = 10%`, `3 = 20/120`, `4 = 10/110`, `5 = 0%`, `6 = без НДС` по ст. 149 п. 2 пп. 2 НК РФ).
    - **Tag 2108** (Мера количества предмета расчета): mapped in `resolveTag2108` (`0 = piece/шт`, `10 = gram/г`, `11 = kilogram/кг`, `255 = other/иное`).
    - **Tag 1055** (Система налогообложения): mapped in `resolveTag1055` (`1 = ОСН`, `2 = УСН Доходы`, `4 = УСН Доходы минус расходы`, `8 = ЕСХН`, `16 = Патент/ПСН`).
  - **Transaction & Ledger Execution**:
    - Inside `db.transaction`:
      - Locks `patientInvoices` (`FOR UPDATE`) if `invoiceId` is provided.
      - Inserts record into `payments` table with `fiscalReceipt` details (`fn`, `fd`, `fpd`, `cashierName`, `receiptUrl`, `operationType`).
      - Records journal entry in `cashLedger`.
      - Updates `patientInvoices.status` to `paid` or `refunded`.
      - Creates digital receipt dispatch entry in `digitalReceiptDispatches` for SMS/Email.

#### Identified Gaps in SBP QR Settlement
1. ❌ **No `visitId` or `documentId` in `createFiscalReceiptPayloadSchema`**:
   - `createFiscalReceiptPayloadSchema` allows linking `invoiceId` (referencing `patient_invoices`), but does not have fields for `visitId` (referencing `visits`) or `documentId` (referencing `generated_documents`).
2. ❌ **No Status Issuance for `generatedDocuments`**:
   - Settling a bill via SBP fiscalization does not automatically issue the associated outpatient document in `generated_documents`.

---

### 2.3 Tax Deduction Certificates (Art. 219 NK RF, Form KND 1151156)

#### Current Architecture
- **Tax Snapshot Engine (`apps/api/src/documents/taxPaymentSnapshot.ts`)**:
  - `taxPaymentsForDocumentScope`: retrieves qualifying payments for a given `taxYear`, matching `patientId`, `status = 'paid'`, `amountRub > 0`, and `taxPayerInn`.
  - `taxPaymentYear(payment)` (`taxPaymentSnapshot.ts:34-41`): accurately determines the tax year by prioritizing `fiscalReceiptIssuedAt` over `paidAt`.
  - `buildTaxPaymentSnapshotForIssue`: constructs a frozen `TaxPaymentSnapshot` at the moment of document issuance, deduplicating against already issued certificates (`coveredIdentifiersForIssuedTaxCertificates`) so no receipt is claimed twice.
  - `taxPaymentSnapshotTotalRub`: aggregates totals strictly in whole kopecks using `sumKopecks` and `parseKopecks` (`taxPaymentSnapshot.ts:257-265`), eliminating binary floating-point drift.
- **FNS Electronic XML Generator (`apps/api/src/documents/taxXml.ts`)**:
  - `buildKnd1151156Xml`: compiles FNS-compliant XML for paper form KND 1151156 according to electronic format KND 1184043, Format 5.01, Order EA-7-11/824@:
    - Segregates expenses into **Code 1** (standard medical services) and **Code 2** (expensive medical treatment / дорогостоящее лечение без лимита вычета).
    - Checks taxpayer relationship: sets `ПрПациент="1"` if taxpayer is self, or `ПрПациент="0"` with nested `<Пациент>` node if paid for relative.
    - Maps identity document types (Passport 21, Birth Certificate 03, Foreign Passport 10, Residence Permit 12, Military ID 07, Other 91).
    - Internal structural preflight validator (`validateKnd1151156XmlDraft`) verifies tag balancing, KND codes, version, and attributes before emitting.
- **NDFL Calculator Endpoint (`GET /api/documents/ndfl-calculator`)** (`apps/api/src/routes/documents/ndflCalculator.ts`):
  - Aggregates paid amounts grouped by `taxDeductionCode` ("1" vs "2") for a patient and period using exact integer kopecks (`toKopecks`, `rublesFromKopecks`).

#### Identified Gaps in Tax Deduction Flow
1. ⚠️ **Tax Year Query Consistency in `ndflCalculator.ts`**:
   - `ndflCalculator.ts` queries `payments` filtered by `gte(payments.paidAt, start)` and `lte(payments.paidAt, end)`. However, `taxPaymentSnapshot.ts` derives the tax year from `fiscalReceiptIssuedAt || paidAt`. If a fiscal receipt was issued in January for a December payment (or vice-versa), `ndflCalculator.ts` can diverge from `taxPaymentSnapshot.ts`.
   - **Recommendation**: Filter `payments` in `ndflCalculator.ts` using `COALESCE(fiscal_receipt_issued_at::timestamp, paid_at)` or align query window.

---

## 3. Requirement R2: Schedule Concurrency & Chair / Doctor Overlap Prevention

### 3.1 Overlap Detection & Mathematical Interval Logic

#### Mathematical Model
Two appointment intervals $A = [A_{start}, A_{end})$ and $B = [B_{start}, B_{end})$ overlap if and only if:
$$A_{start} < B_{end} \quad \land \quad A_{end} > B_{start}$$
Back-to-back appointments (where $A_{end} = B_{start}$) satisfy $A_{start} < B_{end}$ but violate $A_{end} > B_{start}$, correctly evaluating to **no collision**.

#### Multi-Layer Enforcement
1. **Application Layer (`apps/api/src/db/appointmentsQuery.ts:117-166`)**:
   - `assertNoResourceOverlap` runs inside the database transaction:
     ```typescript
     const conditions: SQL[] = [
       eq(schema.appointments.organizationId, organizationId),
       ne(schema.appointments.status, "cancelled"),
       ne(schema.appointments.status, "no_show"),
       lt(schema.appointments.startsAt, candidate.endsAt),
       gt(schema.appointments.endsAt, candidate.startsAt),
     ];
     ```
   - Dynamically evaluates collisions across 4 resource dimensions:
     - Physical Chair: `chairId`
     - Treating Doctor: `doctorUserId`
     - Assisting Nurse/Assistant: `assistantUserId`
     - Patient: `patientId`
2. **Application Layer (`apps/api/src/routes/publicBooking.ts:907-937`)**:
   - Filters active appointments with `notInArray(appointments.status, ['cancelled', 'no_show'])` and interval conditions `lt(appointments.startsAt, endDate)` and `gt(appointments.endsAt, startDate)`.
3. **Database Engine Layer (PostgreSQL GIST Exclusion Constraints)**:
   - Enforced natively via PostgreSQL 18 `btree_gist` extension in migration `0170_schedule_4d_exclusion_hardening.sql`:
     - `appointments_chair_overlap_excl`: `EXCLUDE USING gist (chair_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (chair_id IS NOT NULL AND status NOT IN ('cancelled', 'no_show'))`
     - `appointments_doctor_overlap_excl`: `EXCLUDE USING gist (doctor_user_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (doctor_user_id IS NOT NULL AND status NOT IN ('cancelled', 'no_show'))`
     - `appointments_assistant_overlap_excl`: `EXCLUDE USING gist (assistant_user_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (assistant_user_id IS NOT NULL AND status NOT IN ('cancelled', 'no_show'))`
     - `appointments_patient_overlap_excl`: `EXCLUDE USING gist (patient_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (patient_id IS NOT NULL AND status NOT IN ('cancelled', 'no_show'))`

---

### 3.2 Concurrency Control & Row-Level Locking (`SELECT ... FOR UPDATE`)

#### Analysis of Canonical Lock Ordering (`appointmentsQuery.ts`)
In `apps/api/src/db/appointmentsQuery.ts:34-96`, `lockAppointmentResources` establishes a strict hierarchy before inserting or updating appointments:
1. **Level 1 — Chair**: `SELECT id FROM chairs WHERE organization_id = $1 AND id = $2 FOR UPDATE`
2. **Level 2 — Staff (Doctors & Assistants)**:
   - Collects all unique user IDs (`doctorUserId`, `assistantUserId`).
   - **Crucial**: Sorts user IDs lexicographically (`userIdsToLock.sort()`).
   - Locks each `users` row in sorted order with `FOR UPDATE`. This eliminates circular wait conditions (`40P01`) when two appointments swap doctor and assistant roles simultaneously.
3. **Level 3 — Patient**: `SELECT id FROM patients WHERE organization_id = $1 AND id = $2 FOR UPDATE`

#### Critical Flaw Identified: Inverted Locking in `publicBooking.ts`
- **Location**: `apps/api/src/routes/publicBooking.ts:800-905`
- **Vulnerability**:
  - In `publicBooking.ts`, `chairs` are selected **WITHOUT** `FOR UPDATE` (`publicBooking.ts:801-808`).
  - `patients` row is then locked with `FOR UPDATE` (`publicBooking.ts:898-904`).
  - `users` (doctor) row is **NEVER** locked with `FOR UPDATE`.
- **Deadlock Scenario (`40P01 deadlock detected`)**:
  - **Tx A (CRM Admin creating appointment via `appointmentsQuery.ts`)**:
    1. Locks Chair C (`chairs FOR UPDATE`).
    2. Locks Doctor D (`users FOR UPDATE`).
    3. Attempts to lock Patient P (`patients FOR UPDATE`) -> blocks if Tx B holds Patient P.
  - **Tx B (Website Visitor booking appointment via `publicBooking.ts`)**:
    1. Queries Chair C without lock.
    2. Locks Patient P (`patients FOR UPDATE`).
    3. Attempts `INSERT INTO appointments` with Doctor D and Chair C -> conflicts with Tx A's locks and index exclusion.
  - **Result**: PostgreSQL detects cyclical dependency between Tx A and Tx B, killing one transaction with error code `40P01`.

---

## 4. Technical Implementation Recommendations & Blueprint

### 4.1 Recommendation for Requirement R1

#### A. Enhance `sberbank_transactions` Schema & Migration
Add columns to `sberbank_transactions` in `apps/api/src/db/schema.ts`:
```typescript
visitId: uuid("visit_id").references(() => visits.id),
documentId: uuid("document_id").references(() => generatedDocuments.id),
invoiceId: uuid("invoice_id").references(() => patientInvoices.id),
taxDeductionCode: text("tax_deduction_code"),
```

#### B. Universal Transactional Payment Settlement Helper
Create or reuse a unified settlement function that executes within a transaction:
1. Locks `patients`, `visits` (if `visitId`), `generatedDocuments` (if `documentId`), and `patientInvoices` (if `invoiceId`).
2. Validates against overpayment (`BillingOverpaymentError`).
3. Inserts into `payments` table with full 54-FZ FFD 1.2 tags and `clientMutationId`.
4. If `documentId` is provided and document kind is payable (`payment`, `invoice`, `act`), updates `generatedDocuments.status` to `"issued"` and generates SHA-256 issue snapshot if fully covered.
5. If `visitId` is provided, decrements outstanding visit balance.

#### C. Extend Sberbank Order Registration Endpoint
Update `POST /api/sberbank/pay` in `sberbank.ts`:
- Accept optional `visitId`, `documentId`, `invoiceId`, `taxDeductionCode`, `payerFullName`, `payerInn`, `payerBirthDate`, `payerIdentityDocument`, `payerRelationship`.
- Persist these parameters in `sberbank_transactions`.
- In `POST /api/sberbank/webhook` and `GET /api/sberbank/status/:orderId`, invoke the unified settlement logic upon `deposited` / `success`.

#### D. Extend SBP QR Fiscalize Payload Schema
Update `createFiscalReceiptPayloadSchema` in `packages/shared/src/index.ts`:
- Add optional `visitId: z.string().uuid().optional().nullable()`.
- Add optional `documentId: z.string().uuid().optional().nullable()`.
- In `apps/api/src/routes/sbpQr.ts`, update linked `generatedDocuments` status to `issued` when fiscal receipt is created.

---

### 4.2 Recommendation for Requirement R2

#### Eliminate `40P01` Deadlocks in `publicBooking.ts`
Align `publicBooking.ts` with the canonical 3-tier lock hierarchy:
1. **Tier 1 (Chair)**: Lock active chairs `FOR UPDATE` ordered by `chairs.id ASC`:
   ```typescript
   const activeChairs = await tx
     .select({ id: chairs.id })
     .from(chairs)
     .where(and(eq(chairs.organizationId, organizationId), eq(chairs.isActive, true)))
     .orderBy(asc(chairs.id))
     .for("update");
   ```
2. **Tier 2 (Doctor)**: Lock the selected doctor `FOR UPDATE`:
   ```typescript
   await tx
     .select({ id: users.id })
     .from(users)
     .where(and(eq(users.organizationId, organizationId), eq(users.id, doctorId)))
     .for("update")
     .limit(1);
   ```
3. **Tier 3 (Patient)**: Lock or insert the patient `FOR UPDATE`:
   ```typescript
   await tx
     .select({ id: patients.id })
     .from(patients)
     .where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
     .for("update")
     .limit(1);
   ```
By locking in the exact sequence `chairs -> users -> patients` everywhere across the codebase, PostgreSQL deadlocks (`40P01`) are mathematically impossible.

---

## 5. Verification Matrix (ПРОВЕРЕНО / НЕ ПРОВЕРЕНО)

### ПРОВЕРЕНО
1. ✅ `npm run typecheck` passes with **0 errors** across `@dental/shared`, `@dental/api`, `@dental/web` (verified via live compiler execution).
2. ✅ Sberbank HMAC-SHA256 checksum verification (`verifySberbankChecksum`) verified against standard Sberbank v2, format 2, and urlencoded formats in `sberbankWebhook.test.ts`.
3. ✅ SBP QR CRC16-CCITT calculation and verification conforming to GOST R 56042-2014 verified in `sbpQrFiscalEngine.test.ts`.
4. ✅ 54-FZ FFD 1.2 tag mapping (Tags 1054, 1212, 1214, 1199, 2108, 1055) verified in `apps/api/src/routes/sbpQr.ts`.
5. ✅ Form KND 1151156 XML generator structure and kopeck-exact math verified in `apps/api/src/documents/taxXml.ts` and `taxXml.test.ts`.
6. ✅ 4D PostgreSQL GIST exclusion constraints (`appointments_chair_overlap_excl`, `appointments_doctor_overlap_excl`, `appointments_assistant_overlap_excl`, `appointments_patient_overlap_excl`) verified in migration `0170_schedule_4d_exclusion_hardening.sql`.
7. ✅ Schedule concurrency race prevention (409 on simultaneous chair/doctor/assistant/patient bookings) verified in `scheduleConcurrencyRace.test.ts`.

### НЕ ПРОВЕРЕНО
1. ❓ Live production HTTP webhooks from external Sberbank acquiring gateway in production environment (requires live bank merchant credentials).
2. ❓ Live production NSPK SBP mobile app QR scan execution (requires live banking app test harness).

---

## 6. Conclusion

The existing codebase contains strong, battle-tested foundations for both R1 (cryptographic HMAC checks, FFD 1.2 tag mapping, KND 1151156 XML generation) and R2 (4D GIST exclusion constraints, mathematical interval collision logic, lexicographical staff locking).

Addressing the identified architectural gaps — specifically:
1. Transmitting `visitId` and `documentId` through Sberbank acquiring orders and SBP fiscalization payloads.
2. Auto-issuing `generatedDocuments` upon transaction confirmation.
3. Aligning the row-level locking hierarchy in `publicBooking.ts` to `chairs -> users -> patients` —
will elevate the backend to 100% production-grade reliability, compliance, and deadlock-free operation.
