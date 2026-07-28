# CRITIQUE of R4-money-precision/dossier.md — completeness critic, 2026-07-28

Read-only. I re-measured; I did not re-run the recon. Instruments: the packet's own `q.mjs` (read line by
line first — it is genuinely read-only: `SET default_transaction_read_only = on`, refuses non-SELECT),
plus `crit-phantom.mjs` (mine, in this directory) and two throwaway arithmetic scripts.

**Verdict: USABLE_WITH_GAPS.** This is the strongest recon artefact I have audited in this campaign. Every
load-bearing number I picked re-derived. But it skips one of the five numbered brief items entirely, and
its top-ranked build packet rests on a justification that its own data contradicts.

---

## 1. LOAD-BEARING NUMBERS I RE-DERIVED MYSELF

| Claim | Command I ran | Result |
|---|---|---|
| Column census: text 570, uuid 473, tstz 267, int 111, bool 105, enum 78, numeric 70, jsonb 63, varchar 18, real 9 | `q.mjs "select data_type, count(*) … group by 1"` | **exact match, all 13 rows** |
| `38` of `45` `*Rub` fields are `z.number().int()` | the dossier's own two `rg -c` commands, verbatim | **38 and 45 both reproduce** |
| 14 money columns `mode:"number"`, 24 default string | my own parser over all 3 schema files: 18 `mode:"number"` total − 4 `coverage_*_pct` = **14**; 42 no-mode total − 4 pct − 14 non-money = **24** | **exact match** |
| 12 money columns absent from every Drizzle schema | `crit-phantom.mjs`, table-keyed, joined to `information_schema` | **14 undeclared numeric = 12 money + 2 confidence scores. Exact match.** I also closed its own gap: it hand-checked 7 of 12, I checked all 11 distinct names across all 32 files in `apps/api/src/db/` |
| 3 precision drifts the type gate cannot see | live `numeric_precision` vs `sed -n '1052p;1424p;1425p'` | **all 3 exact**: `advance_deposit_taggings.deposit_amount_rub` DB 10 / model 12; `treatment_plan_items_new.price` and `.discount` DB 12 / model 10 |
| Tolerance: caught 6, MISSED 4 of 10 | re-implemented with the **actual** `guards.ts` shape including the `Math.round(total*100)/100` target normalisation its isolated script omitted | **caught 6, MISSED 4 — same magnitudes, same diffs to the last digit** |
| Float reduce drift: 3 of 7 | my own reduce over the same 7 sets | **3 of 7, identical values** |
| Inventory completeness (brief said: do not sample) | counted table rows and diffed indices against `seq 1 70` | **46 + 8 + 16 = 70, indices 1..70, no gaps, no duplicates** |
| `сумма прописью` = 0 hits | re-ran the rg | **0, confirmed** |
| `_dente_migrations` = 97, the three `applied_at` timestamps | `q.mjs` against the ledger | **97 and all 3 timestamps exact** |

## 2. FILE:LINE CLAIMS I OPENED

All confirmed to the line, which is rare:

- `apps/api/src/documents/renderDocument.ts:57-59` — `rub()` is the bare `toLocaleString("ru-RU")`. Exact.
- `apps/api/src/documents/renderDocument.ts:1261-1263` — `const actualTotalRub = selectedPayments.reduce(...)`
  at 1261, `if (actualTotalRub !== payload.totalPaidRub)` at 1262. Exact.
- `apps/api/src/documents/taxPaymentSnapshot.ts:174-176` — the float reduce. Exact.
- `apps/api/src/documents/guards.ts:657`, `:671` (`> 0.01`), `:682-687` (strict `!==`). Exact.
- `packages/shared/src/index.ts:20-25` (`kopecksAreExact`, `moneyRubSchema`), `:1982`, `:2953`, `:4407`,
  and the five `moneyRubSchema`-family sites. Exact.
- `apps/api/src/db/schema.ts:535` (`mode: "number"`), `:1724` (string mode). Exact.

---

## 3. WHAT FAILED TO RE-DERIVE

### 3.1 An INHERITED number is wrong: there are 98 `.sql` files, not 97
`dossier.md:36` states `fd -e sql . -d 1 | wc -l` in `apps/api/drizzle` = **97**, matching the 97-row
ledger, and concludes on `:37` **"Nothing money-related is pending."**

```
ledger: 97  ondisk: 98
=== ON DISK BUT NOT IN LEDGER ===
0140_clinic_mode_one_vocabulary.sql
```

This is exactly the number `methodLimits #7` says it declined to re-derive ("I did not verify the migration
ledger myself. F0 from the prior killed run cites … a count of 97 `.sql` files"). I checked the pending
file: `rg -c -i 'rub|amount|price|balance|numeric|money|cost'` returns **zero matches**, so the
*conclusion* survives — nothing money-related is pending. But the stated equality is false and it is
presented on `:36` as verified fact, 640 lines before the caveat.

### 3.2 A cited command does not produce its cited number
`dossier.md:138` prints `rg -c -N '^\s*\w*[Rr]ub\s*:\s*z\.number\(\)\.(nonnegative|positive|min|max)'`
**→ 2**. Run verbatim it returns **1** (`totalAmountRub: z.number().nonnegative().nullable()`). The
arithmetic 38 + 5 + 2 = 45 is correct — the second member is `priceRub: z.number(),` at `index.ts:8211`,
a bare `z.number()` with no constraint, which that regex cannot match. Provenance defect on a headline
number, not a numeric error.

---

## 4. CLAIMS WITH NOTHING BEHIND THEM

### 4.1 P1's justification is unbacked and I believe it is FALSE — the highest-consequence problem here
`dossier.md:599` and the structured `mattersForSolo` for F4 ("Direct and total"):

> "Highest value because every other money fix is invisible while the API returns 400 on `5400.50`.
> Solo dentist impact: direct — a filling priced 1 850,50 ₽ cannot be billed today."

The five fields already wired to `moneyRubSchema` are **precisely the two entry points that sentence uses**:

- `serviceCatalogItemSchema.basePriceRub = nonNegativeMoneyRubSchema` (`index.ts:1645`). Its own comment at
  `:1638-1644` says it was changed *away from* `z.number().int()` for this exact reason: «Было
  z.number().int(): прайс клиники не мог содержать ни 1500,50, ни 990,99.» **Pricing a filling at 1850,50
  works.**
- `createPaymentSchema.amountRub = positiveMoneyRubSchema` (`index.ts:4407`), and that schema is the one on
  the live payment route: `apps/api/src/routes/billing.ts:186` `createPaymentSchema.safeParse(request.body)`.
  **Taking a payment of 1850,50 works.**
- And the input widget already accepts it — see 6(c) below.

The dossier itself concedes this on `:147` — "So a single payment CAN carry kopecks" — then contradicts it
450 lines later in the packet ranking. What is *actually* blocked is `treatmentItemSchema.unitPriceRub`
(`:1794`), the document line payloads (`:2893`, `:2928`) and `billingSummarySchema` (`:2003-2011`). The
correct statement is: **a filling can be priced and paid in kopecks; the kopecks are destroyed between the
price and the printed act, and the billing summary cannot hold the sum of its own parts.** Still HIGH,
still P1-worthy — but the lead would build it on a false premise and would tell the user something untrue.

### 4.2 `moneyRubSchema` validates but does not normalise — never tested, and it guts P1
The dossier calls it "well built" (`:141-143`) and "correct" (DELIVERABLE 2) and prescribes it for all 38
fields. Nobody measured it. `kopecksAreExact` is
`Math.abs(value * 100 - Math.round(value * 100)) < 1e-6`. I fed it the dossier's own four drifted values:

```
600.5999999999999   -> kopecksAreExact = true
10101.000000000002  -> kopecksAreExact = true
1110.9999999999995  -> kopecksAreExact = true
0.10000000000000853 -> kopecksAreExact = true
```

**All four pass, unchanged.** So P1 as written unblocks kopecks and leaves the float drift completely
intact: the drifted total validates, then hits the strict `!==` (F10) and `toLocaleString` (F12) exactly as
before. P1 needs a `.transform(v => Math.round(v * 100) / 100)` — or a `parseKopecks` round-trip — or it
delivers materially less than the dossier claims. This is the single biggest technical omission.

Bounded, secondary: the same `1e-6` absolute tolerance is in *kopeck* units, so above ~1e9 RUB it starts
rejecting legitimate `numeric(12,2)` values (`1234567890.12` → `false`, diff `1.5e-5`; 12.1% of random
2-dp values across the full `numeric(12,2)` range). Below 10 000 000 RUB: **0 of 126 279 rejected.** Not a
live defect in a dental practice; a latent bound nobody has written down.

### 4.3 P1's `:2003-2011` instruction would convert two integer counters to money
The range contains **nine** fields, not seven. `openTreatmentItems` (`:2009`) and `unpaidDocuments`
(`:2010`) are row counters. The seven money fields are `:2003-2008` and `:2011` — non-contiguous. A build
agent following "land `billingSummarySchema` (:2003-2011)" literally makes fractional treatment-item counts
valid. The dossier names the right seven fields in prose (`:152-153`) and then hands over a line range that
does not mean those seven.

### 4.4 F1 is rated HIGH on a hazard I could not find occurring
Its stated harm: "In TypeScript `string + number` compiles and concatenates, so `family.balance + amount`
silently produces garbage." I searched for real instances of unconverted string-mode money arithmetic in
`apps/api/src` and `apps/web/src`: **zero**. The reduce sites that exist (`guards.ts:648`,
`managerReports.ts:776`, `useAppLogic.tsx:5052`, `:11434`, `sampleData_opt.ts:1071`) all operate on
Zod-typed `number` payload objects, not on raw string-mode column reads. F1 is a real type-safety hazard
deserving a convention packet; as a *money defect* it is undemonstrated, and HIGH overstates it. Its own
`mattersForSolo` admits as much: "Indirect but structural."

### 4.5 F8's string-mode column is a simulation, not an observation
`exp-drizzle-modes.mjs:43-46` declares a synthetic `pgTable("payments", { amountRub: numeric(..., no mode) })`
to produce the third column of a table headed "real rows from `payments.amount_rub`". The mechanism is
right — I read `node_modules/drizzle-orm/pg-core/columns/numeric.js` myself and the `String(value)` /
`Number(value)` split is as quoted — and `family_groups` has 0 rows so there was no real alternative. But
the table is presented as three readings of a live column when one of them is a re-declaration. Under-labelled.

### 4.6 Severity bookkeeping is internally inconsistent
- F2 is **HIGH** in the dossier (`:105`) and **MEDIUM** in the structured summary.
- F9 and F12 carry severity HIGH with a `mattersForSolo` that says "Medium-high".
- F7 carries HIGH with "High leverage rather than direct harm". An asset inventory ("a correct library
  exists, two files use it") is not a HIGH defect; it is the good news.
- F16 (`сумма прописью`) exists as a MEDIUM finding in the dossier and is **absent from the structured
  findings array entirely** — it survives only inside a `recommendedPackets` footnote.

Not "everything is HIGH", though: 11 HIGH / 7 MEDIUM / 2 LOW / 1 INFO across 21 findings, with real
gradation and two genuine self-corrections. The distribution is defensible; the labels are sloppy.

---

## 5. COVERAGE AGAINST THE FIVE NUMBERED BRIEF ITEMS

| # | Brief item | Verdict |
|---|---|---|
| 1 | Every money-bearing column, live type, precision/scale, roubles-or-kopecks, full inventory not sampled | **DELIVERED, complete.** 70/70, indices 1..70, exact `count(*)`, and the roubles-vs-kopecks question answered (all roubles at scale 2, with the migration-filename trap named). |
| 2 | Where the representations disagree; quote the code that compares/sums/reconciles across the boundary | **PARTIAL.** Schema-vs-contract and parts-vs-aggregate are done well (F5, F21, F3). The roubles↔kopecks boundary that *does* exist in the app layer is not walked: `apps/api/src/migration/reconcile.ts` alone carries 63 `Kopecks` identifiers, `engine.ts` 10, `phases.ts` 3, `runStore.ts` 2, `biAnalyticsWorker.ts` 19. Reconciling those against rouble columns is literally reconcile.ts's job and the brief asked for it by name. F17 quotes two of its lines; the comparison logic is never audited. |
| 3 | **`moneyTypeParsers.ts` read in full. Which OIDs? Every money column covered or only some? Partially registered = intermittent** | **SKIPPED.** No section exists. Two passing mentions (`:8`, `:99`), the file is never opened, no OID is ever named, and the intermittency question is never answered. Answered in §6 below. |
| 4 | Legal documents — справка для налогового вычета and 54-ФЗ — where amounts come from, rounding/float on that path, any JS `number` monetary total | **DELIVERED, and it corrected the brief's own premise.** F11, F10, F12, and F15 (no ККТ/ОФД driver exists at all — recorded as DEBT rather than invented). The right call. |
| 5 | Census of `Math.round`, `toFixed`, `/ 100`, `* 100`, `parseFloat` on money, each with a correct-or-defect verdict | **PARTIAL.** `Math.round` and `parseFloat` are covered site by site with verdicts (F6, F13, F17, F18, F19). **`toFixed` is never reported once** — there are 8 sites, of which `apps/web/src/components/communications/MessageDeliveryConsole.tsx:552` (`gateways.channels.sms.balance.amount.toFixed(2)`) is a live money display. `* 100` / `/ 100` appear only where they collide with another finding; there is no census with per-site verdicts. |

**Deliverables** (inventory table, replacement paragraph, ranked packets) are all present and the
replacement paragraph is genuinely paste-ready — except that its point 1 repeats the P1 framing corrected
in §4.1, so it must not be pasted as-is.

## 5b. SOURCE HYGIENE — CLEAN ON THE DISQUALIFYING AXIS

`rg -n -i 'competitive-audit|RECON_DOSSIER|VISUAL_VERDICT|progress\.md|ARCHON_PROMPT' dossier.md` returns
exactly one hit: `:548`, the heading naming `RECON_DOSSIER.md` as the *destination* of the replacement
paragraph. **No number in this dossier is sourced from `RECON_DOSSIER.md`, `VISUAL_VERDICT.md`,
`progress.md` or `docs/competitive-audit/`.** `docs/competitive-audit/` is never referenced at all.

The only inheritance is from the prior killed R4 run's F0, declared in `methodLimits #7`: the 97-file count
(**wrong**, §3.1), the three `applied_at` timestamps (correct), and "Ledger max = 0139" (correct).

## 5c. `mattersForSolo` — mostly real, two enterprise-shaped

Genuinely solo: F17 (import rounding is hour one of a solo dentist's life with DENTE), F10 (the receipt
refuses to print with a message the user cannot act on), F12 (a tax certificate that reads «5 400,5 руб.»),
F6 (a debt of 5400,50 collected as 5400). These hold.

Enterprise thinking in a solo costume: F3 — `patient_invoices` has four money columns, 0 rows, and no
invoice feature; "any future invoice feature starts from an ambiguous schema" is architecture hygiene, not a
one-dentist problem. F2 — the type-drift gate is developer tooling; the dentist never meets it. Both are
honestly rated MEDIUM/"Indirect", so this is framing, not fraud. The irony is that the one *most*
solo-shaped sentence in the whole packet — P1's "a filling priced 1 850,50 ₽ cannot be billed today" — is
the one that is wrong.

## 5d. `methodLimits` — honest, specific, and better than the campaign norm

Nine numbered items, each naming a file, a line count, or a magnitude: the empty database and the fact that
no real kopeck exists in it; JSON-serialised money outside `information_schema`; the regex parser's
single-line limitation and the explicit "I hand-checked 7 of the 12, not all 12"; `apps/web` audited less
thoroughly than the API; `biAnalyticsWorker.ts` not read in full; the un-re-derived ledger; "38 of 45 is a
floor, not a ceiling"; and a business-judgement abstention on truncate-vs-round. It also records its own
earlier wrong reading of `analyzer.ts` as a 100× bug (F18) and the prior-run clobber (`state.md`).

I closed two of its declared limits and **both resolved in its favour**: all 12 orphan columns check out,
and the `*Rub` naming floor turns out to be nearly tight (my sweep of every non-`*Rub` `z.number().int()`
field name in `index.ts` found no money field hiding outside the count — only `total:` at one site). The
one limit it declared is where the one wrong number lives. That is precisely what a declared limit is for.
This is not a formality list.

---

## 6. THE SINGLE MOST VALUABLE THING NOBODY HAS LOOKED AT

**`apps/api/src/db/moneyTypeParsers.ts` as a *value-conditional* parser, and `apps/web/src/rubAmountInput.ts`.**

**(a) The OID answer the brief asked for, which no agent has written down.** It registers exactly **one**
OID: `const NUMERIC_OID = 1700` (`:29`), `pg.types.setTypeParser(1700, parseNumericMoney)` (`:64`).
`int8`/`bigint` is deliberately excluded (`:26-27`). Registration is process-global and fires at
`apps/api/src/db/client.ts:40`, *before* `new pg.Pool(...)` at `:42` — the brief's premise checks out. There
is exactly one `pg` install in the tree (`node_modules/pg` 8.21.0, no nested copies), so there is no
duplicate-module hazard. **So: all 70 numeric columns are covered uniformly by OID. The parser is not
partially registered by column.**

**(b) But it is partially registered by VALUE, which is the shape the brief was actually pointing at, and
nobody has characterised it.** `parseNumericMoney` returns `number | string | null` and picks per value, not
per column: non-numeric text falls through at `:39`, a magnitude guard at `:43`, and a `toFixed` round-trip
at `:52-55`. The same column can hand back a number for one row and a string for another. I measured the
bound: within `numeric(12,2)` (max 9 999 999 999.99) and `numeric(10,2)` neither escape hatch ever fires, so
money columns always arrive as `number`. **The intermittency is real in the type signature and bounded away
in practice** — reassuring, but now measured instead of assumed.

**(c) And the second-order consequence, which changes a fix:** because the parser is global on OID 1700, it
also converts every raw-SQL `sum()` / `avg()` numeric aggregate into a JS double.
`apps/api/src/services/communications/audience.ts:200` and `:214` cast to `::numeric(12,2)` inside PostgreSQL
*specifically to stay exact* — and the driver parser turns that exact decimal into a double before
`Number(row.total)` at `:223` is ever reached. So F20's diagnosis ("exact in SQL, then float in JS") is
misplaced: **the exactness is destroyed by the driver, not by the JS subtraction.** Nobody has traced this,
and it changes the remedy — the exact-money path needs `::text` casts (or a per-column parser) at every
aggregate, not tidier JavaScript. Every `sum(numeric)` in the codebase is on this path.

**(d) `apps/web/src/rubAmountInput.ts` — 57 lines, kopeck-correct, and mentioned ZERO times in the dossier**
(`rg -c rubAmountInput dossier.md` → 0). `normalizeRubAmountInput` accepts `1500,50`, treats comma and dot
alike, strips ordinary and non-breaking space group separators, **refuses** three decimals rather than
silently rounding, and snaps through integers via `Math.round(amountRub * 100) / 100` (`:21-32`). It is
imported by six web files: `App.tsx:225`, `AppHelpers.tsx:207`, `documentLogic.ts:12`,
`documentValidators.ts:6`, `PaymentCapture.tsx:4`, `useAppLogic.tsx:818`. Its header at `:4-9` records that
the old `/^\d+$/` whole-roubles gate was removed and that the failure was verified live — in the past tense.

This matters three ways: F7's "the expensive part of the fix is already written… in exactly two production
files" **undercounts the correct money code that already exists**; P4's scope ("fix the printed formatter,
plus `PatientFamilyCard.tsx:149`") was set without knowing what the web tree already has; and P1's
solo-dentist justification is falsified partly by this file.

Runner-up, cheap and unexamined: my `crit-phantom.mjs` also found **4 columns declared `numeric()` in the
ORM whose live type is `integer`** — `inventory_items.stock_quantity` (schema.ts:1591),
`.critical_threshold` (:1594), `inventory_transactions.quantity_changed` (:1630),
`procedure_material_rules.quantity_to_deduct` (:1757). Not money, but `stock_quantity` and
`quantity_to_deduct` multiply cost, and Drizzle string-mode over an `int4` OID hands the app a **string**.
The dossier audited DB→ORM orphans and never the ORM→DB direction. (Phantom columns: 0 — nothing declared
is missing from the database.)

---

## 7. WHAT THE LEAD SHOULD CHANGE BEFORE BUILDING

1. **Rewrite P1's justification.** Pricing (`basePriceRub`) and payment (`createPaymentSchema.amountRub`,
   live at `routes/billing.ts:186`) already accept kopecks. The defect is between the price and the
   document: `treatmentItemSchema.unitPriceRub` (`index.ts:1794`), the document line payloads (`:2893`,
   `:2928`), and `billingSummarySchema`. Do not tell the user a filling cannot be billed.
2. **Add normalisation to P1**, not just permission. `moneyRubSchema` accepts drifted floats unchanged;
   without a `.transform` the packet does not fix F10 or F12 by itself.
3. **Replace P1's `:2003-2011` with `:2003-2008` and `:2011`.** `openTreatmentItems` and `unpaidDocuments`
   are counters.
4. **Re-derive the migration file count** before repeating "nothing money-related is pending" — 98 files,
   97 applied, `0140_clinic_mode_one_vocabulary.sql` outstanding (not money, verified).
5. **Read `apps/web/src/rubAmountInput.ts` before scoping P4/P5**, and re-scope F20/P3 around the fact that
   the OID-1700 parser doubles every SQL aggregate.
6. **Demote F1 and F7 from HIGH.** F1's harm is undemonstrated in real code; F7 is good news.
