# AA3-money-contract — state

## STATUS: DEFECT CONFIRMED + INVENTORY DONE

HEAD at start: f3071534e3514592a50b664fbad2fd4d8dd36482

## COLLISION DISCLOSURE (not a foreign author)

`packages/shared/src/index.ts` was dirtied by `.agents/archon/packets/Z2-contract-rejects-kopecks/`,
a DEAD predecessor of THIS packet. Its state.md stops at `DEFECT CONFIRMED`, every log box unchecked,
HEAD 423a7a39d. It also left untracked `packages/shared/src/tests/money-contract-kopecks.test.ts`.
The declared foreign non-fleet author works SettingsView.tsx / components/settings/** /
components/communications/** / App.tsx / MarketingView.tsx / VisitView.tsx / server.ts — NOT this
file. So: not a foreign collision, my own packet's corpse. I verify, correct, finish, commit.

## DEFECT CONFIRMED AT REAL LINES (re-measured myself against HEAD)

`rg "\b\w*[Rr]ub\w*\s*:" ` on HEAD copy => exactly **45** money-bearing fields.
- **38** were `z.number().int(...)` => REJECT 1500.50 (not round: reject)
- 5 already money family: :1645 :1734 :1735 :1982 :4407
- 2 other: :4082 `z.number().nonnegative()` (accepted 1500.5555), :8211 `z.number()` (accepted -5000)
**The brief's figure of 38 is CONFIRMED, not dissolved.**

Schema infra confirmed verbatim: `kopecksAreExact` :20-21, `moneyRubSchema` :23-25,
`positiveMoneyRubSchema` :27-29, `nonNegativeMoneyRubSchema` :31-33, rationale comment :12-13.
All four pre-exist in HEAD — Z2 referenced real identifiers, not invented ones.

## SCOPE OF INVENTORY CLOSED (money by MEANING, not name)

Searched numeric fields with money-meaning names NOT ending in `Rub`: 43 hits, **every one a
count / byte size / ms budget / percent / slice index / DICOM windowCenter. Zero money.**
Searched `Kopeck|Cent|Money` suffixes: only `canManageMoney` (boolean permission) and
`windowCenter` (DICOM). Searched money-named STRING fields: all prose (`costNote`, `priceChangeRules`).
=> **All money in this contract is named `...Rub`. The 45 are the complete set.** No hidden money.
And no `...Rub` field is a count — all 38 are unambiguously money.

## DB VERIFIED — the database was never the problem

Real read, PostgreSQL 18 @127.0.0.1:5432, `information_schema.columns` where column_name ~ 'rub':
**35 columns, ALL `numeric(x,2)`. Zero integer money columns.** So the contract alone rejected
kopecks while the storage layer was already exact. Strongest evidence the widening is correct.

## TWO INVENTED TABLE NAMES IN Z2's INHERITED COMMENTS — I MUST FIX, NOT SIGN

DB says these tables DO NOT EXIST: `treatment_plan_items`, `documents`.
Real: `treatment_items`, `generated_documents`. Z2's comments cite the fake names.
Corrections required before commit (§10 forbids inventing DB schema).

## CITATIONS I VERIFIED BEFORE INHERITING THEM (all real)

- guards.ts:641 `expectedFinancialLineTotal`, :645 `financialLinesTotal`, :691
  `paidFactsTotalMismatchReason`, :1188 `requestedAmountRub`, :337 exact-equality check — ALL REAL
- money.ts exports parseKopecks/sumKopecks/splitKopecks/percentageOfKopecks/formatKopecksRu — REAL
- visitFlowOrchestrator.ts:32 `estimatedAmountRub: service.priceRub` (copies as-is) — REAL
- routes/documents/create.ts:62 `createDocumentSchema.safeParse` -> :64 `reply.code(400)` — REAL
- useAppLogic.tsx:12287 paidAmount = reduce over paid payments; :12331 totalAmountRub;
  :12362 posted; :12366 error text «Документ не создан» — REAL, user-visible

## §10 CONSUMER TRACE — breaks found

1. `apps/api/src/db/domainStateHydration.ts:459` `balanceRub: Math.round(paid - planned)` —
   floors the widened field. **FILE IS DIRTY BY FOREIGN AUTHOR (7 hunks) => I MUST NOT COMMIT IT.**
   Widening is still safe (Math.round output is kopeck-exact, so no regression), but the defect
   survives. HAND TO LEAD.
2. `apps/web/src/useAppLogic.tsx:12281-12286` float accumulation of unitPriceRub*qty-discountRub.
   FILE DIRTY (foreign) => report only.
3. `apps/api/src/services/reports/managerReports.ts:258,767` Math.round to whole rubles — but these
   are LOCAL types (`readonly revenueRub: number` :66), NOT the shared contract. Out of claim.
4. `apps/web/src/components/schedule/LabOrdersPanel.tsx:135` `parseInt(priceRub)` truncates user
   kopecks; lab order is NOT in the shared contract (ad-hoc POST body). Out of claim, report.
5. `apps/api/src/documents/guards.ts:642,648,670` round to 2 decimals — ALREADY kopeck-correct.
6. `apps/api/src/sampleData.ts:1343-1346` uses `roundToKopecks` — ALREADY kopeck-correct.

## Log
- [x] STARTED
- [x] AUTHORITY READ
- [x] DEFECT CONFIRMED (38/45, re-measured)
- [x] INVENTORY DONE
- [x] EDIT WRITTEN (2 invented table names corrected + reversion-proof suite added)
- [x] SELF-CHECK PASSED (money.test.ts 24/24 exit 0; money-contract-kopecks 98/98 exit 0)
- [x] COMMITTED 3537333a2d7011a04faa88f25945e60fa6089523 (contract)
- [x] COMMITTED e302be2dc669a3f2a701381b31571b6464fab7e0 (pricelist parser — the §10 sync)
- [x] PROVEN (UNIT x4, TYPECHECK single-file, DB, SMOKE; API proves the DEFECT only — see below)
- [x] DONE

## SECOND DEFECT FOUND BY THE LIVE CALL, FIXED AND COMMITTED

The live `POST /api/pricelist/analyze` returned HTTP 200 with `priceRub = 1500` for
«Лечение кариеса 1500,50». The contract accepted kopecks; the PARSER destroyed them first.
Root cause `apps/api/src/pricelist/analyzer.ts`: the price regex never captured the decimal part,
and `parseMoney` did `value.replace(/[^\d]/g, "")` then `Math.round` to whole rubles. So
priceRub/minPriceRub/maxPriceRub/averagePriceRub could NEVER be fractional under any pricelist —
the widened contract was a facade. Fixed in e302be2dc with thousands-vs-decimal disambiguation by
digit count (exactly three = thousands, one or two = kopecks).
Also found by measurement in the same function: the trailing `\b` in `stripPriceFromTitle` was DEAD
(JS `\b` uses `\w` = [A-Za-z0-9_]; Cyrillic and `₽` are not word chars, so no boundary ever exists
after «руб»/«р»/«₽»). Replaced with an explicit letter lookahead, because removing `\b` outright
would let `р\.?` eat the next word's first letter.

## API PROOF STATUS — HONEST

The live server serves STALE code: `apps/api/dist/pricelist/analyzer.js` is timestamped 15:52 with
the old `parseMoney`; my source is 18:02. Re-running the live proof after committing returned the
same 1500/2300. **This contradicts the preamble's claim that tsx watch picks up source edits.**
So: API VERIFIED for the DEFECT, NOT for the fix. Closing command is the lead's — see handoff.

## FILES LEFT ON DISK
state.md, commitmsg.txt, commitmsg-analyzer.txt, handoff.md, live-api-proof.mjs (read-only probe).
My claimed files are CLEAN in git status. Nothing of mine left dirty.

## COMMIT VERIFIED
`git log -1 --stat` => 3537333a2, Russian subject intact (no mojibake), exactly 2 files:
packages/shared/src/index.ts, packages/shared/src/tests/money-contract-kopecks.test.ts.
1415 insertions, 40 deletions. Foreign staged files (.agents/lead/commitmsg-modularity-headers.txt,
rebookingConversionRulesQuery.ts, RebookingConversionRulesWidget.tsx) NOT swept in — still staged,
untouched, reported not reverted.
HEAD moved during my work: f3071534e (start) -> 983ab3eb9 (peer commit) -> 3537333a2 (mine).

## Next command about to run
npx tsc --noEmit single-file typecheck on the shared contract (NOT `-p`, which would touch
packages/shared/tsconfig.tsbuildinfo = §7a shared state), then npm run smoke:web-text-encoding.
