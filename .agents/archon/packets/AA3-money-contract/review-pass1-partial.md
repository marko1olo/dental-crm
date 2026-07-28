# REVIEW AA3-money-contract (adversarial, read-only)

Reviewer posture: disbelief. Commits under attack: 3537333a2d (contract), e302be2dc (analyzer).
Started: in progress. Findings appended live.

## 0. Commit shape (verified)
- 3537333a2d touches EXACTLY 2 files: packages/shared/src/index.ts (+204/-40), packages/shared/src/tests/money-contract-kopecks.test.ts (+1251 new).
- e302be2dc touches EXACTLY 2 files: apps/api/src/pricelist/analyzer.ts (+76/-8), apps/api/src/pricelist/pricelistKopecks.test.ts (+211 new).
- Union == claimed filesChanged (4). No dist, no tsbuildinfo, no foreign files staged in either commit. PASS so far.

## 1. COMPILE GATE (rebuilt shared FIRST, as required)
- `npm run build -w @dental/shared` -> TRUE exit 0. NOTE: md5 of dist/index.js and dist/index.d.ts is
  BYTE-IDENTICAL before and after my rebuild (e4a12c5718dd93d2f62db220d48adc17 / 6493b5209f...).
  => the dirty on-disk dist was already an exact build of HEAD source. Builder's claim confirmed.
- `npm run typecheck -w @dental/api`  -> TRUE exit 0, zero `error TS`.
- `npm run typecheck -w @dental/web`  -> TRUE exit 0, zero `error TS` (the 11 panelStateText errors are gone).
- CAVEAT I raise against the packet's own framing: int -> money widening is type-IDENTICAL in TS
  (both infer `number`). A green typecheck proves NOTHING about §10 consumer synchrony here.

## 2. PROOF AUDIT — every claimed test re-run by me, TRUE exit code
| command | claimed | mine | verdict |
|---|---|---|---|
| node --import tsx --test packages/shared/src/tests/money-contract-kopecks.test.ts | 98/98/0 exit 0 | tests 98 pass 98 fail 0, TRUE_EXIT=0 | CONFIRMED |
| node --import tsx --test packages/shared/src/tests/money.test.ts | 24/24/0 exit 0 | tests 24 pass 24 fail 0, TRUE_EXIT=0 | CONFIRMED |
| node --import tsx --test apps/api/src/pricelist/pricelistKopecks.test.ts | 16/16/0 exit 0 | tests 16 pass 16 fail 0, TRUE_EXIT=0 | CONFIRMED |
| node --import tsx --test apps/api/src/pricelist/analyzer.test.ts | 6/6/0 exit 0 | tests 6 pass 6 fail 0, TRUE_EXIT=0 | CONFIRMED |

## 3. MASS-CONVERSION CHECK — my own extraction from the diff
40 field declaration lines removed. 38 carried `z.number().int()`; 2 were loose
(generatedDocument.totalAmountRub = z.number().nonnegative(), visitFlowRequest priceRub = bare z.number()).
41 added lines reference a money schema, of which 1 is prose inside a comment -> 40 real. Balanced.
EVERY ONE of the 40 removed keys is money-named: minPriceRub maxPriceRub averagePriceRub unitPriceRub
discountRub totalRub amountRub totalPlannedRub totalDiscountRub totalPaidRub totalDueRub
taxDeductionEligibleRub draftDocumentAmountRub insuranceCoverageRub balanceRub balanceDueRub
estimatedTotalRub totalByActRub paidRub totalAmountRub prepaidAmountRub remainingAmountRub
estimatedAmountRub priceRub. ZERO counters converted. `count`, `pricedCount`, `quantity`,
`durationMonths`, `visitCount`, `openTreatmentItems`, `unpaidDocuments`, `taxYear` all survive
untouched inside the same hunks. NO MASS CONVERSION. The brief's 38 survives my re-measurement.

## 4. REVERSE CHECK — money left integer? DIFFERENT INSTRUMENT (runtime zod reflection, not rg)
Wrote a probe that imports the BUILT dist and walks every exported schema, unwrapping
ZodEffects/Optional/Nullable/Default/Array/Record/Union, then feeds each number leaf 1500.50 /
1500.505 / 3.5 / -5000. 2072 number leaves reached; 144 of them are `...Rub`-suffixed.
- `...Rub` leaves that REJECT 1500.50: **ZERO**. No money field left integer inside index.ts.
- non-Rub leaves accepting 3.5: devicePixelRatio, brightness, windowWidth, deviceMemoryGb,
  windowCenter — all pre-existing, none touched by this commit, none money.
- FINDING (scope-adjacent, NOT index.ts): 3 unique `...Rub` money leaves accept 1500.505 -
  packages/shared/src/migration.ts:291-293 sourceMoneyTotalRub / loadedMoneyTotalRub /
  quarantinedMoneyTotalRub, all bare `z.number().nullable()`. Untouched by AA3 (different file,
  outside claimed scope) but they are money in the shared contract with no kopeck precision, and the
  packet's blanket line "All money in this contract is named ...Rub" never enumerated them.

## 5. DEFECT AT PARENT — REPRODUCED WITH MY OWN INSTRUMENT (not the builder's)
Wrote a probe that (1) executes the HEAD deterministic parser through the exported
`analyzePricelist` under tsx, and (2) side-by-side runs a VERBATIM reimplementation of the
PARENT-commit `parseMoney` / `extractPrice` / `stripPriceFromTitle` copied off the diff's "-" side.
25-line realistic Russian pricelist corpus. Result: parserMode `deterministic`, 25 items.
- "Лечение кариеса 1500,50"      OLD=1500     NEW=1500.5   -> defect REAL at parent. CONFIRMED.
- "Пломба композитная 2300,25"   OLD=2300     NEW=2300.25  -> CONFIRMED.
- "Коронка металлокерамика 1 500,50 руб."  OLD=1500  NEW=1500.5   CONFIRMED.
- "Имплантация Straumann 12.500,50"       OLD=12500 NEW=12500.5  CONFIRMED (thousands vs decimal ok).
- "Удаление зуба 1500,5"        OLD=1500     NEW=1500.5   CONFIRMED.
- WORSE THAN THE PACKET REPORTED: "Реставрация 1500,505" OLD=**505**. The parent did not merely
  drop kopecks on 3-decimal input, it returned 505 roubles for a 1500,50 service. The packet never
  found this; it strengthens the case that the defect was real and severe.
- PRICE REGRESSIONS INTRODUCED: **ZERO**. Every changed price is a case where OLD was wrong and NEW
  is right. No previously-correct price moved.
- DEAD `\b` CLAIM CONFIRMED BY EXECUTION: at parent, "Консультация врача-стоматолога 1500 руб.",
  "... 1500 ₽", "... 1500 р.", "Хирургия A16.07.001 5500 руб.", "Винир 1500,00 руб.",
  "Наркоз 1 час 9500 руб.", "Скидка 10% на лечение 4500 р" ALL kept the price in the service title;
  at HEAD all seven are cleaned. Not read - run.
- "Гигиена полости рта 1500 рублей" still keeps the price in the title at HEAD. Documented honestly
  in the commit body as the deliberate cost of not eating the next word. Not a hidden failure.

## 6. FINDING #1 (CONFIRMED, introduced by e302be2dc) — mangled service title on price RANGES
Input line `Отбеливание 12000-18000 руб`:
  parent title  = "Отбеливание 12000-18000 руб"  (nothing stripped, dead \b)
  HEAD title    = "Отбеливание 12000-"           <-- dangling range, user-visible in the catalogue
Cause: the revived second replace at apps/api/src/pricelist/analyzer.ts:442 now matches the UPPER
bound "18000 руб" (lookahead passes at end of string) but the lower bound "12000" and the "-" have
no currency marker, so the first replace (which requires a thousands separator) never fires on them.
The packet added a dedicated test for the `\b` fix but no range case, so its own suite is blind here.
Not money-destroying (priceRub 12000 / priceMaxRub 18000 are both correct) but it puts a truncated
string in front of the doctor. Introduced by this commit, therefore owned by it.

## 7. FINDING #2 (CONFIRMED) — the pricelist fix covers ONE of the TWO parser modes.
apps/api/src/pricelist/analyzer.ts:733-737
    function asNumberOrNull(value: unknown): number | null {
      ...
      return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;   // WHOLE RUBLES
    }
used at :768 `priceRub: asNumberOrNull(record.priceRub) ?? fallback.priceRub`
      at :769 `priceMaxRub: asNumberOrNull(record.priceMaxRub) ?? fallback.priceMaxRub`
inside `itemFromGroq`. Reachability, every link at a real line:
  apps/api/src/routes/pricelist.ts:26 POST /api/pricelist/analyze
  -> :45 analyzePricelist(input, catalog)
  -> analyzer.ts:846 `if (!request.useServerAi) return ...Deterministic` — so useServerAi:true continues
  -> :858 `if (!keyPool.configuredKeyCount) return ...Deterministic` — gated on GROQ_API_KEYS/GROQ_API_KEY
     (apps/api/src/speech/keyPool.ts, apps/api/src/env/loadServerEnv.ts)
  -> :863 callGroqPricelist -> :825 itemFromGroq -> :768 asNumberOrNull -> Math.round -> kopecks GONE
  -> :776 dentalPricelistItemSchema.parse succeeds (an integer IS kopeck-exact, so the widened
     contract raises no objection) -> summarize() min/max/avg are copies of rounded values.
This is the SAME FILE the packet edited, 350 lines below the fix, in the mode the product sells as
«серверная нейро-проверка». The packet's SUMMARY says priceRub "could never be fractional under any
pricelist. Fixed and committed separately." That sentence is FALSE for parserMode `groq_json`.
Honest limit on my proof: I did NOT execute the Groq branch (no GROQ key in this environment, and a
network call to a paid provider is out of scope). The call chain and the `Math.round` are read at
real lines and are unambiguous; the branch is env-gated, not dead.
Note the fix must not simply widen asNumberOrNull — :770 uses it for `durationMinutes`, which is
correctly an integer. It has to split into a money reader and a count reader.

## 8. REACHABILITY — EVERY LINK VERIFIED AT A REAL LINE (payment -> document path)
| claimed | actual at HEAD | verdict |
|---|---|---|
| useAppLogic.tsx:12287 paidAmount = reduce over activePayments status "paid" | :12287 `const paidAmount =`, filter chain :12288-12310, `.reduce((total, payment) => total + payment.amountRub, 0) \|\| null` at :12311 | CONFIRMED |
| :12331-12336 assigns to totalAmountRub | :12331 `const totalAmountRub =` ... :12336 `: null;` | CONFIRMED |
| :12347-12363 POSTs to /api/documents | fetch("/api/documents") at :12347, body `totalAmountRub: moneyDocumentKinds.has(kind) ? totalAmountRub : null` | CONFIRMED |
| documents/create.ts:62 createDocumentSchema.safeParse(request.body) | :62 exactly | CONFIRMED |
| :64 reply.code(400) | :63-67 `return reply.code(400).send({ error: "DocumentValidationFailed" ... })` | CONFIRMED |
| useAppLogic.tsx:12366 renders «Документ не создан» | `setError(await responseErrorMessage(response, "Документ не создан"))` inside `if (!response.ok)` right after the fetch | CONFIRMED |
The chain is real, mounted and user-visible. This is the one packet this cycle whose reachability
claim survives a link-by-link audit. `plannedAmount` raw-float accumulation at :12279-12286 is also
real and is exactly where the packet said it is.

## 9. FINDING #3 (CONFIRMED arithmetic, PLAUSIBLE trigger) — the receipt guard still compares money with raw float `!==`
apps/api/src/documents/guards.ts:333-339
    const selectedTotalRub = selectedPayments.reduce((total, payment) => total + payment.amountRub, 0);
    if (selectedTotalRub !== payload.totalPaidRub) { return `Платежная квитанция: сумма ${payload.totalPaidRub} руб. не совпадает с выбранными оплатами ${selectedTotalRub} руб.`; }
Measured, not argued: three paid payments of 300.01 + 300.05 + 300.07 — all three kopeck-exact and
all three legal under the widened contract — sum to **900.1299999999999** in one order and
**900.13** in the other. BOTH pass `kopecksAreExact` (tolerance 1e-6). The guard's `!==` does not.
Found 8 such triples in a small sample of realistic Russian prices; the smallest is the one above.
The client sums `activePayments` in dashboard order (useAppLogic.tsx:12311); the server sums in
`payload.selectedPaymentIds` order (guards.ts loop above :330). Those orders are independent, so
divergence is a live possibility, not a theoretical one.
Consequence: a legitimate multi-payment receipt is rejected with
    «Платежная квитанция: сумма 900.1299999999999 руб. не совпадает с выбранными оплатами 900.13 руб.»
which is (a) the same user-visible failure the packet claims to have removed, (b) a raw float in a
Russian money message, (c) two numbers a human cannot tell apart. `Math.round(x*100)` on both sides
is the fix, exactly as guards.ts:642/648/670 already do for the estimate and invoice paths.
NOT a fabrication by the builder, but an incomplete audit: the handoff cites :337 as
"compares by EXACT equality" and uses that as an argument FOR widening, without noticing that raw
`!==` over float sums is itself the defect. Pre-existing line; AA3 is the commit that makes
fractional values reach it, so it belongs in AA3's FOUND NOT FIXED list and is not there.
HONEST LIMIT: the float non-associativity is measured; the client/server order divergence is read
from code, not driven end-to-end (that needs a live POST with 3 kopeck payments; the running API
serves stale dist and I am forbidden to restart it).

## 10. FINDING #4 (CONFIRMED) — §3: widened money is now printed raw into Russian user messages
Same guard file interpolates the widened values directly: guards.ts:338, :660, :671, :685.
With the contract widened, `${payload.totalPaidRub} руб.` renders **"1500.5 руб."** — English decimal
point, no trailing zero, no NBSP grouping — where Russian money must read "1 500,50 ₽".
Before this commit those fields were `z.number().int()`, so these strings could ONLY ever print an
integer and the defect was unreachable. This commit made it reachable. `formatKopecksRu` exists at
packages/shared/src/utils/money.ts:191 and is already imported by 5 other files
(renderDocument.ts, migration/{valueNormalize,rowTransform,reconcile}.ts,
components/plan/ComparativePlannerDashboard.tsx), so the helper the packet was told not to duplicate
is also the helper it did not wire up.

## 11. FINDING #5 (CONFIRMED) — a claim that does not reproduce at its own parent
The packet's inventory row for :1750 and the code comment at analyzer.ts:583-586 state as observed
fact: «среднее целым рублём выпадало из их диапазона на глазах у пользователя (min 1500,50 · max
1500,50 · среднее 1501)». At the parent, `parseMoney` ended in `Math.round(price)`, so EVERY price
was an integer, and the rounded mean of integers is always inside [min,max].
Measured: 1,200,000 random integer price sets, sets of size 1..6 — `avg` outside [min,max]: **0**.
The state described requires fractional min/max together with whole-rouble average rounding, a
combination that existed in NO commit: 3537333a2 widened the contract but left parseMoney rounding,
and e302be2dc fixed both in one commit. The CODE CHANGE (round the average to kopecks) is correct and
necessary going forward. The JUSTIFICATION is a hypothetical written as a user-visible observation.
This is the one charge-sheet pattern the packet did commit.

## 12. FINDING #6 (CONFIRMED) — §10 consumers of the same class it reported, that it did not find
- apps/web/src/components/settings/InsuranceContractsPanel.tsx:122
    `annualLimitRub: formData.annualLimitRub ? parseInt(formData.annualLimitRub, 10) || undefined : undefined`
  DB verified by real query: `insurance_contracts.annual_limit_rub = numeric(12,2)`. Kopecks the user
  typed are truncated on the client before the request leaves. This is byte-for-byte the same defect
  the packet DID report for LabOrdersPanel.tsx:135 (`lab_orders.price_rub = numeric(12,2)` — also
  confirmed by query). Second instance, not found.
- apps/web/src/PaymentCapture.tsx:346-350 InstallmentCalculator:
    `const downPayment = Math.round((totalAmount * downPaymentPercent) / 100);`
    `const monthlyPayment = months > 0 ? Math.floor(remaining / months) : 0;`
  Whole-rouble down payment and whole-rouble monthly instalment, with an in-file comment asserting
  «сумма сходится точно». That assertion holds only while totalAmount is an integer — which is
  exactly the constraint this packet removed. It is also a hand-rolled second implementation of
  `splitKopecks` (remainder to the last payment), the helper the brief named. Pre-existing, so not an
  AA3-authored second owner, but AA3 is what made it wrong and it is not in FOUND NOT FIXED.

## 13. CLAIMS I RE-DERIVED WITH INDEPENDENT COUNTS — all reproduce exactly
- `z.number().int` occurrences: parent 449 raw / 2 comment lines = **447**; HEAD 414 raw / 5 comment
  lines = **409**; delta **38**. Matches the packet to the unit. The brief's "414" is exactly the raw
  HEAD total, confirming the packet's explanation that the brief measured a dirty file and counted prose.
- `Rub`-named field declaration lines at parent: **45**. Matches.
- Parent declarations vs 1500.50, evaluated with live zod: every `z.number().int()` variant REJECTS
  1500.5; `z.number().nonnegative().nullable()` ACCEPTS 1500.505 (the "tightened from loose" claim);
  bare `z.number()` ACCEPTS -5000 (the other one). All three claims true.
- REVERT-PROOF VALIDITY: 13 revert cases + 13 meta-assertions counted from the real run log, 98 tests
  / 20 suites / 98 pass / 0 fail. The test imports `../index.js` = SOURCE under tsx, not dist, so it
  cannot pass on a stale build. `assertAccepts` demands parse success on a 1500.5 fixture, which every
  parent declaration rejects -> the test WOULD fail if reverted. Not ceremony.
- ZodEffects disclosure verified at runtime: createDocumentSchema / paymentReceiptPayloadSchema /
  paymentRefundCorrectionPayloadSchema all report `ZodEffects` and `.extend === undefined`. The
  honest NOT-PROVEN note is accurate. createDocumentSchema itself: accepts 1500.5, rejects 1500.505.
- DB, by my own pg query (psql is not on PATH here): **35** columns matching ~'rub', 29 numeric(12,2)
  + 6 numeric(10,2), **0** non-numeric, **0** with scale != 2. **2** organizations, exact UUIDs
  d0000000-0000-4000-8000-00000000d001 «Демо-клиника для снимков» and
  4a3420d1-6ffb-4459-bd8f-7f7087f5e191 «Стоматология, 1 кабинет», both clinic_mode='demo'.
  `treatment_plan_items` and `documents` DO NOT EXIST; `treatment_items` and `generated_documents` do.
  Every DB claim in the packet is exact.
- NO SECOND MONEY OWNER: `parseKopecks` (money.ts:53) only accepts `^(-)?(\d+)(?:\.(\d{1,2}))?$` and
  THROWS on anything else — it cannot parse «1 500,50 руб.» or «12.500». `parseMoney` solves a
  different problem (free-text Russian extraction, thousands-vs-decimal). Charge does not stick.
- INVENTED VALUES: none. Numbers added to the analyzer are `100`, `"00"` (kopeck padding) and the
  pre-existing, unchanged bounds `300` / `2_000_000`. No hex, no px, no tenant UUID, no fabricated 0.
- SMOKE: `npm run smoke:web-text-encoding` -> ok:true, mojibakeHits:0, TRUE exit 0. checkedFiles
  **423**, packet claimed **420** — benign drift from other packets adding files, verdict reproduces.
- Tolerance sanity: 1e-6 kopecks hides nothing near a real kopeck. 200,000 float additions of 1500.50
  (sum 300,100,000) produced ZERO tolerance error. The packet's debt note "the margin is consumed at
  sums approaching a million" is unsupported — the first break I could find needs ~107,237 additions
  of 0.07 (sum ~7,507). Right direction, invented threshold.
- GIT HYGIENE: 3537333a2d = exactly `M packages/shared/src/index.ts` + `A .../money-contract-kopecks.test.ts`.
  e302be2dc = exactly `M apps/api/src/pricelist/analyzer.ts` + `A .../pricelistKopecks.test.ts`.
  No dist, no tsbuildinfo, no `.data`, no foreign author's hunks. Nothing deleted, no export removed.
  Both subjects Russian, Conventional Commits, and each NAMES THE DEFECT. Encoding on all four files:
  BOM=false, mojibake=false, U+FFFD=false, Cyrillic present.
- The closing script `.agents/archon/packets/AA3-money-contract/live-api-proof.mjs` is a single
  read-only POST, writes nothing, and iterates ALL summary rows rather than hardcoding one group, so
  it will not false-fail if the two fixture lines land in different categories. Its expected 1900.38
  is arithmetically right ((1500.5+2300.25)/2 = 1900.375 -> Math.round(190037.5)/100 = 1900.38).

## 14. VERDICT: NEEDS_REWORK
The defect was real, worse than reported, and is genuinely fixed in the deterministic path. Every
number in the packet that I could re-derive, re-derived — which makes this the most honest packet I
have audited in this campaign. It is not a revert candidate: nothing is worse than before, no counter
was widened, no guard was deleted, no price was invented, no tolerance hides a kopeck.
It is not SOUND either, on four grounds:
1. A headline PROVEN claim is false: the pricelist parser still floors kopecks in `groq_json` mode
   (analyzer.ts:733-737), in the same file, 350 lines below the fix.
2. The widening walks money into three raw float `!==` comparisons (guards.ts:337/684/696) that can
   reject a correct receipt or act, unflagged, with an unreadable message.
3. Those same messages now print raw floats into Russian money strings, with `formatKopecksRu` sitting
   unused beside them.
4. One published justification does not reproduce at its own parent (the average-outside-min..max).
