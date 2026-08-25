# Handoff Report: Backend Finance & Concurrency Explorer (R1 & R2)
**Working Directory**: `C:/Clinic_MVP/dental-crm/.agents/survey_explorer_1`  
**Git HEAD**: `04f1b8ec1a119359a8f1279f729349c29eb6a5c6`  
**Date**: 2026-08-15  

---

## 1. Observation

1. **Sberbank Acquiring (`apps/api/src/routes/sberbank.ts`)**:
   - `POST /api/sberbank/pay` (lines 110–179) accepts `{ patientId, amount }` and inserts into `sberbankTransactions` (`schema.ts:3849–3870`).
   - `sberbankTransactions` schema contains only: `id`, `organizationId`, `orderId`, `amount`, `status`, `patientId`, `createdAt`, `updatedAt`.
   - `POST /api/sberbank/webhook` (lines 299–557) verifies HMAC-SHA256 signatures via `verifySberbankChecksum` (lines 22–107). On `deposited` / `success`, it inserts into `payments` table (lines 518–533) with `method: "card"`, `status: "paid"`, `amountRub`, `clientMutationId: sberbank:${lockedTx.orderId}`, but does not populate `visitId`, `documentId`, `fiscalReceiptNumber`, `fiscalReceipt`, or update `generatedDocuments` status to `issued`.

2. **SBP QR Settlement & 54-FZ FFD 1.2 (`apps/api/src/routes/sbpQr.ts`)**:
   - `POST /api/billing/sbp/generate-qr` (lines 128–177) uses `SbpQrEngine.buildNspkDynamicPayload` with CRC16-CCITT and SVG rendering via `createTelegramQrSvg`.
   - `POST /api/billing/fiscalize-receipt` (lines 203–436) maps FFD 1.2 tags:
     - Tag 1054 (`resolveTag1054`: 1 = income, 2 = income_return, 3 = expense, 4 = expense_return)
     - Tag 1212 (`resolveTag1212`: 1 = commodity, 3 = job, 4 = service, 10 = payment)
     - Tag 1214 (`resolveTag1214`: 1 = full_prepayment ... 4 = full_payment ... 7 = credit_payment)
     - Tag 1199 (`resolveTag1199`: 1 = 20% ... 6 = vat_none per Art. 149 NK RF)
     - Tag 2108 (`resolveTag2108`: 0 = piece, 10 = gram, 11 = kg, 255 = other)
     - Tag 1055 (`resolveTag1055`: 1 = OSN, 2 = USN income, 4 = USN income-expense, 8 = ESXN, 16 = PSN)
   - `createFiscalReceiptPayloadSchema` (`packages/shared/src/index.ts:13246–13293`) accepts `invoiceId`, but lacks `visitId` and `documentId`.

3. **Tax Deduction Certificates KND 1151156 (`apps/api/src/documents/taxXml.ts`, `taxPaymentSnapshot.ts`)**:
   - `buildKnd1151156Xml` (lines 565–742) generates FNS XML conforming to KND 1184043 / Format 5.01 / Order EA-7-11/824@.
   - Segregates expenses into Code 1 (standard) and Code 2 (expensive treatment) with kopeck-exact math via `sumKopecks` and `kopecksToNumericString`.
   - `taxPaymentSnapshot.ts` derives tax year via `taxPaymentYear` (`fiscalReceiptIssuedAt || paidAt`).
   - `GET /api/documents/ndfl-calculator` (`ndflCalculator.ts:23–99`) aggregates Code 1 and Code 2 sums from `payments`.

4. **Schedule Concurrency & Overlap Logic (`apps/api/src/db/appointmentsQuery.ts`, `publicBooking.ts`)**:
   - `assertNoResourceOverlap` (`appointmentsQuery.ts:117–166`) checks interval overlap $startsAt < candidate.endsAt \land endsAt > candidate.startsAt$ across `chairId`, `doctorUserId`, `assistantUserId`, `patientId`.
   - Migration `0170_schedule_4d_exclusion_hardening.sql` enforces PostgreSQL GIST exclusion constraints:
     - `appointments_chair_overlap_excl`
     - `appointments_doctor_overlap_excl`
     - `appointments_assistant_overlap_excl`
     - `appointments_patient_overlap_excl`
   - `lockAppointmentResources` (`appointmentsQuery.ts:34–96`) locks resources in strict order:
     1. `chairs` (by `chairId`)
     2. `users` (doctor & assistant, sorted lexicographically via `userIdsToLock.sort()`)
     3. `patients` (by `patientId`)
   - `publicBooking.ts` (lines 800–905) selects `chairs` without `FOR UPDATE`, locks `patients` `FOR UPDATE`, and does not lock `users` `FOR UPDATE`.

5. **Typecheck Baseline**:
   - `npm run typecheck` passed with exit code 0 across `@dental/shared`, `@dental/api`, and `@dental/web`.

---

## 2. Logic Chain

1. From Observation 1: `sberbankTransactions` schema and `POST /api/sberbank/pay` do not take or store `visitId` or `documentId`. Therefore, when Sberbank webhook receives `deposited`/`success`, the resulting payment record cannot link to the visit or document, and cannot transition `generatedDocuments.status` to `"issued"`.
2. From Observation 2: `POST /api/billing/fiscalize-receipt` correctly implements all 54-FZ FFD 1.2 tags (1054, 1212, 1214, 1199, 2108, 1055), but its input schema lacks `visitId` and `documentId` fields.
3. From Observation 3: Tax deduction certificate XML generation and kopeck-exact aggregation are fully compliant with FNS specifications, but `ndflCalculator.ts` should align its date filtering with `taxPaymentYear` logic.
4. From Observation 4: `appointmentsQuery.ts` enforces a canonical lock hierarchy (`chairs -> users (sorted) -> patients`), whereas `publicBooking.ts` locks `patients` first without locking `chairs` or `users` in that order. This divergence in row-locking sequence between concurrent administrative mutations and public online bookings creates a theoretical risk of PostgreSQL `40P01 deadlock detected` during high-concurrency races.

---

## 3. Caveats

- Live production banking callbacks from Sberbank acquiring gateway and NSPK SBP were analyzed via unit/integration tests (`sberbankWebhook.test.ts`, `sbpQrFiscalEngine.test.ts`), not live merchant bank terminals.
- No source code outside `.agents/` was modified during this read-only investigation turn.

---

## 4. Conclusion

1. **R1 Assessment**:
   - FFD 1.2 tag mapping, SBP dynamic QR (CRC16-CCITT, SVG), HMAC-SHA256 signature verification, and KND 1151156 FNS XML generation are complete, tested, and mathematically accurate.
   - Gaps to implement:
     - Add `visitId`, `documentId`, `invoiceId`, `taxDeductionCode` to `sberbank_transactions` and `createFiscalReceiptPayloadSchema`.
     - Automatically update `generatedDocuments.status` to `"issued"` and decrement visit balance upon payment deposition.
2. **R2 Assessment**:
   - Interval overlap logic $[T_{start}, T_{end})$ and 4D PostgreSQL GIST exclusion constraints (`0170`) are mathematically sound and robust.
   - Gaps to implement:
     - Standardize the `chairs (FOR UPDATE) -> users (FOR UPDATE) -> patients (FOR UPDATE)` lock order in `publicBooking.ts` to prevent `40P01` deadlocks.

---

## 5. Verification Method

To verify these findings independently:
1. Run `npm run typecheck` to verify zero type errors.
2. Run test suites:
   ```bash
   node --test apps/api/dist/tests/routes/sberbankWebhook.test.js
   node --test apps/api/dist/tests/routes/sbpQrFiscalEngine.test.js
   node --test apps/api/dist/tests/routes/scheduleConcurrencyRace.test.js
   node --test apps/api/dist/documents/taxXml.test.js
   ```
3. Inspect `apps/api/src/routes/sberbank.ts:131`, `apps/api/src/db/schema.ts:3849-3870`, `apps/api/src/routes/sbpQr.ts:203-436`, `apps/api/src/db/appointmentsQuery.ts:34-96`, and `apps/api/src/routes/publicBooking.ts:800-905`.
