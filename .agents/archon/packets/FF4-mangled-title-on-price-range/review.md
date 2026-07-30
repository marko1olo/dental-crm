# FF4-mangled-title-on-price-range — adversarial review

Commits: `68d41f863c59ec1f0cf41852b9cdb677e791ae1e` (fix + tests), `ebee6a7afe7489a54c3bcf8257ecce932dcb4b18` (comment).
Files at HEAD: `apps/api/src/pricelist/analyzer.ts`, `apps/api/src/pricelist/pricelistKopecks.test.ts`.
Reviewer wrote nothing outside this packet dir. Verdict: **NEEDS_REWORK**.

Everything below was measured, not read. Tooling (read-only, in this dir):
`reviewer-probe-head.ts`, `reviewer-probe-two-option.ts`, `reviewer-probe-missed-forms.ts`,
`reviewer-revert-hook.mjs` (a `node:module` `load` hook that undoes the three added `\/|`
fragments **in memory** — it prints `total reverted sites: 3 (expected 3)` so a silent no-op
cannot masquerade as a passing reverted tree). No file in the working tree was edited.

## What the diff actually is

Three regex separator lists in `analyzer.ts` gain `\/`:

- `:418` `priceRegex` — `(?:-|до)` → `(?:-|\/|до)`
- `:447` thousands strip rule — `(?:-|до)?` → `(?:-|\/|до)?`
- `:501` range strip rule — `(?:-|до)` → `(?:-|\/|до)`

Plus Russian comments and 25 new test lines. Nothing else.

## Check 2 — money COMPARISON: NOT TOUCHED (confirmed)

Grep over the combined diff of both commits for `>=|<=|<|>|epsilon|tolerance|Math.abs|Math.round|toFixed|Number(`
returns exactly one hit, and it is the lookbehind `(?<![А-Яа-яЁёA-Za-z])` in the range strip rule —
a regex construct, not a comparison. `analyzer.ts:425` (`priceMaxRub >= priceRub`), `:908-911`
(the Groq branch `priceMaxRubFromModel < priceRub`) and the integer-kopeck aggregation at
`:642-661` (`sumKopecks`/`parseKopecks`) are byte-identical to the parent. **No tolerance
introduced. Not REVERT-grade.**

But the money OUTCOME changes anyway, through the untouched guard — see Finding 1.

## Finding 1 (worst) — priceRub silently changes for the «A/B» two-option idiom

In a Russian pricelist `A/B` most often means **two discrete options** (взрослый/детский,
первичный/повторный, старая цена/новая цена, одна челюсть/две) or a per-unit rate. A *range* is
written with a dash or «от…до». The commit declares `/` a range separator globally. Measured
through the real `analyzePricelist` (deterministic branch), BEFORE = in-memory revert, AFTER = HEAD:

| line | BEFORE priceRub | AFTER priceRub | AFTER max |
|---|---|---|---|
| `Консультация 1000/500 руб` | 500 | **1000** | null |
| `Осмотр 500/300 руб` | 300 | **500** | null |
| `Отбеливание 18000/12000 руб` | 12000 | **18000** | null |
| `Отбеливание 18000/12000` | 12000 | **18000** | null |
| `Чистка 4000/6000 руб` | 6000 | **4000** | 6000 |
| `Осмотр 300/500 руб` | 500 | **300** | 500 |

For a descending pair the recorded price now jumps to the **higher** number (+500 ₽, +200 ₽,
+6000 ₽ in the rows above). The commit message claims safety:

> Сравнение границ не добавлено: диапазон отбирает существующая проверка priceMaxRub >= priceRub в extractPrice.

True but incomplete. When that guard rejects the pair it nulls **only the max**; the pair was
already consumed as ONE `candidate` (`explicit: Boolean(match[3] || match[2])` is true because
`match[2]` matched), so the second number no longer forms its own candidate and the *first,
higher* number wins `.at(-1)`. Pre-fix, the two numbers were independent candidates and the
currency-marked one won. Same mechanism lowers `priceRub` for ascending pairs and invents a range.

By the commit's own argument this value reaches the treatment plan and the signed document; it
also shifts per-category `minPriceRub`/`maxPriceRub`/`averagePriceRub` (`analyzer.ts:642-661`).
**Test coverage for this: zero.** Not one added case has a descending pair or an ascending
two-option pair. (The descending-pair behaviour class pre-exists for `-`; the commit newly routes
the far more common `/` idiom into it.)

## Finding 2 — Check 3: the strip rules now delete text that is NOT money

The strip rule at `:501` has no 300 ₽ floor and no sanity bounds — only `\d{3,7}` on both sides.
Every row below had an **intact** title before the commit and is mangled at HEAD:

| line | BEFORE title | AFTER title |
|---|---|---|
| `Седация 5000/120 мин` | `Седация 5000/120 мин` | **`Седация мин`** |
| `Наркоз 12000/100 мин` | `Наркоз 12000/100 мин` | **`Наркоз мин`** |
| `Лицензия 5678/2024 Осмотр 500 руб` | `Лицензия 5678/2024 Осмотр` | **`Лицензия Осмотр`** |
| `Договор 1234/2025 Отбеливание 12000 руб` | `Договор 1234/2025 Отбеливание` | **`Договор Отбеливание`** |
| `Прайс 2025/2026 Отбеливание 12000 руб` | `Прайс 2025/2026 Отбеливание` | **`Прайс Отбеливание`** |
| `Кабинет 101/102 Осмотр 500 руб` | `Кабинет 101/102 Осмотр` | **`Кабинет Осмотр`** |
| `Анестезия Ультракаин 1000/2000 мг 500 руб` | `Анестезия Ультракаин 1000/2000 мг` | **`Анестезия Ультракаин мг`** |

`Кабинет 101/102` is the cleanest statement: 101 and 102 are **below the 300 ₽ money floor**, so
`extractPrice` refuses to call them money, yet the strip rule deletes them from the title anyway.
License and contract numbers are deleted from the line that goes into the clinic catalogue.

The claimed inventory says «Счёт единиц косой чертой не затронут … требование трёх цифр в каждой
границе их отделяет». That holds only for the three lines probed. It fails two ways:
3-digit denominators (`5000/120 мин`) hit rule `:501`; a thousands-separated numerator hits rule
`:447`, whose upper bound is `\d{0,3}` — `Гигиена 3 000/1 час` → `Гигиена час`,
`Имплантация 45.000/1 имплант` → `Имплантация имплант` (BEFORE: `Гигиена /1 час`,
`Имплантация /1 имплант` — mangled differently, so that pair is a nit, not a regression).

## Finding 3 — Check 1: the dispatched defect STILL REPRODUCES at HEAD

The packet's own claim is «reported defect does NOT reproduce». That is true only for the single
currency placement probed (marker after the upper bound). Put the marker after **both** bounds —
at least as common in real pricelists — and both symptoms are fully intact at HEAD, on **dash**
forms, i.e. the originally reported class:

| line at HEAD | title | priceRub | priceMaxRub |
|---|---|---|---|
| `Отбеливание 12000 руб - 18000 руб` | **`Отбеливание -`** | 18000 | **null** |
| `Отбеливание 12000 руб. – 18000 руб.` | **`Отбеливание -`** | 18000 | **null** |
| `Отбеливание 12000 ₽ - 18000 ₽` | **`Отбеливание -`** | 18000 | **null** |
| `Отбеливание 12000₽-18000₽` | **`Отбеливание -`** | 18000 | **null** |
| `Отбеливание 12000 р. - 18000 р.` | **`Отбеливание -`** | 18000 | **null** |
| `Отбеливание от 12000 руб до 18000 руб` | **`Отбеливание от до`** | 18000 | **null** |
| `Отбеливание 12000/15000/18000 руб` | **`Отбеливание /`** | 18000 | **null** |
| `Отбеливание 12000-15000-18000 руб` | **`Отбеливание -`** | 18000 | **null** |
| `Отбеливание 12000 или 18000 руб` | `Отбеливание 12000 или` | 18000 | null |
| `Отбеливание 12000…18000 руб` | `Отбеливание 12000...` | 18000 | null |

Mangled title **and** a silently destroyed lower bound — the exact pair of harms the commit
message describes, still shipping. The three-tier slash chain is the packet's headline symptom
(dangling separator) surviving *the fix itself*. Root cause is not the separator list: a currency
marker between the bounds defeats both `priceRegex` and the `:501` strip rule.

## Check 4 — would the test fail on revert? YES, named

Committed test file, fix reverted in memory (`reviewer-revert-hook.mjs`, 3/3 sites reverted):

```
not ok 3 - диапазон цены уходит из названия целиком, без оборванного хвоста
not ok 4 - копейки в обеих границах диапазона доезжают до контракта
# tests 21  # pass 19  # fail 2
```

- `pricelistKopecks.test.ts:210` — `assert.equal(item.title, "Отбеливание", …)`,
  actual `'Отбеливание 12000/'` for `Отбеливание 12000/18000 руб`.
- `pricelistKopecks.test.ts:224` — same assertion, actual `'Отбеливание 12000,50/'`.

`:211`/`:212` (priceRub 12000 / priceMaxRub 18000) would also break; the title assertion fires
first. Not ceremony. HEAD counts reproduce the claim exactly: `pricelistKopecks` 21/21,
`analyzer` 6/6, `groqPricelistKopecks` 13/13.

The added *guard* tests («3000/1 час», «1500/2 поверхности», «15000/зуб», «Каппа 12/16 лет») pass
before and after by construction — fair as regression pins, but the cases that would have caught
Findings 1 and 2 (3-digit denominator, thousands-separated numerator, descending pair) are exactly
the ones absent.

## Check 5 — attribution: CLEAN

`git log -1 --format='%(trailers)'` → **empty** for both commits. `grep -icE
'co-authored|anthropic|generated with|claude'` over each body → **0** and **0**. Author and
committer are `marko1olo <marko1olo@users.noreply.github.com>` on both. Nit only: both subjects
carry the `[ARCHON]` orchestration prefix while neighbours (`382d27a35`, `7214d458d`, `80bc539ee`)
do not — not vendor attribution, but it is inconsistent history.

## Check 1 in the brief's own schema (guards.ts) — stale field, re-derived anyway

The brief's "11 raw / 4 already correct" belongs to a money-formatting packet. Neither commit
touches `apps/api/src/documents/guards.ts` (`git show --name-only` → 0 hits). My own grep at HEAD:
**11 money-in-text interpolation sites, all 11 already routed through `moneyRubText` /
`moneyKopecksText`, zero raw** (`:424 :540 :544 :545 :744 :758 :772 :783 :841 :850 :881`). The
"11 raw" number is stale. `moneyRubText` (`guards.ts:87`) wraps
`kopecksToNumericString(parseKopecks(rub))` from `@dental/shared` — a thin wrapper, not a second
money helper. `guards.ts:744` still interpolates `строка ${index + 1}` raw: a line number,
correctly not money-formatted.

## Sweeps — all clean

- `₽ руб` / `руб. ₽` adjacency anywhere in `apps/**` `packages/**`: none.
- Replacement chars in either commit: 0. `Ð|Ñ|Â|Ã` mojibake in diffs or subjects: 0.
- Added English string reaching a user: none (all added strings are Russian).
- Float-fragile kopecks at HEAD: `12000,10/18000,30` → 12000.1/18000.3, `1500,01/2500,07` →
  1500.01/2500.07, contract accepted, no throw. The added test only uses binary-exact `,50`/`,75`,
  so it does not prove this — I proved it separately.
- Standing debt, untouched and not this packet's fault: `analyzer.ts:383` `parseMoney` is a
  float-rubles money parser (`Math.round(price * 100) / 100`) living beside the integer-kopeck
  helpers from `@dental/shared`.

## Required rework

1. Stop treating `/` as a range separator unconditionally, or stop letting a rejected
   (`max < min`) pair collapse two candidates into the higher one. `Консультация 1000/500 руб`
   must not become 1000 ₽ silently. Add a descending-pair and an ascending two-option test.
2. Bound the `:501` strip rule to text `extractPrice` actually priced (same 300 ₽ floor, same
   selected match) so license numbers, contract numbers, dates, room numbers and per-unit
   denominators stop being deleted from service titles. Pin `Седация 5000/120 мин` and
   `Лицензия 5678/2024 …`.
3. Fix the currency-on-both-bounds range family (`12000 руб - 18000 руб`, `12000 ₽ - 18000 ₽`,
   `от 12000 руб до 18000 руб`) — the dispatched defect, still live, both title and lower bound.
   Pin all of them.
4. Correct the commit-message claim that the existing `priceMaxRub >= priceRub` check makes the
   change safe; it does not restore the prior price selection.
