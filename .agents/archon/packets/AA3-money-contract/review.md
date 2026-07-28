# REVIEW AA3-money-contract — PASS 2 (adversarial, read-only, independent)

Reviewer posture: disbelief. Nothing below is read from the packet; every line is something I ran.
Commits under attack: `3537333a2d` (contract), `e302be2dc` (analyzer).
A partial PASS-1 review existed on disk and is preserved verbatim at `review-pass1-partial.md`.
I did NOT inherit its conclusions: I re-derived every load-bearing number with my own instruments and
I refute one of its findings below (§R).

My probe scripts, left on disk so the lead can re-run them:
- `.agents/archon/packets/AA3-money-contract/reviewer-probe-analyzer.mjs` — drives the HEAD
  deterministic pricelist parser and a verbatim reimplementation of the PARENT parser side by side.
- `.agents/archon/packets/AA3-money-contract/reviewer-probe-schema-diff.mjs` — runtime zod behaviour
  diff, PARENT vs HEAD, over every number leaf of every exported schema.
- `.agents/archon/packets/AA3-money-contract/parent-shared/` — throwaway copy of `packages/shared/src`
  with `index.ts` replaced by the parent revision, so the parent contract can be executed. DELETE IT.

---

## 1. COMPILE GATE — GREEN, and I rebuilt shared FIRST

| gate | true exit | output |
|---|---|---|
| `npm run build -w @dental/shared` | 0 | clean, `tsc -p tsconfig.json` |
| `npm run typecheck -w @dental/api` | 0 | zero `error TS` |
| `npm run typecheck -w @dental/web` | 0 | zero `error TS` — the 11 panelStateText errors are gone (AA1's, not AA3's) |

The committed code is NOT red inside its own claim.

CAVEAT I raise against the packet's framing: `z.number().int()` -> `moneyRubSchema` is **type-identical**
in TypeScript (both infer `number`). A green typecheck therefore proves nothing at all about §10
consumer synchrony here. Every §10 finding below had to be found by hand, and the compiler will never
find the next one.

## 2. PROOF AUDIT — all four claimed test runs reproduce EXACTLY, true exit codes

| command | claimed | mine (true exit) |
|---|---|---|
| `node --import tsx --test packages/shared/src/tests/money-contract-kopecks.test.ts` | 98/98/0, exit 0 | tests 98, suites 20, pass 98, fail 0, **exit 0** |
| `node --import tsx --test packages/shared/src/tests/money.test.ts` | 24/24/0, exit 0 | tests 24, pass 24, fail 0, **exit 0** |
| `node --import tsx --test apps/api/src/pricelist/pricelistKopecks.test.ts` | 16/16/0, exit 0 | tests 16, suites 6, pass 16, fail 0, **exit 0** |
| `node --import tsx --test apps/api/src/pricelist/analyzer.test.ts` | 6/6/0, exit 0 | tests 6, pass 6, fail 0, **exit 0** |

No fabricated proof in the test claims. This packet is the opposite of the charge sheet on this axis.

## 3. WAS THE DEFECT REAL AT THE PARENT? YES — reproduced with MY OWN instrument

`reviewer-probe-analyzer.mjs`, 25-line realistic Russian pricelist, HEAD parser executed through the
real exported `analyzePricelist`, parent parser reimplemented verbatim off the diff's `-` side
(including the candidate-selection code, which the diff did NOT touch and therefore had to be read
from HEAD — see §R for why that matters).

```
"Лечение кариеса 1500,50"                OLD=1500      NEW=1500.5
"Пломба композитная 2300,25"             OLD=2300      NEW=2300.25
"Коронка металлокерамика 1 500,50 руб."  OLD=1500      NEW=1500.5
"Имплантация Straumann 12.500,50"        OLD=12500     NEW=12500.5   (thousands-vs-decimal correct)
"Композитная реставрация 12.500"         OLD=12500     NEW=12500     (3 digits still = thousands)
"Чистка 990,90 руб"                      OLD=990       NEW=990.9
"Установка импланта 45 000,99 ₽"         OLD=45000     NEW=45000.99
"Реставрация 1500,505"                   OLD=505       NEW=1500.5
"Плазмолифтинг 4 500,00 - 6 000,50 руб." OLD=6000/null NEW=4500/6000.5
```
- Defect **CONFIRMED REAL** at the parent, and worse than the packet reported: `1500,505` produced
  **505 rubles** for a 1500,50 service at the parent, and `4 500,00 - 6 000,50` produced a single
  price of **6000** (the max, not the min, and no range at all).
- **PRICE REGRESSIONS INTRODUCED: ZERO** across all 25 lines. Every changed price is a case where the
  parent was wrong. No previously-correct price moved.
- Dead-`\b` claim **CONFIRMED BY EXECUTION, not by reading**: at the parent, `1500 руб.`, `1500 ₽`,
  `1500 р.`, `1500,00 руб.`, `A16.07.001 5500 руб.`, `9500 руб.`, `4500 р` ALL kept the price inside
  the service title; at HEAD all seven titles are clean.
- Category summaries at HEAD: `min 1500 · max 1500.5 · avg 1500.25`, `min 12500.5 · max 45000.99 ·
  avg 28750.75`. Average is kopeck-rounded and inside its own range in all 10 groups.

## 4. MASS-CONVERSION CHECK — the REVERT-grade question. CLEAN.

Instrument: **runtime zod behaviour**, not `rg`. `reviewer-probe-schema-diff.mjs` walks every exported
schema in the parent contract and in HEAD, unwrapping Effects/Optional/Nullable/Default/Array/Record/
Union/Intersection, reaches **2112 number leaves in each**, and probes each leaf with 1500.50 /
1500.505 / 3.5 / -5000 / 1500.

- Leaves that went **reject(1500.50) -> accept(1500.50)**: **121** paths.
  That is the 40 changed declarations, reached through the aggregate schemas that embed them
  (`dashboardSchema`, `documentPayloadSchema`, `generatedDocumentSchema`, `createDocumentSchema`,
  `dentalPricelistAnalysisResponseSchema`, `visitFlowRequestSchema.planPayload`, …).
- **NON-money-named leaves among those 121: ZERO.** Every single one ends in `…Rub`.
- Leaves that a COUNT-shaped name and now accept 3.5 but did not before: **ZERO**.
- `billingSummarySchema.openTreatmentItems` and `.unpaidDocuments` at HEAD: **still reject 1500.50**.
  Executed, not read. The two anti-mass-conversion assertions in the test are load-bearing and true.
- Money-named leaves at HEAD that **still reject** 1500.50 (i.e. money left integer): **ZERO**.
- The five HEAD leaves with count-ish names that accept 3.5 (`migration*.rowCount`,
  `migrationQuarantineItem.sourceRowNumber`, `visitFlowRequest.completedServices[].quantity`) accept
  3.5 at the PARENT too. Pre-existing, untouched, not this packet's.

**NOT a mass conversion. Not REVERT-grade.** The brief's figure of 38 survives an instrument change.

## 5. REVERT-PROOF — the real standard, executed against the actual parent contract

I did not reason about which assertion breaks; I executed the parent declarations:

```
billingSummary.totalPaidRub            PARENT accepts 1500.50 = false   HEAD = true
billingSummary.totalDueRub             PARENT = false   HEAD = true
createDocument.totalAmountRub          PARENT = false   HEAD = true
patient.balanceRub                     PARENT = false   HEAD = true
treatmentPlanItem.unitPriceRub         PARENT = false   HEAD = true
paymentReceiptPayload.totalPaidRub     PARENT = false   HEAD = true
pricelistCategorySummary.averagePriceRub PARENT = false HEAD = true
billingSummary.openTreatmentItems      PARENT = false   HEAD = false   (correctly pinned)
billingSummary.unpaidDocuments         PARENT = false   HEAD = false   (correctly pinned)
```
The test's `assertAccepts` demands `safeParse` success on a 1500.50 fixture, and it imports
`../index.js` — i.e. the SOURCE under tsx, never `dist` — so it cannot pass on a stale build.
**The test WOULD fail if the fix were reverted. Not ceremony.**

## 6. DB, SMOKE, ENCODING, TOLERANCE — my own instruments, every packet claim reproduces

`reviewer-probe-db.mjs`, read-only SQL against `127.0.0.1:5432` (no `psql` on PATH; `pg.Client`):
- money-named columns (`column_name ~ 'rub'`): **35**. Histogram: `numeric(12,2)` × 29, `numeric(10,2)` × 6.
  Columns NOT `numeric(x,2)`: **0**. Packet claim exact.
- `treatment_plan_items` and `documents` **DO NOT EXIST**; `treatment_items` and `generated_documents` do.
  The packet's correction of two inherited fake table names is right.
- spot-checked: `treatment_items.unit_price_rub` / `.discount_rub` = `numeric(12,2)`,
  `generated_documents.total_amount_rub` = `numeric(12,2)`, `lab_orders.price_rub` = `numeric(12,2)`,
  `insurance_contracts.annual_limit_rub` = `numeric(12,2)` (the last one is F6's evidence).
- organizations: **2**, both `clinic_mode='demo'`, UUIDs `d0000000-0000-4000-8000-00000000d001`
  «Демо-клиника для снимков» and `4a3420d1-6ffb-4459-bd8f-7f7087f5e191` «Стоматология, 1 кабинет».
  Packet exact; the lead's published "4 organizations" remains wrong.
- CONTEXT THE PACKET DID NOT GIVE, split by `organization_id` as required: of **8** payments in the only
  org that has any, **0** carry kopecks today. The break is real by construction but has no existing
  data instance — nobody has hit it yet, which is why no bug report exists.

Smoke: `npm run smoke:web-text-encoding` -> `ok:true`, `checkedFiles:423`, `mojibakeHits:0`,
`garbledQuestionHits:0`, **true exit 0**. Packet said 420; benign drift from other packets adding files.

Encoding, my own round-trip per AGENTS rule 5 on all four changed files AND on both commit messages:
`validUTF8=true, BOM=false, mojibake=false, U+FFFD=false, Cyrillic present` on every one.

TOLERANCE — the REVERT-grade question "does 1e-6 hide a real one-kopeck mismatch?" Answer: NO, measured.
`1500.505` false, `1500.5000001` false, `0.005` false, `1500.4999999` false, `900.1299999999999` true
(correct — that *is* 900.13). Over 3,000,000 random kopeck-exact values in `0..2,000,000`, worst float
error was `1.49e-8`, two orders of magnitude inside the tolerance. Over 3,000,000 deliberate
HALF-kopeck values, wrongly accepted: **0**. The tolerance is correctly sized.

## 7. REACHABILITY — every link opened at a real line at HEAD, not two of three

| link | what I found | verdict |
|---|---|---|
| `useAppLogic.tsx:12287` `paidAmount` = reduce over paid payments | `:12287 const paidAmount =`, filters `:12288-12310`, `.reduce((total, payment) => total + payment.amountRub, 0) \|\| null` at `:12311` | CONFIRMED |
| `:12331-12336` assigns to `totalAmountRub` | `:12331 const totalAmountRub =` … `: null;` at `:12336` | CONFIRMED |
| `:12347` POST `/api/documents` | `await fetch("/api/documents", { method: "POST"` …, body carries `totalAmountRub: moneyDocumentKinds.has(kind) ? totalAmountRub : null` | CONFIRMED |
| `documents/create.ts:62` `createDocumentSchema.safeParse(request.body)` | exactly that line | CONFIRMED |
| `create.ts:64` 400 | `:63-67 return reply.code(400).send({ error: "DocumentValidationFailed", … })` | CONFIRMED |
| `useAppLogic.tsx:12366` renders «Документ не создан» | `:12365 setError(await responseErrorMessage(response, "Документ не создан"))` inside `if (!response.ok)` | CONFIRMED |

Mounted, real, user-visible. This packet's reachability claim is the only one this cycle that survives a
link-by-link audit.

## 8. NO SECOND OWNER, NO INVENTED VALUES, NOTHING DELETED

- `git show … | rg '^\+' | rg 'function |const .*=>|export '` over both commits: **zero hits**. Neither
  commit introduces a single new function or export. No second money helper.
- `parseKopecks` (`utils/money.ts:53`) accepts only `^(-)?(\d+)(?:\.(\d{1,2}))?$` and throws otherwise —
  it cannot parse «1 500,50 руб.» or «12.500». `parseMoney` in the analyzer solves a different problem
  (free-text Russian extraction, thousands-vs-decimal). The duplicate-owner charge does not stick.
- New constants in the analyzer: `100` and `"00"` (kopeck padding). The bounds `300` / `2_000_000` are
  pre-existing and unchanged. No hardcoded price, no fabricated 0, no hex, no px, no tenant UUID.
- `git show --name-status` on both: `M` and `A` only, **no `D`**. Nothing deleted, so no repo-wide
  `git grep` hole to chase.
- No new user-facing string is introduced by either diff — the additions are comments, schema
  references and regexes.

## 9. GIT HYGIENE — clean

- `3537333a2d`: `M packages/shared/src/index.ts`, `A packages/shared/src/tests/money-contract-kopecks.test.ts`. Nothing else.
- `e302be2dc`: `M apps/api/src/pricelist/analyzer.ts`, `A apps/api/src/pricelist/pricelistKopecks.test.ts`. Nothing else.
- `git show --name-only` over both, filtered for `dist|tsbuildinfo|.data`: **NONE**.
- No foreign author's hunks swept in, despite `packages/shared/src/index.ts` having been dirty from the
  dead Z2 packet. Nothing deleted, no export removed.
- Both subjects are Russian, Conventional Commits, and each **names the defect**, not the fix.

---

# FINDINGS

## F1 — CONFIRMED. A headline PROVEN claim is FALSE: the pricelist still floors kopecks in `groq_json` mode.

The packet's SUMMARY: *"priceRub/minPriceRub/maxPriceRub/averagePriceRub could never be fractional
under any pricelist. Fixed and committed separately."* That sentence is false for the second parser
mode, in **the same file the packet edited**, 350 lines below its own fix.

`apps/api/src/pricelist/analyzer.ts:733-737`
```ts
function asNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;   // WHOLE RUBLES
}
```
used at `:768 priceRub: asNumberOrNull(record.priceRub) ?? fallback.priceRub`
and `:769 priceMaxRub: asNumberOrNull(record.priceMaxRub) ?? fallback.priceMaxRub`.

Reachability, every link at a real line I opened (line numbers verified by `rg -n`, not copied):
`apps/api/src/routes/pricelist.ts:27` POST `/api/pricelist/analyze` -> `:45 analyzePricelist(input, catalog)`
-> `analyzer.ts:846 if (!request.useServerAi) return …Deterministic` (so `useServerAi:true` continues) ->
`:857 if (!keyPool.configuredKeyCount) return …Deterministic` (env-gated on GROQ keys, not dead) ->
`:862 callGroqPricelist` -> `:745 itemFromGroq` -> `:768 asNumberOrNull` -> `Math.round` -> kopecks gone
-> `:776 dentalPricelistItemSchema.safeParse` **succeeds** (an integer is kopeck-exact, so the widened
contract raises no objection) -> `summarize()` min/max/avg are copies of rounded values.

Worse than "floors": `Math.round(1500.5)` is **1501**. In `groq_json` mode a 1500,50 service becomes
1501 ₽ — the clinic is shown a price 50 kopecks HIGHER than its own pricelist. That is an invented
price, §1/§13.

The fix must NOT simply widen `asNumberOrNull`: `:770` uses the same function for `durationMinutes`,
which is correctly an integer. It has to split into a money reader and a count reader.

HONEST LIMIT: I did not execute the Groq branch (no key in this environment; a paid network call is out
of scope). The call chain and the `Math.round` are read at real lines and are unambiguous. This is a
static finding, not a runtime one, and I label it as such.

## F2 — CONFIRMED BY EXECUTION. The analyzer commit introduces a user-visible mangled service title on price RANGES.

Not read — run, by `reviewer-probe-analyzer.mjs`:

| input line | PARENT title | HEAD title |
|---|---|---|
| `Отбеливание 12000-18000 руб` | `Отбеливание 12000-18000 руб` | **`Отбеливание 12000-`** |
| `Отбеливание ZOOM 12000 - 18000 руб.` | unchanged | **`Отбеливание ZOOM 12000 -`** |
| `Брекеты от 90000 до 150000 руб.` | unchanged | **`Брекеты от 90000 до`** |

3 of 25 lines. Cause: the revived second `replace` at `analyzer.ts:442` now matches the UPPER bound
`18000 руб` (the new letter-lookahead passes at end of string), but the lower bound `12000` and the
`-`/`до` carry no currency marker, and the FIRST replace only matches numbers that contain a thousands
separator — `12000` has none. So the tail is deleted and the head is left dangling.

Consequence: §3 human language. `Брекеты от 90000 до` is a truncated Russian phrase — "Braces from
90000 to" — printed into the service catalogue the doctor reads. Prices themselves are correct
(`priceRub 12000 / priceMaxRub 18000`), so no money is lost, but the string is worse than the parent's.
Introduced by `e302be2dc`, therefore owned by it. The packet added a dedicated test for the `\b` fix
and **no range case at all**, so `pricelistKopecks.test.ts` is blind here.

## F3 — CONFIRMED arithmetic. The widening walks money into raw-float `!==` money comparisons.

`apps/api/src/documents/guards.ts`, read at HEAD:
```
:333  const selectedTotalRub = selectedPayments.reduce((total, p) => total + p.amountRub, 0);
:337  if (selectedTotalRub !== payload.totalPaidRub) {
:338      return `Платежная квитанция: сумма ${payload.totalPaidRub} руб. не совпадает с выбранными оплатами ${selectedTotalRub} руб.`;
:684  payloadTotalRub !== facts.plannedAmountRub          (plannedFactsTotalMismatchReason)
:696  facts.paidAmountRub > 0 && payloadTotalRub !== facts.paidAmountRub   (paidFactsTotalMismatchReason)
:884-971  paidAmountRubForDocument — four separate raw-float `.reduce((t,p)=>t+p.amountRub,0)` sums, NO rounding
```
Three `!==` comparisons against un-rounded float sums. Before this commit those operands were forced
integers by the contract, so the comparison was exact by construction and the defect was unreachable.
This commit is what makes fractional values reach them.

Contrast with the code the packet cited as evidence that the server "already expects kopecks":
`:641` `expectedFinancialLineTotal` and `:648` `financialLinesTotal` DO round to two decimals and
compare with `Math.abs(...) > 0.01`. Those are kopeck-safe. The three `!==` sites are not, and the
handoff cites `:337` as an argument FOR widening without noticing that raw `!==` over float sums IS
the defect. Pre-existing line, newly reachable, and absent from FOUND NOT FIXED.

**MEASURED, and the rate is not small.** Over 200,000 random 3-payment sets of kopeck-exact Russian
prices in 300..5300 ₽, **35.74%** have a float sum that DEPENDS ON SUMMATION ORDER. Concrete triples my
probe found, all three amounts kopeck-exact and all sums passing `kopecksAreExact`:
```
[4941.05, 1611.69, 5118.66] -> 11671.4  or  11671.400000000001
[2292.32, 4573.12, 4793.02] -> 11658.460000000001  or  11658.46
[1408.84,  895.04, 3547.56] ->  5851.4400000000005 or  5851.44
```
**And the two orders are provably different, at real lines.** The client total is built at
`apps/web/src/useAppLogic.tsx:5338-5341`
```ts
const selectedPaymentReceiptTotalRub = selectedPaymentReceiptPayments.reduce(
  (total, payment) => total + payment.amountRub, 0);          // NO rounding
```
where `selectedPaymentReceiptPayments` (`:5331-5337`) is
`eligiblePaymentReceiptPayments.filter(p => selectedPaymentReceiptIdSet.has(p.id))` — **list order**.
It reaches the payload as `totalPaidRub` via `apps/web/src/documentLogic.ts:644`. The server sums
`selectedPayments`, which `guards.ts:341-349` builds by iterating `selectedIds` — **the order the user
clicked**. Two independent orders, two un-rounded float reduces, one `!==`.

The fix is already in the same client file: `useAppLogic.tsx:5071` wraps the billing-summary
`totalPaidRub` in `roundToKopecks(...)`, and `roundToKopecks` appears 10 times in that file. It is
simply absent from `:5338`.

Consequence: a legitimate multi-payment receipt is rejected with
«Платежная квитанция: сумма 11671.400000000001 руб. не совпадает с выбранными оплатами 11671.4 руб.» —
the same user-visible failure the packet claims to have removed, in an unreadable message.

HONEST LIMIT: the order-dependence rate and the divergent orders are measured/read at real lines; I did
not drive the POST end to end. That needs a live request with three kopeck payments, and the running API
serves stale `dist` while I am forbidden to restart it. Label: CONFIRMED arithmetic, CONFIRMED order
divergence, un-driven trigger.

## F4 — CONFIRMED. §3: widened money is now printed as a raw float into Russian money strings.

`guards.ts:338`, `:657`, `:669`, `:686`, `:697` interpolate the widened values directly:
`${payload.totalPaidRub} руб.` now renders **`1500.5 руб.`** — English decimal point, no trailing zero,
no grouping — where Russian money must read `1 500,50 ₽`. Before this commit those fields were
`z.number().int()` and these strings could only ever print an integer.

`formatKopecksRu` already exists at `packages/shared/src/utils/money.ts` and is already imported by
five other files. The helper the brief forbade duplicating is also the helper this packet did not wire
up. Worse, F3's message would print two numbers a human cannot tell apart:
`«сумма 900.1299999999999 руб. не совпадает с выбранными оплатами 900.13 руб.»`.

## F5 — CONFIRMED. A published justification does not reproduce at its own parent.

The inventory row for `:1750` and the code comment at `analyzer.ts:583-586` state as observed fact:
«среднее целым рублём выпадало из их диапазона на глазах у пользователя (min 1500,50 · max 1500,50 ·
среднее 1501)».

At the parent, `parseMoney` ended in `Math.round(price)`, so **every** price was an integer, and
`Math.round(mean of integers)` is always inside `[min, max]`. The state described requires fractional
min/max together with whole-ruble average rounding — a combination that existed in **no commit**:
`3537333a2` widened the contract but left `parseMoney` rounding, and `e302be2dc` fixed both at once.
My 25-line corpus at HEAD: `avg` outside `[min,max]` in **0 of 10** groups.

The CODE CHANGE (round the average to kopecks) is correct and necessary going forward. The
JUSTIFICATION is a hypothetical written as a user-visible observation, in a commit body and in a
permanent source comment. This is the one charge-sheet pattern the packet does commit.

## F6 — CONFIRMED. §10 consumers of exactly the class the packet reported, that it did not find.

The packet found `LabOrdersPanel.tsx:135` (`parseInt` on a price whose column is `numeric(12,2)`) and
reported it honestly. It did not find its siblings:

- `apps/web/src/components/settings/InsuranceContractsPanel.tsx:121-123`
  `annualLimitRub: formData.annualLimitRub ? parseInt(formData.annualLimitRub, 10) || undefined : undefined`
  DB verified by my own query: `insurance_contracts.annual_limit_rub = numeric(12,2)`. Byte-for-byte the
  same defect the packet DID report for `LabOrdersPanel.tsx:135` (`lab_orders.price_rub = numeric(12,2)`,
  also confirmed by query): kopecks the user typed are truncated client-side before the request leaves.
- `apps/web/src/PaymentCapture.tsx:342-350` (`InstallmentCalculator`)
  ```
  :345  // Теперь остаток от деления добирается последним платежом: сумма сходится точно.
  :346  const downPayment = Math.round((totalAmount * downPaymentPercent) / 100);
  :348  const monthlyPayment = months > 0 ? Math.floor(remaining / months) : 0;
  ```
  Whole-ruble down payment and whole-ruble monthly instalment, directly under an in-file comment
  asserting «сумма сходится точно». That assertion held only while `totalAmount` was an integer — the
  exact constraint this packet removed. It is also a hand-rolled second implementation of `splitKopecks`,
  the helper the brief named.

Both pre-existing, so not AA3-authored second owners, but AA3 is what makes them wrong and neither is
in FOUND NOT FIXED.

## F7 — CONFIRMED by runtime probe. Three money fields in the SAME shared contract have no kopeck precision, and a blanket claim covers them.

`reviewer-probe-schema-diff.mjs`, money-named leaves at HEAD that ACCEPT `1500.505`: **6 paths, 3
unique fields**, all `packages/shared/src/migration.ts` and all re-exported through `index.ts`:
`sourceMoneyTotalRub`, `loadedMoneyTotalRub`, `quarantinedMoneyTotalRub` — bare `z.number().nullable()`.
They also accept `-5000`.

The packet's MEASUREMENTS say «Money fields hiding under a non-Rub name: ZERO … All money in this
contract is named ...Rub, and no ...Rub field is a count», and its inventory declares «UNCERTAIN —
none. Every one of the 45 resolved to a definite verdict.» Those are statements about "this contract",
and these three are in it, reachable from `index.ts`, named `…Rub`, and money. Different file than the
claimed scope — so this is a **reporting overreach**, not a missed edit. Fix belongs to a separate
owner; the *claim* needed a boundary the packet never drew.

## F8 — nit. The code comment at `analyzer.ts:417-422` justifies the decimal capture with a state that does not occur.

«без неё … «Лечение кариеса 1500,50 руб» превращалось в «Лечение кариеса ,50»». Without the decimal
group, `\b\d{3,7}\s*(?:₽|руб\.?|р\.?)` cannot match `1500,50 руб` at all (`1500` is not followed by
whitespace or currency; `50` is only two digits), so the title would have been left whole, not turned
into `,50`. The change is right; the stated failure mode is invented. Same species as F5, smaller.

## F9 — CONFIRMED, and it is a SHIPPING BLOCKER the packet flagged but under-weighted: the TRACKED build artefact at HEAD still holds the OLD contract.

`packages/shared/dist` is **tracked in git** (`git ls-files packages/shared/dist` -> `index.d.ts`,
`index.d.ts.map`, `index.js`). Occurrences of `nonNegativeMoneyRubSchema`:
- `git show HEAD:packages/shared/dist/index.js` -> **1** (only the declaration; the migration is absent)
- freshly rebuilt `packages/shared/dist/index.js` -> **37**

So at HEAD the tracked source and the tracked build output **contradict each other**, and `apps/api`
imports the build output. A clean checkout of this HEAD runs the OLD contract: every API test, smoke or
manual probe against it would report the pre-fix behaviour and look like a passing green. That is
structurally the charge sheet's "smoke green only because it loaded a dist built BEFORE the fix",
sitting one `git checkout` away.

The packet DID declare this — it is in NOT PROVEN and it is the first line of LEAD MUST RUN, and it
correctly refused to stage generated output into a commit alongside another author's dirty tree. That is
a defensible call. But the consequence is stronger than "my change is inert until you build": until the
rebuilt `dist` is committed, **the repository's own history does not contain the fix**, and the two
commits under review are not self-sufficient. The lead must rebuild AND commit `packages/shared/dist`,
or the fix ships inert.

## 10. THE PACKET'S OWN NUMBERS, RE-DERIVED WITH A DIFFERENT INSTRUMENT — all exact

Instrument: node, line-by-line, classifying each hit as code or comment prose. NOT the builder's
`rg -o … | wc -l`.

| claim | packet | mine |
|---|---|---|
| `z.number().int` code occurrences at parent | 447 | **447** (+2 prose = 449 raw) |
| `z.number().int` code occurrences at HEAD | 409 | **409** (+5 prose = 414 raw) |
| code delta | 38 | **38** |
| `…Rub`-named field declaration lines | 45 | **45** at parent AND at HEAD |

The brief's figure of 414 is exactly the raw HEAD total, confirming the packet's explanation that the
brief measured a dirty file and counted comment prose. **The packet's numbers are not inflated.**

---

## R — I REFUTE ONE FINDING OF THE PASS-1 REVIEW, AND TWO OF MY OWN FIRST ATTEMPTS

My first run of `reviewer-probe-analyzer.mjs` reported `Реставрация 1500,505 -> OLD=1500`, which would
have made PASS-1's `OLD=505` a fabrication. It was **my** probe that was wrong: I reconstructed the
parent's candidate selection as `candidates.find(explicit) ?? candidates[0]`, whereas the real code —
unchanged by the diff, therefore invisible in it, therefore something I had to read at HEAD
(`analyzer.ts:407-409`) — is `(explicit.length ? explicit : candidates).at(-1)`, i.e. the LAST
candidate, with `explicit` also true when a range was captured. After correcting my probe, `OLD=505`
reproduces exactly, and `4 500,00 - 6 000,50` reproduces as `OLD=6000`.

PASS-1's `OLD=505` therefore stands, and I record my own error here rather than quietly fixing it: a
reviewer reimplementing a parser off a diff will silently inherit the unchanged half. Anyone re-running
my probe should know this is the trap.

**MY SECOND SELF-CAUGHT ERROR, and it is the exact mechanism behind this campaign's phantom
measurements.** My first count script compared parent vs HEAD via
`require('child_process').execSync('git show <sha>^:packages/shared/src/index.ts')` and reported
`PARENT 409 / HEAD 409 / delta 0` — which, taken at face value, would have destroyed the packet's
central claim. It was wrong. On win32 `execSync` runs through **cmd.exe, where `^` is the escape
character**, so `git show <sha>^:path` silently degrades to `git show <sha>:path` and returns the file
*at that commit* rather than at its parent. Both sides of my comparison were HEAD. It failed silently,
with plausible-looking identical numbers and exit 0.

Anyone re-deriving a before/after number on this host: run `git show <sha>^:path` from the shell, or
resolve the parent with `git rev-parse <sha>^` first. Do not put a `^` inside `execSync`.

PASS-1 numbers I re-derived independently and which reproduce: the four test totals, the two typechecks,
the `\b` execution results, the 3-field migration.ts loose-money finding (as 6 leaf paths),
the range-title mangling (PASS-1 found 1 case, I found 3), and the average-out-of-range refutation.

## VERDICT: NEEDS_REWORK

The defect was real, worse than reported, and is genuinely fixed in the deterministic path. Every
number in the packet that I could re-derive, re-derived — 38, 45, 447 -> 409, 98/24/16/6, 2
organizations, the ZodEffects disclosure. On the fabrication axis this is the cleanest packet on the
charge sheet, and its NOT PROVEN list is honest to the point of naming its own inertness.

It is **not** a revert candidate: no counter was widened, no money was left integer, no guard was
deleted, no price was invented in the shared contract, the 1e-6 tolerance hides nothing near a real
kopeck (`1500.505` and `1500.5000001` are both rejected), and nothing is worse than the defect.

It is **not** SOUND, on five grounds, in severity order:
1. **F3/F4** — the widening walks fractional money into three raw-float `!==` comparisons. Measured:
   **35.74%** of 3-payment kopeck sets have an order-dependent float sum, and the client sums in list
   order (`useAppLogic.tsx:5338`, un-rounded) while the server sums in click order (`guards.ts:341-349`,
   un-rounded). A correct multi-payment receipt can be rejected with
   «сумма 11671.400000000001 руб. не совпадает с выбранными оплатами 11671.4 руб.» — the same
   user-visible failure the packet claims to have removed, now printed as two indistinguishable raw
   floats, with `roundToKopecks` used 10 times in that same client file and `formatKopecksRu` unused.
2. **F1** — a headline PROVEN claim is false. The pricelist parser still destroys kopecks in
   `groq_json` mode, in the same file the packet edited, and `Math.round` there raises a 1500,50 service
   to **1501 ₽** — an invented price, §1/§13.
3. **F9** — the tracked `packages/shared/dist` at HEAD still contains the OLD contract, so the two
   commits are not self-sufficient and a clean checkout runs the pre-fix behaviour. Declared by the
   packet, but it needs a commit, not a note.
4. **F2** — the analyzer commit puts a truncated Russian phrase (`Брекеты от 90000 до`) in the service
   catalogue, on 3 of 25 realistic lines, with no test covering ranges.
5. **F5/F8** — two justifications published as observed user-visible facts do not reproduce at their
   own parent.

REQUIRED REWORK, numbered and specific:
1. `apps/api/src/pricelist/analyzer.ts:733-737` — split `asNumberOrNull` into a money reader
   (`Math.round(n*100)/100`) and a count reader (`Math.round(n)`); wire `:768`/`:769` to the money
   reader and leave `:770 durationMinutes` on the count reader. Add a `groq_json`-mode test that feeds
   `{"priceRub": 1500.5}` through `itemFromGroq` and asserts 1500.5, not 1501.
2. `apps/web/src/useAppLogic.tsx:5338` — wrap `selectedPaymentReceiptTotalRub` in `roundToKopecks`, as
   `:5071` already does for the billing summary. Same for `paidAmount` at `:12311` and `plannedAmount`
   at `:12281-12286`.
3. `apps/api/src/documents/guards.ts:333-337`, `:683-684`, `:696` — round both operands to kopecks
   before comparing, or compare with `Math.abs(a-b) > 0.005`, exactly as `:641`/`:648`/`:670` already do.
   Also round the four `.reduce` sums in `paidAmountRubForDocument` (`:884-971`).
4. `apps/api/src/documents/guards.ts:338`, `:657`, `:669`, `:686`, `:697` — format money through
   `formatKopecksRu` instead of interpolating the raw number into a Russian string.
5. `apps/api/src/pricelist/analyzer.ts:442` — make the second `replace` consume the whole range
   (`\d{3,7}(?:[.,]\d{1,2})?\s*(?:-|до)\s*` prefix) so `Отбеливание 12000-18000 руб` does not become
   `Отбеливание 12000-`. Add range cases to `pricelistKopecks.test.ts`.
6. Rebuild AND COMMIT `packages/shared/dist` (`npm run build -w @dental/shared`), since it is tracked
   and HEAD's copy predates the migration.
7. Correct the two non-reproducing justifications: the average-outside-min..max claim in the `:1750`
   inventory row and in the comment at `analyzer.ts:583-586`, and the «превращалось в «Лечение кариеса
   ,50»» claim at `analyzer.ts:417-422`. Both are permanent source comments asserting observed facts
   that never occurred.
8. Add to FOUND NOT FIXED: `InsuranceContractsPanel.tsx:121-123` (`parseInt` on a `numeric(12,2)`
   column), `PaymentCapture.tsx:342-350` (whole-ruble instalment split beside a comment claiming exact
   convergence), and `packages/shared/src/migration.ts` `sourceMoneyTotalRub` / `loadedMoneyTotalRub` /
   `quarantinedMoneyTotalRub` (money with no kopeck precision, reachable from `index.ts`).
