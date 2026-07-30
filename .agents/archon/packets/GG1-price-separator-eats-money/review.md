# GG1-price-separator-eats-money — adversarial review

Reviewer: independent (did not write this code). READ-ONLY. Nothing in the repo was edited; all
harnesses live in `C:/Users/Admin/AppData/Local/Temp/`.

Commits reviewed: `f98692df58fc424b48ea3be547e5c1eb2a5d3b72` (code) and
`4710b92f631a1095e6ab64f73f0980bec3d12218` (tests).

**VERDICT: NEEDS_REWORK.** The headline fix is real and reproduces. Two measured regressions ride
along with it, one of which underprices a service by 12x, and one of which is pinned as intended by
a new test while being absent from the inventory reported upward.

---

## 0. Scope re-derived (not taken from the brief)

- `f98692df5` touches exactly 3 files: `apps/api/src/pricelist/analyzer.ts` (+198/-103),
  `commitmsg.txt`, `state.md`. **No test file.**
- Tests landed separately in `4710b92f6`: `apps/api/src/pricelist/pricelistKopecks.test.ts` (+211)
  + `commitmsg2.txt` + `state.md`.
- Author on both: `marko1olo <marko1olo@users.noreply.github.com>`.

## 1. Brief/packet SCHEMA MISMATCH — the agent's disclosure is accurate

My checks 1-3 name `guards.ts`, "11 raw money-in-text sites", and `${index + 1}`. That is the
**float-comparison / money-in-text packet**, owned by `apps/api/src/documents/guards.ts` and landed
by `a3f83ebeb` / `d0c0d196d` / `185f181ac` (`git log -- apps/api/src/documents/guards.ts`).
`f98692df5` does not touch that file. The agent said so instead of inventing 11 sites. Verified.

### 1a. Literal check — `guards.ts` money-in-text at HEAD (my own grep)

`grep -oE '\$\{[^}]*\}' apps/api/src/documents/guards.ts | sort | uniq -c`

- 34 interpolations total; **24 carry a money value** (22 `moneyRubText(...)`, 2 `moneyKopecksText(...)`),
  spread over **11 message-producing lines** (424, 540, 544, 545, 744, 758, 772, 783, 841, 850, 881).
- **Raw money interpolations still at HEAD: 0.** Every one goes through a helper.
- Non-money interpolations correctly NOT money-converted: `${index + 1}` (line number, guards.ts:744),
  `${documentLabel}` x5, `${input.taxYear}`, `${application.requestedTaxYear}`, three
  `.join(", ")` key lists. Nothing over-converted.
- «руб. ₽» double-currency sweep over `apps/`: **0 hits**. `moneyRubText` returns a bare decimal
  string (`kopecksToNumericString`) and the literal ` руб.` is supplied by the template. Correct.

So the brief's "11 raw at dispatch" is now 11 converted / 0 raw — but that is another commit's work,
not this one's.

### 1b. Substantive check — separator-family sites still wrong at HEAD

Measured by driving the real `analyzePricelist({useServerAi:false})` at HEAD (45 + 12 + 7 probe
lines), and comparing against the **verbatim old `extractPrice` / `stripPriceFromTitle`** extracted
from `59a886a2c` (the parent) into a standalone harness.

All 13 claimed inventory entries reproduce. Highlights confirmed:

| input | BEFORE | AFTER |
|---|---|---|
| «Консультация 1000/500 руб» | price 1000, max null | **500 / 1000**, title «Консультация» |
| «Консультация 1000-500 руб» | price 1000, max null | **500 / 1000** |
| «Отбеливание 12000 руб - 18000 руб» | 18000 / null, title «Отбеливание -» | **12000 / 18000**, «Отбеливание» |
| «Отбеливание 12000 ₽ - 18000 ₽» | 18000 / null, «Отбеливание -» | 12000 / 18000 |
| «Отбеливание от 12000 руб до 18000 руб» | 18000 / null, «Отбеливание от до» | 12000 / 18000 |
| «Отбеливание 12.000 руб/18.000 руб» | 18000 / null, «Отбеливание /» | 12000 / 18000 |
| «Седация 5000/120 мин» | title «Седация мин» | title «Седация /120 мин», price 5000 |
| «Справка 5678/2024 выдана» | **price 5678** (fabricated), «Справка выдана» | null + `price_not_found`, title intact |
| «Прайс-лист действует от 01.01.2025» | **price 1202** (fabricated from a date) | no price |
| «Лечение кариеса 1500,50» | 1500.5 | 1500.5 (kopeck exactness intact) |

One claim I could not fault: «–»/«—» really were already correct, because `splitPricelistLines`
(analyzer.ts:677) runs `normalizeText` first. My first harness pass appeared to contradict that;
the contradiction was my own artifact (I fed the raw line, skipping normalization). Corrected and
re-measured — the agent is right.

**Sites still wrong at HEAD (my numbers, all measured):**

1. `analyzer.ts:507,526` — a currency-marked price is demoted to non-explicit and loses to a bare
   number. **REGRESSION, see §3.1.**
2. `analyzer.ts:566,~600` — the unselected second price stays verbatim in the service title.
   **REGRESSION, see §3.2.**
3. `analyzer.ts:513` — the year guard covers only `/`. «Договор 1234-2025 на оказание услуг» →
   price 1234, max 2025, category `documents`, **no warning**. «Консультация 900 руб прайс 2024-2025»
   → price **2024 / 2025**, the real 900 ₽ discarded. Pre-existing (old `explicit:
   Boolean(match[3] || match[2])` did the same), so not this commit's fault — but the inventory
   claims the document-number family is closed, and for `-` it is not.
4. `analyzer.ts:838` — the "refusal is visible" rationale fails on its own headline example.
   «Лицензия 5678/2024 Департамент здравоохранения» gets `priceRub: null` and `category: "other"`, so
   the item filter `item.priceRub !== null || item.category !== "other"` **drops the whole row**.
   Measured with a sibling service row present: `items=2`, `response.warnings=[]` — the licence row
   vanishes with no warning at all. `price_not_found` only surfaces for lines classified `documents`
   («Справка…», «Договор…»), which is why the test picked «Справка».
5. `analyzer.ts:513` — the year guard also requires `!hasCurrency`, so «Лицензия 5678/2024 руб»
   bypasses it: AFTER gives **price 2024 / max 5678**, title «Лицензия» (BEFORE: 5678). Contrived
   input; noted for completeness, not a blocker.
6. `analyzer.ts:~600` — «Имплантация до 90000 руб» still yields title «Имплантация до»: a one-sided
   «до» is not part of the priced span, so the dangling preposition reaches the catalog. Pre-existing
   (BEFORE was identical), but it is the same "dangling separator in the title" family the commit
   says it closed.

## 2. Did it touch a money COMPARISON? — YES, one. Not REVERT-grade.

Only one comparison changed anywhere in the diff. Verbatim:

```diff
-        priceMaxRub: priceMaxRub !== null && priceMaxRub >= priceRub ? priceMaxRub : null,
+      priceRub: Math.min(low, high),
+      priceMaxRub: Math.max(low, high) > Math.min(low, high) ? Math.max(low, high) : null,
```

Why this is **not** REVERT-grade:

- **No tolerance, no epsilon.** Grep over every added/removed line for `EPSILON|epsilon|tolerance|
  toFixed|Math.abs`: zero hits. `parseMoney`'s `Math.round(price * 100) / 100` (analyzer.ts:393) is
  untouched context, not an added tolerance. `Math.min`/`Math.max` on already-rounded values
  introduce no drift.
- **It is not a payment gate.** The no-epsilon rule the brief protects lives in
  `apps/api/src/documents/guards.ts` — `moneyRubEquals(kopecks, rub) => kopecks === parseKopecks(rub)`,
  which releases receipts. That file is not in this commit's tree of 3 files. Untouched.
- **The old comparison was the defect.** It nulled the upper bound but kept the *first* position as
  the price, and on a descending pair the first position holds the larger number. Measured: 1000/500
  → 1000 ₽. Reverting reinstates a silent 2x overcharge on every «первичная/повторная» row.

Behavior change worth knowing: equal bounds now yield `priceMaxRub: null` («Отбеливание 12000-12000 руб»
was 12000/12000, now 12000/null). Harmless, arguably better; no consumer depends on the degenerate range.

Not fixed, same family, out of this diff: `itemFromGroq` (analyzer.ts:1003-1006) still carries the
old shape — `priceMaxRubFromModel < priceRub ? null : priceMaxRubFromModel` — so on the AI path a
model-returned 1000/500 still collapses to 1000 ₽ with the max discarded. The deterministic path was
fixed; its twin 460 lines below was not.

## 3. Did it convert something that is NOT money? — and two real regressions

Non-money handling is mostly *good*: the date pattern `\b\d{1,2}\.\d{1,2}\.\d{4}\b` (analyzer.ts:~478)
is correctly classified as not-money and blanked with same-length spaces to preserve indices — I
could not construct a legitimate amount that it eats. `«за»` is correctly absent from the separator
list. `«5000/120 мин»` correctly refuses to treat 120 as a bound.

### 3.1 REGRESSION — a currency-marked price loses to a room number (12x underprice)

`analyzer.ts:507` computes `hasCurrency` from the END of the whole match:

```ts
const hasCurrency = /(?:₽|руб|р)\.?$/iu.test(matchText.trimEnd());
```

but in the `high === null` branch the match text runs PAST the currency mark to swallow the separator
and the rejected number. So `«5000 руб/120»` ends in a digit → `hasCurrency === false` →
`explicit: hasCurrency` (line 526) records a currency-marked price as *inexplicit*. `extractPrice`
(line 560-561) then prefers explicit candidates, finds none, and takes `.at(-1)` — the **last bare
number on the line**.

Measured, real `analyzePricelist` at HEAD vs verbatim old functions:

| input | BEFORE price | AFTER price |
|---|---|---|
| «Седация 5000 руб/120 мин кабинет 412» | **5000** | **412** |
| «Седация 5000/120 мин кабинет 412» | **5000** | **412** |

AFTER title for the first: «Седация 5000 руб/120 мин кабинет» — so the price is wrong *and* the
money stayed in the name. BEFORE title was clean («Седация /120 мин кабинет 412»).

Trigger window: any 3-digit number in 100..299 (or >2,000,000) reached through `-`, `/`, or «до»
right after the price. `/120 мин`, `/150 мин`, `/180 мин` are the standard sedation and anaesthesia
durations, and an imported table row carrying a room or code column supplies the winning number.
`«Наркоз 3000 руб - 60 мин кабинет 415»` is NOT affected (60 is two digits, so `amountPattern` never
engages) — which is why the new test set misses this entirely.

Direction of harm: the clinic **undercharges** — the mirror of the defect the packet opened on, and
larger in magnitude (12x here vs 2x there).

Cheap fix: derive `hasCurrency` from the low-bound slice only, i.e. test
`matchText.slice(0, lowEnd > 0 ? lowEnd : undefined)`, or capture the low-bound currency as its own
named group and test that group.

### 3.2 REGRESSION — the unselected price is left verbatim in the service title

`stripPriceFromTitle` now removes only the *selected* candidate's span, so on a row with two money
figures the other one survives into the title, which by the commit's own harm model reaches the
catalog → the treatment plan → the patient-signed document.

| input | BEFORE title | AFTER title |
|---|---|---|
| «Имплантация 45000 руб, с коронкой 60000 руб» | «Имплантация , с коронкой» | **«Имплантация 45000 руб, с коронкой»** |
| «Чистка 4000 руб, со скидкой 3500 руб» | «Чистка , со скидкой» | **«Чистка 4000 руб, со скидкой»** |
| «Пломба\t3500 руб\t4000 руб» | «Пломба ; ;» | **«Пломба ; 3500 руб»** (price field = 4000) |
| «Коронка 15000 руб установка 5000 руб» | «Коронка установка» | **«Коронка 15000 руб установка»** |
| «Коронка 25000 руб временная 8000 руб» | «Коронка временная» | **«Коронка 25000 руб временная»** |
| «Отбеливание 12000-18000 руб, кабинетное 20000 руб» | «Отбеливание , кабинетное» | **«Отбеливание 12000-18000 руб, кабинетное»** |

The tab-row case is the sharpest: the service is named «Пломба ; 3500 руб» while its `priceRub` is
4000 — one record that contradicts itself, printed for a patient to sign.

**This is disclosed** — the test file carries a «ЧЕСТНО О ПРЕДЕЛЕ» comment and pins it:

```ts
test("две цены в одной строке: в названии остаётся невыбранная", ...
  assert.equal(item.title, "Осмотр 500 руб, повторный осмотр");
```

Two problems with accepting that as settled:

1. **It is absent from the 13-entry inventory reported to the lead.** Disclosure inside a test file
   is not disclosure to the reviewer of the packet. Nothing in the inventory says titles got worse
   for two-price rows.
2. **The stated justification does not hold.** The comment argues this is "the price of refusing to
   cut what wasn't read" — but the other price *was* read: it is already sitting in
   `collectPriceCandidates`' output with `explicit: true` and its own `start`/`end`. Blanking every
   *currency-marked* candidate span (not merely the selected one) keeps the principle intact and
   still leaves «Кабинет 305/2» and «/120 мин» untouched, because neither carries a currency mark.
   The tests at lines 157-167 and 132-140 would still pass.

## 4. Would the tests fail on revert? — YES, named assertions

Not ceremony. Proven against the verbatim old functions from `59a886a2c` (I did not revert the tree).

| test | assertion | old measured value |
|---|---|---|
| «убывающая пара даёт меньшую цену нижней границей» | `assert.equal(item.priceRub, 500)` | **1000** → fails |
| same | `assert.equal(item.priceMaxRub, 1000)` | **null** → fails |
| «диапазон со знаком рубля на каждой границе» | `assert.equal(item.priceRub, 12000)` | **18000** → fails |
| same | `assert.equal(item.title, "Отбеливание")` | **«Отбеливание -»** → fails |
| «знаменатель за единицу остаётся в названии» | `assert.ok(item.title.includes("120"))` | title **«Седация мин»** → fails |
| «номер документа с годом … ценой не считается» | `assert.equal(item.priceRub, null)` | **5678** → fails |
| «дата не разбирается как цена» | `assert.equal(item.priceRub, null)` | **1202** → fails |

Caveat: the test at «две цены в одной строке» pins §3.2, so the suite now **locks the regression in**.
And no test covers §3.1 — the whole added set has no line where a price with a currency mark is
followed by both a 100..299 number and a later ≥300 number.

Test runs at HEAD (claimed counts reproduce exactly):

- `node --import tsx --test src/pricelist/pricelistKopecks.test.ts` → exit 0, tests 33 / pass 33 / fail 0
- `node --import tsx --test src/pricelist/analyzer.test.ts` → exit 0, tests 6 / pass 6 / fail 0
- `node --import tsx --test src/pricelist/groqPricelistKopecks.test.ts` → exit 0, tests 13 / pass 13 / fail 0

## 5. Attribution — clean

- `git log -1 --format=%(trailers) f98692df58fc424b48ea3be547e5c1eb2a5d3b72` → **empty** (`cat -A`
  shows a single `$`, i.e. one bare newline, zero trailers).
- Same for `4710b92f6` → empty.
- `grep -inE "co-authored-by|anthropic|claude|generated with"` over both bodies → exit 1, no match.
- Author/committer on both: `marko1olo <marko1olo@users.noreply.github.com>`.

## 6. Remaining sweeps

- **«руб. ₽»**: 0 hits across `apps/`. `formatKopecksRu` is not used where a decimal belongs.
- **Second money helper beside `@dental/shared`**: none added. Value conversion still goes through the
  pre-existing `parseMoney` (analyzer.ts:383, untouched — it is the hunk's context header). Nit: that
  function does float ruble math (`Number(...)`, `Math.round(x*100)/100`) rather than
  `parseKopecks` from `@dental/shared`, which is what guards.ts's own header comment demands
  ("Считать деньги здесь теперь нечем, кроме packages/shared/src/utils/money.ts"). This commit adds
  ~110 lines of new money-*scanning* code around it and does not close that gap. Pre-existing, nit.
- **Mojibake**: 0. Byte scan of both commits (subject + body + diff) for U+FFFD, `Ð`/`Ñ`/`â`/`Â«`
  sequences → 0 hits. The 73 distinct non-ASCII characters are exactly Cyrillic, `«»`, `‐‑‒–—`, `•`,
  `…`, `₽`, plus U+0301 combining acute (the deliberate stress mark in «бо́льшую»).
- **English reaching a user**: none added. The only English literals in the file are
  `groqSystemPrompt`/`groqUserPrompt` (model-facing, pre-existing, untouched by this diff).

## Required rework

1. `analyzer.ts:507` — derive `hasCurrency` from the low-bound slice, not from the tail of the whole
   match. Add a test: «Седация 5000 руб/120 мин кабинет 412» must price at 5000, not 412.
2. `analyzer.ts:~600` (`stripPriceFromTitle`) — blank every currency-marked candidate span, not only
   the selected one, and change the pinning test to assert the title is money-free.
3. Report §3.2 in the packet inventory. A behavior regression disclosed only in a test comment is
   not disclosed to the packet's reviewer.
4. Either extend the year guard to `-` (`analyzer.ts:513`) or stop claiming the document-number
   family is closed. «Консультация 900 руб прайс 2024-2025» prices at 2024/2025 today.
5. Fix or retract the "refusal is visible as `price_not_found`" claim: for `category: "other"` rows
   the filter at `analyzer.ts:838` deletes the row silently, including the licence example the
   commit message is built on.
6. Optional, same family: `itemFromGroq` (analyzer.ts:1003) still collapses a descending pair on the
   AI path.
