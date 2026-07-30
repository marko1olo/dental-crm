# BB3-invented-prices-in-mounted-estimate

## STATUS (5th incarnation): STARTED
- 5th incarnation resumed 2026-07-28. Packet dir already existed; state.md read BEFORE any other read.
- Inherited claim: the 4th incarnation reached DEFECT CONFIRMED on review findings 1/3/6 plus a
  SECOND unnamed site of finding 1, and died before EDIT WRITTEN. Nothing from it is trusted:
  I re-verify HEAD, dirtiness, and every cited line myself.
- NEXT: git rev-parse HEAD, git status --porcelain on my 3 files, then re-read all of them in full.

## STATUS (5th incarnation): AUTHORITY READ
- READ IN FULL MYSELF: .agents/AGENTS.md (241 lines), .agents/INDEX.md (29), .agents/BILLING_AND_FINANCE.md
  (44), review.md (444).
- MEASURED MYSELF, NOT TRUSTED FROM NOTES:
  * HEAD moved 7d5328f9f -> **d691c33410eb0316a66c38ff03c97945ea19530b**.
  * Both prior packet commits ARE ancestors of HEAD (`git merge-base --is-ancestor` exit 0 twice).
  * `git log 7d5328f9f..HEAD -- apps/web/src/components/odontogram/` EMPTY and the range diff for that
    dir is EMPTY -> no concurrent author touched my claim. Only 2 commits landed: d691c3341 (lead's
    progress.md) and 479fadd78 (записи).
  * `git diff --cached --name-only` EMPTY — the foreign rebookingConversionRules* files the preamble
    warned about are no longer staged.
  * `git status --porcelain` on my claim: ONLY ` M treatmentEstimatorPricing.ts`. That dirt is my own
    packet's 4th-incarnation in-flight edit (58+/6-), NOT a collision: no other author has a commit or
    diff in that dir, and the content is the FINDING 1 fix described in this very file.
- THE LEAD'S VERDICT IS IN HEAD: progress.md now records BB3 as **SOUND_WITH_NITS, "the best packet of
  the campaign"**. It does NOT dismiss the review's findings. So my job this incarnation is exactly the
  nits, in my own new code, and nothing else. No scope expansion.
- NEXT: re-read all 3 of my files in full, then finish/compile/commit the inherited FINDING 1 fix.

## STATUS (5th incarnation): DEFECT CONFIRMED

RE-READ IN FULL MYSELF: TreatmentEstimator.tsx (795), treatmentEstimatorPricing.ts (939, dirty),
treatmentEstimatorPricing.test.ts (653), PanelLoadFailure.tsx (75), odontogram.ts:125-174.

### INVENTORY RE-DERIVED BY ME against the TRUE parent, my own instrument (`rg` on the blob)
`git rev-parse ae54cb935^` = **e29a8791ac82262b17e2b5deaa6d4b398ca8792f** — so the reviewer's FINDING 4
is right and the earlier note's `fff515a76` was a mislabel. At that blob:
- 8 fabricated PRICES: :368=4000 :376=5500 :386=6000 :394=12500 :403=35000 :411=12000 :421=5000
  :430=28000. Matches the lead's count of eight exactly.
- 8 fabricated ID SITES / **5 distinct values**: :366 :374 `service_caries_01`; :384 :392
  `service_endo_pulpitis`; :401 `service_implant_osstem`; :409 `service_surgery_guide`; :419 :428
  `service_crown_zirconia`. (`service_catalog_items` in the same file is a TABLE NAME, not an id.)
- 8 fabricated TITLES: :367 :375 :385 :393 :402 :410 :420 :429, 8 distinct.
- At HEAD: `rg -c "priceRub:\s*[0-9]"` and `rg -c 'id:\s*"service_'` on the component blob both return
  ZERO. The eight are gone and stayed gone.

### THE THREE LIVE DEFECTS IN MY OWN NEW CODE — each confirmed at a real line
1. **FINDING 1 + its unnamed twin.** Inherited dirty edit already fixes the resolver (match over the
   WHOLE catalogue, then split active/inactive; `catalog_empty` now keyed on `catalog.length === 0`).
   **BUT THE INHERITED EDIT IS A REGRESSION AS IT STANDS AND MUST NOT BE COMMITTED ALONE:** it adds
   kind `service_disabled` and `estimatorIssueMessages` (:834-850) has NO case for it and no
   exhaustiveness guard — so a disabled-service row would produce NO message at all, the whole amber
   explanation block (`issueMessages.length > 0`, component :542) would disappear, and the row badge at
   :640 would still say «нет в вашем прайсе», which is false. Silent gap = the same disease as FINDING 1.
2. **FINDING 3 CONFIRMED at TreatmentEstimator.tsx:757**, guard `pricedRows === 0 && incompleteRows > 0`.
   `items=[]` -> totals `{0,0,0}` -> guard false -> `rub(0)` prints «Итого по плану: 0 ₽». Worse than
   the reviewer said: the footer (:746) is in the MAIN return behind NO phase condition, and `items` is
   reset to `[]` at :219 on every load, so «Итого по плану: 0 ₽» also prints while `planLoad.phase` is
   "loading" AND while it is "failed" — a total asserted for a plan the panel itself says it could not
   read. That is the fabricated zero the cycle-12 delta calls REVERT-grade.
3. **FINDING 6 CONFIRMED, and it is REACHABLE — the reviewer rated it unreachable.**
   `planItemFromServer` (:531-538) nulls a blank `priceId` but KEEPS the price and leaves `issue: null`.
   Then `estimatorRowMoney` says `known: true` (so the row joins «Итого»), the row shows its money with
   NO badge (the badge at :640 renders only inside `!rowMoney.known`), and yet `estimatorSaveBlock`
   (:876-882) catches `!item.priceId` and tells the doctor «в смете есть лечение **без цены** из вашего
   прайса» about a row that visibly shows a sum. **Reachability I measured myself, upstream:**
   `apps/api/src/routes/odontogram.ts:135-143` `splitStoredPriceId` returns `priceId: ""` whenever the
   stored composite starts with `::` (`stored.slice(0, 0)`), and the write path (:472-474) stores
   `` `${item.priceId}::${item.name}` `` while the server's own zod (:94) is `z.string().trim().min(1)` —
   which **accepts a priceId of `"::"`**. So the server can hand back a row with a price and an empty
   priceId. NOT MY FILE: reported as debt for the lead, not edited.

### A TRAP I CAUGHT IN MY OWN PLANNED TEXT — do not repeat it
My first draft of the "plan not read" footer note said «нажмите «Повторить» выше». **PanelLoadFailure.tsx
:64 renders that button only when `text.retryLabel` is set**, and `panelRetryLabel` returns none for
404/400/422. A note promising a button that is not there is exactly the §3 lie («a «Повторить» beside
«сервер не знает такого раздела» is a lie in the interface»). Footer note for `failed` is therefore
null — the reason and the next step already live in the failure panel above (§4, do not pile on).

### NEXT: build the fix (one owner per rule), then my own signal, then COMMIT.

## STATUS (4th incarnation): STARTED — CLOSING THE REVIEW FINDINGS

- 4th incarnation resumed 2026-07-28. Previous incarnation reached DONE with 2 commits, then an
  ADVERSARIAL REVIEWER ran (`review.md`, written 21:59, AFTER state.md 21:34) and returned
  **SOUND_WITH_NITS with 3 findings that are live defects INSIDE MY OWN NEW CODE**:
  * FINDING 1 [CONFIRMED, §3] treatmentEstimatorPricing.ts:291 — a price list that is FULL but
    entirely DEACTIVATED is reported as `catalog_empty`, so the doctor is told «Заполните прайс»
    when the true action is «включите». The type's own docstring at :168 («пуст целиком»)
    contradicts what :291 assigns. Needs a 4th issue kind.
  * FINDING 3 [CONFIRMED, nit] TreatmentEstimator.tsx:757 — an EMPTY plan still prints
    «Итого по плану: 0 ₽». Guard is `priced===0 && incomplete>0`; with zero rows both are 0.
  * FINDING 6 [PLAUSIBLE, nit] whitespace `priceId` -> priceId null but price kept, `known:true`,
    so the row joins «Итого» while the block message calls it «без цены».
  FINDINGS 2/4/5 are doc/debt only and go to dossierCorrections + handoff, not to code.
- VERIFIED MYSELF THIS INCARNATION (not trusted from notes):
  * HEAD moved again: a094f1268 -> **7d5328f9fa8b4f00f79c133bf8f512e263dd4401**.
  * Both prior commits ARE ancestors of HEAD (`git merge-base --is-ancestor` exit 0).
  * `git log a094f1268..HEAD -- apps/web/src/components/odontogram/` is EMPTY — no concurrent
    author touched my claim. My 3 files are CLEAN. Index is EMPTY.
## STATUS (4th incarnation): DEFECT CONFIRMED

- AUTHORITY READ this incarnation: .agents/AGENTS.md (full, 241 lines), .agents/INDEX.md (full),
  review.md (full, 444 lines). RE-READ IN FULL: TreatmentEstimator.tsx (795),
  treatmentEstimatorPricing.ts (887), treatmentEstimatorPricing.test.ts (653),
  ../plan/planPricing.ts (615, read-only reference).
- FINDING 1 CONFIRMED at treatmentEstimatorPricing.ts:253 (`catalog.filter(s => s.active)`) and
  :290 (`activeCatalog.length === 0 ? "catalog_empty"`). The docstring at :170 says «пуст целиком»
  and the message at :777 says «Заполните прайс» — both false when the list is full but disabled.
- **A SECOND, UNNAMED SITE OF THE SAME DEFECT, WORSE THAN FINDING 1.** `matches` is computed from
  `activeCatalog` (:254), so when the needed service EXISTS in the price list but is switched OFF
  and other services are on, the row falls to `not_in_catalog` and the doctor is told
  «такой услуги нет в вашем прайсе. Добавьте её» — advice that makes them create a DUPLICATE of a
  service they already have. The reviewer only reached the all-inactive case. Both are one fix:
  match against the WHOLE catalogue, then split active/inactive.
- FINDING 3 CONFIRMED at TreatmentEstimator.tsx:757: guard is `pricedRows === 0 && incompleteRows > 0`.
  Zero rows -> both 0 -> `rub(0)` prints «Итого по плану: 0 ₽». **And it is worse than the reviewer
  said**: `items` is reset to [] at :219 on every load, so the SAME «Итого по плану: 0 ₽» prints
  while `planLoad.phase` is "loading" and while it is "failed" — a total asserted for a plan the
  panel itself says it could not read. That is the fabricated zero the delta calls REVERT-grade.
- FINDING 6 CONFIRMED: estimatorSaveBlock (:841) says «лечение без цены из вашего прайса» about a
  row that has a price and only lacks a priceId, and the row shows its money with NO badge (the
  badge at :640 only renders inside `!rowMoney.known`). Nothing on screen marks the row that blocks
  the save.
- OUT OF CLAIM, FOR THE LEAD: ../plan/planPricing.ts:250-252 has FINDING 1 byte-for-byte
  (`activeCatalog.length === 0 ? "catalog_empty"`, matches filtered from activeCatalog at :211).
  I may only READ that file. Not fixed by me. Reported.
- NEXT: fix all three inside my claim, extend the test, run my own signal, COMMIT.

## STATUS (3rd incarnation): DONE

- COMMIT 1: ae54cb9357c172e1ebd0f764d2bca1d707106cde (3 files, +1738 -412) — eight invented
  prices/ids/titles removed, price/priceId widened to nullable, pricing+money split into
  treatmentEstimatorPricing.ts, specific save refusal.
- COMMIT 2: a094f12683dbae997a997ac4ea676b42b7acf109 (3 files, +51 -5) — the last fabricated zero:
  «Итого: 0 ₽» is no longer printed when NOTHING could be priced (estimatorTotals.pricedRows).
- PROVEN: UNIT 31/31 exit 0. tsc on my 3 files: 0 errors in my files (5 unrelated, all from the
  missing --types vite/client in my explicit file list). API GET 200 with a real minted token.
  DB: 2 organizations (NOT 4); service_catalog_items EMPTY for BOTH orgs; treatment_plans EMPTY;
  base_price_rub and price_rub both numeric(12,2). §11 encoding ok:true / 424 files / 0 mojibake,
  run after BOTH commits.
- KEY MEASUREMENT: the price list is empty in the live DB for both organizations, so the
  "catalogue empty" branch — the one that emitted all eight invented prices — was the ONLY branch
  that ran. This defect was the default behaviour, not an edge case.
- NOT PROVEN: the server's 400 on a priceId-less row (POST needs STAFF auth and returns 401 before
  body parse; a successful POST would write to the shared DB). No UI claim. No shared §7a gate run.
- Tree clean, index empty, nothing of another author touched. handoff.md written.

- SELF-CHECK PASSED:
  * `npx tsc --noEmit <flags> <my 2 files>` -> TRUE_EXIT=2, 5 error lines, **ZERO in my two files**.
    All 5 are other files and are artefacts of my explicit file list omitting `--types vite/client`
    (4x `Property 'env' does not exist on type 'ImportMeta'` in LeadsKanbanView.tsx:156,
    OdontogramModule.tsx:252, leadsStore.ts:26, workspaceRouteErrorBoundary.tsx:125) plus
    DicomArchiveUploader.tsx:220 `webkitdirectory`. Not mine, not caused by me.
  * `node --import tsx --test src/components/odontogram/treatmentEstimatorPricing.test.ts`
    -> tests 30 / pass 30 / fail 0, TRUE_EXIT=0, re-run AFTER my component edits.
- COMMITTED ae54cb9357c172e1ebd0f764d2bca1d707106cde, 3 files, 1738 insertions / 412 deletions.
  `git log -1 --stat` verified: Russian subject intact, no mojibake, ONLY my 3 files.
  Index empty before and after; my dir clean. Iron Gate gitleaks: "no leaks found". Biome skipped
  ("Biome not found in PATH") exactly as the preamble said.
- NEXT: verify the inventory line numbers against the PARENT commit fff515a76 (not the stale
  dispatch hash), run `npm run smoke:web-text-encoding` (§11, explicitly whitelisted), write handoff.

- RESUMED AGAIN. Previous incarnation died after "UNIT GREEN, about to run tsc". Nothing committed.
- HEAD MOVED AGAIN: 9bcacf957 -> fff515a76bd95497b229b958742c772c7c9e4e40.
  `git log 9bcacf957..HEAD -- <my file>` EMPTY and `git diff 9bcacf957..HEAD -- <my file>` EMPTY:
  no concurrent author touched TreatmentEstimator.tsx. Dirty state is MINE, not a collision.
  `git diff --cached --name-only` is now EMPTY (the foreign rebookingConversionRules* files the
  preamble warned about are no longer staged — they landed in someone's commit).
- INHERITED TEST RE-RUN BY ME (not trusted from notes):
  `node --import tsx --test src/components/odontogram/treatmentEstimatorPricing.test.ts`
  -> tests 30 / pass 30 / fail 0, TRUE_EXIT=0.
- I RE-READ ALL THREE FILES IN FULL this incarnation (768 + 873 + 635 lines). Audit findings:
  * shared exports all confirmed to exist: multiplyKopecks (money.ts:123), sumKopecks (:113),
    parseKopecks (:53), percentageOfKopecks (:140), kopecksToNumericString (:92), Kopecks (:26),
    isValidFdiToothNumber (index.ts:3456, `(value: unknown): value is number` — narrows, so
    planItemFromServer's use on an `unknown` field is sound), VALID_FDI_TOOTH_NUMBERS (:3438).
  * ServiceCatalogItem (index.ts:1650) IS structurally assignable to PlanPriceCatalogItem
    (planPricing.ts:70-76): basePriceRub is nonNegativeMoneyRubSchema -> number, active is
    z.boolean() REQUIRED, id/title strings, category enum -> string. So the cast at :291 is real.
  * ToothData (ToothChart.tsx:35-39) IS assignable to EstimatorToothInput under
    exactOptionalPropertyTypes (surfaces?: string[] -> readonly string[] | undefined).
  * tsconfig.base.json: noUnusedLocals is NOT set, exactOptionalPropertyTypes and
    noUncheckedIndexedAccess ARE. So the spread-guard style in the pricing module is required, and
    an unused import is not a typecheck error.
- TWO DEFECTS *I* FOUND IN THIS AUDIT and am fixing now (both inside my claimed file):
  (d) :17 `import { type ToothData, ToothState }` — ToothState is a TYPE (ToothChart.tsx:6) imported
      as a VALUE binding and never used. At runtime ./ToothChart has no such export.
  (e) :600 `item.toothNumber > 50` — a second, hardcoded copy of the deciduous-FDI threshold that
      the pricing module already owns as isDeciduousFdiToothNumber. Magic number, and it called
      tooth 99 a baby tooth.
- ABOUT TO RUN (SLOW, read-only, writes nothing, NOT a §7a shared gate — explicit file list, no -p,
  so no tsbuildinfo and no dist):
    npx tsc --noEmit --jsx react-jsx --target ES2022 --lib ES2022,DOM,DOM.Iterable --module ESNext
      --moduleResolution Bundler --strict --skipLibCheck --esModuleInterop
      --allowSyntheticDefaultImports --resolveJsonModule --isolatedModules
      --noUncheckedIndexedAccess --exactOptionalPropertyTypes --noImplicitAny false
      src/components/odontogram/TreatmentEstimator.tsx
      src/components/odontogram/treatmentEstimatorPricing.ts
  I will read only the errors whose path is one of MY two files; anything else is another author.
  I will NOT run `npm run typecheck` / `npm run build` / `npm test`.

- Inherited diff AUDITED line by line against HEAD 9bcacf957 (no concurrent author touched the file:
  `git log b4cf775c4..HEAD -- <file>` empty, `git diff b4cf775c4 HEAD -- <file>` empty).
- Two further defects found IN THE INHERITED CODE and fixed by me:
  (a) estimatorIssueMessages grouped by kind+humanName, so a PUSTOI price list produced N
      byte-identical «Ваш прайс-лист пуст…» messages -> duplicate React keys in the <ul key={message}>.
      Now ONE message that lists every treatment needing a price.
  (b) estimatorItemForApi sent `id`, which is NOT in treatmentPlanItemSchema (odontogram.ts:92-101)
      and is meaningless because items are deleted+reinserted (:445-481). Removed.
  (c) component badge said «нет в вашем прайсе» for ANY unknown money, including a corrupt saved
      sum. Now keyed on item.issue.
- UNIT GREEN: `node --import tsx --test src/components/odontogram/treatmentEstimatorPricing.test.ts`
  -> tests 30 / pass 30 / fail 0, TRUE_EXIT=0.
- ABOUT TO RUN (slow, read-only, writes nothing, no shared state):
  npx tsc --noEmit --jsx react-jsx ... on my two files only. NOT `npm run typecheck` (§7a).

- RESUMED. Previous incarnation of THIS packet died after DEFECT CONFIRMED, mid-edit.
  HEAD has MOVED: dispatch b4cf775c4 -> now 9bcacf957df9a3883eac4d4b8f3d945baab6089d.
  Inherited working tree (dirty BY ME, not a collision):
    M  apps/web/src/components/odontogram/TreatmentEstimator.tsx
    ?? apps/web/src/components/odontogram/treatmentEstimatorPricing.ts  (planned in "Design decisions" below)
  Next: audit the inherited diff line by line, do NOT trust it, then finish + compile + COMMIT.

- STARTED — packet dir created before any reading.
- AUTHORITY READ — .agents/AGENTS.md (full), .agents/INDEX.md (full),
  .agents/BILLING_AND_FINANCE.md (full), packages/shared/src/utils/money.ts (full),
  apps/web/src/components/plan/planPricing.ts (full, read-only reference).
- HEAD at dispatch: b4cf775c4581bf0952e99e5c8ecc1bbb1e6f16e9
- git status of claim: apps/web/src/components/odontogram/TreatmentEstimator.tsx CLEAN.
  apps/api/src/db/pricelistQuery.ts is ` M` (dirty) — read-only reference for me, NOT edited.
  Foreign staged files present as warned (rebookingConversionRules*) — untouched, pathspec protects.
- DEFECT CONFIRMED — read TreatmentEstimator.tsx IN FULL (963 lines).

## INVENTORY (at HEAD b4cf775c4581bf0952e99e5c8ecc1bbb1e6f16e9)

### Fabricated MONEY — 8 literals (matches the lead's count exactly)
1. :368 `priceRub: 4000`   cariesServiceBaby
2. :376 `priceRub: 5500`   cariesServiceAdult
3. :386 `priceRub: 6000`   pulpitisServiceBaby
4. :394 `priceRub: 12500`  pulpitisServiceAdult
5. :403 `priceRub: 35000`  implantService
6. :411 `priceRub: 12000`  guideService
7. :421 `priceRub: 5000`   crownBaby
8. :430 `priceRub: 28000`  crownAdult

### Fabricated SERVICE IDs — 8 literals, only 5 DISTINCT (lead said "eight ids"; measured: 8 sites / 5 values)
1. :366 "service_caries_01"
2. :374 "service_caries_01"        <- duplicate of 1
3. :384 "service_endo_pulpitis"
4. :392 "service_endo_pulpitis"    <- duplicate of 3
5. :401 "service_implant_osstem"   <- also names a vendor (Osstem) the clinic never chose
6. :409 "service_surgery_guide"
7. :419 "service_crown_zirconia"
8. :428 "service_crown_zirconia"   <- duplicate of 7

### Fabricated TITLES — 8
:367 :375 :385 :393 :402 :410 :420 :429

### Additional defects found in the same 10 lines (NOT in the brief)
A. :335 `if (!best && candidates.length>0) best = candidates[0]` — arbitrary catalogue row
   becomes the treatment. Filled price list starting with «Консультация» prices a carious
   tooth as a consultation. Same class, second channel.
B. :326-337 `findService(category, isBaby, keywords)` — `isBaby` is NEVER READ. The
   baby/adult split the 8 titles pretend to make does not exist in the lookup.
C. :331 no `active` filter — a DEACTIVATED service can be priced into a signed estimate.
D. :406 keyword "хирург" matches any surgical service, billing it as a surgical guide.
E. :582-590 total in floats, and no `Math.max(0, ...)` per line while the server has it
   (odontogram.ts:389) — screen total can differ from the saved total and go negative.
F. :857 :920 per-row copay `(price*copayPct)/100` in floats.
G. :210-223 coverage keyed on PHASE, and the phase `<select>` at :905 lets the user change
   the DMS percentage (money) by changing the stage.
H. :151 `activeContract: any` — undefined percent renders «Покрытие ДМС undefined%».

## Server contract (measured, apps/api/src/routes/odontogram.ts:92-108)
- `priceId: z.string().trim().min(1)` REQUIRED — a row with no catalogue match CANNOT save.
- `price: z.number().finite().min(0)` REQUIRED — null 400s the WHOLE plan.
- schema is NOT .strict() -> unknown keys stripped.
=> honest client behaviour is a SPECIFIC refusal naming the missing services, never a
   silent drop of rows and never a fabricated 0.

## Design decisions
- `money()` (AppHelpers:2521) turns null into «0 ₽». A null price must NEVER reach it.
- Pure resolver goes into a NEW module `treatmentEstimatorPricing.ts` beside the component:
  the component cannot be imported by node:test (probe: `Unknown file extension ".css"`),
  and apps/web/testCssStub.mjs itself documents that pure logic must be split out.
- Reuse `planPriceIssueMessages` was REJECTED: its "ambiguous" text says «Выберите нужную в
  строке», and this component has no service picker — that would be a button that cannot
  keep its promise.
- Correction to the brief: the settings tab is «Прайс» (AppHelpers.tsx:6082), not «Цены».
