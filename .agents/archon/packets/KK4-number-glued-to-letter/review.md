# KK4 «число приклеено к букве» — adversarial review (in progress)

REVIEWER: adversarial, did not write the code. READ-ONLY.
COMMIT UNDER REVIEW: c31252afbb8e59de7b62fb419b976a3f6003cba2
HEAD at review time: b33134d24 (review commit IS an ancestor of HEAD — verified via `git merge-base --is-ancestor`)

## Sequence actually on disk (my own `git log -- <files>`)

```
f1592b977  [ARCHON] fix(прайс): две разные величины ... lowText   <- rename, touches the KK4 hunk
27408f5f1  [ARCHON] test(прайс): бренд с цифрой ...               <- the NEW test file lives HERE, not in c31252afb
c31252afb  [ARCHON] fix(прайс): цена рядом с кодом модели         <- the fix under review (analyzer.ts ONLY, 71+/2-)
2918ee42f  [ARCHON] fix(прайс): «Filtek Z550 3500» стоила 550 350 ₽  <- the (?!\d) half of the same defect
```

FILES-list discrepancy (not a defect, a bookkeeping note for the lead): the brief lists
`pricelistBrandDigits.test.ts` as part of c31252afb. `git show --stat c31252afb` shows **one** file,
`apps/api/src/pricelist/analyzer.ts`. The test suite was committed separately in 27408f5f1, and the
KK4 hunk was renamed once more in f1592b977. All three are ancestors of HEAD, so the review is of the
HEAD state of the fix.

## 5 — Attribution (ran first, cheapest)

```
$ git log -1 --format=%(trailers) c31252afbb8e59de7b62fb419b976a3f6003cba2
(literal empty output — `cat -A` shows a single `$`, i.e. one bare newline, no trailer lines)
```

EMPTY. Author `marko1olo <marko1olo@users.noreply.github.com>`. Body greps pending.

## HARNESS (fully read-only — nothing written into the repo tree)

`git show c31252afb^:apps/api/src/pricelist/analyzer.ts` and `git show HEAD:…` dumped verbatim to
`C:/Users/Admin/AppData/Local/Temp/kk4rev/{base,head}.raw.ts`; a builder rewrote ONLY the two import
specifiers (`@dental/shared` → the real `packages/shared/dist/index.js`, `../speech/keyPool.js` → the real
`apps/api/src/speech/keyPool.ts`) and appended one `export {}` line. No function body retyped.
Probe: `C:/Users/Admin/AppData/Local/Temp/kk4rev/probe.mts`, 54 forms, run through
`normalizeText` → `extractPrice` → `stripPriceFromTitle`, exactly as `buildItemFromLine` does
(analyzer.ts:901-904).

`cd apps/api && node --import tsx C:/Users/Admin/AppData/Local/Temp/kk4rev/probe.mts` → exit 0,
54 forms, 16 changed, 38 byte-identical.

## FINDING 1 (blocking) — an explicit ₽ price gets REPLACED by a different explicit ₽ price, upward

Both numbers carry «руб». Measured base→head:

```
FORM «Осмотр 500 руб, повторный осмотр300 руб»
   BASE price=300  title=«Осмотр 500 руб, повторный осмотр»
   HEAD price=500  title=«Осмотр , повторный осмотр300 руб»
FORM «Консультация 1500 руб, повторная800 руб»
   BASE price=800  title=«Консультация 1500 руб, повторная»
   HEAD price=1500 title=«Консультация , повторная800 руб»
```

analyzer.ts:737-738 states the in-file convention in its own words: «Знак рубля неоднозначность
снимает: у явных цен последняя остаётся выбранной (проверено на «Осмотр 500 руб, повторный осмотр
300 руб»)» — and analyzer.test.ts pins the spaced form at 300. The demotion runs AFTER the explicit
filter (`detached = withCurrency.filter(...)`, analyzer.ts:716), so when the LAST explicit price is
glued to a letter the pool collapses to the earlier one and the repeat-visit price 300 ₽ is published
as 500 ₽ — +67 %, silently, no warning, into the catalog → treatment plan → the document the patient
signs. 1500 vs 800 is +87 %.

Second half of the same finding: the title. HEAD cuts «500 руб» out of the MIDDLE and leaves
«повторный осмотр300 руб» standing, so the catalog row reads a title containing «300 руб» while the
price field says 500 ₽, plus a dangling «Осмотр ,». The two visible numbers now contradict each other.

## FINDING 2 (blocking) — the ambiguity guard is suppressed, and a YEAR becomes the price

The demotion drops the glued candidate BEFORE `ambiguous` is computed (analyzer.ts:740-741), so a line
that the parser used to refuse now yields a confident price built from the number that is NOT money:

```
FORM «Осмотр1500 2024»          BASE price=null → HEAD price=2024  title=«Осмотр1500»
FORM «Прайс 2024 Осмотр1500»    BASE price=null → HEAD price=2024  title=«Прайс Осмотр1500»
FORM «Гигиена-3500 скидка 500»  BASE price=null → HEAD price=500   title=«Гигиена-3500 скидка»
FORM «Осмотр1500 повторно 800»  BASE price=null → HEAD price=800   title=«Осмотр1500 повторно»
FORM «Консультация1500 повторная 800»       BASE null → HEAD 800
FORM «Скидка30% Осмотр1500 повторно 800»    BASE null → HEAD 800
```

«2024» as the price is check-3 by the letter: the year is not money. This file already knows that —
notMoneyPatterns:537 blanks `01.01.2025` with the comment «Датой в прайсе помечают редакцию, а не
цену», and `looksLikeYear` exists (analyzer.ts:595) — but the year guard only fires for the `/`-separator
high group, and a bare edition year «Прайс 2024» has always been a live candidate. Before this commit
the ambiguity guard covered it; the demotion removed that cover.

The commit's own defence («ОТКАТА К ПУСТОМУ НАБОРУ ЗДЕСЬ НЕТ … ни одна строка цену не теряет»,
analyzer.ts:710-717) is true and beside the point: no line loses a price, lines GAIN a wrong one. The
34-form measurement set contains no line with a glued number AND a detached non-price number, which is
why «25 прочих форм побайтово те же» missed the whole failure mode.

## FINDING 3 (blocking, realistic form) — the edition year of the pricelist becomes the price

```
FORM «Осмотр1500 прайс 2024»            BASE null → HEAD price=2024  title=«Осмотр1500 прайс»
FORM «Гигиена-3500 действует с 2024»    BASE null → HEAD price=2024  title=«Гигиена-3500 действует с»
FORM «Осмотр1500 ; 800»                 BASE null → HEAD price=800   title=«Осмотр1500»
FORM «Осмотр1024 ; Пломба ; 3500»       BASE null → HEAD price=3500  title=«Осмотр1024 ; Пломба»
FORM «Консультация1000 первичная ; 1500 повторная»  BASE null → HEAD price=1500
```

`pricelistLastNumber.test.ts:171-177` pins the SPACED twin of the fourth line —
«Осмотр 1024 ; Пломба ; 3500» → priceRub null + `price_not_found` + title untouched, with the comment
«цена выдумана из неоднозначной строки». Delete one space and HEAD publishes 3500 ₽. The rule the
repo tests by name is broken by the glued variant of the very same line, and no test covers the glued
variant, which is why the suite is green.

The tab-separated «;» form is not a synthetic string: `splitPricelistLines` (analyzer.ts:890) turns
every table tab into « ; », so this is the shape every XLS/PDF table export arrives in.

## What the fix genuinely buys (measured, not conceded on trust)

8 forms move null → correct price (the commit's list reproduces exactly), plus two I added:

```
«Пломба Filtek Z550 ; 3500»                     null → 3500   (table row — the common real shape)
«Коронка E.max 15000 руб, вкладка E.max550 руб»  550 → 15000  (a 27× UNDERCHARGE fixed)
```

That last one is the strongest argument for the packet existing: BASE priced a crown at 550 ₽ because
the model tail carried the «руб» marker. HEAD gets 15000 ₽. So the direction of the change is right;
its blast radius is not bounded.

## 4 — revert proof (real assertions, not ceremony)

The new suite copied to temp with its import repointed at the pre-fix blob
(`C:/Users/Admin/AppData/Local/Temp/kk4rev/reverted.test.mts` → `base.ts`), run with the repo's tsx:

```
$ cd apps/api && node --import tsx --test .../reverted.test.mts
ℹ tests 9  ℹ pass 5  ℹ fail 4        REVERTED_EXIT=1
```

First assertion to break — `pricelistBrandDigits.test.ts:81`:
`assert.equal(item.priceRub, expectedPrice, "ценой стал хвост кода модели (строка «Пломба Filtek Z550 3500»)")`
→ `actual: null, expected: 3500`.
Also breaking: `:52` `assert.ok(item, …)` → `actual: undefined` (no item at all for «Цемент РЦ550 1400»);
`:103` → `actual: null, expected: 3500.5`; `:115` title → `actual: 'Пломба Filtek Z550 3500'`,
`expected: 'Пломба Filtek Z550'`.
At HEAD the same file is `tests 9 / pass 9 / fail 0`, exit 0. The test is load-bearing, not ceremony.

## 2 — money comparison / tolerance: NOTHING TOUCHED

Every added or removed line in the diff carrying an operator:

```
-  const pool = explicit.length ? explicit : candidates;
+  const withCurrency = explicit.length ? explicit : candidates;
+  const detached = withCurrency.filter((candidate) => !candidate.glued);
+  const pool = detached.length ? detached : withCurrency;
```

Four `.length` truthiness checks. No relational or equality comparison of a money value is added,
removed or altered; `Math.min/Math.max` at analyzer.ts:685-686 and the `price >= 300 && price <= 2_000_000`
bounds in `parseMoney` are context lines, byte-identical. No epsilon, no tolerance, no `toFixed`.
NOT revert-grade on this axis.

## 1 — money-in-text sites (brief's own framing, re-derived by me)

The commit touches ONE file, `apps/api/src/pricelist/analyzer.ts` (`git show --name-only`). `guards.ts`
is not in the commit and is clean in the worktree, so "sites missed" cannot be charged to KK4. Numbers
anyway, at HEAD, `apps/api/src/documents/guards.ts` (1303 lines):

```
$ rg -n --pcre2 '\$\{(?![^}]*money(?:Rub|Kopecks)Text)[^}]*(?:Rub|Kopecks|amountRub|sum|Sum|price|Price|total|Total|balance|debt|paid)[^}]*\}' → 0 matches
```

**0 raw money-in-text sites.** All 11 money interpolations (lines 424, 540, 544, 545, 744, 758, 772,
783, 841, 850, 881) go through `moneyRubText`/`moneyKopecksText`. The lead's "11 raw at dispatch" is
already fully converted at HEAD by an earlier packet.

## 3 — non-money conversion

- `${index + 1}` at guards.ts:744 is a LINE NUMBER and is still raw. Correct, untouched.
- No row count was converted.
- But in this commit's own domain, non-money DOES become money: the year 2024 (Findings 2 and 3), a
  discount, and a second service's price. That is the check-3 failure, in the pricelist rather than in
  guards.ts.

## Sweeps

- «руб. ₽» double unit: `rg 'руб\.?\s*₽|₽\s*руб' apps/api/src apps/web/src` → 0 hits. `moneyRubText`
  returns `kopecksToNumericString(parseKopecks(rub))`, a numeric string, so the « руб.» suffix in the
  templates is right and `formatKopecksRu` is not misused.
- Second money helper: none in `apps/api/src/pricelist/` (`formatKopecksRu|toLocaleString|Intl.NumberFormat`
  → 0 hits). `moneyRubText`/`moneyKopecksText` are thin wrappers over @dental/shared, not a second
  implementation. Pre-existing NIT, not from this commit: `parseMoney` carries money as float rubles
  (`Math.round(price * 100) / 100`) while the rest of the money path is integer kopecks.
- Mojibake: none. Subject/body/diff carry no U+FFFD and no Ð/Ñ/â€ sequences; `analyzer.ts` round-trips
  UTF-8 exactly (76559 bytes, 0 replacement chars).
- English reaching a user: the diff adds no string literal at all beyond the regex `""` default and the
  pattern itself — comments and identifiers only. The test file's messages are all Russian.

## Bookkeeping

- `git status --porcelain -- apps/api/src/pricelist/` first showed ` M analyzer.ts`; that was a stale
  stat cache, not an edit — `git hash-object` on the worktree file and `git rev-parse HEAD:…` both give
  `200d961bf1531848cc1bf1623e17c1673b238bdc`. I ran `git update-index --refresh -q` (stat-cache only,
  nothing staged) to clear it; disclosed for honesty since it writes .git/index.
- Files I created live only in `C:/Users/Admin/AppData/Local/Temp/kk4rev/` and this review.md.

## VERDICT: NEEDS_REWORK

The defect is real, the direction is right, the test is load-bearing, attribution is clean, no
comparison was touched. But the demotion is placed where it disarms the guard that this file's own
comments call the only acceptable outcome for an unreadable line, and it overrides a selection rule
pinned by two existing test files. 8 of my 54 forms moved from «refuse + price_not_found» to a silently
wrong price; 2 moved from one explicit price to a higher explicit price.

