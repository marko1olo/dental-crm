# Handoff Report: Requirement R2 Survey (54-FZ Cashier, Sberbank Acquiring, NDFL XML 5.01, Doctor Payroll & Kopeck-Exact Math)

**Commit HEAD**: `b504376fe86287191375575428cc92bf69084463`  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_finance`  
**Scope**: Requirement R2 (54-FZ Cashier, Sberbank Acquiring Webhook & Callbacks, NDFL Certificate KND 1151156 XML 5.01, Doctor Payroll Engine, Kopeck-Exact Financial Arithmetic).

---

## 1. Observation

### A. 54-FZ Cashier & Fiscal Receipt Generation (FFD 1.2 Tags)
1. **FFD 1.2 Tag Resolvers (`apps/api/src/routes/sbpQr.ts:52-156`)**:
   - **Tag 1054** (`resolveTag1054`): Sign of calculation (`1` = `income` / Приход, `2` = `income_return` / Возврат прихода, `3` = `expense` / Расход, `4` = `expense_return` / Возврат расхода).
   - **Tag 1212** (`resolveTag1212`): Subject of calculation (`1` = `commodity` / Товар, `3` = `job` / Работа, `4` = `service` / Услуга, `10` = `payment` / Платеж).
   - **Tag 1214** (`resolveTag1214`): Payment method (`1` = `full_prepayment`, `2` = `prepayment`, `3` = `advance`, `4` = `full_payment`, `5` = `partial_payment_and_credit`, `6` = `credit_handover`, `7` = `credit_payment`).
   - **Tag 1199** (`resolveTag1199`): VAT rate (`1` = 20%, `2` = 10%, `3` = 20/120, `4` = 10/110, `5` = 0%, `6` = Без НДС по пп. 2 п. 2 ст. 149 НК РФ для медицинских услуг).
   - **Tag 2108** (`resolveTag2108`): Quantity measure (`0` = piece / шт, `10` = gram / г, `11` = kilogram / кг, `255` = other / иное).
   - **Tag 1055** (`resolveTag1055`): Taxation system / СНО (`1` = ОСН, `2` = УСН Доходы, `4` = УСН Доходы минус расходы, `8` = ЕСХН, `16` = ПСН).
   - **Additional tags in response payload**: Tag 1008 (`customerContact`), Tag 1021 (`cashierFullName`), Tag 1031 (`cashKopecks`), Tag 1081 (`electronicSumKopecks`), Tag 1215 (`prepaidKopecks`).

2. **Fiscalization Endpoint & Schema (`apps/api/src/routes/sbpQr.ts:232-524`, `packages/shared/src/index.ts:13246-13295`)**:
   - `POST /api/billing/fiscalize-receipt`: Validates input with `createFiscalReceiptPayloadSchema`, checks patient and invoice existence, executes atomic database transaction with pessimistic locking on `patientInvoices` (`FOR UPDATE`).
   - Generates fiscal data: `fn`, `fd`, `fpd` (`computeFiscalSign`), OFD verification link (`buildOfdVerificationUrl`), inserts into `payments`, creates cash ledger entry in `cashLedger`, dispatches electronic receipt via `digitalReceiptDispatches` (SMS / Email), and atomically promotes `generatedDocuments.status` to `issued`.
   - `createFiscalReceiptPayloadSchema` enforces kopeck equality:
     - `itemsSum === totalKopecks`
     - `paymentsSum === totalKopecks`
     - `item.priceKopecks * item.quantity === item.amountKopecks`

3. **NSPK SBP Dynamic B2C QR Engine (`packages/shared/src/index.ts:13300-13395`, `apps/api/src/routes/sbpQr.ts:159-230`)**:
   - `SbpQrEngine.computeCrc16Ccitt`: Pure TypeScript implementation of CRC16-CCITT (ГОСТ Р 56042-2014, polynomial 0x1021, init 0xFFFF).
   - `POST /api/billing/sbp/generate-qr`: Generates dynamic QR URL (`https://qr.nspk.ru/{operationId}?type=02&bank={bank}&sum={amountKopecks}&cur=RUB&crc={crc16}`) and renders vector SVG via `createTelegramQrSvg`.
   - `POST /api/billing/sbp/verify-payload`: Verifies authenticity and CRC16 checksum of SBP QR links.

---

### B. Sberbank Acquiring Callbacks & Webhook Processing
1. **HMAC-SHA256 Cryptographic Verification (`apps/api/src/routes/sberbank.ts:27-112`)**:
   - `verifySberbankChecksum`: Excludes signature fields (`checksum`, `sign`, `signature`, `sign_alias`), sorts keys alphabetically, computes HMAC-SHA256 against 3 standard Sberbank Acquiring API formats:
     - Standard v2: `key1;val1;key2;val2;...;`
     - Key-equal format: `key1=val1;key2=val2`
     - URL-encoded format: `key1=val1&key2=val2`
   - Compares HMACs using constant-time `timingSafeSecretEqual` to eliminate timing side-channel attacks.
   - Rejects unauthenticated/tampered requests with HTTP 400/401 with ZERO database operations.

2. **Webhook State Machine & Pessimistic Concurrency (`apps/api/src/routes/sberbank.ts:339-623`)**:
   - `POST /api/sberbank/webhook`:
     - Reads secret from `SBERBANK_WEBHOOK_SECRET || DENTE_WEBHOOK_SECRET || SBERBANK_SECRET_KEY`.
     - Validates signature before touching DB.
     - Locates transaction via `withSuperuserBypass` on `sberbankTransactions.orderId`.
     - Acquires pessimistic row lock within tenant context:
       ```sql
       SELECT * FROM sberbank_transactions WHERE order_id = $1 AND organization_id = $2 FOR UPDATE
       ```
     - Validates incoming `amount` against `lockedTx.amount`.
     - Handles transitions:
       - `refunded` -> Updates `sberbankTransactions.status = "refunded"` and `payments.status = "refunded"`.
       - `reversed` -> Updates `sberbankTransactions.status = "reversed"`.
       - `approved` -> Updates `sberbankTransactions.status = "approved"`.
       - `deposited` / `success` / `2` -> Updates `sberbankTransactions.status = "success"`, idempotently inserts into `payments` with `clientMutationId: sberbank:${lockedTx.orderId}` using `onConflictDoNothing`, atomically marks `generatedDocuments.status = "issued"` and updates `visits.updatedAt`.
       - Terminal state guard: If already `success` or `refunded`, returns `200 OK` with `processed: false, reason: "already_processed" / "already_refunded"`.
       - Failure -> Updates `sberbankTransactions.status = "failed"`.

3. **Client-Side Sberbank Terminal Modal (`apps/web/src/components/finance/SberbankTerminalPaymentModal.tsx:43-108`)**:
   - Employs synchronous `useRef(false)` in-flight lock to eliminate double-submits.
   - Initiates payment to `POST /api/sberbank/pay`.
   - Polls `GET /api/sberbank/status/:orderId` with authenticated clinic headers.

---

### C. NDFL Tax Deduction Certificate (КНД 1151156 XML 5.01)
1. **FNS XML Generator (`apps/api/src/documents/taxXml.ts:1-743`)**:
   - Implements official FNS Order No. ЕА-7-11/824@ (electronic format КНД 1184043 version 5.01, XSD `UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd`).
   - Root: `<Файл ИдФайл="UT_SVOPLMEDUSL_DENTE_{taxYear}_{docNumber}" ВерсПрог="DENTE 0.1.0" ВерсФорм="5.01">`
   - Document: `<Документ КНД="1184043" ДатаДок="ДД.ММ.ГГГГ" КодНО="XXXX" ОтчГод="ГГГГ">`
   - Organization: `<СвНП><НПЮЛ НаимОрг="..." ИННЮЛ="10_digits" КПП="9_digits"/></СвНП>` (or `<НПИП ИННФЛ="12_digits">` for IP).
   - Signer: `<Подписант ПрПодп="1"><ФИО Фамилия="..." Имя="..." Отчество="..."/></Подписант>`
   - Expenses: `<СведРасхУсл НомерСвед="..." НомКорр="0" ПрПациент="0|1" СуммаКод1="X.XX" СуммаКод2="Y.YY">`
   - Payer: `<НППлатМедУсл ИНН="12_digits" ДатаРожд="ДД.ММ.ГГГГ"><ФИО .../><СведДок .../></НППлатМедУсл>`
   - Patient: `<Пациент ...>` (included strictly when `ПрПациент="0"`, where payer != patient).
   - Math precision: `taxPaymentSumKopecks` aggregates payments in integer kopecks via `sumKopecks` and formats via `money(kopecks)` without float drift.
   - Validation: `validateKnd1151156XmlDraft` checks tag balance, notice number length (<= 12 digits), non-zero sum matching, UTF-8 validity, and absence of `undefined`/`NaN`/mojibake tokens.
   - Issue requirement: Refuses to generate XML for unissued documents (`document.issuedAt` is mandatory, preventing fabricated dates).

2. **Routes & Calculator (`apps/api/src/routes/documents/taxXml.ts:32-223`, `ndflCalculator.ts:23-99`)**:
   - `GET /api/documents/:id/tax-xml`: Returns downloadable XML or stored snapshot.
   - `GET /api/documents/ndfl-calculator`: Calculates eligible payments grouped by Code 1 (standard) and Code 2 (expensive treatment) for date range.

---

### D. Doctor Payroll Calculation Engine
1. **Single-Query CTE Engine (`apps/api/src/services/finance/doctorPayouts.ts:1-1103`)**:
   - CTE `payout_paid_visits`: Identifies visits paid in the target period.
   - CTE `payout_revenue`: Aggregates revenue through chain `payments.visit_id → visits.appointment_id → appointments.doctor_user_id`.
   - CTE `payout_materials`: Computes consumable costs from `inventory_transactions` (`auto_deduct`) for paid visits.
   - CTE `payout_lab_orders`: Computes dental lab costs from `lab_orders` (`received` / `completed`).
   - CTE `payout_rate_candidates`: Selects newest active commission rate from `doctor_commissions.commission_pct` by `user_id` ordered by `effective_from DESC, created_at DESC`.
   - CTE `payout_period_revenue`: Computes period total revenue and attributable revenue in a single query snapshot.
   - Order of operations:
     1. Accrued = `percentOfMoney(revenueRub, commissionPct)`
     2. Withheld Materials = `percentOfMoney(materialCostRub, materialDeductionPct)`
     3. Withheld Lab = `percentOfMoney(labCostRub, labDeductionPct)`
     4. Net Payout = `accrued - (withheldMaterials + withheldLab)`
   - Money precision: All percentage and subtraction math executes via `Decimal.js` (`toDecimalPlaces(2, Decimal.ROUND_HALF_UP)`).
   - Negative payouts: Preserved and explicitly explained via `payoutRowNote` and `payoutNegativeExplain.ts` (doctor debt to clinic is never zeroed out).
   - Permissions: `payroll.read` (full clinic payouts) vs `payroll.read.own` (filtered at SQL level via `onlyDoctorUserId`).

2. **Routes & UI (`apps/api/src/routes/billing.ts:431-533`, `apps/api/src/routes/settings.ts:182-270`, `apps/web/src/components/settings/StaffCommissionsPanel.tsx`)**:
   - `GET /api/billing/payouts`: Timezone-aware payroll endpoint using `resolvePeriodBoundary`.
   - `GET /api/settings/staff/commissions` & `PUT /api/settings/staff/:staffId/commission`: Commission rate management.
   - `StaffCommissionsPanel.tsx`: Interactive commission rate editor in settings.

---

### E. Kopeck-Exact Financial Arithmetic Foundation
1. **Shared Money Utils (`packages/shared/src/utils/money.ts:1-214`)**:
   - `type Kopecks = number` (safe integer).
   - Functions: `parseKopecks`, `kopecksToNumericString`, `kopecksToWholeRubles`, `sumKopecks`, `multiplyKopecks`, `percentageOfKopecks`, `splitKopecks` (distributes remainders accurately across installments), `formatKopecksRu`.
2. **Monorepo Schema Enforcement (`packages/shared/src/money.ts:1-36`, `tests/money-contract-kopecks.test.ts`)**:
   - `moneyRubSchema`, `positiveMoneyRubSchema`, `nonNegativeMoneyRubSchema` enforce 2-decimal precision (rejecting 3+ decimal fractions).

---

## 2. Logic Chain

```
[Requirement R2: Finance & Cashier Precision]
       │
       ├──> 1. 54-FZ Cashier & Fiscal Receipts
       │     ├── FFD 1.2 tags (1054, 1212, 1214, 1199, 2108, 1055) resolved accurately
       │     ├── Zod schemas enforce item sum == payment sum == totalKopecks
       │     ├── SBP Dynamic QR (CRC16-CCITT GOСТ Р 56042-2014) verified
       │     └── Overpayment guards & pessimistic locking on patient invoices
       │
       ├──> 2. Sberbank Acquiring Callbacks
       │     ├── HMAC-SHA256 signature verification across 3 standard formats
       │     ├── Constant-time string comparison (timingSafeSecretEqual)
       │     ├── Fast reject of unverified calls before touching database
       │     ├── Pessimistic row locking: SELECT ... FROM sberbank_transactions FOR UPDATE
       │     ├── State machine transitions (deposited, refunded, reversed, approved, failed)
       │     └── Idempotent payment recording via clientMutationId + onConflictDoNothing
       │
       ├──> 3. NDFL Tax Certificate (КНД 1151156 XML 5.01)
       │     ├── Conforms to FNS Order No. ЕА-7-11/824@ (КНД 1184043 XML v5.01)
       │     ├── Split by Code 1 (standard) and Code 2 (expensive treatment)
       │     ├── Pure integer kopeck aggregation (sumKopecks) -> zero float drift
       │     ├── Automatic ПрПациент="0" (taxpayer != patient) with <Пациент> sub-tree
       │     ├── Preflight validation gate rejects invalid tokens, malformed tags, mojibake
       │     └── Strict check on document.issuedAt preventing fabricated dates
       │
       └──> 4. Doctor Payroll Engine
             ├── Single-query CTE aggregate eliminating N+1 race conditions
             ├── Direct attribution: payments.visit_id -> visits.appointment_id -> doctor_user_id
             ├── Formula: Accrued (revenue * rate) - Materials (cost * rate) - Lab (cost * rate)
             ├── Decimal.js exact kopeck math with ROUND_HALF_UP
             ├── Strict SQL-level filtering for payroll.read.own vs payroll.read
             └── Negative payout explanation preventing loss of clinic receivables
```

---

## 3. Caveats

1. **Environment Configuration**:
   - Sberbank acquiring requires valid terminal credentials (`SBERBANK_TERMINAL_USER`, `SBERBANK_TERMINAL_PASSWORD` or `SBERBANK_TERMINAL_TOKEN`) and webhook secret (`SBERBANK_WEBHOOK_SECRET`). In dev mode without secrets, dev fallbacks are enabled with explicit warnings.
2. **Doctor Commission Category Specificity**:
   - Commission rates are currently configured per doctor (`doctor_commissions.commission_pct`), rather than per clinical discipline (therapy vs orthopedics vs surgery). A doctor performing both therapy and implantology uses a single unified commission rate.
3. **NDFL Tax Office Code**:
   - XML generation requires a configured 4-digit FNS tax office code (`taxOfficeCode`, e.g. "7701"). Without this configuration, the endpoint cleanly returns HTTP 409 prompting the administrator to set the clinic's tax inspection code.

---

## 4. Conclusion

### ПРОВЕРЕНО (Verified Facts & Working Components)
1. **54-FZ Cashier**: Full FFD 1.2 tag mapping (1054, 1212, 1214, 1199, 2108, 1055) in `apps/api/src/routes/sbpQr.ts` with strict schema validation in `packages/shared/src/index.ts` and automated test coverage in `apps/api/src/tests/routes/sbpQrFiscalEngine.test.ts`.
2. **Sberbank Acquiring**: HMAC-SHA256 checksum verification, `SELECT ... FOR UPDATE` pessimistic locking, terminal state handling, and idempotency protection fully implemented in `apps/api/src/routes/sberbank.ts` and verified in `apps/api/src/tests/routes/sberbankWebhook.test.ts`.
3. **NDFL Certificate XML**: KND 1151156 / KND 1184043 XML format version 5.01 generation implemented in `apps/api/src/documents/taxXml.ts` with kopeck-exact aggregation, payer/patient branch resolution, preflight schema validation, and frozen payment snapshot verification.
4. **Doctor Payroll**: High-performance single-query CTE aggregate in `apps/api/src/services/finance/doctorPayouts.ts`, `Decimal.js` rounding, materials/lab deductions, negative payout explanation, and granular permission enforcement (`payroll.read` / `payroll.read.own`).
5. **Kopeck Exactness**: Monorepo-wide integer kopeck math and Zod validators in `packages/shared/src/utils/money.ts` verified by `packages/shared/src/tests/money-contract-kopecks.test.ts`.

### НЕ ПРОВЕРЕНО (External / Runtime Production Prerequisites)
1. Production TLS webhook delivery from live Sberbank acquiring host (requires live public domain & real bank merchant contract).
2. Live physical KKT cash register hardware drivers (ATOL / Shtrikh-M physical USB/COM daemon connection; software fiscalization layer and OFD links verified).

---

## 5. Verification Method

To independently verify all surveyed components:

1. **Verify TypeScript compilation**:
   ```bash
   npm run typecheck
   ```
2. **Run SBP QR and 54-FZ Fiscal Engine tests**:
   ```bash
   node --test --import tsx apps/api/src/tests/routes/sbpQrFiscalEngine.test.ts
   ```
3. **Run Sberbank Webhook and HMAC cryptographic tests**:
   ```bash
   node --test --import tsx apps/api/src/tests/routes/sberbankWebhook.test.ts
   ```
4. **Run NDFL XML and Tax Snapshot tests**:
   ```bash
   node --test --import tsx apps/api/src/documents/taxXml.test.ts apps/api/src/documents/frozenTaxXmlPayments.test.ts
   ```
5. **Run Doctor Payroll and Negative Payout tests**:
   ```bash
   node --test --import tsx apps/api/src/services/finance/doctorPayouts.test.ts apps/api/src/services/finance/payoutNegativeExplain.test.ts
   ```
6. **Run Shared Kopeck-Exact Contract tests**:
   ```bash
   node --test --import tsx packages/shared/src/tests/money-contract-kopecks.test.ts
   ```
