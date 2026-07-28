# AA4-invented-prices — adversarial review

Reviewer: adversarial, did not write the code. Read-only on source; every claim re-run.
Commit under attack: `a37f358aab22c97cbcc91d820b1332c6b85103e8` (+ docs commit `9b43c934d`).
Repo HEAD at review time: `99e5cbcf4` (moved twice during the review; the repo is under
concurrent writers).

## 0. COMPILE GATE (cheapest check first)

`npm run typecheck -w @dental/web` = `tsc -b --noEmit` — the incremental build cache made it a
no-op (empty output, exit 0). Defeated the cache and re-ran:

```
cd apps/web && npx tsc -p tsconfig.json --noEmit --composite false --incremental false
EXIT=2
src/FinanceView.tsx(336,8): error TS2304: Cannot find name 'CashDayTally'.
```

ONE error in the whole workspace, and it is NOT AA4's:
- `apps/web/src/FinanceView.tsx` is ` M` (uncommitted). `git show HEAD:...FinanceView.tsx | rg CashDayTally`
  returns nothing → introduced by a CONCURRENT agent's working-tree edit.
- The 11 panelStateText errors quoted at dispatch are no longer present. Not AA4's either way.
- ZERO errors in `ComparativePlannerDashboard.tsx`, `planPricing.ts`, `planPricing.test.ts`.

AA4 did not touch `packages/shared` (`git show --name-status`: 4 files, all `apps/web/src`), so no
`npm run build -w @dental/shared` was needed for my typecheck to describe today's code.

**Compile verdict: green.**

## 1. WAS THE DEFECT REAL BEFORE THE COMMIT? (own instruments)

`git show a37f358aa^:...ComparativePlannerDashboard.tsx` + `rg`, i.e. not the builder's read:

| claim | parent line | verified |
|---|---|---|
| `priceRub: 4000` | :343 | yes |
| `priceRub: 8000` | :349 | yes |
| `priceRub: 35000` | :355 | yes |
| `priceRub: 15000` | :361 | yes |
| `priceRub: 35000` | :367 | yes |
| `price: service?.priceRub?.toString() \|\| "0"` | :375 | yes |
| `price: String(catItem.priceRub)` | :701 | yes |
| `{sc.title} ({sc.priceRub} ₽)` | :714 | yes |
| `1 - (item.discount ?? 0) / 100` | :88 | yes |
| `(−${item.discount}%)` | :1063 | yes |
| `priceId: r.priceId \|\| null` | :423 | yes |

The lead's count of FIVE hardcoded prices is right; the packet's correction of the declared
"four" stands.

**Runtime reproduction with a different instrument** (real zod schema, not a code read):

```
node -e "serviceCatalogItemSchema.parse({... basePriceRub: 3500.5 ...})"
keys: id,organizationId,code,title,aliases,category,specialty,basePriceRub,durationMinutes,taxDeductible,active
has priceRub: false
OLD expression result: 0            <- service?.priceRub?.toString() || "0"
OLD dropdown label: Title (undefined RUB)
OLD manual pick String(): undefined
serviceCategory enum: consultation,therapy,surgery,prosthetics,orthodontics,periodontology,hygiene,imaging,documents,other
has ortho? false                    <- the old `case "ortho"` was dead code
```

`priceRub` exists on `dentalPricelistItemSchema` (shared/index.ts:1734), a DIFFERENT type — the
parent confused the parsed price-list line with the catalogue item. Diagnosis confirmed.

**Discount-as-percent, reproduced numerically:**
```
parent calcPlanTotal(10000 × 1, discount 500) -> -40000
server totalPrice  max(0, 10000*1-500)        ->   9500
float accumulation 0.1 + 0.2                  -> 0.30000000000000004
```
The −40 000 ₽ vs 9 500 ₽ claim is exact. Server contract re-read by me:
`routes/odontogram.ts:115 discount: z.number().finite().min(0).max(100_000_000)` and
`:407-410 sum + Math.max(0, item.price * item.quantity - item.discount)` — discount is ROUBLES.

## 2. IS THE FIX REACHABLE? EVERY LINK.

Links 1–3 verified by reading the live files:
1. `components/odontogram/OdontogramModule.tsx:443-459` — mounted odontogram calls
   `addPendingPlanSuggestion` for Caries/Pulpitis/Planned_Implant/Missing/Crown after a save. YES.
2. `store/patientStore.ts:57-59,104-106` — the queue holds them (`any[]`). YES.
3. `ComparativePlannerDashboard.tsx` is the only reader (rg over the whole repo: store, odontogram
   writer, this component, plus two test files that name it as declared debt). YES.

Link 4 is **BROKEN, as the brief ordered**. Independent instrument — my own import-graph scan
(node, 375 files under apps/web/src, regex over `from "…"`/`import(…)` specifiers, not the
builder's rg):

```
apps/web/src/components/plan/ComparativePlannerDashboard <- importers: 0 []
apps/web/src/components/plan/planPricing                 <- importers: 1 [ComparativePlannerDashboard.tsx]
```

So: **the money fix is unreachable for a user today, and so is `planPricing.ts`, whose only
importer is the dead component.** The brief explicitly forbade mounting ("do not mount this
component", "Mounting the component" listed as a fail condition), so this is compliance, not a
demerit — but it must be stated without decoration: this packet delivers ZERO user-visible
change at HEAD. The identical defect in the MOUNTED `TreatmentEstimator.tsx` is what is actually
writing invented money today.

`npm test -w @dental/web` → `panelsAreMounted.test.ts` (the reachability census) is green, 9/9,
and its `DECLARED_UNMOUNTED` entry still names the component. Nothing was smuggled into a mount.

## 3. DID IT FIX EVERY SITE? (re-derived with rg/ast-grep, not the builder's list)

Every one of the 18 inventory items I could reach was verified true at the parent and changed at
HEAD. Two corrections to the packet's own numbers:

- **`TreatmentEstimator.tsx` line numbers in the packet are all off by 4.** HEAD truth: hardcoded
  prices at :324, :332, :342, :350, :359, :367, :377, :386; phantom `svc.priceRub` at :452, :474,
  :484, :504, :524; `candidates[0]` at :314. The packet cited :320/:328/…/:310/:448…
  Cause found and it is honest drift, not fabrication: commit `dba665723` (17:54 local) added
  net +4 lines to that file, and AA4's own files were written at 17:51 — it read the file three
  minutes before the shift. Substance (8 prices, 5 phantom reads, the arbitrary fallback) is
  correct.
- **Schema-drift citation** `schema.ts:1424-1425` is the DIRTY working-tree line number; at HEAD it
  is :1380-1381. The drift itself is real and I confirmed it against the live database:
  declared `numeric(10,2)`, live `numeric(12,2)`.

**Repo-wide hunt for surviving `.priceRub` reads** (`rg "\.priceRub\b"` over apps/web, apps/api,
packages/shared, scripts):
- `TreatmentEstimator.tsx` ×5 — real, mounted, out of claim, correctly reported as NOT FIXED.
- `SettingsPricesTab.tsx:312 item.basePriceRub || item.priceRub || 0` — a fabricated `|| 0` on the
  same disease, but that file is ` M` (another agent's uncommitted work); not AA4's and not
  reviewable at HEAD.
- `apps/api/src/ai/visitFlowOrchestrator.ts:32 service.priceRub` — **I suspected the same defect
  and DISPROVED it**: `completedServices[].priceRub` is a real field of the request schema
  (shared/index.ts:8324-8336). Not a defect.
- `LabOrdersPanel`/`routes/lab.ts` — `labOrders.priceRub` is a real column. Not a defect.

## 4. BEHAVIOURAL PROOF THE PACKET DID NOT PRODUCE

The packet proved the new module with synthetic fixtures only. I ran it against the catalogue the
product ACTUALLY serves at HEAD. (At HEAD `domainStateHydration.ts:775` still carries
`if (serviceRecords.length > 0)` and `service_catalog_items` has 0 rows, so `dashboard.serviceCatalog`
is the 7 compiled-in `sampleData.ts` services.)

```
зуб 16 Caries         -> svc-therapy-caries    price=6800   issue=нет
зуб 26 Caries         -> svc-therapy-caries    price=6800   issue=нет
зуб 36 Pulpitis       -> null                  price=null   issue=not_in_catalog
зуб 46 Crown          -> svc-prosthetics-crown price=26000  issue=нет
зуб 11 Missing        -> null                  price=null   issue=not_in_catalog
зуб 21 Planned_Implant-> null                  price=null   issue=not_in_catalog

* «лечение пульпита» (зуб 36): такой услуги нет в вашем прайсе. Добавьте её в прайс — тогда в смете появится ваша цена.
* «установка имплантата» (зубы 11, 21): такой услуги нет в вашем прайсе. Добавьте её в прайс — тогда в смете появится ваша цена.
```

4000 → 6800 (the listed price), 15000 → 26000 (the listed price), and the three unlisted
treatments get NO number and a named Russian instruction. **The invented prices are gone in
behaviour, not only in unit tests.** Screen-vs-server on a 3-line plan with kopecks and a 5-kopeck
discount: server 17601.45 ₽, screen 1760145 kopecks, **difference 0 kopecks**.

## 5. FINDINGS (defects I found that the packet did not report)

**F1 — a 0 ₽ price-list position deadlocks the create form, silently (medium).**
`nonNegativeMoneyRubSchema` allows `basePriceRub: 0` and the server contract allows `price: 0`
(`routes/odontogram.ts:114 z.number().finite().min(0)`). Reproduced:
```
resolvePlanSuggestions -> priceRub: 0, issue: null            (no notice, no row hint)
validateDraftPlanRows  -> ok:false, «Лечение кариеса по акции»: укажите цену больше нуля.
```
The row is pre-filled from the price list, the guidance block stays silent because `issue` is
null, and the only way out for the doctor is to type a price that is NOT in the price list — the
exact act this packet exists to forbid. `validateRubAmountInput(price, "укажите цену больше нуля")`
is stricter than the contract it claims to mirror.

**F2 — a found service with an unreadable price is reported as missing from the price list (low).**
```
resolvePlanSuggestions(basePriceRub: NaN) ->
  serviceId: "svc-broken", serviceTitle: "Лечение кариеса", priceRub: null,
  issue: { kind: "not_in_catalog", matches: 1 }
message: «лечение кариеса» (зуб 16): такой услуги нет в вашем прайсе. Добавьте её в прайс…
```
The service IS in the price list; the instruction cannot help, and the row simultaneously carries
a `priceId` and the hint «Цены нет: выберите услугу из прайса» — a service is already selected.
`planPricing.ts:229-235` needs its own issue kind ("цена этой позиции прайса испорчена").
Reachability is low (requires a non-finite `basePriceRub` reaching the client).

**F3 — §3: the form still invites a manual service name it will now refuse (medium).**
`ComparativePlannerDashboard.tsx:845` placeholder is unchanged: «Или введите название услуги
вручную». After this commit `validateDraftPlanRows` hard-refuses any row without a `priceId`
(«выберите услугу из прайса. Сохранить строку сметы без позиции прайса сервер не может»).
`planPricing.ts:274-277` documents exactly this reasoning — and then the input next to it keeps
promising the opposite. Before the commit the row at least reached the server; now the UI invites
an action it blocks locally. The placeholder must say the name only refines a price-list position.

**F4 — no guard exists on the component side of this fix, and the compiler is not one (medium).**
Type probe, decisive:
```ts
type Dash = AppLogicContextType["dashboard"];
const item = dash?.serviceCatalog?.[0];
// @ts-expect-error
const phantom = item?.priceRub;
→ error TS2578: Unused '@ts-expect-error' directive.
```
i.e. reading `priceRub` off `dashboard.serviceCatalog` produces NO type error — the God Context
hands out `any` here. That is why the defect survived so long, and it means the component-side
half of the fix (`String(catItem.basePriceRub)`, `sc.basePriceRub`, the `resolvePlanSuggestions`
call site) is protected by neither the compiler nor any test. `planPricing.test.ts` covers only
the extracted pure module; `git grep` finds no test asserting the component's source is free of
the phantom field. Reverting the component half would keep the suite green.

**F5 — the packet's own patientCardDecomposition proof is no longer reproducible, and the guard it
quoted no longer exists (informational, not the builder's fault).**
Claimed: 13 tests / 13 pass, including «components/plan/ComparativePlannerDashboard.tsx:
заявленный долг, подключения нет» and «components/plan/planPricing.ts: его кто-то импортирует».
Re-run now, from `apps/web`, true exit 0:
```
tests 9 / suites 2 / pass 9 / fail 0
✔ реквизиты пациента рисуются целиком
✔ карточка пациента не держит вторую копию реквизитов
```
Neither quoted test name exists. The file is UNTRACKED (`??`) and its mtime is 14:25Z — 20 minutes
AFTER AA4's commit (14:05Z) — so a concurrent writer rewrote it, moving the orphan search into
`panelsAreMounted.test.ts` + `tests/utils/componentReachability.ts` (both also untracked/dirty).
The claim was almost certainly true when made; it is dead now. Consequences the lead must own:
the assertion that `planPricing.ts` has an importer no longer exists anywhere, and the debt reason
for this component now lives in `panelsAreMounted.test.ts:91-113` — where someone has ALREADY
written «Денежный блокер снят коммитом a37f358aa …», **uncommitted, in a file AA4 never declared**.
Whoever wrote that (AA4 or the orphans packet) left the corrected debt text unversioned.

**F6 — latent, no live path: a coverage percent with 3+ decimals silently drops DMS coverage to
zero.** `basisPointsFromPercent` returns null → `insuranceCoverageKopecks` skips the line → the
patient is shown «Покрывает ДМС: −0,00 ₽» with no explanation. I tried to make this reachable and
FAILED: the columns are `numeric(5,2)` (verified live) and all 10 001 two-decimal percents from
0.00 to 100.00 pass. `insurance_contracts` also has 0 rows. Report as latent only.

## 6. PROOF AUDIT — every claimed command re-run, true exit code

| claim | my result |
|---|---|
| `node --import tsx --test apps/web/src/tests/planPricing.test.ts` 27/27 | TRUE_EXIT=0, tests 27 / suites 6 / pass 27 / fail 0 — REPRODUCED |
| `patientCardDecomposition.test.ts` 13/13 with two named tests | TRUE_EXIT=0 but **9 tests / 2 suites, neither name exists** — NOT REPRODUCIBLE (see F5) |
| single-file `tsc` on the three files, exit 0 | superseded by the full workspace typecheck: 0 errors in AA4's files |
| `node scripts/check-css-tokens.mjs` exit 0, 0 unresolvable | TRUE_EXIT=0; 48 css files, 146 vars, 2948 var() uses, «НЕ РАЗРЕШАЕТСЯ НИ В ОДНОЙ ТЕМЕ: 0 имён, 0 вхождений» — REPRODUCED exactly |
| new tokens resolve in EVERY theme | the guard only proves "in at least one", so I checked per theme: `dente-redesign.css` declares `--ink/--line/--teal-surface/--warn-bg/--warn-fg` in all three — `:root,[data-theme="light"]` (:11), `[data-theme="dark"]` (:67), `[data-theme="night"]` (:115). CLAIM HOLDS, and it was under-proven by the builder's own instrument |
| `npm run smoke:web-text-encoding` 420 files | TRUE_EXIT=0, ok true, **423** files, mojibake 0, garbled 0, requiredSnippets 13 — reproduced; the file count drifted up by 3 from concurrent commits |
| `service_catalog_items` = 0 for both orgs | live read-only SQL: TOTAL 0, group-by returns no rows — CONFIRMED |
| `organizations` = 2, both `clinic_mode='demo'` | CONFIRMED: `4a3420d1-…` «Стоматология, 1 кабинет», `d0000000-…` «Демо-клиника для снимков» |
| `treatment_plans` = 0, `treatment_plan_items_new` = 0 | CONFIRMED, 0 and 0 |
| live column types price/discount numeric(12,2), quantity/tooth_number integer, price_id text | CONFIRMED verbatim from `information_schema.columns` |
| Drizzle declares precision 10 → drift | CONFIRMED at HEAD `schema.ts:1380-1381` (packet cited dirty-tree :1424-1425) |
| the priceId:null → 400 defect, admitted NOT PROVEN | still not proven by me either; I note the FAILING variant writes nothing, so it was safely testable and was left untested |

Mojibake / encoding round-trip (AGENTS §5 method) on all four changed files plus the commit
subject and body: `mojibake: false, bom: false, validUTF8: true, U+FFFD: false` on every one.

## 6a. THE §7a GATE THE BUILDER WAS FORBIDDEN TO RUN — I RAN IT

```
cd apps/web && npm test        (node --import tsx --import ./testCssStub.mjs --test "src/**/*.test.ts" "src/**/*.test.tsx")
exit 0
ℹ tests 697 / suites 110 / pass 697 / fail 0 / cancelled 0 / skipped 0 / todo 0
ℹ duration_ms 34619
```
57 test files match the glob; `planPricing.test.ts` is one of them (verified by enumerating the
glob). So the packet's 27 new checks run inside the workspace suite and the whole suite is green —
a stronger result than the packet could claim for itself.

`npx tsc -p apps/web/tsconfig.json --noEmit` — 1 error, in another agent's dirty `FinanceView.tsx`
(§0). Zero in AA4's files.

## 7. TEST QUALITY — would it fail if the fix were reverted?

`planPricing.test.ts` is not ceremony. It asserts the honest behaviours by value, not by
smoke: `priceRub === null` AND `notEqual(…, 0)` for an empty catalogue; no `candidates[0]`
substitution; `ambiguous` with `matches: 2`; inactive positions excluded; `«ё»` normalisation;
discount in roubles (`950000` where the old formula gave −40 000 ₽); `max(0, …)` floor; whole
kopecks on ×3 of 1500,10; per-category DMS coverage with an explicit `notEqual` against the old
arithmetic mean (1 250 000); `orthodontics` vs the dead `ortho`; three-decimal input refused.
Reverting `planPricing.ts` breaks the import and every one of the 27 checks.
But see **F4**: the COMPONENT half has no guard at all, so "the fix" is only half-defended.

## 8. GIT HYGIENE

- `a37f358aa`: exactly 4 files, all claimed, all `apps/web/src` (`ComparativePlanner.css`,
  `ComparativePlannerDashboard.tsx`, `planPricing.ts` new, `planPricing.test.ts` new).
  +1368/−143. No `dist`, no `tsconfig.tsbuildinfo`, no `.data/`, no `node_modules`.
- `9b43c934d`: 4 packet docs only (`commitmsg.txt`, `commitmsg2.txt`, `handoff.md`, `state.md`).
- No other author's work swept in; the tree around it is filthy (36+ dirty files from concurrent
  agents, including a staged deletion `D apps/api/src/db/rebookingConversionRulesQuery.ts`) and
  none of it landed in either commit.
- Subjects are Conventional Commits in Russian and name the DEFECT, not the change:
  «fix(смета): импорт из зубной формулы подставлял выдуманные цены, а найденной услуге — ноль».
- Nothing was deleted by this packet, so no `git grep '<BaseName>'` hole to check; `calcPlanTotal`
  was renamed to `calcPlanTotalKopecks` inside the same file and has no external referents
  (`rg calcPlanTotal` → only that file).

## 9. WHAT I COULD NOT DO

- Did not restart any server, did not apply a migration, did not seed. Did not POST to
  `/api/patients/:id/treatment-plans`.
- Could not typecheck the parent commit to prove the parent was green; the working tree is dirty
  with other agents' work and stashing/worktrees are mutations. F4's type probe answers the
  question that mattered (the compiler never guarded the phantom field) without touching the tree.

---

# SECOND PASS (continuation reviewer, HEAD 798a320fd)

The previous pass above died before finishing. This pass re-verifies its load-bearing claims with my
own instruments and adds findings it did not have. Where I contradict it, my run wins.

## S0. COMPILE GATE, RE-RUN AT NEW HEAD

```
cd apps/web && npx tsc -p tsconfig.json --noEmit --composite false --incremental false
TRUE_EXIT=0   (no output at all)
```
ZERO errors in the whole apps/web workspace, incremental cache defeated. The 11 panelStateText
errors quoted at dispatch are gone; so is the `CashDayTally` error the first pass saw in another
agent's dirty `FinanceView.tsx` (commits 1f3361456 / 798a320fd landed since). AA4 touched no
`packages/shared`, so no `npm run build -w @dental/shared` was owed. **Compile: green.**

## S1. THE DEFECT WAS REAL — AND THE REAL-DATA SHAPE OF IT IS NOT WHAT THE PACKET DESCRIBES

I ran the parent commit's `findService`/`importSuggestions` logic verbatim against the catalogue the
API actually serves (`apps/api/src/sampleData.ts`, 7 services — `service_catalog_items` is empty and
`domainStateHydration.ts:775` only replaces the compiled-in list `if (serviceRecords.length > 0)`).
Instrument: my own harness, `node --import tsx`, not the builder's read.

```
OLD (parent a37f358aa^), real 7-item catalogue:
tooth 16 Caries          -> svc-therapy-caries      "Лечение кариеса с восстановлением"  PRICE=0
tooth 36 Pulpitis        -> svc-therapy-caries      "Лечение кариеса с восстановлением"  PRICE=0
tooth 46 Crown           -> svc-prosthetics-crown   "Коронка керамическая"               PRICE=0
tooth 11 Missing         -> svc-surgery-extraction  "Удаление зуба"                      PRICE=0
tooth 21 Planned_Implant -> svc-surgery-extraction  "Удаление зуба"                      PRICE=0
```
Two facts the packet did not state:
- On the real catalogue **the five hardcoded prices never fire at all**: every state's category has
  at least one row, so `candidates[0]` always wins and the `|| {priceRub: 4000}` object is never
  constructed. The invented prices are reachable only when a whole CATEGORY is missing from the
  price list. The packet's claim that they were "the only prices this import could ever show" is
  still literally true (catalogue hits produced `"0"`), but the observed defect on live data was
  **0 ₽ plus the wrong treatment**, which is worse than the brief's framing.
- The arbitrary `candidates[0]` fallback assigned **«Удаление зуба» for a MISSING tooth** and
  **caries treatment for pulpitis**. Not just an invented price — an invented diagnosis→service map.

NEW behaviour, same catalogue, same harness:
```
tooth 16/26/55 Caries -> svc-therapy-caries price=6800   issue=none
tooth 46 Crown        -> svc-prosthetics-crown price=26000 issue=none
tooth 36 Pulpitis     -> null price=null issue=not_in_catalog
tooth 11/21           -> null price=null issue=not_in_catalog
messages:
 * «лечение пульпита» (зуб 36): такой услуги нет в вашем прайсе. Добавьте её в прайс — тогда в смете появится ваша цена.
 * «установка имплантата» (зубы 11, 21): такой услуги нет в вашем прайсе. Добавьте её в прайс — тогда в смете появится ваша цена.
```
0 → the clinic's own 6800/26000, no number where there is no position, named Russian instruction.
Screen-vs-server on a 3-line plan (1500,50×3 −0,05 ₽; 6800 −500 ₽; 0,01×7): server float total
10801.52 ₽ → 1080152 kopecks; screen 1080152 kopecks; **delta 0**.

The field-name diagnosis is confirmed from the PRODUCER side, not the client type: both API paths
emit `basePriceRub` and nothing else — `pricelistQuery.ts:23-36` maps it explicitly, and
`domainStateHydration.ts:704-710` coerces then validates through `serviceCatalogItemSchema`, which
declares `basePriceRub` (shared/index.ts:1645) and no `priceRub`, so zod strips any stray key. My
harness confirms at runtime: `any item exposing priceRub: false`. `priceRub` DOES exist as a column
on `service_catalog_items` (schema.ts:399) — that is where the bug came from — but it never reaches
the DTO. Both money columns are `mode: "number"`, so no numeric-as-string leak.

## S2. FINDING S-A (MEDIUM) — THE PACKET'S HEADLINE PROMISE IS FALSE ABOVE THREE SERVER BOUNDS

The commit body promises: «либо план сохраняется целиком, либо названы конкретные строки и сказано,
что с ними сделать», and `planPricing.ts:515-527` says it exists so the user is never met with the
server's generic 400. `validateDraftPlanRows` copies exactly ONE rule out of
`treatmentPlanItemSchema` (routes/odontogram.ts:109-118) — the mandatory `priceId` — and silently
skips the numeric bounds declared four lines away in the same object. Server truth:

```
quantity: z.number().int().min(1).max(999)
price:    z.number().finite().min(0).max(100_000_000)
name:     z.string().trim().max(500).optional()
priceId:  z.string().trim().min(1).max(200)
items:    z.array(...).max(500)
```
Client truth, reproduced (`validateDraftPlanRows`, my probe):
```
quantity "1000"        -> CLIENT OK, sends quantity 1000        (server rejects: max 999)
quantity "999999999"   -> CLIENT OK, sends quantity 999999999
price "200000000"      -> CLIENT OK, sends price 200000000      (server rejects: max 1e8)
name 600 chars         -> CLIENT OK                             (server rejects: max 500)
priceId 250 chars      -> CLIENT OK                             (server rejects: max 200)
```
`normalizeRubAmountInput` caps at `MAX_SAFE_INTEGER/100` ≈ 9,0e13 ₽, i.e. six orders of magnitude
above the contract. The quantity input at `ComparativePlannerDashboard.tsx:875-878` is
`type="number" min={1} step={1}` — **no `max`**, so an extra zero in the spinner is all it takes.
When it happens the user gets `serverMessage` rendered verbatim in the new problems block, and that
message is «План лечения не сохранен: проверьте услуги, цены и этапы.» (routes/odontogram.ts:402) —
the precise generic phrase this commit was written to abolish. Not a regression (the parent 400'd
too) but the packet's own claim, unfinished, in the function whose entire purpose is that claim.

## S3. FINDING S-B (MEDIUM) — THIS COMMIT SENDS A NEW FIELD THE SERVER FDI-VALIDATES, AND THE
CLIENT DOES NOT

Before this commit `toothNumber` was never in the request body. It is now
(`planPricing.ts:593 toothNumber: row.toothNumber ?? null`). The server field is
`fdiToothNumberSchema.optional().nullable()` — 11–18, 21–28, 31–38, 41–48, 51–55, 61–65, 71–75,
81–85. The client filter is only `Number.isFinite` (`ComparativePlannerDashboard.tsx:350-352`), and
my probe confirms `toothNumber: 19` passes client validation and is sent. A non-FDI tooth number now
**fails the WHOLE plan with the generic 400**, where before the plan saved (losing the tooth). New
failure mode introduced by this commit. Reachability depends on what the odontogram can put in the
queue — measured below.
