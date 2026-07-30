# ADVERSARIAL REVIEW — BB1-groq-mode-rounds-kopecks

Commit under attack: `2a914a78d6209ce03389ba3f74bb162271c0fae7`
Docs commit: `869d4c0cd`
HEAD at review time: `fff515a76bd95497b229b958742c772c7c9e4e40`
Reviewer posture: disbelief. Every number re-derived with a different instrument.

STATUS: IN PROGRESS — appended as I go.

---

## 0. Git hygiene (first pass)

- `git show 2a914a78d --stat`: 4 files, +416/-13. Matches the claim EXACTLY.
  - apps/api/src/pricelist/analyzer.ts (+164/-13... net per stat 164 changed)
  - apps/api/src/pricelist/groqPricelistKopecks.test.ts (+173, new)
  - apps/api/src/pricelist/pricelistKopecks.test.ts (+55)
  - packages/shared/src/migration.ts (+37)
- No `apps/api/dist`, no `tsconfig.tsbuildinfo`, no `.data/*.json` staged. CLEAN.
- `git merge-base --is-ancestor 2a914a78d HEAD` -> exit 0. Ancestor CONFIRMED.
- `git diff 2a914a78d HEAD -- apps/api/src/pricelist/ packages/shared/src/migration.ts` -> EMPTY.
  Nobody touched the packet's files after the commit. CONFIRMED.
- `git status --short` = 423 dirty files (other authors' work, this repo is a swarm).
  `git status --short -- apps/api/src/pricelist/ packages/shared/src/migration.ts` = EMPTY.
  So the packet's own files are clean at HEAD and my typecheck reads committed code, not
  somebody's uncommitted draft. Index empty. No foreign work swept in.
- Commit subject: `[ARCHON] fix(прайс): нейро-разбор округлял цену до рубля и обрывал название
  на диапазоне` — Conventional Commits, Russian, names the DEFECT (not the fix), no mojibake.

## 1. Instrument notes

- Rebuilt `@dental/shared` BEFORE typechecking (mandatory; a shared change is invisible to
  apps/api until dist is regenerated).

## 2. THE CHEAPEST CHECK: DOES IT COMPILE? — PASS

Ran (in this order, mandatory):
1. `npm run build -w @dental/shared` -> exit 0. Without this the shared change is invisible to apps/api
   and any typecheck describes yesterday's code.
2. `npm run typecheck` (root, all three workspaces) -> **exit 0**.
   - `@dental/shared` tsc -p --noEmit: clean
   - `@dental/api` tsc -p --noEmit: clean
   - `@dental/web` tsc -b --noEmit: clean

The committed code is GREEN inside its own claim. No repeat of the cycle-10 non-compiling commit.

## 3. z.lazy TYPE-INFERENCE TRAP — CHECKED, NOT TRIPPED

`z.lazy(() => moneyRubSchema)` across a circular module boundary is a classic way to silently
degrade an inferred type to `any`. Instrument used: the GENERATED `packages/shared/dist/migration.d.ts`
(not the source, not the builder's runtime probe).

    sourceMoneyTotalRub: z.ZodNullable<z.ZodLazy<z.ZodEffects<z.ZodNumber, number, number>>>;
    loadedMoneyTotalRub: ...same
    quarantinedMoneyTotalRub: ...same
    // and in the inferred input/output object types:
    sourceMoneyTotalRub: number | null;

Type preserved as `number | null`. No `any` leak, no widening. The lazy did not poison the contract type.

Also checked the SIGN question, which the builder did not raise: `moneyRubSchema` is
`z.number().refine(kopecksAreExact)` — NOT `nonNegative`. So negative totals still validate.
If it had been `positiveMoneyRubSchema`/`nonNegativeMoneyRubSchema`, a legitimately negative
reconciliation total would have started failing. It is the right schema of the three.

## 4. MY OWN INSTRUMENT (different from the builder's)

Builder proved things with node:test unit files calling `itemFromGroq` / internals.
I drove the **real exported public entry** `analyzePricelist(req, catalog)` in deterministic mode —
the same function `routes/pricelist.ts:47` calls — for HEAD and for the PARENT BLOB side by side,
22 Russian pricelist lines. Harness: `scratch/bb1_probe.ts`, output `scratch/bb1_out.json`.
Parent obtained as `git show 2a914a78d^:apps/api/src/pricelist/analyzer.ts`. Exit 0, 22 rows, 0 errors.

### 4.1 Defect was REAL at the parent — CONFIRMED by my own run
| line | parent title | HEAD title | price parent/HEAD |
|---|---|---|---|
| `Отбеливание 12000-18000 руб` | `Отбеливание 12000-` | `Отбеливание` | 12000/18000 both |
| `Отбеливание 12000-18000 ₽` | `Отбеливание 12000-` | `Отбеливание` | 12000/18000 both |
| `Отбеливание от 12000 до 18000 руб` | `Отбеливание от 12000 до` | `Отбеливание` | 12000/18000 both |
| `Консультация 500-700 р.` | `Консультация 500-` | `Консультация` | 500/700 both |
| `Коронка E-max 1500-2000 руб за единицу` | `Коронка E-max 1500- за единицу` | `Коронка E-max за единицу` | 1500/2000 both |

The dangling truncated title is reproduced at the parent and gone at HEAD. Not taken on trust.

### 4.2 PRICE REGRESSIONS INTRODUCED: ZERO
`priceChanged` is false on all 22 lines, including `1500,50 руб` -> 1500.5 and `2300,25` -> 2300.25.
The title regex did not disturb price extraction anywhere I could reach.

### 4.3 FINDING — the code comment asserts an invariant that is FALSE (measured)
`analyzer.ts:469-471` states the currency marker is optional *because* «extractPrice считает пару
«число-число» явной ценой и без него ... поэтому название обязано терять ровно то, что ушло в цену».
Two measured counterexamples where the title lost text that went into NO price:

- `Кабинет 305-310 осмотр 1200 руб` -> parent `Кабинет 305-310 осмотр`, **HEAD `Кабинет осмотр`**.
  priceRub = 1200 in BOTH (it comes from `1200 руб`). The room-number range `305-310` was deleted from
  the service name and contributed nothing to the price. Strictly worse name than the parent.
- `Анестезия аппликационная 200-500 руб` -> parent `Анестезия аппликационная 200-`,
  **HEAD `Анестезия аппликационная`**, price NULL in both. `parseMoney` (`analyzer.ts:392`) rejects
  anything under 300 ₽, so the strip regex's `\d{3,7}` floor of 100 is WIDER than the price floor of
  300. In the band 100..299 the title is stripped and no price is ever produced.
- Third, milder: `Штифт стекловолоконный 1500-2000 мкм` -> HEAD `Штифт стекловолоконный мкм`
  (dangling unit). Here the numbers DO become the price 1500/2000, in the parent too, so the strip is
  symmetric; the pre-existing defect is extractPrice pricing a micrometre range at all.

Severity: NOT revert-grade. The parent was also mangling these titles (`... 200-`, `Кабинет 305-310`
survived only by luck), and no price moved. It is a false claim in a comment plus a real
name-quality regression on two realistic line shapes.

## 5. WOULD THE TESTS FAIL IF REVERTED? — PROVED, NOT REASONED

I did not reason about this. I built a revert simulation:
- `git show 2a914a78d^:apps/api/src/pricelist/analyzer.ts` -> `scratch/pricelist/analyzer_parent.ts`
- one mechanical sed to export `itemFromGroq` in the SCRATCH copy only (the parent did not export it)
- the committed test file copied verbatim, only its import line repointed at the parent

`node --import tsx --test scratch/pricelist/revert.test.ts` -> **exit 1, tests 13 / pass 3 / fail 10.**

Failing at the parent: 1500,50->1501; range kopecks; price-as-string; the fabricated-zero suite (both
tests); fractional durationMinutes; durationMinutes 0 destroying the item; the duration bound;
inverted range; equal bounds. The 3 that pass either way are the legitimate control cases
(«целая цена остаётся целой», and the two «разобрать нечем» null cases).

Confirmed at the parent blob: `asNumberOrNull` sits at lines **733-737** exactly as the brief and the
packet both claim, body verbatim `Math.round(number)` with `number >= 0`.

## 6. SHARED-HALF REACHABILITY — the packet never traced it; I did

The packet's REACHABILITY section traces the analyzer/Groq path link by link and traces the
`packages/shared/src/migration.ts` half **not at all**. Its only evidence there is a probe of the
schema object itself ("1500.505 REJECTED"), which proves the schema rejects — NOT that any production
path validates through it. That is the "fix in an unmounted file" shape. I traced it:

- `migrationReconciliationReportSchema` has exactly 3 references repo-wide (`rg` over apps + packages):
  its own definition, its `z.infer`, and `packages/shared/src/migration.ts:460`.
- **No `.parse()`/`.safeParse()` is ever called on it directly.**
- It is nested in `migrationRunResponseSchema` (migration.ts:457-463), and THAT is parsed at
  **`apps/api/src/routes/migration.ts:140` — `return migrationRunResponseSchema.parse(result)`**.

VERDICT: reachable, one link, via the wrapper. The tightening can execute. But the packet did not
know this — it asserted the fix mattered without tracing the consumer. Reachability confirmed by me.

### 6.1 Can the stricter schema now THROW where it used to pass? — checked, NO
The producer is `apps/api/src/migration/reconcile.ts:425-428`, all three via
`rublesFromKopecks(k) = Number(kopecksToNumericString(k))`. `kopecksToNumericString` calls
`assertWholeKopecks`, which throws on non-integers, and the kopeck inputs are integers by
construction (`Math.round(Number(...))` on the SQL sums at reconcile.ts:176-177, `parseKopecks` at
:180). So the value handed to the schema always has exactly 2 decimals and always satisfies
`kopecksAreExact`. No new 500 on `POST` migration runs from this tightening.

## 7. THE summarize() CLAIM IS OVERSTATED (measured)

INVENTORIES says `analyzer.ts:637-643` summarize() "WAS BROKEN", and the commit body cites
«300,01 + 300,05 + 300,07 ... даёт 900,1299999999999 или 900,13».

I drove that exact input through the public entry, parent vs HEAD (`scratch/bb1_out.json`):
- parent: min 300.01, max 300.07, **avg 300.04**
- HEAD:   min 300.01, max 300.07, **avg 300.04**  — IDENTICAL
- naive float `(300.01+300.05+300.07)/3` = 300.0433333333333

The intermediate sum was indeed sloppy, but the parent already divided and THEN rounded to 2 decimals,
so the user-visible average on the packet's own headline example was never wrong. **The cited example
does not demonstrate a user-visible defect.**

A real difference does exist, but it is a different one. Sweep (`scratch/bb1_avg_sweep.ts`,
400,066 cases, exit 0), comparing the two formulas directly:
- 12 random disagreements collected (collection capped at 12, so this is a floor, not a rate)
- 12/12 of the targeted exact-.5-kopeck ties disagree

Every disagreement is **exactly one kopeck**, e.g. prices [44608.33, 571464.44] -> parent 308036.38,
HEAD 308036.39. On an exact tie the parent's float lands microscopically below .5 and rounds DOWN;
HEAD rounds the exact integer half-up. HEAD is the more defensible of the two, and this is a DERIVED
display average, not a stored amount or a signed document total.

Net: the code change is a genuine improvement; the "WAS BROKEN" label is an overclaim on the evidence
the packet offered for it.

## 8. §3 HUMAN LANGUAGE — not applicable, verified rather than assumed
Filtered the added lines of analyzer.ts for Cyrillic outside comments: the ONLY hit is Cyrillic inside
regex character classes (`[А-Яа-яЁёA-Za-z]`). The commit adds **no new user-facing string**, no button
label, no message interpolating a raw float. Nothing to grade under §3.

## 9. DELETED SYMBOL — no dangling reference (the check that broke a smoke once)
`git grep -n "asNumberOrNull" HEAD -- .` over the WHOLE repo: 10 hits, **all of them prose** inside
`.agents/archon/*` (old commit-message drafts, `cycle12.workflow.js` prompt text, the AA3 review).
Zero hits in `apps/`, `packages/`, `scripts/`, `package.json`. The deletion is clean.

## 10. MY OWN INVENTORY of numeric reads in itemFromGroq (independent re-derivation)
Read `analyzer.ts:877-921` myself and enumerated every numeric read, then compared item-by-item with
the packet's INVENTORIES. Result: **no site missed inside itemFromGroq.**
- `:898` sourceLine `Math.max(1, Math.round(Number(record.sourceLine) || index + 1))` — COUNT, correct.
  Note it KEEPS the `Number()||` coercion the packet says it "dropped"; the packet's own inventory is
  honest that this one is unchanged, and a line number is a position, not a fabricated amount.
- `:911` priceRub — MONEY, fixed. `:912` priceMaxRub — MONEY, fixed + inverted-range guard at :885-892.
- `:913-914` durationMinutes — COUNT, integer preserved, bound applied.
- `:915` confidence `Math.min(0.98, Math.max(0.1, Number(...) || fallback))` — OTHER (0..1), correct.
MONEY-VS-COUNT reverse check: nothing was made fractional that should be integral. `durationMinutes`
is integer-only by construction in `readIntegerCountOrNull` (`Math.round`, then `>= 1 && <= maxValue`),
and the revert simulation proves the split is real, not a widened single reader.

## 11. PROOF AUDIT — every claimed command re-run by me, TRUE exit codes

| claim | my re-run | verdict |
|---|---|---|
| groqPricelistKopecks 13/13 exit 0 | tests 13 / suites 5 / pass 13 / fail 0, exit 0 | CONFIRMED |
| pricelistKopecks 19/19 exit 0 (was 16) | tests 19 / suites 6 / pass 19 / fail 0, exit 0 | CONFIRMED |
| analyzer.test 6/6 exit 0 | tests 6 / pass 6 / fail 0, exit 0 | CONFIRMED |
| smoke:web-text-encoding ok, 422 files, 13 snippets | exit 0, ok true, **checkedFiles 424**, mojibake 0, garbled 0, snippets 13 | CONFIRMED (424 vs 422 is drift: apps/web gained 2 files from other authors since; not a falsification) |
| organizations = 2, `d0000000-...d001` fixture + `4a3420d1-...` real | raw `pg` client, NOT the app's db module: count 2, both UUIDs and both names match character for character | CONFIRMED |
| pre-fix reader executed from parent blob, 1500.5 -> 1501 | parent `asNumberOrNull` verbatim at **733-737**, `Math.round(number)`, `number >= 0`; revert simulation makes 10/13 tests fail | CONFIRMED |
| z.lazy loads without ReferenceError, resolves at first parse | generated `dist/migration.d.ts` types intact; `dist/migration.js:255` carries `.lazy(() => moneyRubSchema)`; `npm run build -w @dental/shared` exit 0 | CONFIRMED |
| single-file tsc exit 0 | superseded by the real gate: full `npm run typecheck` exit 0 on all three workspaces | CONFIRMED, stronger |
| own diff clean of TODO/mock/hardcoded price/hex/px/UUID | re-grepped the added lines: no new user-facing string at all, only comments + regex + logic | CONFIRMED |
| `npm run check:encoding` not claimed | I ran it anyway: exit 0, 2217 files, no findings | no mojibake introduced |

Nothing in the CLAIMED PROVEN list failed to reproduce. This packet is not fabricating its results.

## 12. FINDING — the line numbers the packet was PROUDEST of are partly wrong

The packet says, emphatically: «Every link confirmed by my own read, not copied from the brief. Two
line numbers in the brief were off by one and I am reporting the actual ones.» I audited all of them.
Both files are CLEAN in the working tree and `git diff 2a914a78d HEAD` on them is empty, so nothing
shifted after the commit — there is no excuse available.

CORRECT (verified): analyzer.ts `:76` maxServiceDurationMinutes, `:392` `price >= 300`, `:393`
`Math.round(price*100)/100`, `:496` duration bound, `:559` confidence toFixed, `:608` summarize,
`:637-643` average, `:913-914` durationMinutes, `:915` confidence. Parent `:733-737` asNumberOrNull,
parent `:768/:769/:770` the three call sites, parent `:825/:846/:857/:862` the whole Groq chain — all
four exist at exactly those lines **in the parent blob**, which I checked directly.

WRONG:
1. **`routes/pricelist.ts:47`** for `dentalPricelistAnalysisResponseSchema.parse(await analyzePricelist(...))`.
   Measured: it is at **`:45`** — precisely where the ORIGINAL BRIEF said it was. The packet overrode a
   correct number with a wrong one and justified it with a false claim: it wrote «:45 is the
   requireResolvedOrganizationId line», but `requireResolvedOrganizationId` is at **`:42`**. `:45` is
   the parse. This is fabricated precision inside the section claiming superior rigor.
2. **`routes/pricelist.ts:46`** for `getServiceCatalogForOrganization(orgId)` — actual **`:44`**.
3. **INVENTORIES `:887` priceRub / `:888` priceMaxRub**, explicitly labelled post-fix — actual
   **`:884` / `:885`**. Off by 3.
4. **INVENTORIES `:911` sourceLine** — actual **`:898`**. Off by 13.
5. Presentation defect: links 4-7 of REACHABILITY are PARENT line numbers (825/846/857/862; HEAD is
   969/990/1001/1006 — analyzer.ts went 877 -> 1021 lines) but are printed as "ACTUAL" with no
   pre-fix label, while item 8 in the same list does label its numbers "pre-fix". Mixed numbering in
   one trace. The numbers are real; the labelling is not.

None of this changes the code verdict. All of it is exactly the failure mode this cycle exists to
catch, so it is on the record.

---
---

# SECOND ADVERSARIAL REVIEWER (respawn) — BB1-groq-mode-rounds-kopecks

The section above was written by a PREVIOUS reviewer instance that died mid-task at section 12.
I did not inherit its conclusions. Everything below is re-derived by me with my own instruments;
where I contradict it, I say so explicitly.

Commit under attack: `2a914a78d6209ce03389ba3f74bb162271c0fae7` (code) + `869d4c0cd` (docs)
HEAD when I started: `2fa157e4a`; HEAD moved to `7d5328f9f` DURING my first two commands
(another agent committed concurrently). All my measurements are pinned to the packet commit and
to the parent blob `2a914a78d^`, not to a moving HEAD.

## R2-0. COMPILE GATE — the cheapest check

Order was mandatory and I obeyed it: `npm run build -w @dental/shared` FIRST (exit 0), because
apps/api imports the built output; without it a typecheck describes yesterday's code.

`npm run typecheck` (root, all three workspaces) -> **EXIT 1**.

    @dental/shared  tsc -p --noEmit            -> clean
    @dental/api     tsc -p --noEmit            -> clean
    @dental/web     tsc -b --noEmit            -> 5 errors, EXIT 1
      src/App.tsx(2399,66)  TS2304 Cannot find name 'defaultClinicNoticeHidden'
      src/App.tsx(2415,30)  TS2304 Cannot find name 'setDefaultClinicNoticeHidden'
      src/components/communications/MessageDeliveryConsole.tsx(29,2) TS2440 import conflicts with local 'failNotice'
      src/components/communications/MessageDeliveryConsole.tsx(32,2) TS2440 import conflicts with local 'Notice'
      src/components/communications/MessageDeliveryConsole.tsx(389,35) TS2304 Cannot find name 'countLabel'

The predecessor reviewer's section 2 claims `npm run typecheck` -> **exit 0 on all three
workspaces**. That is NOT what I measured. Attribution below (R2-0a) — this is the single most
important thing to get right, because "typecheck green" is exactly the claim this cycle exists
to distrust.

---
---

# THIRD ADVERSARIAL REVIEWER (respawn #2) — BB1-groq-mode-rounds-kopecks

Reviewer #1 died at section 12. Reviewer #2 died mid-sentence at R2-0a, immediately after
measuring `npm run typecheck` -> EXIT 1 and BEFORE attributing those 5 errors to anyone.
That unfinished attribution is the single most important open question in this file and it is
my first task. I inherit NOTHING; every number below is mine.

STATUS: IN PROGRESS — appended as I go.

## R3-1. COMPILE GATE — and the attribution reviewer #2 died holding

Order obeyed: `npm run build -w @dental/shared` FIRST -> exit 0. Then `npm run typecheck` (root).

    @dental/shared  tsc -p --noEmit  -> clean
    @dental/api     tsc -p --noEmit  -> clean          <-- the packet's workspace
    @dental/web     tsc -b --noEmit  -> 3 errors, EXIT 1

`npm run typecheck` overall EXIT = 1. Reviewer #1 measured exit 0; reviewer #2 measured exit 1 with
5 errors. I measure exit 1 with THREE. All three of us are right — the working tree is a live swarm
and other authors' files moved under us. Reviewer #2's two `App.tsx` errors are gone; the
`MessageDeliveryConsole.tsx` three remain.

ATTRIBUTION — this is the answer reviewer #2 never got to write, and it EXONERATES the packet:

    src/components/communications/MessageDeliveryConsole.tsx(29,2) TS2440 import conflicts with failNotice
    src/components/communications/MessageDeliveryConsole.tsx(32,2) TS2440 import conflicts with Notice
    src/components/communications/MessageDeliveryConsole.tsx(389,35) TS2304 Cannot find name countLabel

1. The file is in `apps/web`. The packet touched `apps/api` + `packages/shared` ONLY.
2. `git status --short` shows the file DIRTY — uncommitted work by another author.
3. `git diff` on that file shows the uncommitted delta is the direct cause: it REMOVES
   `-import { countLabel } from "../../AppHelpers";` (-> TS2304 countLabel) and ADDS `+  failNotice,`
   into an import list (-> TS2440 conflict). The errors live inside somebody else's half-finished
   edit, not in any commit.
4. Causal independence proven, not assumed: `apps/web` consumes NONE of the three changed shared
   fields. Repo-wide search for
   `sourceMoneyTotalRub|loadedMoneyTotalRub|quarantinedMoneyTotalRub|migrationMoneyTotalRubSchema|migrationReconciliationReportSchema`
   returns ZERO hits under `apps/web/`. The shared tightening cannot reach that file.

VERDICT ON THE COMPILE GATE: the committed code is GREEN inside its own claim. `@dental/api` and
`@dental/shared` both clean AFTER the mandatory shared rebuild. No cycle-10 repeat.

## R3-2. THE DEFECT WAS REAL — reproduced with MY instrument, not read

Instrument: `.agents/archon/packets/BB1-groq-mode-rounds-kopecks/scratch/probe.ts`, run under
`node --import tsx` from `apps/api`, exit 0. It drives the REAL exported public entry
`analyzePricelist(request, catalog)` — the same function `routes/pricelist.ts` calls — and separately
executes the PARENT blob asNumberOrNull and the PARENT blob stripPriceFromTitle regex chain
verbatim, so parent-vs-HEAD is measured rather than argued.

PARENT `asNumberOrNull` EXECUTED (money defect, all of it confirmed):

    1500.5      -> 1501      kopecks destroyed
    "1500,50"   -> null      the price VANISHES entirely
    "1500.50"   -> 1501
    18000.25    -> 18000
    12000.1     -> 12000
    0           -> 0         (reaches the catalogue as a 0 rouble service)
    false       -> 0         FABRICATED ZERO
    []          -> 0         FABRICATED ZERO
    {} -> null   "бесплатно" -> null   null -> null
    45.7 -> 46   99999 -> 99999 (69 days accepted)   -30 -> null   600 -> 600

PARENT title, EXECUTED: `Отбеливание 12000-18000 руб` -> `"Отбеливание 12000-"`. Finding #1 real.

HEAD `itemFromGroq` on the same inputs, all id=`price-ai-1` (model item NOT swapped for fallback):
1500.5->1500.5 | "1500,50"->1500.5 | false->null | 0->null | dur 45.7->46 (integer) | dur 0->null with
the item preserved | dur 99999->null | max 12000 below min 18000 -> max null.

MONEY-VS-COUNT: `durationMinutes` is integer at every input I could produce. `readIntegerCountOrNull`
does `Math.round` then `>=1 && <=maxValue`, so it satisfies `z.number().int().positive().nullable()`
at `index.ts:1736`. Nothing was made fractional that must be integral. The reverse (money left
rounded) also holds: all three named sites now carry kopecks.

## R3-3. CONFIRMED REGRESSION — the new title regex deletes text that is NOT a price

This is my main finding and it is NOT in the packet FOUND NOT FIXED list.

The new rule at `analyzer.ts:481-484` makes the currency marker OPTIONAL. So ANY `NNN-NNN` pair of
3-7 digits is deleted from the service NAME, currency or not. The source comment justifies that with
an explicit invariant: «extractPrice считает пару «число-число» явной ценой и без него ... поэтому
название обязано терять ровно то, что ушло в цену.»

**MEASURED: that invariant is FALSE.** Four realistic Russian pricelist lines where the HEAD title is
strictly WORSE than the parent (parent column = parent regex chain executed verbatim):

| source line | parent title | HEAD title | HEAD price |
|---|---|---|---|
| `Гарантия на пломбу 100-200 дней 900 руб` | `Гарантия на пломбу 100-200 дней` | **`Гарантия на пломбу дней`** | 900 |
| `Файл ProTaper размер 021-025 стерильный 450 руб` | `Файл ProTaper размер 021-025 стерильный` | **`Файл ProTaper размер стерильный`** | 450 |
| `Кабинет 305-310 осмотр 1200 руб` | `Кабинет 305-310 осмотр` | **`Кабинет осмотр`** | 1200 |
| `Штифт стекловолоконный 1500-2000 мкм` | `Штифт стекловолоконный 1500-2000 мкм` | **`Штифт стекловолоконный мкм`** | 1500/2000 |

In rows 1-3 the deleted range contributed NOTHING to the price — the price came from the separate
`NNN руб` token (900 / 450 / 1200). A warranty period, an ISO endodontic file size and a room-number
range were erased from the catalogue name the doctor reads, and rows 1 and 4 leave a dangling unit
(«дней», «мкм»). The parent preserved all four.

Fifth case, invariant failing the other way — text deleted, NO price produced at all:

| `Анестезия аппликационная 200-500 руб` | `Анестезия аппликационная 200-` | `Анестезия аппликационная` | **null** |

Root cause, statically provable: the strip-regex floor is `\d{3,7}` = 100, but `parseMoney`
(`analyzer.ts:392`) refuses anything under **300 ₽**. In the band 100..299 the title is stripped and
no price is ever created. The two floors are different numbers and nothing links them.

Severity: NOT revert-grade. No price moved anywhere (`priceRub`/`priceMaxRub` identical parent vs HEAD
on all 19 lines I drove), and the parent was already mangling three of these five. It is a real
name-quality regression on plausible input PLUS a false invariant asserted in a source comment as the
justification for the risky part of the change. The packet added a test for the case it fixed and none
for the class it broke.

## R3-4. THE summarize() HEADLINE EXAMPLE IS AN OVERCLAIM — measured

INVENTORIES says `analyzer.ts:637-643` "WAS BROKEN"; the commit body evidence is «300,01 + 300,05 +
300,07 в double даёт 900,1299999999999 или 900,13».

I drove those three prices through the real public entry and compared both formulas directly:
**parent avg = 300.04, HEAD avg = 300.04. IDENTICAL.** The parent divided and THEN rounded to 2
decimals, so the sloppy intermediate sum never reached the user on the headline example the packet
itself chose.

A real difference does exist, and I sized it with a 200,000-case sweep (`probe.ts` section 5, exit 0):
**10,781 / 200,000 = 5.4% of cases disagree, every one by exactly one kopeck, HEAD always higher**
(e.g. `[158680.40, 158811.93]` -> parent 158746.16, HEAD 158746.17). On an exact half-kopeck tie the
parent float lands microscopically below .5 and rounds down; HEAD rounds the exact integer half-up.
HEAD is the more defensible of the two, and this is a DERIVED display average, not a stored or signed
amount. Net: the code change is a genuine improvement; the label "WAS BROKEN" is not supported by the
example offered to prove it.

## R3-5. NEW: type-dependent money asymmetry the packet documented nowhere

`readMoneyKopecksOrNull` answers differently for the same value depending on its JSON type:

    { priceRub: 1500.505 }   -> 1500.51   (silently rounded up by parseKopecks toFixed(2))
    { priceRub: "1500.505" } -> null      (string regex \d{1,2} refuses 3 decimals -> deterministic fallback)

Both outcomes stay kopeck-exact so this is not a money-integrity break, but an LLM JSON type for a
numeric field is not stable, and the same model answer therefore yields two different prices. The
string path was given an explicit format guard with a comment; the number path silently rounds. Nit.

## R3-6. NEW: the inverted-range guard does not cover max-without-min

`{ priceMaxRub: 18000 }` with no `priceRub` -> HEAD `price=null max=18000`, contract accepts
(`index.ts:1734-1735`, both `.nullable()` independently). The new guard at `analyzer.ts:888-893`
requires `priceRub !== null` before it fires, so an upper bound with no lower bound survives into the
catalogue. Behaviour is IDENTICAL at the parent, so pre-existing, not a regression — but the packet
claimed to have closed the range-sanity hole and this half of it is still open.

## R3-7. Pre-existing, NOT introduced, and the new rule does not catch it

`Имплантация Osstem акция 2024-2026 45000 руб` -> title `Имплантация Osstem акция 2024-2` at BOTH
parent and HEAD. The older thousands-separator rule (`analyzer.ts:437-440`) consumes `026 45000 руб`
before the new range rule is ever reached, so the year range is mangled and the new rule cannot help.
Pre-existing; recorded so it is not mistaken for a regression later.
