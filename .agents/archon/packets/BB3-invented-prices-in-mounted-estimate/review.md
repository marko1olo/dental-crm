# ADVERSARIAL REVIEW — BB3-invented-prices-in-mounted-estimate

Commit under attack: `a094f12683dbae997a997ac4ea676b42b7acf109`
Also in scope (the packet's first commit): `ae54cb9357c172e1ebd0f764d2bca1d707106cde`
Reviewer: adversarial, did not write this code. Posture: disbelief.
Repo HEAD at review start: `8b017779ebf267609bf58fbc162d783fc763a396` (one commit PAST the packet — another author's test commit).

STATUS: IN PROGRESS — appended as measured.

---

## 0. CHEAPEST CHECK FIRST — DOES IT COMPILE?

| command | result | TRUE_EXIT |
|---|---|---|
| `npm run typecheck -w @dental/web` | no output beyond banner | **0** |
| `cd apps/web && npx tsc -b --force` (defeats tsbuildinfo cache) | no output | **0** |
| `npm run typecheck -w @dental/api` | no output beyond banner | **0** |

Packet claimed it did NOT touch `packages/shared` (only imported from it). Verified below in §git.
No `npm run build -w @dental/shared` was needed; confirmed by `git show --stat` on both commits
touching only `apps/web/src/components/odontogram/*`.

**VERDICT ON THE COMPILE GATE: GREEN, and green under `--force`, so not a cache artefact.**
This is the check that killed cycle 10. It passes here.

---

## 1. WAS THE DEFECT REAL BEFORE THE COMMIT? — YES, MEASURED MYSELF

The packet names the parent as `fff515a76`. **The actual parent of `ae54cb935` is `e29a8791a`.**
That is a mislabel. It is however HARMLESS, and I proved why rather than assuming:

```
git rev-parse fff515a76:apps/web/.../TreatmentEstimator.tsx -> 4bb8ab86539f817642b0bdd60423f7341114fd0a
git rev-parse e29a8791a:apps/web/.../TreatmentEstimator.tsx -> 4bb8ab86539f817642b0bdd60423f7341114fd0a
```

Byte-identical blob, and `fff515a76` IS an ancestor of `ae54cb935` (`--is-ancestor` exit 0).
So every `file:line` citation in the packet's inventory is valid; only the commit label is wrong.
Recorded as a NIT, not fabrication — contrast with the charge sheet's "measurement against a
baseline the packet itself proved impossible": here the baseline is real and I reproduced it.

My own instrument (`grep -n` on the parent blob, not the builder's AST walk) at `e29a8791a`:

| claim | my measurement | match |
|---|---|---|
| 8 fabricated prices at :368 :376 :386 :394 :403 :411 :421 :430 | exactly those 8 lines, values 4000 5500 6000 12500 35000 12000 5000 28000 | **EXACT** |
| 8 id sites at :366 :374 :384 :392 :401 :409 :419 :428 | exactly those 8 lines | **EXACT** |
| only 5 DISTINCT id values | `service_caries_01` x2, `service_endo_pulpitis` x2, `service_crown_zirconia` x2, `service_implant_osstem`, `service_surgery_guide` = 5 distinct | **EXACT, and the builder's correction to the brief is right** |

The brief said "eight ids"; the builder said 5 distinct across 8 sites and flagged the difference.
That is the opposite of the disease — a builder correcting its own brief downward.

---

## 2. THE REVERT-PROOF CLAIM — I REIMPLEMENTED IT AND IT HOLDS

This is the claim I expected to break. It did not.

I re-wrote the two AST assertions from scratch in my own script
(`critic-ast-revert.mjs`, beside this file) and ran them against BOTH blobs:

```
--- PARENT e29a8791a ---
TEST A (no invented service id): FAIL -> ids=[all 5] titles=[all 3]
TEST B (no numeric money literal): FAIL -> priceRub: 4000 … 28000 (all 8)

--- HEAD a094f1268 ---
TEST A: PASS
TEST B: PASS
```

**The tests genuinely fail if the fix is reverted.** Not ceremony. §8 satisfied.
The comment-exclusion in the walk (`leadingComments`/`trailingComments`/`innerComments`/`comments`)
is honestly motivated and I verified it is NOT a loophole: the surviving textual mentions of
`service_caries_01` et al. at HEAD are all inside `/* */` docblocks
(`TreatmentEstimator.tsx:277-279`, `treatmentEstimatorPricing.ts:8-9,77-78`) documenting the
defect history. Excluding comments is what lets the code keep its own post-mortem. A plain
`grep` guard would have forced deletion of the explanation.

Test B is keyed on the PROPERTY name, not the value — the docblock says why (`12000` still
exists in the file as a toast duration). I confirmed that reasoning is true, see §5.

| command | result | TRUE_EXIT |
|---|---|---|
| `node --import tsx --test .../treatmentEstimatorPricing.test.ts` | `tests 31 / pass 31 / fail 0 / cancelled 0 / skipped 0 / todo 0` | **0** |

Reproduced the exact claimed number. 31/31.

---

## 3. REACHABILITY — EVERY LINK, MEASURED

I did not accept the packet's chain. I re-walked it from the route down.

| # | link | evidence | verdict |
|---|---|---|---|
| 1 | route -> view | `App.tsx:3738` `currentView === "patients"` -> `App.tsx:3770 <PatientsView …>` inside `WorkspaceRouteErrorBoundary` + `Suspense`; lazy at `App.tsx:393` | **LIVE** |
| 2 | view -> module | `PatientsView.tsx:497 <OdontogramModule patientId={selectedPatient.id} />`, rendered when a patient is selected | **LIVE** |
| 3 | module -> component | `OdontogramModule.tsx:18` import, `:740 <TreatmentEstimator patientId={patientId} currentTeeth={teethData} />` | **LIVE** |
| 3b | SECOND independent chain | `VisitView.tsx:505 <VisitOdontogramTab …>` -> `VisitOdontogramTab.tsx:45 <OdontogramModule …>` -> same estimator | **LIVE** |
| 4 | component -> changed lines | the edited footer is at `TreatmentEstimator.tsx:747-775`, inside the component's MAIN `return`, NOT behind any conditional | **LIVE** |
| 5 | changed lines -> signed document | `SignaturePad` is rendered in the same `return`, `TreatmentEstimator.tsx:776-793` | **CONFIRMED** |

So the fix is NOT in a dead file. This is the failure mode the dispatch warned about ("one packet
this campaign fixed a dead file and certified it with its strongest label") and it does not apply.

`workspacePreload.ts:7` also preloads `./PatientsView`, further confirming it is a real route target.

---

## 4. SERVER CONTRACT — I READ IT MYSELF, NOT VIA THE CLAIM

`apps/api/src/routes/odontogram.ts:91-100`:

```ts
priceId: z.string().trim().min(1).max(200),          // REQUIRED
price: z.number().finite().min(0).max(100_000_000),  // REQUIRED
quantity: z.number().int().min(1).max(999).default(1),
```

Packet's claim ("`priceId` REQUIRED min(1), so one unpriced row rejects the WHOLE plan") is
**ACCURATE**. Its statement that the OLD code's fabricated `"service_caries_01"` passed this
schema is also accurate — any non-empty string satisfies it.

I then attacked the boundary the packet did NOT mention: the server demands `quantity >= 1`, and
`estimatorRowMoney` only rejects `quantity < 0`, so quantity `0` would be "known" client-side and
rejected server-side. **Not reachable**: `planItemFromServer` clamps
`quantity: Math.max(1, finiteOr(item.quantity, 1))` (`treatmentEstimatorPricing.ts:497`) and
auto-rows are hardcoded `quantity: 1` (`:332`), and there is **no quantity input in the UI** —
`grep -n quantity TreatmentEstimator.tsx` returns only a display at `:692`. So no false save.
Dead-end, correctly. Not a finding.

API probes I ran myself:

| probe | result |
|---|---|
| `curl /api/health` | **200** |
| `curl GET /api/patients/5755a8aa…/treatment-plans` (no token) | **401** `{"error":"AuthRequired","message":"Требуется авторизация рабочего кабинета клиники."}` |

The 401-before-body-parse ordering the packet claims for POST is consistent with what I observe on
GET. I did not mint a token (the packet's 200 is plausible and its `plans:[]` matches the DB
measurement below), and I did not POST — a write to the shared DB is exactly what the packet
correctly refused. **The packet's "NOT PROVEN" list is honest about this.**

---

## 5. MONEY-VS-COUNT — CLEAN IN BOTH DIRECTIONS

No count made fractional:
- `pricedRows: payable.length` — array length, integer by construction.
- `incompleteRows` — `+= 1` only.
- `quantity` — guarded by `Number.isInteger(item.quantity)` at `:607`; a fractional quantity makes
  the row *unpriced* rather than being silently rounded or accepted.
- `phase` — untouched integer.

No money left rounded / no float money:
`grep -n '/ 100|\* 100|Math.round|Math.floor|toFixed|parseFloat|parseInt|Number('` over
`treatmentEstimatorPricing.ts` returns **ZERO arithmetic hits** — the only matches are a comment at
`:47` describing the OLD float bug and FDI predicates at `:121/:158/:489`. All money goes through
`parseKopecks`, `multiplyKopecks`, `percentageOfKopecks`, `sumKopecks` from `@dental/shared`
(`:52-59`). `Math.max(0, …)` is applied per line, matching the server.

**SECOND-OWNER CHECK: NEGATIVE.** `rub()` at `TreatmentEstimator.tsx:67` is
`money(kopecksToNumericString(kopecks))` — a formatting delegate to the pre-existing `AppHelpers.money`,
performing NO arithmetic. It is not a second money helper.

---

## 6. §10 SHARED CONTRACT SYNCHRONY — I HUNTED A STALE CONSUMER AND FOUND NONE

The risky part of this packet is widening `PlanItem.price` to `number | null`. If any other file
consumed that type, it would now be wrong. Measured:

```
grep -rn "interface PlanItem|type PlanItem"  ->  treatmentEstimatorPricing.ts:194  (the new one)
                                                 ComparativePlannerDashboard.tsx:35 (SEPARATE local type)
                                                 planPricing.ts:497 PlanItemForApi   (SEPARATE)
importers of ./treatmentEstimatorPricing     ->  TreatmentEstimator.tsx  +  its own test.  THAT IS ALL.
```

The widened type has exactly ONE production consumer, in the same directory, and it compiles.
No stale consumer exists. `packages/shared` was NOT touched by either commit (verified by the
per-commit file lists in §8), so the "shared not rebuilt" trap does not apply here — and I still
ran both workspace typechecks anyway.

I also checked the obvious sibling for the SAME disease, since "did it fix every site" is the
question: `ComparativePlannerDashboard.tsx` — `grep 'priceRub: [0-9]|price: [0-9]|id: "service_'`
returns **nothing**. No fabricated-price twin left behind in the plan folder.

---

## 7. DELETED-SYMBOL SWEEP — WHOLE REPO, INCLUDING scripts/ AND package.json

`git grep -n '<sym>' HEAD -- .` for every symbol commit 1 removed:

| symbol | live source references at HEAD | verdict |
|---|---|---|
| `findService` | none in source (only `.agents/` docs + `recon/*.json` artefacts) | **no hole** |
| `servicePriceRub` | none in source (one `.agents/` commitmsg) | **no hole** |
| `getCoverageInfo` | none in source (`.agents/lead/*`, `scratch/*` only) | **no hole** |
| `numberOr` | none — the only hits are an UNRELATED `numberOrNull` in `analytics/analyticsWidgetData.test.ts` | **no hole** |
| `planItemFromServer` | MOVED, not deleted: imported `TreatmentEstimator.tsx:31`, used `:255` and `:395` | **still wired** |

No `scripts/` or `package.json` reference to any removed symbol. The hole that broke a smoke once
is not present here.

---

## 8. GIT HYGIENE — CLEAN, AND NOTABLY SO

```
COMMIT1 ae54cb935: apps/web/src/components/odontogram/TreatmentEstimator.tsx
                   apps/web/src/components/odontogram/treatmentEstimatorPricing.test.ts
                   apps/web/src/components/odontogram/treatmentEstimatorPricing.ts
COMMIT2 a094f1268: the same 3 files
```

- Exactly the claimed files. **Nothing else.**
- No `SettingsPricesTab.tsx` in either commit — and this matters, because
  `git status --porcelain apps/web/src` shows `M apps/web/src/components/settings/SettingsPricesTab.tsx`
  **dirty right now**, along with 21 other modified files from other authors. The builder committed
  through a shared index with 22 dirty files present and swept in **zero** of them. That is the
  discipline the charge sheet says was missing elsewhere.
- No `apps/api/dist`, no `tsconfig.tsbuildinfo`.
- Commit subjects are Russian, name the DEFECT not the fix, and contain **no mojibake**:
  - `[ARCHON] fix(смета): в подписываемый план уходили цены и услуги, которых нет в прайсе клиники`
  - `[ARCHON] fix(смета): план без единой цены показывал «Итого: 0 ₽», как будто лечение бесплатное`
- Nothing odontogram-related is staged in the index now.

### The `checkedFiles` discrepancy — chased down, and it EXONERATES the builder
Packet claims `checkedFiles: 424`; I measure **427**.
`scripts/smoke-web-text-encoding.mjs:37` walks `apps/web/src` only. The post-packet commit
`8b017779e` added `apps/api/src/tests/support/fixtureOrganizations.test.ts` — outside the walk, so
it cannot explain the delta. The actual cause is three UNTRACKED files another author dropped into
`apps/web/src` after the builder's run:
```
?? apps/web/src/components/documents/PaidContractRequiredFieldsPanel.tsx
?? apps/web/src/components/documents/paidContractRequiredFields.test.ts
?? apps/web/src/components/documents/paidContractRequiredFields.ts
```
424 + 3 = 427 exactly. **The builder's number was honest.** My re-run:
`{ok:true, checkedFiles:427, mojibakeHits:0, garbledQuestionHits:0, requiredSnippets:13}`, TRUE_EXIT **0**.

### Caveat I will not hide
My two typechecks measured the WORKING TREE (22 modified + 3 untracked files from other authors),
not the packet commit in isolation. The tree is green, therefore the packet's files are green in
context. I am not claiming an isolated-commit typecheck.

---

## 9. DB CLAIMS — RE-MEASURED WITH MY OWN `pg` CLIENT

`critic-db.mjs` (beside this file), read-only SELECTs, split by `organization_id`:

| claim | my measurement | verdict |
|---|---|---|
| exactly TWO organizations, not four | `d0000000-…-d001 'Демо-клиника для снимков'`, `4a3420d1-… 'Стоматология, 1 кабинет'` | **EXACT** |
| `service_catalog_items` ZERO rows for BOTH orgs | `group by organization_id` -> `[]`; `count(*)` -> `0` | **EXACT** |
| `treatment_plans` ZERO | `[]` | **EXACT** |
| `treatment_plan_items_new` ZERO | `0` | **EXACT** |
| none of the 8 sums ever set by a clinic | `where base_price_rub in (4000,…,28000)` -> `[]` | **EXACT** |
| `base_price_rub` and `price_rub` both `numeric(12,2)` | both `numeric(12,2)` — orphan second money column confirmed | **EXACT** |

So the packet's central measurement stands: **the catalogue-empty branch was the ONLY branch that
could execute on this database.** The defect was the default behaviour, not an edge case. The packet
also independently reproduces the lead's own corrected count (2 orgs, not the published 4).

Bonus measurement the packet did not make, which I used to close a loose end:
`treatment_plan_items_new.quantity` is `integer NOT NULL` and `.price` is `numeric(12,2) NOT NULL`.

---

## 10. INDEPENDENT BEHAVIOURAL DRIVER — MY INSTRUMENT, NOT THEIRS

I did not re-run their test and call it verification. I wrote `critic-driver.ts` /
`critic-driver2.ts` and drove the module directly. Results:

| case | input | observed | verdict |
|---|---|---|---|
| A | EMPTY catalogue, 5 marked teeth | 6 rows, **every** `price=null priceId=null issue=catalog_empty`; `estimatorItemForApi` returned null for all 6 (no leak to the wire); `totals {payable:0, incomplete:6, priced:0}` | **fix works** |
| B | catalogue `basePriceRub: 1500.5` | `unitKopecks 150050` exactly; `forApi.price 1500.5` | **kopeck-exact** |
| C | catalogue with ONE **inactive** service | `price=null priceId=null` — deactivated service kept out | **fix works** (but see FINDING 1) |
| D | «Консультация» FIRST in therapy + a real caries service | picked `Лечение кариеса глубокого` @4100, **not** the consultation | **`candidates[0]` defect gone** |
| E | surgery catalogue = «Удаление зуба хирургическое» only | implant AND guide rows both `price=null` — extraction NOT billed as a guide | **keyword over-match gone** |
| F | 300.01 + 300.05 + 300.07 | naive float `900.1299999999999`; `estimatorTotals` -> `90013` kopecks | **float money gone** |
| G | server round trip, priced row, qty 2, discount 0.5 | `1500.50 x2 - 0.50` -> `300050` kopecks exactly | **round trip exact** |
| I | mixed plan (1 priced, 1 not) | `{payable:200000, incomplete:1, priced:1}` -> prints a sum **plus** «Итог неполный» | **correct branch** |

The user-facing text produced in case A, verbatim from the run (no `[A-Za-z]`, names every
treatment and every tooth, names the place to go, and states the finding survives):

> Ваш прайс-лист пуст, поэтому цены брать неоткуда. Заполните прайс в «Настройки → Прайс» — для
> этого плана нужны: лечение кариеса (зубы 11, 71); коронка (зуб 21); установка имплантата (зуб 16);
> хирургический шаблон (зуб 16); лечение пульпита (зуб 36). Найденное лечение из плана не исчезло:
> зубы и лечение видны, нет только цен.

§3 satisfied on the main path: Russian, plural agreement correct (`зубы 11, 71` vs `зуб 21`),
actionable, and **no money or raw float is interpolated into any message** — the only interpolated
numbers are tooth numbers and an integer match count.

**NOT A HOLLOW FACADE:** `estimatorIssueMessages` is genuinely rendered at
`TreatmentEstimator.tsx:542-556`; the row placeholder «Цена не назначена» renders at `:634`; and
«Сохранить» is truly `disabled={isSaving || blockedReason !== null}` with the reason in `title`
(`:479-480`), with a second guard inside `savePlan` at `:348`. The button does not promise what it
cannot deliver.

**NO SECOND OWNER:** `PLAN_SERVICE_RULES` is imported from `../plan/planPricing` (`:62`), not
re-typed. The single local rule, `SURGICAL_GUIDE_RULE` (`:105-109`), is documented as the one case
the shared table cannot express (one rule per tooth state, but a planned implant needs two rows).
FDI logic delegates to shared `isValidFdiToothNumber`; no tooth list is re-typed.

**NO INVENTED VALUES IN NEW CODE:** `grep -E '#[0-9a-fA-F]{3,8}|[0-9]+px|<uuid>'` over
`treatmentEstimatorPricing.ts` -> **zero hits**. The only numeric literals are `100` (percent bound
and copay complement) and phase ordinals 1/2/3, which match the server's `.int().min(1).max(12)`.
The only capitalised English strings added anywhere in the diff are `"Implant"` and `"Pulpitis"` —
`ToothState` switch labels, not user text.

---

## 11. FINDINGS

### FINDING 1 — §3: a fully DEACTIVATED price list is reported as EMPTY, with wrong advice  [CONFIRMED]
`apps/web/src/components/odontogram/treatmentEstimatorPricing.ts:291`

```ts
kind: matches.length > 1 ? "ambiguous"
    : activeCatalog.length === 0 ? "catalog_empty"   // <-- ACTIVE-filtered, not the raw catalogue
    : "not_in_catalog",
```

`activeCatalog` is `catalog.filter(s => s.active)` (`:253`). So a clinic whose price list is **full
but entirely deactivated** gets `catalog_empty`, and is told (`:774`):

> «Ваш прайс-лист пуст, поэтому цены брать неоткуда. **Заполните прайс** в «Настройки → Прайс» …»

That sentence is false in that state and the instruction is wrong: the doctor opens Настройки →
Прайс, sees their services listed, and "заполните" is not the action needed — "включите" is.
The type's own docstring at `:168` says «Прайс клиники пуст **целиком**», which contradicts what
`:291` actually assigns — so the code and its documentation disagree.

Failure scenario, **reproduced in driver case C**: catalogue `[{title:"Лечение кариеса",
category:"therapy", basePriceRub:3200, active:false}]`, tooth 11 = Caries -> row comes back
`price=null priceId=null issue.kind="catalog_empty"`. A clinic that stages its price list as
inactive drafts before go-live sits in exactly this state.

Mitigating: no money is fabricated (price correctly absent) and saving is still correctly blocked.
This is message precision, not a pricing defect. Needs a fourth issue kind (e.g. `catalog_inactive`)
distinguishing `catalog.length === 0` from `activeCatalog.length === 0`.

### FINDING 2 — a pre-existing saved row carries its fabricated id and price straight back out  [CONFIRMED, unreachable today]
`apps/web/src/components/odontogram/treatmentEstimatorPricing.ts:872-887`

`planItemFromServer` performs **no catalogue cross-check**. Driver case G:

```
in : {priceId:"service_caries_01", price:4000, toothNumber:51, …}
out: {priceId:"service_caries_01", price:4000, …, issue:null}       <- issue null, treated as legitimate
forApi: {priceId:"service_caries_01", price:4000, …}                 <- re-sent to the server verbatim
```

So any plan saved BEFORE the fix would re-render the invented 4000 ₽ beside the signature pad and
re-persist the invented id on the next save. The client cannot tell a fabricated id from a real one
— both are just non-empty strings.

**Not reachable in this database**: I measured `treatment_plans` = 0 rows and
`treatment_plan_items_new` = 0 rows for both organizations, so no such row exists. The packet
disclosed precisely this in CLAIMED NOT PROVEN ("Behaviour against OLD saved plans was not observed
because `treatment_plans` is empty"). Recorded as tracked debt, not a blocker — but if any other
deployment has saved plans, this is the migration question.

### FINDING 3 — an EMPTY plan still prints «Итого по плану: 0 ₽»  [CONFIRMED, nit]
`apps/web/src/components/odontogram/TreatmentEstimator.tsx:757`

The new guard is `totals.pricedRows === 0 && totals.incompleteRows > 0`. With **zero rows**,
`incompleteRows` is 0, so the guard fails and `rub(0)` prints. Driver case H:
`totals for [] -> {payable:0, incomplete:0, priced:0}` -> "prints rub(payableKopecks) = 0 RUB".

I rate this a NIT rather than a defect: with no rows there is no treatment to misprice, the
«План лечения пуст» empty-state card renders above it (`:569`), and the label reads «Итого по
плану», not the incomplete variant. But the second commit's own thesis is that «Итого: 0 ₽» reads as
"free", so the guard is narrower than the principle it was written to enforce.

### FINDING 4 — the packet mislabels its own baseline commit  [CONFIRMED, nit]
Packet says "the true parent commit fff515a76". `git rev-parse ae54cb935^` -> **`e29a8791a`**.
HARMLESS and I proved why rather than assuming: the `TreatmentEstimator.tsx` blob is byte-identical
at both (`4bb8ab865…`) and `fff515a76` is an ancestor, so every `file:line` citation is valid.
Flagged only because baseline mislabelling is one of the campaign's named diseases; here it is a
label slip on a real, reproducible baseline, not a phantom measurement.

### FINDING 5 — a FOUND-NOT-FIXED debt item describes an unreachable state  [CONFIRMED, nit]
The packet's first debt item says a NULL `treatment_plan_items_new.price` is served to the client as
`0` by `numeric()` (`apps/api/src/routes/odontogram.ts:129-132`). I measured the column:
`price numeric(12,2) **NOT NULL**`. NULL cannot occur, so the described failure cannot fire. The
`numeric()` coercion smell is real; the stated consequence is not. Minor overstatement in an
advisory list, not in a proof claim.

### FINDING 6 — whitespace `priceId` keeps its price and counts toward the total  [PLAUSIBLE, nit]
Driver case G: `planItemFromServer({priceId:"   ", price:100, …})` -> `{priceId:null, price:100,
issue:null}`. The row is unsavable (`estimatorSaveBlock` catches `!priceId`) yet
`estimatorRowMoney` reports `known:true`, so it increments `pricedRows` and joins «Итого», while the
block message says «лечение **без цены** из вашего прайса» about a row that visibly shows 100 ₽.
Unreachable from the server's own write path (zod `.trim().min(1)` means a stored id is trimmed and
non-empty), and the packet has a test for the trimming. Cosmetic inconsistency in issue attribution.

---

## 12. WHAT I TRIED TO BREAK AND COULD NOT

Listed so the lead knows the attack surface was actually walked, not skimmed:

- **Compile red inside its own claim** — no. Both workspaces 0 errors, web under `--force`.
- **Tests that pass either way** — no. I reimplemented both AST assertions and they FAIL at the parent.
- **Fix in an unmounted file** — no. Two independent live chains to the changed lines.
- **A site the builder missed** — none found. I re-derived the inventory by `grep` (different tool)
  and it matched line-for-line; I checked the obvious sibling `ComparativePlannerDashboard.tsx` for
  the same literals and it is clean.
- **A stale consumer of the widened type (§10)** — none exists; one production consumer only.
- **A count made fractional / money left rounded** — neither. `Number.isInteger` guards quantity;
  DB confirms `quantity integer NOT NULL`; all money is integer kopecks via shared helpers.
- **A second money owner** — no. `rub()` is a formatting delegate with no arithmetic.
- **A deleted symbol still referenced anywhere incl. `scripts/`, `package.json`** — none.
- **Another author's work swept in** — none, despite 22 dirty files in the tree, including the
  explicitly-forbidden `SettingsPricesTab.tsx`, which stays untouched.
- **Mojibake** — none in either subject; smoke green at 427 files.
- **An English user-facing string** — none.
- **A fabricated price, magic hex/px, or tenant UUID in the new code** — none.

## 13. VERDICT: **SOUND_WITH_NITS**

Every substantive claim in this packet reproduced under a different instrument. That is not the
outcome the charge sheet trained me to expect, and I looked hard for the opposite. Two places the
builder corrected its OWN brief downward (5 distinct ids, not 8; 6 price consumers measured, not
"roughly seven") and one place it corrected the lead's published number (2 organizations, not 4) —
the behaviour of an honest measurer, not a fabricator. The `CLAIMED NOT PROVEN` list is accurate
and includes the exact gap I independently found as FINDING 2.

Not REVERT, not NEEDS_REWORK: nothing here is worse than the defect, no guard was deleted and left
empty, no schema was mass-converted, no tolerance hides a kopeck mismatch, and no price is
fabricated anywhere. FINDING 1 is a real §3 message defect in new code but produces no wrong money
and blocks saving correctly; it belongs in a follow-up, not a revert.

