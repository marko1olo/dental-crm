# BB1-groq-mode-rounds-kopecks — state

STATUS: DONE — code committed 2a914a78d6209ce03389ba3f74bb162271c0fae7, re-verified after respawn,
handoff.md written. Committing packet docs (tracked convention: 222 packet files already in git).

## Re-verification results (second instance, all my own commands)
- 3 test files: 13/13, 19/19, 6/6 — exit 0 each.
- single-file tsc on analyzer.ts + both tests: exit 0. On packages/shared/src/migration.ts: exit 0.
- pre-fix asNumberOrNull executed from blob 2a914a78d^: 1500.5→1501, "1500,50"→null, false→0, []→0.
- runtime probe of BUILT @dental/shared: migration report schema REJECTS 1500.505 and 0.001,
  ACCEPTS 1500.5 / 1500 / null. z.lazy ESM-cycle workaround loads without ReferenceError.
- smoke:web-text-encoding: ok true, 422 files, 0 mojibake, exit 0.
- organizations = 2 (fixture d0000000… + real 4a3420d1…), confirming delta item 6.
- CORRECTION to first instance: packages/shared/dist/migration.js was rebuilt at 20:30 and ALREADY
  carries the z.lazy fix, so migration.ts is NOT inert any more. leadMustRun is now insurance only.
- analyzer.ts:393 Math.round(price*100)/100 is a pre-existing REDUNDANT money rounder, proven no-op
  over 25,300 samples of the real domain (0 values altered). Left untouched, recorded as debt.
- HTTP proof unavailable: token signed by the documented recipe verifies locally but the running
  server answers 401 AuthRequired → live process holds a different secret. Stopped at two attempts.

## RESPAWN (second instance, previous one died before handoff.md)
HEAD now 9bcacf957df9a3883eac4d4b8f3d945baab6089d (moved past my commit; my commit IS an ancestor —
`git merge-base --is-ancestor 2a914a78d HEAD` exit 0).
`git diff 2a914a78d HEAD -- apps/api/src/pricelist/ packages/shared/src/migration.ts` → EMPTY,
so nobody has touched my files since. Claim clean: `git status --porcelain` on it → empty.
Re-ran ALL THREE test files myself, exit 0 each: 13/13, 19/19, 6/6.
Re-executed the PRE-FIX reader from blob 2a914a78d^ — defect reconfirmed, not taken on trust.
ABOUT TO RUN (slow): single-file `npx tsc --noEmit` with flags mirrored from apps/api/tsconfig.json +
tsconfig.base.json on analyzer.ts, then on packages/shared/src/migration.ts. --noEmit, no tsbuildinfo
(neither composite nor incremental is set), so no §7a shared state is touched.

## Commit
2a914a78d6209ce03389ba3f74bb162271c0fae7, parent e223c5e362bceef4c8198f24b0897522ccfde2ce.
4 files, 416 insertions, 13 deletions. Only my files. Russian subject intact.
HEAD has since moved twice past it (1c585dbf3, fb6b67c86 by the other author) — my commit is in history.
Foreign files still staged by others and NOT touched by me:
apps/api/src/db/rebookingConversionRulesQuery.ts,
apps/web/src/components/analytics/RebookingConversionRulesWidget.tsx,
apps/web/src/components/settings/LegacyMigrationStudio.tsx,
apps/web/src/components/settings/SmartImportStudio.tsx.

## Own signal (all exit 0)
- node --import tsx --test apps/api/src/pricelist/groqPricelistKopecks.test.ts → 13/13 pass
- node --import tsx --test apps/api/src/pricelist/pricelistKopecks.test.ts → 19/19 pass (was 16/16)
- node --import tsx --test apps/api/src/pricelist/analyzer.test.ts → 6/6 pass
- single-file tsc (flags mirrored from each package tsconfig) on analyzer.ts, migration.ts and both
  test files → exit 0

## Pre-fix behaviour, EXECUTED from the blob 2a914a78d^ (not reasoned)
asNumberOrNull(1500.5)=1501 · ("1500,50")=null · (18000.25)=18000 · (false)=0 · ([])=0 · (99999)=99999
stripPriceFromTitle("Whitening 12000-18000 ₽") = "Whitening 12000-"
stripPriceFromTitle("Whitening 12000-18000")   = "Whitening 12000-18000"

STATUS WAS: DEFECT CONFIRMED
HEAD at dispatch: b4cf775c4581bf0952e99e5c8ecc1bbb1e6f16e9
Claim clean at dispatch: `git status --porcelain -- apps/api/src/pricelist/ packages/shared/src/migration.ts` → empty.
Foreign staged files present (left alone): apps/api/src/db/rebookingConversionRulesQuery.ts,
apps/web/src/components/analytics/RebookingConversionRulesWidget.tsx.

## Timeline
- STARTED — packet dir created, state.md written before any read.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/BILLING_AND_FINANCE.md complete.
- DEFECT CONFIRMED — see below.

## Reachability (confirmed line by line, my own read)
- apps/api/src/routes/pricelist.ts:26 `app.post("/api/pricelist/analyze"...)`
- apps/api/src/routes/pricelist.ts:45 `await analyzePricelist(input, catalog)`
- apps/api/src/pricelist/analyzer.ts:846 `if (!request.useServerAi) return analyzePricelistDeterministic(...)`
- apps/api/src/pricelist/analyzer.ts:857 `if (!keyPool.configuredKeyCount) return ...deterministic_groq_fallback`
  (brief said :858 — actual :857)
- apps/api/src/pricelist/analyzer.ts:862 `const items = await callGroqPricelist(request, catalog)`
  (brief said :863 — actual :862)
- apps/api/src/pricelist/analyzer.ts:825 `.map((row, index) => itemFromGroq(row, index, request, catalog))`
- apps/api/src/pricelist/analyzer.ts:768-770 `asNumberOrNull(...)` — the defect.

## INVENTORY — every numeric read in the groq path
| file:line | expression | verdict | state |
|---|---|---|---|
| analyzer.ts:733-737 | `asNumberOrNull` (`Math.round`, `>= 0`) | MONEY+COUNT conflated | BROKEN, deleted |
| analyzer.ts:755 | `sourceLine: Math.max(1, Math.round(Number(record.sourceLine) \|\| index+1))` | COUNT | correct, unchanged |
| analyzer.ts:768 | `priceRub: asNumberOrNull(...)` | MONEY | BROKEN (1500.50 → 1501) |
| analyzer.ts:769 | `priceMaxRub: asNumberOrNull(...)` | MONEY | BROKEN (same) |
| analyzer.ts:770 | `durationMinutes: asNumberOrNull(...)` | COUNT | must stay int; also 0 killed whole item |
| analyzer.ts:771 | `confidence: Math.min(0.98, Math.max(0.1, Number(record.confidence) \|\| fallback))` | OTHER (0..1) | correct, unchanged |
| analyzer.ts:572-588 | `summarize()` min/max/avg over priceRub | MONEY | float accumulation in the average |
| analyzer.ts:447-452 | `durationFromLine` bound `<= 600` | COUNT | correct; magic 600 duplicated |
| migration.ts:291-293 | 3× `z.number().nullable()` | MONEY | no kopeck precision at all |

## Measured facts
- ESM cycle probe: a TOP-LEVEL read of a barrel const from a module the barrel `export *`s
  crashes with `ReferenceError: Cannot access 'EARLY' before initialization` (exit 1).
  A DEFERRED read (getter) across the same cycle loads fine (exit 0).
  → `import { moneyRubSchema } from "./index.js"` used directly in migration.ts would kill the API at boot.
- packages/shared/dist/utils/money.js already exports parseKopecks / kopecksToNumericString,
  and dist/index.js line 8413-equivalent re-exports them → analyzer.ts can use them WITHOUT a shared rebuild.
- packages/shared/dist/migration.js:258-260 still `z.number().nullable()` → my migration.ts edit is INERT
  until the lead runs `npm run build -w @dental/shared`.
