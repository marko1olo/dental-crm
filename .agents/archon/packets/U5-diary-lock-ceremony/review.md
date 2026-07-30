# ADVERSARIAL REVIEW — U5-diary-lock-ceremony

Reviewer: adversarial (did not write the code). Posture: disbelief; every claim reproduced or marked
UNTESTABLE. Read-only on source throughout — no edit/fix/commit/revert/git add; `git diff HEAD --
apps/api/src/routes/diary.ts apps/api/src/tests/...` is empty at the end. Server never started or
restarted (it was already up on 4100). All scratch deleted.

Commit under attack: `1f65d674b2a590130cc4ffeb4a8cc9b0df01bcc9`
Predecessor in the same packet: `87e367c404376fed3574473e36e9f8a5e4d0d11b` (the actual ceremony
convergence; `1f65d674b` is only the `||` -> `??` follow-up plus the whole 612-line test file).

## VERDICT: NEEDS_REWORK

Not because the code is wrong — the central fix is real, reachable over the network, and I reproduced
it end to end. Because **commit `1f65d674b` names, narrates and "measures" a defect that does not
exist**, and ships a test that cannot go red for it. On a packet whose sibling reviews exist to stamp
out fabricated proof, a commit subject that survives into the ledger as
"подписание приёма с пустой полки увеличивало остаток материала" is a false historical record about
the clinic's stock. It has to be corrected, and the real defect that hunk actually fixes has to be
named and gated.

## 0. Scope reconciliation

The task named ONE commit; the packet is TWO:
- `87e367c40` — diary.ts only, 478 ins / 275 del. Ceremony extraction. **This is the real fix.**
- `1f65d674b` — diary.ts 19 lines (`||` -> `??`, finite/positive guards) + the 612-line node:test.

Intervening commits (`0d219199e`, `94871d09a`, `0112f293e`) belong to other packets; untouched.

Method for the historical measurements: `git show <rev>:apps/api/src/routes/diary.ts` extracted to a
throwaway directory with **only its three import specifiers repointed**, loaded into a bare Fastify
instance with the same `onRequest -> getRequestIdentity` hook the server uses, driven against the
real PostgreSQL 18.4 at 127.0.0.1:5432 in throwaway organizations, then every fixture deleted. Final
DB state verified back to baseline (organizations 4 — the same four by name, inventory_items 0,
visit_diaries 0, patients 18, visits 10, users 7, treatment_items 10).

## 1. Was the defect real before the change? — CONFIRMED, re-measured

Pre-fix router (`87e367c40^`, 505 lines) read in full AND driven with the packet's own fixtures
(stock 10, rule 2/unit, treatment quantity 2 -> expected 6):

```
PREFIX POST draft -> 200
PREFIX POST sign  -> 200 {"success":true,"id":"f752f015-...","hash":"328f7995..."}
PREFIX POST observed: {"diaryExists":true,"locked":true,"pkcs7":null,"stock":10,"movements":0,
                       "movementQty":0,"audits":0,"auditAction":null,"treatmentStatus":"approved"}
PREFIX /lock sign -> 200 {"success":true,"hash":"6a064b51...","lockedAt":"2026-07-28T04:22:51.885Z"}
PREFIX /lock observed: {"diaryExists":true,"locked":true,"pkcs7":"MIIB-...","stock":6,"movements":1,
                        "movementQty":-4,"audits":1,"auditAction":"VISIT_SIGNED_AND_LOCKED",
                        "treatmentStatus":"completed"}
CLEANUP leftover org rows = 0
```

The packet's headline counterfactual reproduces digit for digit. Dossier §5.7 is TRUE.

Every secondary pre-fix claim also confirmed at file:line in the extracted file: POST hashed the
request body (`prefix:125-133`) vs /lock hashing the stored row (`prefix:250-256`); insert branch set
`isLocked: isSigning` (`prefix:205`); no `db.transaction` in POST; no `pkcs7Signature` in the schema
(`prefix:22-35`); /lock read `treatmentItems`/`procedureMaterialRules`/`inventoryItems` with no
organization predicate (`prefix:309, 321, 327`); `catch (err: any)` returned 400 with the raw driver
message and dispatched on `err?.message === "AlreadyLocked"` (`prefix:397-407`); `/revise` returned
the constant `revisionCount: 1` (`prefix:491`) un-transacted.

**Cross-tenant deduction, measured, not read.** Foreign clinic's material rule for our service,
pointing at the foreign clinic's shelf:

```
PRE-FIX cross-tenant -> 200 | FOREIGN shelf=6  OUR shelf=10 movements=1 movementOrgIsOurs=true movementItemIsForeign=true
HEAD    cross-tenant -> 200 | FOREIGN shelf=10 OUR shelf=10 movements=0 movementOrgIsOurs=true movementItemIsForeign=false
```

Pre-fix, signing in our clinic drained ANOTHER tenant's shelf from 10 to 6 and filed the movement row
under OUR organization. That is a genuine cross-tenant data-integrity defect and the org-scoping fix
closes it. Confirmed.

## 2. THE DEFECT NAMED BY `1f65d674b` DOES NOT EXIST — DISPROVED

Subject: `fix(склад): подписание приёма с пустой полки увеличивало остаток материала`.
Claimed measurement: "Empty shelf (stock_quantity 0, current_qty 10) ... Pre-fix that path raised the
shelf from 0 to 6."

Same scenario, three routers, real DB:

```
PRE-FIX (87e367c40^) empty shelf -> 400 {"error":"TransactionFailed","message":"Недостаточно материалов: ..."} {"stockRaw":"0","stock":0,"movements":0}
PARENT  (1f65d674b^) empty shelf -> 400 {"error":"TransactionFailed","message":"Недостаточно материалов: ..."} {"stockRaw":"0","stock":0,"movements":0}
HEAD                 empty shelf -> 400 {"error":"TransactionFailed","message":"Недостаточно материалов: ..."} {"stockRaw":"0","stock":0,"movements":0}
```

The empty shelf was already refused, stock untouched at 0, **before** the commit that claims to fix
it. It never rose to 6.

Root cause of the misdiagnosis, measured:

```
ORM VALUES SEEN BY THE ROUTE:
  inv.stockQuantity     = "0"    (string) truthy=true
  inv.currentQty        = "10"   (string) truthy=true
  rule.quantityToDeduct = "0"    (string) truthy=true
  item.quantity         = "2.00" (string) truthy=true
```

The commit body reasons one layer too low: "в живой базе stock_quantity имеет тип integer, поэтому
драйвер отдаёт число 0, а не строку «0»". The raw driver does hand back a JS number for an integer
column — I confirmed that separately (`typeof integer 0 = number`, `typeof numeric 0 = string`) — but
`schema.ts:1523` declares the column `numeric("stock_quantity", …)`, and drizzle's numeric mapper
stringifies the value before the route sees it. `"0"` is truthy, so `||` never fell through. Same for
`procedure_material_rules.quantity_to_deduct` (`schema.ts:1675`, numeric) and
`treatment_items.quantity` (`schema.ts:390`, numeric).

**Therefore `||` -> `??` on those three reads is a provable no-op.** Through drizzle each is either a
non-empty string (always truthy) or NULL, and on NULL the two operators behave identically. There is
no reachable value that distinguishes them.

The second stated mechanism fails the same way. Claim: "`Number(rule.quantityToDeduct || 1)`
превращало правило со списанием 0 в списание 1". Measured with `quantity_to_deduct = 0`:

```
PRE-FIX zero rule -> 200 | {"stock":10,"movements":1,"movementQty":["0"]}
HEAD    zero rule -> 200 | {"stock":10,"movements":0,"movementQty":[]}
```

Pre-fix deducted **0, not 1** — stock stayed 10. The real change is smaller: a junk
`inventory_transactions` row of quantity 0 is no longer written. The commit body's second paragraph
does state that part correctly; it is the headline mechanism that is invented.

### What that hunk DID fix, which nobody claimed

```
PRE-FIX negative rule (quantity_to_deduct = -3) -> 200 | {"stock":16,"movements":1,"movementQty":["6"]}
HEAD    negative rule                            -> 200 | {"stock":10,"movements":0,"movementQty":[]}
```

A negative `quantity_to_deduct` made signing **raise stock from 10 to 16** and write a POSITIVE
"deduction" row. `if (!Number.isFinite(qtyToDeduct) || qtyToDeduct <= 0) continue;` (`diary.ts:249`)
kills it. So there IS a "signing increased the balance" defect — with a different trigger than the
commit subject states. The commit describes the empty shelf, which was safe, and never mentions the
negative rule, which was not.

## 3. THE NEW TEST CANNOT GO RED FOR THE COMMIT THAT SHIPS IT

Packet's own test file run against both historical routers (import specifier repointed, nothing else):

| test file run against | result |
|---|---|
| HEAD | `tests 5 / pass 5 / fail 0`, exit 0 |
| `1f65d674b^` (converged ceremony, `\|\|` still present) | **`tests 5 / pass 5 / fail 0`, exit 0** |
| `87e367c40^` (pre-convergence) | `tests 5 / pass 0 / fail 5`, exit 1 |

So the suite is a real, load-bearing gate for `87e367c40`: reintroduce the two-ceremony defect and all
five tests go red, including the equality assertion and the absolute-values assertion. It is **not**
a gate for `1f65d674b` — every test passes without the `??` change, including the one titled
"пустая полка не даёт подписать приём и не восстанавливает остаток". Nothing in the repo would notice
if that hunk were reverted, except the negative-rule case, which no test covers at all.

## 4. Reachability — the packet's claim is OVERSTATED, and its closing command cannot succeed

Packet claim: "The /lock path itself is fully user-reachable (useVisitDiaryLogic.ts:209 doLock -> the
sign button) ... so those two ARE on the live user path."

Traced myself; it does not hold. **Nothing in the product creates a `visit_diaries` row except
`POST /api/diaries`, which has zero in-repo callers.**

- The only INSERT into `visitDiaries` in the whole API is in `diary.ts`. `portal.ts:606`,
  `toothHistory.ts:47`, `biAnalyticsWorker.ts:190` only SELECT; `sterilization.ts:104` only UPDATEs.
- The UI's draft goes to `PUT /api/visits/:visitId/draft/autosave`, which writes
  `visits.draftAutosave` JSON (`db/visitsQuery.ts:71-77`) and answers
  `visitDraftAutosaveResponseSchema` = `{ serverDraft }` (`packages/shared/src/index.ts:5950-5952`).
  There is no `diary` key, so `useVisitDiaryLogic.ts:156` `if (data.diary?.id) setDiaryId(...)` can
  never fire.
- `diaryId` therefore only ever comes from `useVisitDiaryLogic.ts:76`, which needs a diary row to
  already exist.
- `doLock` sends `const target = diaryId ?? visitId` (`:207`) to `/api/diaries/${target}/lock`
  (`:209`); the route resolves by `visitDiaries.id`, so a visit id yields 404 and the toast
  "Ошибка: NotFound" (`:224`).
- Live DB corroborates: `visit_diaries = 0` rows against `visits = 10`, `patients = 18`. No diary has
  ever been created through this product.

The whole ceremony — both routes — is unreachable from the UI. The packet is a network-API-only
correctness fix, which is still worth having (I signed diaries over real HTTP), but:
**the packet's own closing command — "lead opens a visit at 127.0.0.1:5173, signs the diary, checks
the material balance" — will produce a 404 toast and no stock movement.** The lead would reasonably
conclude the fix is broken. The builder's handoff discloses the mechanism as debt #3, so this is an
overstatement in the summary rather than a fabrication; the summary sentence is still false.

## 5. Proof audit — every claimed command re-run, true exit codes captured

| claim | my result |
|---|---|
| `npm run typecheck -w @dental/api` exit 0 | **exit 0**, clean. CONFIRMED |
| `node --import tsx --test .../diarySigningCeremony.test.ts` 5/5 exit 0 | **exit 0, tests 5 / pass 5 / fail 0**. CONFIRMED |
| `npm test -w @dental/api` 970/970/0 | **exit 0, tests 970 / suites 158 / pass 970 / fail 0**. CONFIRMED |
| counterfactual pre-fix POST 10/0/0/approved/null vs /lock 6/1/1/completed/stored | CONFIRMED (§1) |
| API VERIFIED on live 127.0.0.1:4100, both routes equal, 403/409 on retry | CONFIRMED, re-driven (below) |
| DB recon: organizations 4, inventory_items 0, visit_diaries 0, procedure_material_rules 0 (0 NULL org), patients 18, visits 10, treatment_items 10, service_catalog_items 0, users 7 | CONFIRMED, every figure |
| `revision_reason` + `previous_diagnosis_tooth` exist in DB, absent from drizzle | CONFIRMED (`text`, `character varying` in information_schema; neither in schema.ts) |
| org-scoping closes a cross-tenant deduction | CONFIRMED, measured (§1) |
| empty-shelf measurement | **DISPROVED** (§2) |
| "quantityToDeduct 0 became 1" | **DISPROVED** (§2) |
| concurrent double-signing — packet says NOT PROVEN | **now PROVEN SAFE by me** (below) |

Live re-drive, my own run, real HTTP:

```
GET /api/health -> 200 {"ok":true,"service":"dental-crm-api","time":"2026-07-28T04:26:42.761Z"}
POST /api/diaries (черновик) -> 200 {"success":true,"id":"c91bf8da-...","hash":null}
POST /api/diaries (status signed) -> 200 {"success":true,"id":"c91bf8da-...","hash":"1a387a7eaa83..."}
POST /api/diaries/:id/lock -> 200 {"success":true,"hash":"353821fc12fe...","lockedAt":"2026-07-28T04:26:42.866Z"}
DB after POST signing : stock 6, movements 1, movementQty -4, auto_deduct, audits 1, VISIT_SIGNED_AND_LOCKED, completed
DB after /lock signing: stock 6, movements 1, movementQty -4, auto_deduct, audits 1, VISIT_SIGNED_AND_LOCKED, completed
CEREMONY EQUAL ACROSS BOTH ROUTES: true
POST повторная подпись -> 403 {"error":"DiaryLocked",...}
/lock повторная подпись -> 409 {"error":"AlreadyLocked",...}
stock unchanged after retries: {"post":6,"lock":6}
```

Hashes differ from the handoff's, as they must — the seal covers the fixture's visit and patient ids.
Fixtures cleaned up.

**The race the packet left open, closed.** Two simultaneous `POST /api/diaries/:id/lock` in one
`Promise.all` over live HTTP:

```
RACE lock #1 -> 200 {"success":true,"hash":"bcebb3c6b29a...","lockedAt":"2026-07-28T04:30:12.862Z"}
RACE lock #2 -> 409 {"error":"AlreadyLocked"}
RACE result: stock=6 movements=1 qty=["-4"] audits=1
```

One 200, one 409, exactly one `auto_deduct` row, stock 6 not 2. The `FOR UPDATE` re-read holds under
real concurrency. That NOT-PROVEN item can be struck.

**Tenant bypass attempts** (in-process, HEAD router): foreign-org staff token against our diary ->
`404 {"error":"NotFound"}`; staff token carrying an organization UUID that exists in no
`organizations` row -> `404 {"error":"NotFound"}` on `/lock`. Unauthenticated live HTTP:
`POST /api/diaries` -> `403 {"error":"OrgRequired"}`, `POST /api/diaries/:id/lock` ->
`403 {"error":"OnlyDoctorsCanLock"}`, malformed token -> `403 {"error":"OrgRequired"}`. No bypass.

**Not a finding, stated so nobody re-derives it as one:** in my bare-Fastify harness a ghost-org POST
produced a 500 whose body contained the raw `Failed query: insert into "visit_diaries" (…)` text.
That is an artifact of a harness with no `app.setErrorHandler`; the real server anonymises through
`server.ts:324-343` -> `publicApiErrorMessage` (`:225-232`), which drops any message matching the
technical pattern or lacking Cyrillic and substitutes `fallbackApiErrorMessage`. No leak on the live
server.

**Suite caveat, pre-existing, not U5's:** `npm test -w @dental/api` prints `ℹ fail 0` and exits 0
while ALSO printing `✖ failing tests: src\tests\routes\portalOtp.test.ts` — an after-hook failure
(`patients_organization_id_organizations_id_fk` deleting org `dce70000-…-0901`). That org and one
patient are sitting in the live DB right now as leftover fixture debris; I confirmed both. The builder
disclosed this flake honestly. But "970/970, fail 0, exit 0" is a green that hides a broken cleanup —
future packets must not treat that exit code as proof of a clean run.

**Operational note the lead needs.** At 08:31 local, `apps/api/.data/dev-auth-secret` was
(re)generated — `authTokenSecret()` only writes when the file is missing or shorter than 32 chars, so
something removed it between 08:30 and 08:31. My live proofs at 08:26 and 08:30 ran before that and
are valid; every token signed from the file afterwards is rejected by the still-running server
(real-org token -> `403 OrgRequired`), because the server cached the old secret at boot. Any further
token-signing smoke against 4100 will 403 until the API is restarted. I did not delete the file and
cannot attribute it; `apps/api/.data/*.json` is being modified by another session concurrently.

## 6. Encoding, git hygiene

- Mojibake scan (`[РС][-ÿ]`) over both commit subjects, both bodies, both full diffs:
  0 lines. `diary.ts` and the test file: 0 mojibake lines, no BOM, no CRLF.
- Conventional Commits with a Russian scope naming a defect, per §12. Bodies explain WHY at length.
- `git show --name-only`: `87e367c40` -> only `apps/api/src/routes/diary.ts`; `1f65d674b` -> that file
  plus the new test. No `apps/api/.data/*.json`, no tsbuildinfo, no `scratch/**`, no other author's
  file swept in. Author `marko1olo` on both.
- The dirty worktree is other sessions' work and is in neither commit. `apps/api/NUL` (a stray file
  that breaks `rg` on the repo root) and `apps/api/.dente-data/` are pre-existing/not U5's.
- `live-api-proof.ts` left untracked in the packet folder is disclosed (debt #5), prints no secrets,
  cleans up. Verified by reading and running it.

## 7. Facade / hardcode / second-owner sweep

- Not a hollow facade: `{success:true}` is backed by rows I read back from PostgreSQL.
- Second owner genuinely eliminated. `rg` over `apps/api/src`: exactly ONE `isLocked: true`
  (`diary.ts:163`), ONE `auto_deduct` (`:273`), ONE `VISIT_SIGNED_AND_LOCKED` (`:318`), all inside
  `runDiarySigningCeremony`. Extracted, not copied.
- No `useAppLogic.tsx` field touched, no listener/interval/handle added, no hex/px/undeclared literal
  (API-only change; Russian strings are user-facing error text).
- Pre-existing hardcode carried verbatim into the shared function: `commissionPct: "30.00"`,
  `materialCostDeductionPct: "100.00"`, `specialty: "universal"`, `serviceCategory: "therapy"`
  (`:303-306`). A 30% doctor commission invented by the signing route is an anti-hardcode violation
  and a money policy nobody configured. Not introduced here; now more visible because it is shared.

## 8. Remaining weaknesses in the code as it stands (ranked, all disclosed or pre-existing)

1. `computeDiaryHash` (`:43-52`) seals only
   `visitId|patientId|anamnesis|statusLocalis|treatmentDescription`. `diagnosisIcd10`,
   `diagnosisTooth`, `complications`, `comorbidities` are NOT covered, so `/revise` can change the
   ICD-10 diagnosis or the tooth number and the "forensic SHA-256 seal" stays byte-identical.
   Pre-existing and untouched — but it undercuts the packet's boast about what the seal now covers.
2. Fractional consumption is now a 500, not a refusal. `String(currentStock - qtyToDeduct)` (`:259`)
   and `quantityChanged` (`:256`) write decimal strings into columns that are `integer` in the live
   DB, while `treatment_items.quantity` is genuinely `numeric(10,2)`. Quantity 1.5 produces `'8.5'`
   for an integer column; Postgres rejects it, the error is not a `DiarySigningError`, so `/lock`
   rethrows and the client gets an opaque 500 where it used to get a 400. Disclosed as debt #2; needs
   the lead's decision (migrate to numeric, or reject fractional input explicitly).
3. The `?? inv.currentQty` fallback (`:246`) disagrees with the only other reader of that column,
   `routes/inventory.ts:143` = `Number(item.stockQuantity ?? 0)`. For a row with `stock_quantity
   NULL` and a stale `current_qty > 0`, the ceremony deducts from `current_qty` and writes the result
   into `stock_quantity` — an item the inventory screen renders as 0 gains stock. Same class as the
   bug `1f65d674b` claims to have fixed, still present, merely narrowed from `0` to `NULL`.
   Reachability is thin (nothing in the app writes `current_qty`; `inventory.ts:87` always writes
   `stock_quantity`). Two-column split disclosed as debt #4.
4. Misconfigured material rules (0 or negative `quantity_to_deduct`) are now silently `continue`d,
   with no warning row and no log. Correct for 0; for a negative rule it hides a data error that used
   to be loudly wrong (+6 stock).
5. `POST /api/diaries` selects the existing diary by `visitId` without `FOR UPDATE` (`:407-416`), and
   `pg_indexes` shows **no unique index on `visit_diaries.visit_id`** (only `visit_diaries_pkey` on
   `id`). Structurally, two concurrent first-time POSTs could both take the insert branch and each run
   the ceremony over the same treatment items, double-deducting. **I could not reproduce it**: four
   `Promise.all` attempts all gave `200` + `403 DiaryLocked`, one diary row, stock 6, one movement.
   PLAUSIBLE, not confirmed; noted so it is not sold as either.

## 9. What the lead should NOT re-derive

- The ceremony convergence is real, measured on live data, and gated by a test that provably goes red.
- Transaction, `FOR UPDATE` (proven under a real race), stored-row hash, pkcs7 acceptance,
  born-locked insert removal, typed `DiarySigningError`, org-scoping (proven against a real foreign
  tenant) and `/revise` fixes are all real.
- Every DB reconnaissance figure is exactly reproducible; encoding and git hygiene are clean.

## REQUIRED REWORK

1. Correct the false defect record for `1f65d674b`. Its subject and body claim an empty shelf gained
   stock and that a 0-deduction rule became a deduction of 1. Neither reproduces on
   `1f65d674b^`: the empty shelf returned `400 TransactionFailed` with stock 0, and the 0-rule
   deducted 0. Write the real finding instead — a NEGATIVE `quantity_to_deduct` raised stock from 10
   to 16 and wrote a positive `auto_deduct` row, plus a 0-rule wrote a junk 0-quantity movement row —
   in a correction note in the packet handoff and in the ARCHON ledger. Do not rewrite history; state
   the correction where the original claim is read.
2. State in the same place that `||` -> `??` on `inv.stockQuantity`, `rule.quantityToDeduct` and
   `item.quantity` is a behavioural no-op, with the reason: `schema.ts:390/1523/1675` declare all
   three `numeric`, so drizzle hands the route the string `"0"`, which is truthy. The change is
   defensible as defensive hygiene; it must stop being sold as a stock-integrity fix.
3. Add the missing gate. `apps/api/src/tests/routes/diarySigningCeremony.test.ts` passes unchanged
   against `1f65d674b^`, so the only real behavioural change in that commit is untested. Add a case
   with `quantity_to_deduct = -3` asserting stock stays 10 and 0 movement rows are written, and a case
   with `quantity_to_deduct = 0` asserting 0 movement rows. Verify the new cases FAIL against
   `1f65d674b^` before claiming them.
4. Retract or qualify the reachability sentence "those two ARE on the live user path". No product code
   creates a `visit_diaries` row (`POST /api/diaries` is the only INSERT and has no callers;
   `visitDraftAutosaveResponseSchema` has no `diary` field, so `useVisitDiaryLogic.ts:156` can never
   set `diaryId`; `doLock` therefore always sends a visit id to a route keyed on diary id -> 404;
   live DB has 0 diaries against 10 visits). Replace the closing UI command with one that can succeed,
   or state plainly that the fix is not exercisable from any screen until debt #3 is fixed.
5. Strike the "concurrent double-signing" NOT-PROVEN item: measured here as one 200, one 409, exactly
   one `auto_deduct` row, stock 6. Record the measurement rather than leaving an open unknown.
