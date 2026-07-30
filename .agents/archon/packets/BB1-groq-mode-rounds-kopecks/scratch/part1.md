
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
