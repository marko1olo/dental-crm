# R4 — MONEY PRECISION. Live measurement, 2026-07-28

Read-only recon. Runner used for every SQL number below:
`.agents/archon/recon/R4-money-precision/q.mjs` (sets `default_transaction_read_only = on`, refuses any
non-SELECT). Target: `postgresql://127.0.0.1:5432/dental_crm`, `current_setting('server_version')` =
**18.4**, `current_database()` = **dental_crm**.

Note on my instrument: **my runner does NOT register `moneyTypeParsers`**, so `numeric` arrives as a
JavaScript string in my output. That is deliberate — it lets me see the exact stored text (`"1500.50"`),
not a lossy re-render.

---

## F0 — CORRECTION: the dossier's «amountRub is an integer» paragraph is now FALSE. Zero integer money columns remain.

Command:
```
node q.mjs "select table_name||'.'||column_name, data_type from information_schema.columns
            where table_schema='public' and data_type in
            ('integer','real','double precision','bigint','smallint') order by data_type,1"
```
Printed **120 int/float columns, and not one is money.** All 111 `integer` columns are counters,
versions (optimistic-lock `version`), tooth numbers (`tooth_fdi`, `tooth_number`), minute/hour windows,
`tax_year`, row counts, quotas. All 9 `real` columns are `confidence`, `implant_diameter_mm`,
`angulation_deg`, `avg_hu_*` — clinical measurements, no money. There are **no** `double precision`,
`bigint`, `smallint` or PostgreSQL `money` columns in the schema at all.

The three tables the old audit named are all converted:

| column | live type | migration that converted it | applied_at (ledger) |
|---|---|---|---|
| `payments.amount_rub` | `numeric(12,2)` | `0131_payments_amount_kopecks.sql` | 2026-07-27T18:14:03Z |
| `treatment_items.price_rub`, `.unit_price_rub`, `.discount_rub` | `numeric(12,2)` | `0135_treatment_items_kopecks.sql` | 2026-07-28T01:21:09Z |
| `generated_documents.total_amount_rub` | `numeric(12,2)` | `0137_money_columns_kopecks.sql` | 2026-07-28T06:04:55Z |

`select count(*) from _dente_migrations` = **97**; `fd -e sql . -d 1 | wc -l` in `apps/api/drizzle` = **97**.
Ledger max = `0139_workspace_feature_flags.sql`. Nothing money-related is pending.

**Naming trap for the lead:** migrations 0131/0135/0137 are *named* `..._kopecks` but they did **not**
move to integer kopecks. They store **roubles with a scale-2 exact decimal**. `numeric(12,2)` is exact
decimal, so `0.01` is stored as exactly `0.01` — no binary float error. Anyone reading only the migration
filenames will conclude the DB holds kopeck integers and write `/100` conversions that are wrong.
Verdict: this is the correct representation, but the filenames lie about it.

---
## RUN 2 (re-derived independently; F0 above was re-verified, see V0)

### V0 — F0 re-verified by me, and it holds. Zero integer/float money columns in the live DB.
```
node q.mjs "select data_type, count(*) from information_schema.columns where table_schema='public' group by 1 order by 2 desc"
```
printed: text 570, uuid 473, timestamptz 267, **integer 111**, boolean 105, USER-DEFINED 78,
**numeric 70**, jsonb 63, varchar 18, **real 9**, timestamp 3, ARRAY 1, date 1.
`current_database()` = `dental_crm`, `server_version` = **18.4**, 146 tables, 1769 columns.
No `bigint`, no `smallint`, no `double precision`, no PostgreSQL `money` type exists in the schema.

I then asked the inverse question F0 did not: are there money-NAMED columns that are NOT numeric?
```
node q.mjs "select table_name||'.'||column_name, data_type from information_schema.columns
 where table_schema='public' and data_type <> 'numeric'
 and (column_name ~* '(rub|kopeck|amount|price|cost|balance|total|_sum|payout|salary|wage|revenue|
 deposit|debt|fee|discount|tariff|charge|commission|penalty|bonus|refund|paid|cash|money)')"
```
16 hits, **none of them money**: `users.can_manage_money` (bool), `migration_reconciliations.balanced`
(bool), 5 `total_*` row/call counters (int), 6 `*_summary` / `price_list_sync_status` / `price_id` (text),
3 `paid_at`/`paid_date` (timestamptz). **So: 100% of money in the live DB is `numeric(_,2)`. Exact
decimal. The old "amountRub is an INTEGER column" claim is dead.**

### F1 — HIGH. THE REAL MONEY DEFECT: money reaches application code as `number` for 14 columns and as `string` for 24. Same process, same request.

The DB is uniform (`numeric(_,2)` everywhere). The **ORM layer is not.** Drizzle's `numeric()` has two
modes and this schema uses both, apparently at random. Measured with
`.agents/archon/recon/R4-money-precision/exp-mode-audit.mjs` (parses all 3 schema files, 1456 column
declarations, joins them to the 70 live numeric columns):

**Arrive as JS `number` — `mode: "number"` (14):**
`payments.amount_rub` schema.ts:535 · `treatment_items.price_rub` :465 · `.unit_price_rub` :466 ·
`.discount_rub` :467 · `generated_documents.total_amount_rub` :567 · `service_catalog_items.base_price_rub`
:442 · `.price_rub` :443 · `services.base_price_rub` :2149 · `treatment_scenarios.total_rub` :481 ·
`lab_orders.price_rub` :1390 · `insurance_contracts.annual_limit_rub` :1577 ·
`migration_reconciliations.{source,loaded,quarantined}_money_total_rub` :2617-2619

**Arrive as JS `string` — no mode (24):**
`family_groups.balance` schema.ts:1724 · `cash_ledger.amount_rub` :2249 ·
`digital_receipt_dispatches.receipt_amount_rub` :1080 · `ndfl_tax_calculators.total_med_expenses_rub`
:2008 · `.deduction_amount_rub` :2009 · `.ndfl_return_rub` :2010 · `patient_invoices.total_rub` :1643 ·
`treatment_plans.total_price` :1407 · `.total_price_rub` :1405 · `treatment_plan_items_new.price` :1424 ·
`.discount` :1425 · `alternative_treatment_plans.total_cost_rub` :1193 ·
`advance_deposit_taggings.deposit_amount_rub` :1052 · `pricelist_doctor_payrolls.price_rub` :1312 ·
`.doctor_payroll_rub` :1314 · `.clinic_margin_rub` :1315 · `inventory_items.price_per_unit` :1595 ·
`.unit_cost_rub` :1597 · `inventory_transactions.unit_cost_rub` :1631 · `uis_sms_chat_quotas.cost_rub`
:2080 · `doctor_commissions.commission_percent` :1689 · `.commission_pct` :1690 ·
`.material_cost_deduction_pct` :1691 · (+ `system_ram_watchdogs.heap_total_mb`, not money)

Why this is the defect and not a style question — verified in the installed library, not from memory:
`node_modules/drizzle-orm/pg-core/columns/numeric.js:25-28` `PgNumeric.mapFromDriverValue` is
`if (typeof value === "string") return value; return String(value);` and :63-66 `PgNumericNumber` is
`if (typeof value === "number") return value; return Number(value);`.
So `moneyTypeParsers` turns `"1500.50"` into the number `1500.5`, and then the **string-mode** columns run
`String(1500.5)` → **`"1500.5"`**. The two-decimal text is destroyed on the way in.
In TypeScript `string + number` is legal and yields a string, so `family.balance + amount` compiles and
concatenates — the exact bug `scripts/check-schema-type-drift.mjs:12-15` was written to catch and does not
catch, because it compares `information_schema.data_type` only and both sides are `numeric`.

### F2 — HIGH. `check-schema-type-drift.mjs` reports "0 money drift" and that all-clear is thinner than it reads.
`node scripts/check-schema-type-drift.mjs` → `ДЕНЕЖНЫЕ КОЛОНКИ С ДРЕЙФОМ ТИПА: 0`, exit 0
(40 non-money drifts listed). Three blind spots, each verified:
1. **Scale is computed and thrown away.** `declaredNumericScale()` at :87-91 fills `meta.scale` (:118) and
   nothing ever compares it — the only test is `real.dataType === meta.expected` at :163. A money column
   declared `numeric({scale: 0})` against a live `numeric(12,2)` passes the gate silently.
2. **Precision is never even read.** My audit found **3 real precision drifts** it cannot see:
   `advance_deposit_taggings.deposit_amount_rub` DB 10 / model 12 (schema.ts:1052),
   `treatment_plan_items_new.price` DB 12 / model 10 (:1424), `.discount` DB 12 / model 10 (:1425).
3. **It parses only `apps/api/src/db/schema.ts`** (`SCHEMA_FILE` at :24), so anything declared in
   `communicationsSchema.ts` / `patientsSchema.ts` is never checked at all.
4. It compares only *declared* columns, so the 12 money columns in F3 are invisible to it by construction.
It also does not look at `mode:` at all, which is why F1 walked straight past it.

### F3 — MEDIUM. 12 money columns exist in the live DB and in NO Drizzle schema file. The ORM cannot see them.
From section C of `exp-mode-audit.mjs`, then confirmed one by one with
`rg -n "<column>" apps/api/src/db/*.ts` (7 of them return **zero hits anywhere in the schema files**):
`patient_invoices.total_amount_rub`, `.patient_amount_rub`, `.insurance_amount_rub`,
`cash_shifts.starting_balance`, `.expected_closing_balance`, `.actual_closing_balance`,
`crm_leads.expected_revenue`, `dental_lab_orders.lab_cost_amount`,
`treatment_plan_items_new.commission_amount`, `doctor_payrolls.amount_rub`,
`payment_installments.amount_rub`, `ndfl_tax_calculators.total_eligible_rub`.
`patient_invoices` is the sharp one: the DB carries **four** money columns
(`total_amount_rub` NOT NULL default 0, `patient_amount_rub` NOT NULL default 0, `insurance_amount_rub`
default 0, `total_rub` nullable) and the model declares exactly one of them, `total_rub` (schema.ts:1643).
An invoice total therefore has two possible homes and nothing keeps them equal.

### F4 — HIGH, THE HEADLINE. The API contract still forbids kopecks in 38 of 45 money fields. Not "rounds" — REJECTS.
The DB migration finished; the **shared contract did not follow it.** Counted in
`packages/shared/src/index.ts` (8236 lines):
```
rg -c -N '^\s*\w*[Rr]ub\s*:\s*z\s*\.number\(\)\s*\.int\(\)'                       -> 38
rg -c -N '^\s*\w*[Rr]ub\s*:\s*(positiveMoneyRubSchema|nonNegativeMoneyRubSchema|moneyRubSchema)' -> 5
rg -c -N '^\s*\w*[Rr]ub\s*:\s*z\.number\(\)\.(nonnegative|positive|min|max)'      -> 2
rg -c -N '^\s*\w*[Rr]ub\s*:'                                                      -> 45
```
`z.number().int()` **rejects `1500.50` with a validation error**, it does not round it. The correct
schema exists and is well built — `moneyRubSchema` at :23-25 with `kopecksAreExact` at :20-21 (which
correctly avoids `value % 0.01 === 0`, a comment at :12-13 explains why) — and it is wired to exactly
**five** fields: `basePriceRub` :1645, `priceRub` :1734, `priceMaxRub` :1735, `paymentSchema.amountRub`
:1982, `createPaymentSchema.amountRub` :4407.

So a single payment CAN carry kopecks, and almost nothing downstream of it can.

### F5 — HIGH. The parts and the total use different contracts, so the total cannot equal its parts.
`paymentSchema.amountRub` = `positiveMoneyRubSchema` (kopecks allowed, index.ts:1982), but the summary
that adds those same payments up is integer-only — `billingSummarySchema`, index.ts:2003-2011:
`totalPlannedRub`, `totalDiscountRub`, `totalPaidRub`, `totalDueRub`, `taxDeductionEligibleRub`,
`draftDocumentAmountRub`, `insuranceCoverageRub` — every one `z.number().int().nonnegative()`.
Two payments of `5400.50` sum to `10801.00` (integer, passes) but one payment of `5400.50` sums to
`5400.5` and **fails the summary schema**. The parts are exact and the aggregate refuses to hold them.

### F6 — HIGH. A live `Math.round` on the patient's debt, justified by a comment that is now factually false.
`apps/web/src/useAppLogic.tsx:5130-5135`:
```ts
// Долг — целое число рублей: ровно так его принимает поле оплаты
// и колонка payments.amount_rub (integer).
totalDueRub: Math.max(0, Math.round(totalPlannedRub - insuranceCoverageRub - totalPaidRub)),
```
Both premises are dead. `payments.amount_rub` is `numeric(12,2)` (measured, V0/F1) and the payment field
accepts kopecks (`createPaymentSchema.amountRub` = `positiveMoneyRubSchema`, index.ts:4407). A debt of
`5400.50` is displayed and paid as `5400` — the practice silently forgives 50 kopecks, or overcharges,
depending on which way the half rounds. Same file :5112
`insuranceCoverageRub += Math.round((treatmentLineTotal(item) * pct) / 100)` rounds insurance coverage to
**whole roubles per line**; the accompanying comment defends per-line rounding (correct) but rounds to the
wrong unit now that kopecks exist.

### F7 — HIGH. There is a correct, exact-kopeck money library. Two production files use it. Zero on the frontend, zero on the document paths.
`packages/shared/src/utils/money.ts` (199 lines) is genuinely good work: integer kopecks only,
`parseKopecks` parses by regex rather than `parseFloat` (:53-76), `splitKopecks` guarantees the parts sum
to the whole (:161-176), `percentageOfKopecks` takes basis points to avoid a fractional multiplier
(:140-151), `assertWholeKopecks` throws if a float ever got in (:190-199), `formatKopecksRu` (:179-188).
It is exported from the barrel (`index.ts:8235`).
```
rg -l 'parseKopecks|kopecksToNumericString|sumKopecks|splitKopecks|formatKopecksRu|percentageOfKopecks|multiplyKopecks|rublesToKopecks|kopecksToWholeRubles'
  --glob '!**/node_modules/**' --glob '!**/dist/**' .
```
Production importers: **`apps/api/src/routes/finance_family.ts` and
`apps/api/src/services/biAnalyticsWorker.ts`. That is all.** (`apps/api/src/db/schema.ts:1722` is a
comment mentioning it, not an import. The rest of the hits are the module itself, its test, and
`scratch/`.) No `apps/web` file imports it; no document-rendering file imports it.

### F8 — MEASURED. What the two Drizzle modes really hand to app code, on real rows.
`node .agents/archon/recon/R4-money-precision/exp-drizzle-modes.mjs` — real `payments` rows, real `pg`,
real `drizzle-orm`, the real parser, one deterministic `ORDER BY` on all three reads with a row-identity
assertion so the columns cannot be mis-aligned:
```
stored text | raw driver value | drizzle mode:number | drizzle default (string)
5400.00     | number 5400      | number 5400         | string "5400"
7200.00     | number 7200      | number 7200         | string "7200"
14800.00    | number 14800     | number 14800        | string "14800"
```
**The two-decimal form does not survive either path.** `"14800.00"` in the database becomes the number
`14800` or the string `"14800"` in application code. So `schema.ts:1717-1722`, which says the driver
returns `"150.50"` and reasons from that, describes a shape that no longer occurs: the string it will
actually see is `"150.5"`. Any code that assumes two decimals in that string — a `split(".")[1].length`
check, a raw-string equality in an idempotency comparison, a printed receipt line — is reasoning about a
value that does not arrive.
Also measured: `parseKopecks` survives all of it (`"1500.50"`, `"1500.5"` and `1500.5` all give `150050`)
and correctly **throws** on `"1500.005"`. The library is not the weak link; its absence is.

### F9 — HIGH. The family wallet refuses kopecks on a premise that is false, while its own arithmetic is exact.
`apps/api/src/routes/finance_family.ts:22-26`:
```ts
// The payments ledger stores whole rubles (integer column), so a family-wallet
// payment must be an integer too. ...
amountRub: z.number().int().positive(),
```
and :47-49 for the top-up (`z.number().int().positive().max(10_000_000)`, comment
«Баланс хранится в целых рублях (integer)»). Both premises are false: `payments.amount_rub` and
`family_groups.balance` are both `numeric(12,2)` (measured V0/F1).
The irony is that this is the **one route that does money correctly** — :469-476 is
`parseKopecks(family.balance)`, `rublesToKopecks(payload.amountRub)`, `kopecksToNumericString(...)`,
exact integer kopecks throughout, and :605-606 the same on top-up. Only the door is nailed shut.
**Coordination note for the build packet:** relaxing the Zod schema alone will make this route throw 500 —
`rublesToKopecks` deliberately throws on a non-integer (`money.ts:80-82`). The two changes must land
together, with `rublesToKopecks` swapped for `parseKopecks` at :470 and :606.

### F10 — HIGH, WORST DEFECT FOUND. A strict float equality gates the issuing of a fiscal payment receipt.
`apps/api/src/documents/renderDocument.ts:1261-1264`, inside `paymentReceiptSelectionBlockReason`:
```ts
const actualTotalRub = selectedPayments.reduce((total, payment) => total + payment.amountRub, 0);
if (actualTotalRub !== payload.totalPaidRub) {
  return `Платежная квитанция: сумма ${payload.totalPaidRub} руб. не совпадает с выбранными оплатами ${actualTotalRub} руб.`;
```
Wired live, not dead code: `documentIssueBlockReasonRaw` (:3805) calls it at :3841;
`documentIssueBlockReason` (:3896) is imported by `routes/documents.ts:927`,
`routes/documents/taxXml.ts:102`, `routes/documents/pdf.ts`, `routes/documents/create.ts`,
`routes/documents/void.ts`.
Measured with `exp-float-drift.mjs` — **3 of 7 realistic price sets drift**, e.g.
`[100.10, 200.20, 300.30]` → float reduce `600.5999999999999` vs exact `600.60`;
`10 × 1010.10` → `10101.000000000002` vs exact `10101`;
`20 × 55.55` → `1110.9999999999995` vs exact `1111`.
The last two are the vicious ones: the exact total is a whole number, so `payload.totalPaidRub`
(`z.number().int().positive()`, index.ts:2953) is perfectly valid, and the receipt is **still blocked** —
with the message «сумма 10101 руб. не совпадает с выбранными оплатами 10101.000000000002 руб.»
shown to the user. That is simultaneously a money defect and a §3 violation.
Same pattern, same file, same function, on the refund cap at :3865:
`refundPayload.amountRub > paidTotalRub` where `paidTotalRub` is the drifting float reduce from :3860 —
a refund of the full 1111 ₽ is refused because the sum of its own parts came to 1110.9999999999995.

### F11 — HIGH. The tax deduction certificate's total is a float reduce, and it is what gets stored and printed.
`apps/api/src/documents/taxPaymentSnapshot.ts:174-176`:
```ts
export function taxPaymentSnapshotTotalRub(snapshot: TaxPaymentSnapshot): number {
  return snapshot.payments.reduce((total, payment) => total + payment.amountRub, 0);
}
```
Its single caller is `apps/api/src/routes/documents.ts:335`,
`totalAmountRub: taxPaymentSnapshotTotalRub(snapshot)` inside `taxSnapshotDocument()` (:331-338) — so the
drifted float becomes the document's `totalAmountRub`, which is the `mode:"number"` column
`generated_documents.total_amount_rub` (schema.ts:567). PostgreSQL will round it to 2 places on the way
into `numeric(12,2)`, so the *stored* row self-heals; the value used for the rendered HTML, the PDF and
therefore the SHA-256 `issued_snapshot_sha256` does not.
Every other document total is the same construction — `renderDocument.ts:680`, `:723`, `:885`, `:1261`,
`:2321`, `:3860` are all `reduce((total, x) => total + x.amountRub, 0)`.
`packages/shared/src/utils/money.ts` has `sumKopecks` for exactly this and it is not used here (F7).

### F12 — HIGH. The printed money formatter on legal documents cannot show kopecks reliably. Two decimals are never guaranteed.
`apps/api/src/documents/renderDocument.ts:57-59` — the formatter used by every `row("...", rub(...))` on
every printed form:
```ts
function rub(value: number | null) {
  return value === null ? "не указана" : `${value.toLocaleString("ru-RU")} руб.`;
}
```
`Number.prototype.toLocaleString` with no options defaults to `maximumFractionDigits: 3` and
`minimumFractionDigits: 0`. Measured on node v24.13.0, full ICU:
```
5400               -> "5 400 руб."          (no kopecks at all)
5400.5             -> "5 400,5 руб."        (ONE decimal on a fiscal document)
5400.05            -> "5 400,05 руб."
600.5999999999999  -> "600,6 руб."          (drift silently hidden)
1110.9999999999995 -> "1 111 руб."
```
So one document can print «5 400 руб.», «5 400,5 руб.» and «5 400,05 руб.» for three lines that are all
`numeric(12,2)`. A справка для налогового вычета and a 54-ФЗ receipt must read `5 400,00`.
`formatKopecksRu` (money.ts:179-188) already produces `1 500,50 ₽` correctly, with a non-breaking space
and a typographic minus, and is not imported here.

### F13 — HIGH. The document money guard tolerates a one-kopeck error at some prices and rejects it at others. It depends on the magnitude.
`apps/api/src/documents/guards.ts` is the best money code in the document layer — :641-643 and :645-649
round to kopecks correctly with `Math.round(x * 100) / 100`, and :657 / :671 compare with a tolerance
instead of `===`. But the tolerance is `Math.abs(line.totalRub - expectedTotalRub) > 0.01`, i.e. **"more
than one kopeck"**, evaluated in binary floating point. Measured with `exp-tolerance.mjs`, injecting the
same exactly-one-kopeck discrepancy at ten magnitudes:
```
total        declared   diff (float)              caught?
1.00         1.01       0.010000000000000009      caught
10.00        10.01      0.009999999999999787      MISSED — 1 kopeck accepted
100.00       100.01     0.010000000000005116      caught
1000.00      1000.01    0.009999999999990905      MISSED — 1 kopeck accepted
5400.00      5400.01    0.010000000000218279      caught
26500.00     26500.01   0.00999999999839929       MISSED — 1 kopeck accepted
100000.00    100000.01  0.00999999999476131       MISSED — 1 kopeck accepted
caught 6, MISSED 4 of 10
```
`5400.00` and `26500.00` are both real values in the live `treatment_items.price_rub` — so this is not a
contrived magnitude. A document whose lines sum to one kopeck less than its stated total is accepted at
26 500 ₽ and rejected at 5 400 ₽.
And in the same file, :682-687 `plannedFactsTotalMismatchReason` drops the tolerance entirely and uses
**`payloadTotalRub !== facts.plannedAmountRub`** — strict float equality, the F10 defect again.

### F14 — MEDIUM. The screen money formatter was fixed for exactly this bug. The legal-document formatter was not.
`apps/web/src/AppHelpers.tsx:2509-2530` — `money()` — is correct and its own comment names the defect:
> «Раньше стоял голый toLocaleString без указания знаков: 1500,5 выводилось как «1 500,5 ₽» — для денег
> это неверная запись, полтинник читается как пять копеек.»
It now sets `minimumFractionDigits`/`maximumFractionDigits` explicitly (:2526-2529) and tolerates a string
input (:2522) because numeric columns used to arrive as strings.
**`apps/api/src/documents/renderDocument.ts:57-59` `rub()` is still the bare `toLocaleString` that comment
condemns** — and it is the one printing contracts, acts, receipts and the tax certificate. Usage:
`rg -c '\bmoney\(' apps/web/src` = **87** call sites on the fixed formatter;
`rg -c '\brub\(' apps/api/src/documents/renderDocument.ts` = **53** call sites on the broken one.
The fix was applied to the screen and not to the paper.

### F15 — INFO / CORRECTS AN ASSUMPTION. There is no 54-ФЗ fiscal receipt path to audit. DENTE does not issue fiscal receipts.
My packet asked me to check the fiscal receipt for rounding. It cannot round what it does not compute.
- `digital_receipt_dispatches` (`receipt_amount_rub numeric(12,2) NOT NULL`, schema.ts:1080) has **no
  writer**: `rg -n 'digitalReceiptDispatches|digital_receipt_dispatches' apps/api/src` returns exactly two
  hits — the table declaration at schema.ts:1072 and a comment. `receiptAmountRub` appears in the whole
  repo **once**, its own declaration. Live row count **0**.
- The comment is `apps/api/src/routes/clinical.ts:388-393` and it is honest:
  «Маршрут «отправка электронных чеков» удалён вместе со своим экраном: таблица
  digital_receipt_dispatches пуста всегда, чеки никуда не уходят — драйвера кассы в системе нет.»
  `advance_deposit_taggings` is documented the same way at :381-385, also 0 rows.
- What exists instead is a **manually typed** receipt number: `createPaymentSchema.fiscalReceiptNumber`
  (`z.string().trim().max(120).nullable().optional()`, index.ts:4409) plus `fiscalReceiptDetailsSchema`.
So the only DENTE-computed "receipt" is the `payment_receipt` **document** (a client-facing квитанция),
whose total is the strict-float-equality defect F10. Recording the absence as DEBT per §10 rather than
inventing a fiscal contract: **no ККТ/ОФД driver exists, so no 54-ФЗ amount is generated by this system.**

### F16 — MEDIUM. No «сумма прописью» anywhere. Russian financial paperwork expects it.
`rg -n -i 'прописью|amountInWords|numberToWords|rublesInWords|inWords' apps/api/src apps/web/src packages/shared/src`
returns **zero hits**. Contracts and cash documents in Russian practice carry the amount in words next to
the figure. Recorded as DEBT, not invented: no schema field or template slot for it exists either.

### F17 — HIGH, WORST FOR THE TARGET USER. Data import deliberately rounds every payment and every service price to whole roubles, having already computed the exact kopecks.
`apps/api/src/migration/rowTransform.ts:372-385`:
```ts
case "service.priceRub":
case "payment.amountRub": {
  /** В боевую колонку идут целые рубли — она так объявлена. ... */
  apply(field, column.sourceColumn, rawValue, normalizeMoneyRubles(rawValue), ...);
  const exact = normalizeMoneyValue(rawValue);          // <- exact kopecks, right here
  if (exact.value !== null) values[...] = exact.value;  // <- saved to normalized_json, not to the column
```
`normalizeMoneyRubles` is `apps/api/src/migration/valueNormalize.ts:887-895` and its final line is
`const rubles = Math.round(kopecks.value / 100)`. Its docstring :872-885 states the reason outright:
> «Колонка payments.amount_rub объявлена целыми рублями … Значит, «23 400,50» из чужой базы физически не
> влезает в неё без потери пятидесяти копеек.»
**`payments.amount_rub` is `numeric(12,2)`** (measured V0/F1). The premise is dead, the rounding is not.
Live, not dead code: `rowTransform.ts:379` and `:389` are the only callers and `rowTransform` is the import
row pipeline. So a solo dentist migrating a history out of another CRM loses the kopecks on **every payment
and every price**, while the exact value sits in `normalized_json` one line away.
To its credit the subsystem makes the loss *visible* rather than silent — a `round-kopecks-to-rubles`
transform tag (:894) and a reconciliation that names the difference. That machinery is now unnecessary.
Related, lower: `apps/api/src/migration/reconcile.ts:417`
`sourceMoneyTotalRub: Math.round(input.sourceMoneyTotalKopecks / 100)` rounds the reconciliation total for
readability into `migration_reconciliations.source_money_total_rub`, a `numeric(12,2)` that could hold it
exactly; same at :176-178.

### F18 — MEDIUM. Price-list import silently truncates kopecks. (I first read this as a 100× bug; it is not, and I am recording the correction.)
`apps/api/src/pricelist/analyzer.ts:353-358`:
```ts
const normalized = value.replace(/[^\d]/g, "");   // strips the decimal separator too
...
return ... price >= 300 && price <= 2_000_000 ? Math.round(price) : null;
```
Read alone, `parseMoney("5400,00")` returns **540000** — a 100× inflation. **That path is not reachable**:
the only two callers are :367-368 with `match[1]`/`match[2]` from the `priceRegex` at :364-365, whose
capture group `(\d{1,3}(?:[\s.]\d{3})+|\d{3,7})` cannot contain a decimal comma. I measured the real
reachable behaviour by running the actual regex over realistic price lines:
```
Лечение кариеса 5400,00 руб.  => captures "5400"    -> 5400
Имплантация 26 500,50 ₽       => captures "26 500"  -> 26500   (50 kop lost)
Коронка 12345,67 руб.         => captures "12345"   -> 12345   (67 kop lost)
Гигиена 1 500.50 руб          => captures "1 500"   -> 1500    (50 kop lost)
```
So the defect is **kopeck truncation on price-list import**, not inflation. Worth fixing because the
destination is one of the only five kopeck-exact contract fields (`priceRub: nonNegativeMoneyRubSchema`,
index.ts:1734) — the importer is the bottleneck, not the schema. `Math.round(price)` at :358 is a no-op
given the regex.

### F19 — LOW/MEDIUM. `parseFloat` on money values reaching the screen, including the family wallet balance.
`money.ts:15` states the doctrine («без parseFloat: "150.50" → 15050 точно»). These ignore it, and each
reads a **string-mode** column (F1) so the value it gets is already `"150.5"`, not `"150.50"`:
- `apps/web/src/components/patients/PatientFamilyCard.tsx:149` —
  `{parseFloat(familyData.balance).toLocaleString("ru-RU")} ₽` — the family wallet balance, `parseFloat`
  plus the bare `toLocaleString` that `AppHelpers.tsx:2513` condemns. A balance of 150.50 ₽ prints as
  «150,5 ₽».
- `apps/web/src/components/inventory/useInventoryLogic.ts:396` `parseFloat(formData.unitCostRub)` and
  `:543` `parseFloat(item.unitCostRub || "0")` — `inventory_items.unit_cost_rub`, string mode.
- `apps/web/src/components/plan/ComparativePlannerDashboard.tsx:425` `price: parseFloat(r.price) || 0`,
  and `:858` `insuranceCoverage = Math.round((total * avgPct) / 100)` — coverage to whole roubles.
- `apps/web/src/PaymentCapture.tsx:346` `downPayment = Math.round((totalAmount * downPaymentPercent) / 100)`
  — the down payment of an installment schedule rounded to whole roubles; `splitKopecks` (money.ts:161)
  exists precisely for this and is not used.

### F20 — MEDIUM. Patient debt for dunning is summed exactly in SQL and then subtracted in JS float.
`apps/api/src/services/communications/audience.ts:198-226` `debtByPatient` does the right thing for the
hard part — both aggregates are `::numeric(12,2)` computed in PostgreSQL (:200, :214), and the comment at
:208-213 shows an earlier `::int` was removed *because* migration 0135 gave prices kopecks. Then :223
`const debt = Number(row.total) - (paid.get(row.patientId) ?? 0);` and `:224 if (debt > 0)` finish the job
in binary float. Equal values still cancel exactly, so this does not spuriously dun a paid-up patient;
what it does produce is a debt figure like `0.10000000000000853` flowing on to whoever formats it.


## DELIVERABLE 1 — COMPLETE LIVE MONEY COLUMN INVENTORY (all 70 numeric columns, nothing sampled)

Generated by `.agents/archon/recon/R4-money-precision/exp-inventory.mjs` against
`dental_crm` on `127.0.0.1:5432` (PostgreSQL 18.4). Row counts are exact `count(*)`, not estimates.
**Every money column in this database stores ROUBLES with an exact 2-decimal scale. None stores kopecks as an integer,
and none is `integer`, `real`, `double precision` or PostgreSQL `money`.**

### 1a. Money (46 columns)
| # | table.column | live type | app type via Drizzle | declared at | rows |
|---|---|---|---|---|---|
| 1 | `advance_deposit_taggings.deposit_amount_rub` | numeric(10,2) | `string` | schema.ts:1052 | 0 |
| 2 | `alternative_treatment_plans.total_cost_rub` | numeric(12,2) | `string` | schema.ts:1193 | 0 |
| 3 | `cash_ledger.amount_rub` | numeric(12,2) | `string` | schema.ts:2249 | 0 |
| 4 | `cash_shifts.actual_closing_balance` | numeric(12,2) | **NOT IN THE ORM** | — | 0 |
| 5 | `cash_shifts.expected_closing_balance` | numeric(12,2) | **NOT IN THE ORM** | — | 0 |
| 6 | `cash_shifts.starting_balance` | numeric(12,2) | **NOT IN THE ORM** | — | 0 |
| 8 | `crm_leads.expected_revenue` | numeric(12,2) | **NOT IN THE ORM** | — | 0 |
| 9 | `dental_lab_orders.lab_cost_amount` | numeric(12,2) | **NOT IN THE ORM** | — | 0 |
| 12 | `digital_receipt_dispatches.receipt_amount_rub` | numeric(12,2) | `string` | schema.ts:1080 | 0 |
| 16 | `doctor_payrolls.amount_rub` | numeric(12,2) | **NOT IN THE ORM** | — | 0 |
| 17 | `family_groups.balance` | numeric(12,2) | `string` | schema.ts:1724 | 0 |
| 18 | `generated_documents.total_amount_rub` | numeric(12,2) | `number` | schema.ts:567 | 4 |
| 20 | `insurance_contracts.annual_limit_rub` | numeric(12,2) | `number` | schema.ts:1577 | 0 |
| 27 | `inventory_items.price_per_unit` | numeric(10,2) | `string` | schema.ts:1595 | 0 |
| 28 | `inventory_items.unit_cost_rub` | numeric(12,2) | `string` | schema.ts:1597 | 0 |
| 30 | `inventory_transactions.unit_cost_rub` | numeric(12,2) | `string` | schema.ts:1631 | 0 |
| 31 | `lab_orders.price_rub` | numeric(12,2) | `number` | schema.ts:1390 | 0 |
| 32 | `migration_reconciliations.loaded_money_total_rub` | numeric(12,2) | `number` | schema.ts:2618 | 4 |
| 33 | `migration_reconciliations.quarantined_money_total_rub` | numeric(12,2) | `number` | schema.ts:2619 | 4 |
| 34 | `migration_reconciliations.source_money_total_rub` | numeric(12,2) | `number` | schema.ts:2617 | 4 |
| 35 | `ndfl_tax_calculators.deduction_amount_rub` | numeric(12,2) | `string` | schema.ts:2009 | 0 |
| 36 | `ndfl_tax_calculators.ndfl_return_rub` | numeric(12,2) | `string` | schema.ts:2010 | 0 |
| 37 | `ndfl_tax_calculators.total_eligible_rub` | numeric(12,2) | **NOT IN THE ORM** | — | 0 |
| 38 | `ndfl_tax_calculators.total_med_expenses_rub` | numeric(12,2) | `string` | schema.ts:2008 | 0 |
| 40 | `patient_invoices.insurance_amount_rub` | numeric(12,2) | **NOT IN THE ORM** | — | 0 |
| 41 | `patient_invoices.patient_amount_rub` | numeric(12,2) | **NOT IN THE ORM** | — | 0 |
| 42 | `patient_invoices.total_amount_rub` | numeric(12,2) | **NOT IN THE ORM** | — | 0 |
| 43 | `patient_invoices.total_rub` | numeric(12,2) | `string` | schema.ts:1643 | 0 |
| 44 | `payment_installments.amount_rub` | numeric(12,2) | **NOT IN THE ORM** | — | 0 |
| 45 | `payments.amount_rub` | numeric(12,2) | `number` | schema.ts:535 | 8 |
| 46 | `pricelist_doctor_payrolls.clinic_margin_rub` | numeric(10,2) | `string` | schema.ts:1315 | 0 |
| 48 | `pricelist_doctor_payrolls.doctor_payroll_rub` | numeric(10,2) | `string` | schema.ts:1314 | 0 |
| 49 | `pricelist_doctor_payrolls.price_rub` | numeric(10,2) | `string` | schema.ts:1312 | 0 |
| 51 | `service_catalog_items.base_price_rub` | numeric(12,2) | `number` | schema.ts:442 | 0 |
| 52 | `service_catalog_items.price_rub` | numeric(12,2) | `number` | schema.ts:443 | 0 |
| 53 | `services.base_price_rub` | numeric(10,2) | `number` | schema.ts:2149 | 0 |
| 60 | `treatment_items.discount_rub` | numeric(12,2) | `number` | schema.ts:467 | 10 |
| 61 | `treatment_items.price_rub` | numeric(12,2) | `number` | schema.ts:465 | 10 |
| 63 | `treatment_items.unit_price_rub` | numeric(12,2) | `number` | schema.ts:466 | 10 |
| 64 | `treatment_plan_items_new.commission_amount` | numeric(12,2) | **NOT IN THE ORM** | — | 0 |
| 65 | `treatment_plan_items_new.discount` | numeric(12,2) | `string` | schema.ts:1425 | 0 |
| 66 | `treatment_plan_items_new.price` | numeric(12,2) | `string` | schema.ts:1424 | 0 |
| 67 | `treatment_plans.total_price` | numeric(12,2) | `string` | schema.ts:1407 | 0 |
| 68 | `treatment_plans.total_price_rub` | numeric(12,2) | `string` | schema.ts:1405 | 0 |
| 69 | `treatment_scenarios.total_rub` | numeric(12,2) | `number` | schema.ts:481 | 0 |
| 70 | `uis_sms_chat_quotas.cost_rub` | numeric(10,2) | `string` | schema.ts:2080 | 0 |

### 1b. Percentages that multiply money (8) — a float percent produces wrong kopecks just as reliably as a float sum
| # | table.column | live type | app type via Drizzle | declared at | rows |
|---|---|---|---|---|---|
| 13 | `doctor_commissions.commission_pct` | numeric(5,2) | `string` | schema.ts:1690 | 0 |
| 14 | `doctor_commissions.commission_percent` | numeric(5,2) | `string` | schema.ts:1689 | 0 |
| 15 | `doctor_commissions.material_cost_deduction_pct` | numeric(5,2) | `string` | schema.ts:1691 | 0 |
| 21 | `insurance_contracts.coverage_hygiene_pct` | numeric(5,2) | `number` | schema.ts:1576 | 0 |
| 22 | `insurance_contracts.coverage_ortho_pct` | numeric(5,2) | `number` | schema.ts:1575 | 0 |
| 23 | `insurance_contracts.coverage_surgery_pct` | numeric(5,2) | `number` | schema.ts:1574 | 0 |
| 24 | `insurance_contracts.coverage_therapy_pct` | numeric(5,2) | `number` | schema.ts:1573 | 0 |
| 47 | `pricelist_doctor_payrolls.doctor_payroll_percent` | numeric(4,2) | `string` | schema.ts:1313 | 0 |

### 1c. Non-money numerics, listed so the inventory is provably complete (16)
| # | table.column | live type | app type via Drizzle | declared at | rows |
|---|---|---|---|---|---|
| 7 | `confirmation_performance_reports.conversion_rate_percent` | numeric(5,2) | `string` | schema.ts:1182 | 0 |
| 10 | `diagnocat_ai_findings.ai_confidence_score` | numeric(4,2) | **NOT IN THE ORM** | — | 0 |
| 11 | `diagnocat_ai_findings.confidence_score` | numeric(4,3) | `string` | schema.ts:1898 | 0 |
| 19 | `ingested_patients_mapping.confidence_score` | numeric(5,4) | **NOT IN THE ORM** | — | 0 |
| 25 | `inventory_items.current_qty` | numeric(10,3) | `string` | schema.ts:1589 | 0 |
| 26 | `inventory_items.min_qty` | numeric(10,3) | `string` | schema.ts:1592 | 0 |
| 29 | `inventory_transactions.qty` | numeric(10,3) | `string` | schema.ts:1628 | 0 |
| 39 | `patient_duplicate_merge_queues.match_score` | numeric(5,4) | `string` | schema.ts:1836 | 0 |
| 50 | `procedure_material_rules.required_qty` | numeric(12,4) | `string` | schema.ts:1755 | 0 |
| 54 | `sterilization_logs.pressure_bar` | numeric(4,2) | `string` | schema.ts:1769 | 0 |
| 55 | `sterilization_logs.temperature_celsius` | numeric(5,1) | `string` | schema.ts:1768 | 0 |
| 56 | `system_ram_watchdogs.external_mb` | numeric(8,2) | `string` | schema.ts:1786 | 0 |
| 57 | `system_ram_watchdogs.heap_total_mb` | numeric(8,2) | `string` | schema.ts:1784 | 0 |
| 58 | `system_ram_watchdogs.heap_used_mb` | numeric(8,2) | `string` | schema.ts:1783 | 0 |
| 59 | `system_ram_watchdogs.rss_mb` | numeric(8,2) | `string` | schema.ts:1785 | 0 |
| 62 | `treatment_items.quantity` | numeric(10,2) | `string` | schema.ts:458 | 10 |

Total: 46 + 8 + 16 = 70 numeric columns. Cross-check: `select count(*) from information_schema.columns where table_schema='public' and data_type='numeric'` = 70.

### F21 — MEDIUM. `treatment_plans` has two total columns; one is written, the other is permanently NULL, and `schema.ts` calls them an alias.
`apps/api/src/db/schema.ts:1405-1407`:
```ts
totalPriceRub: numeric("total_price_rub", { precision: 12, scale: 2 }),
// alias — some routes call it totalPrice
totalPrice: numeric("total_price", { precision: 12, scale: 2 }),
```
They are **two distinct physical columns**, not an alias — writing one does not populate the other. The
comment is actively dangerous. The only writer is `apps/api/src/routes/odontogram.ts:442`, `:466`, `:516`
and it writes `total_price` only, so `total_price_rub` is NULL forever.
The web side already knows: `apps/web/src/components/PatientPortal.tsx:47` reads
`rubFromDbValue(row.totalPrice) ?? rubFromDbValue(row.totalPriceRub)` and the comment at :38-42 spells out
why («записывает план единственный маршрут (routes/odontogram.ts) и только в total_price»). A defensive
`??` across two columns is a workaround for a schema defect, not a fix.
The writer's own total is a float reduce with a multiply — `odontogram.ts:402-406`
`sum + Math.max(0, item.price * item.quantity - item.discount)`.
Same duplicate-pair shape elsewhere, each a place where two representations can disagree:
`doctor_commissions.commission_pct` / `.commission_percent`, `patient_invoices.total_rub` /
`.total_amount_rub` / `.patient_amount_rub` / `.insurance_amount_rub` (F3),
`inventory_items.price_per_unit` / `.unit_cost_rub`, `service_catalog_items.base_price_rub` / `.price_rub`.

### F22 — MEDIUM. The exact-kopeck library cannot express this schema's line totals. `multiplyKopecks` refuses a fractional quantity.
`packages/shared/src/utils/money.ts:122-131`:
```ts
/** Цена за единицу × количество. Количество обязано быть целым. */
export function multiplyKopecks(unit: Kopecks, quantity: number): Kopecks {
  ...
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error(...)
```
But `treatment_items.quantity` is `numeric(10,2)` and fractional quantities are *intended* — the comment at
`apps/api/src/services/communications/audience.ts:208-213` says so explicitly («Количество объявлено
numeric(10,2) — половина услуги, треть курса»). Live rows currently all hold `1.00`.
So any build packet that tries to route line totals through the correct library will hit a thrown error on
the first half-service. And a rounding decision is genuinely unavoidable there, measured:
```
0.5  x 26500.50 = 13250.25   whole kopecks
0.33 x   100.10 = 33.033     NOT a whole number of kopecks
0.25 x   999.99 = 249.9975   NOT a whole number of kopecks
```
`guards.ts:642` already makes that decision (round to nearest kopeck) without naming it as a policy.
**The library needs a `multiplyKopecksByQuantity(unit, qty, rounding)` that states its policy;** that is
part of the fix, not an obstacle to it.

---

## DELIVERABLE 2 — REPLACEMENT PARAGRAPH FOR `.agents/archon/RECON_DOSSIER.md`
Paste this over the stale «`amountRub` is an INTEGER column» paragraph.

> **MONEY PRECISION — corrected 2026-07-28 by recon R4 against the live database.**
> The old claim that `amountRub` is an `integer` column in `payments`, `treatment_items` and
> `generated_documents`, so every kopeck is rounded, is **false and must not be repeated.** Measured on
> `dental_crm` / PostgreSQL 18.4: **all 70 `numeric` columns are the only numeric-money storage in the
> schema, every money column is `numeric(_,2)`, and there are zero `integer`, `real`, `double precision`,
> `bigint` or PostgreSQL `money` money columns** — the 111 `integer` and 9 `real` columns are counters,
> versions, tooth numbers and clinical measurements. `apps/api/drizzle/0131_payments_amount_kopecks.sql`
> and its siblings landed. **Naming trap: those migrations are called `..._kopecks` but they did NOT move
> to integer kopecks — they store roubles at scale 2.** Anyone who writes a `/100` conversion from the
> filename will be wrong by a factor of 100. **The database layer is now correct and is not the problem.**
>
> The problem moved up one level, and it is worse than rounding:
> 1. **The shared contract still forbids kopecks in 38 of 45 `*Rub` fields** (`z.number().int()`), so a
>    kopeck amount is **rejected with a validation error**, not rounded. The correct
>    `moneyRubSchema`/`kopecksAreExact` exists at `packages/shared/src/index.ts:20-33` and is wired to
>    exactly five fields. `paymentSchema.amountRub` (:1982) accepts kopecks; `billingSummarySchema`
>    (:2003-2011), which sums those very payments, does not.
> 2. **Money reaches application code in two different JavaScript types.** Drizzle's `numeric()` has two
>    modes and the schema uses both: 14 money columns are `mode:"number"` (arrive as `number`) and 24 are
>    default (arrive as `string`). Measured on real rows, `"14800.00"` in the DB becomes `14800` or
>    `"14800"` in code — **the two-decimal form survives neither path.**
> 3. **There is a correct, exact-kopeck money library** — `packages/shared/src/utils/money.ts`, 199 lines,
>    integer kopecks, no floats, `splitKopecks` preserves totals — **and exactly two production files
>    import it** (`routes/finance_family.ts`, `services/biAnalyticsWorker.ts`). Zero frontend files, zero
>    document-rendering files.
> 4. **Legal documents run on binary floats.** Every document total is
>    `reduce((t, p) => t + p.amountRub, 0)`; a **strict `!==` float equality** at
>    `apps/api/src/documents/renderDocument.ts:1262` blocks the issuing of a payment receipt, and 3 of 7
>    realistic price sets drift enough to trigger it. The printed money formatter at :57-59 is the bare
>    `toLocaleString` and cannot guarantee two decimals.
> 5. **Import rounds every payment and price to whole roubles on purpose**
>    (`apps/api/src/migration/rowTransform.ts:372-385`), because its docstring still believes
>    `payments.amount_rub` is integer. The exact kopecks are computed one line away and discarded.
> 6. **There is no 54-ФЗ fiscal receipt path at all.** No ККТ/ОФД driver exists;
>    `digital_receipt_dispatches` has no writer and 0 rows; the receipt number is typed by hand.
>    Record as DEBT, do not audit a rounding path that does not exist.
> The one-line summary: **the kopecks now fit in the database and cannot get through the API, the ORM, the
> importer, or onto the printed page.**


---

## DELIVERABLE 3 — RANKED BUILD PACKETS, WORST FIRST

**P1. Unblock kopecks in the contract, or delete the ambition.** `packages/shared/src/index.ts` — replace
`z.number().int()` with `moneyRubSchema`/`nonNegativeMoneyRubSchema`/`positiveMoneyRubSchema` on the 38
`*Rub` fields (F4). Must land with `billingSummarySchema` :2003-2011 (F5) or the parts still will not fit
the total. Highest value because every other money fix is invisible while the API returns 400 on `5400.50`.
Solo dentist impact: direct — a filling priced 1 850,50 ₽ cannot be billed today.

**P2. Kill the float equality on money in the document gate.** `apps/api/src/documents/renderDocument.ts`
:1261-1264 (`!==`), :3865 (`>` on a drifted sum), and `apps/api/src/documents/guards.ts:684` (`!==`) (F10,
F13). Compare integer kopecks via `parseKopecks`, and drop the magnitude-dependent `> 0.01` tolerance at
guards.ts:657/:671 while there. Solo dentist impact: today a receipt can refuse to issue with the message
«10101 руб. не совпадает с 10101.000000000002 руб.», which is unfixable by the user.

**P3. Route every document total through `sumKopecks`.** `taxPaymentSnapshot.ts:174-176` plus
`renderDocument.ts` :680, :723, :885, :1261, :2321, :3860 (F7, F11). Needs P5 for the multiply.
Solo dentist impact: the tax certificate is the single most valuable piece of paper a Russian patient wants
from a dentist; its total must be exact to the kopeck by §8b.

**P4. Fix the printed money formatter.** `renderDocument.ts:57-59` → two decimals always, on all 53 call
sites; the correct implementation already exists as `formatKopecksRu` (money.ts:179-188) and the correct
reasoning already exists as `AppHelpers.tsx:2509-2530` (F12, F14). Also
`PatientFamilyCard.tsx:149` (F19). Cheap, self-contained, immediately visible.

**P5. Give the money library a rounding-explicit multiply and adopt one Drizzle mode.**
`multiplyKopecks` refuses fractional quantities that the schema is designed to hold (F22); and the 14/24
`mode:"number"` vs `mode:"string"` split (F1) should become one convention — `mode:"number"` reads more
naturally but `string` is what preserves arbitrary precision, so this is a decision the lead should make
once and enforce with a gate. Blocks P3.

**P6. Stop rounding money on import.** `apps/api/src/migration/rowTransform.ts:372-385` and
`valueNormalize.ts:872-895` — write the exact kopecks that are already computed; then delete the
`round-kopecks-to-rubles` transform and simplify `reconcile.ts:176-178`, `:417` (F17). Solo dentist impact:
this is the first hour of their life with DENTE — importing their history from another CRM.

**P7. Teach the type-drift gate what it is for.** `scripts/check-schema-type-drift.mjs` — compare
`numeric_scale` (it already computes it at :87-91 and discards it), compare precision, read all three
schema files not just one, flag columns present in the DB and absent from the ORM, and check `mode:` (F2,
F3, F1). Its current «0 money drift» all-clear is what let F1 through.

**P8. Resolve the duplicate money columns.** `treatment_plans.total_price` / `.total_price_rub` and the
misleading «alias» comment at `schema.ts:1406`; `patient_invoices` four totals; the 12 columns absent from
the ORM (F3, F21). Per DATABASE.md rule 4 the honest options are to make each real or drop it.

**P9. Fix price-list import kopeck truncation.** `apps/api/src/pricelist/analyzer.ts:353-368` (F18).
Lower rank only because the destination field already accepts kopecks, so this is a one-regex change.

**Not a build packet — record as DEBT:** no 54-ФЗ / ККТ driver exists (F15); no «сумма прописью» (F16).
Both are §10 territory: do not invent the contract.

---

## DELIVERABLE 4 — WHAT MY METHOD COULD STILL BE MISSING (honest list)

1. **I did not run the typecheck, the build, the test suite or the route smoke.** §7a reserves those for
   the lead and a build fleet is live in this tree. So every claim here is static reading plus read-only
   SQL plus arithmetic I executed in isolation — **no claim in this dossier is runtime-proven inside the
   running application.** `packages/shared/src/tests/money.test.ts` exists; I did not run it.
2. **The database is nearly empty.** `payments` 8 rows, `treatment_items` 10, `generated_documents` 4,
   `family_groups` **0**, and every other money table 0. **Every stored money value is a whole rouble
   ending in `.00`** — so I could not observe a single real kopeck in production data. The drift I measured
   is arithmetic I constructed from realistic prices, not drift observed in this database.
3. **Money hidden inside JSON is outside my inventory.** `generated_documents.payload_json` and
   `.tax_payment_snapshot_json` are `text`, and `.tax_xml_snapshot` / `.tax_xml_source_snapshot` are
   `jsonb`; there are 63 `jsonb` columns in total. Amounts serialised into those are whatever JavaScript
   put there and `information_schema` cannot see them. The tax snapshot in particular stores whole cloned
   `Payment` objects (`taxPaymentSnapshot.ts:163-171`) — I did not audit the numeric fidelity of that
   round-trip through `JSON.parse(JSON.stringify(...))` at :36.
4. **My column-declaration parser is regex-based** and only matches single-line
   `builder("column_name", ...)` declarations. A multi-line declaration, or Drizzle's newer
   name-inference form (`amountRub: numeric({...})` with a casing config), would be invisible to it and
   would show up as "NOT IN THE ORM". I spot-checked the 12 such columns with `rg` and 7 returned zero
   hits anywhere in the schema files, but I did not verify all 12 that way.
5. **I audited the API and shared packages far more thoroughly than `apps/web`.** `useAppLogic.tsx` is
   ~14.5k lines and I read the billing-summary region only; there are 87 `money()` call sites and
   `AppHelpers.tsx` is 6k+ lines. There is almost certainly more float money arithmetic in the web tree
   than the sites I listed in F19.
6. **`biAnalyticsWorker.ts` is the second importer of the money library and I did not read it in full** —
   I confirmed only that it imports the library and that its header comment (`:21`) still claims
   `payments.amount_rub` is «колонка integer в ЦЕЛЫХ РУБЛЯХ», which is false. Whether its arithmetic is
   correct despite the stale comment is unverified.
7. **I did not verify the migration ledger myself.** F0 from the prior killed run cites migration
   filenames and `_dente_migrations` timestamps; I re-derived the *live column types*, which is the load-
   bearing fact, but I did not re-count the 97 `.sql` files or re-read the ledger.
8. **`z.number().int()` counts came from a line-anchored regex on field names ending in `Rub`.** A money
   field not named `*Rub` (e.g. `price`, `discount`, `total`) is outside that count, so **38 of 45 is a
   floor, not a ceiling.** I saw several such fields while reading (`treatment_plan_items_new.price`).
9. **`percentageOfKopecks` truncates** (money.ts:150, `Math.trunc`). Whether truncation or rounding is the
   right insurance-coverage policy is a business decision I am not qualified to settle, and the two
   existing implementations disagree with it (`useAppLogic.tsx:5112` and
   `ComparativePlannerDashboard.tsx:858` both use `Math.round`).

### F23 — INFO, corroborates the naming trap. A past 100× revenue bug came from exactly the misreading the `..._kopecks` filenames invite.
`apps/api/src/services/biAnalyticsWorker.ts:18-31` — the second and last production importer of the money
library. Its header states «payments."amount_rub" — колонка **integer** в ЦЕЛЫХ РУБЛЯХ», which is false
(it is `numeric(12,2)`). But it then records this:
> «Раньше здесь стояло `sum(CAST(amount_rub AS float) / 100)`: значение делилось на 100, как будто в
> колонке копейки, и **выручка каждого врача занижалась в сто раз.**»
So someone already assumed this column held kopecks, divided by 100, and understated every doctor's revenue
100-fold. That is precisely the mistake the `0131_payments_amount_kopecks.sql` / `0135_..._kopecks` /
`0137_money_columns_kopecks.sql` filenames set up for the next reader, and it has already been made once.
The current code (`sum(${payments.amountRub})` at :40, no division) is **correct** for roubles-at-scale-2,
so here a false premise produced right code — but the premise is one edit away from causing the bug again.
Recorded because it is the strongest available argument for renaming those migrations or annotating them.

---

## SUMMARY LINE FOR THE LEAD
The database is fixed and is not the problem. **Kopecks now fit in every money column and cannot get
through the API contract (38 of 45 fields reject them), the ORM (two different JavaScript types), the
importer (rounds on purpose), the document totals (float `reduce`, strict `!==`), or the printed page (no
guaranteed second decimal).** A correct exact-kopeck library already exists and two production files use it.
