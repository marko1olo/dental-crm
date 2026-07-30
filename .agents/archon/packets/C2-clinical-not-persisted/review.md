# ADVERSARIAL REVIEW — packet C2-clinical-not-persisted

Reviewer: adversarial subagent (did not write this code). Posture: disbelief.
Target commit named by lead: `26f1f3c59f5f64b3a4caa83ec2f6e05a03e14b88`.
Actual packet = three commits: `2f18e4406` (fix), `669c812a5` (SQL cast fix + real-DB test),
`26f1f3c59` (docs only). All three attacked.

VERDICT: **SOUND_WITH_NITS**. Every central claim reproduced on my machine. No fabricated proof
found. Real weaknesses exist and are listed in §7; none of them makes the change worse than the
defect it replaced.

---

## 1. Commit topology (verified)

`git show 26f1f3c59 --stat` -> **docs only**, 6 files, all under
`.agents/archon/packets/C2-clinical-not-persisted/`. Zero source files. The lead's "COMMIT TO
ATTACK" is the packet's paperwork; the code lives in the two earlier commits.

- `2f18e4406` A `apps/api/src/db/clinicalTasksQuery.ts`, M `apps/api/src/routes/clinical.ts`,
  M `apps/api/src/services/clinical/ClinicalRouter.ts`
- `669c812a5` M `apps/api/src/db/clinicalTasksQuery.ts`, M `.../ClinicalRouter.test.ts`
- `26f1f3c59` A x6 packet docs

No churn files (`apps/api/.data/*.json`, `dist/**`, `*.tsbuildinfo`, `scratch/**`) in any of the
three. No foreign author's work. **Index contamination: NOT FOUND.**

`git diff HEAD -- <the four source files>` is EMPTY -> the worktree copies I tested are
byte-identical to HEAD. My runtime proofs therefore exercise committed code, not a dirty tree.

---

## 2. Was the defect REAL before the commit? — CONFIRMED

`git show 2f18e4406^:apps/api/src/services/clinical/ClinicalRouter.ts` line 3:
`// Mocking db imports to keep it simple and compileable in the backend`; lines 42-56 build the
task in memory, `console.log` it and `return newTask;` under the comment
`// In a real implementation, we would insert into the DB via Drizzle`. Exactly as the dossier said.

---

## 3. Is the fix REACHABLE? — CONFIRMED, and the builder's own limits are honest

Traced independently, not taken from the handoff:

- `git show HEAD:apps/api/src/server.ts` -> `:8` import, `:355` `await registerClinicalRoutes(app)`.
  Pre-existed the packet (identical at `2f18e4406^`). The handoff says `:356`; that is the line in
  the *dirty worktree* (a concurrent agent added an import above). Off-by-one, not a fabrication.
- `routes/clinical.ts:109` POST `/api/clinical/phase-completions`, `:160` GET `/api/clinical/tasks`
  -> `ClinicalRouter.ts:106/:124` -> `clinicalTasksQuery.ts`.
- `rg "ClinicalRouter"` outside node_modules/dist: only the service, its test, `routes/clinical.ts`,
  and stale `scratch/*.txt` captures of the OLD test output. Dead-before claim CONFIRMED.
- `rg "clinical/tasks|phase-completions" apps/web/src` -> **0 hits**. The chain terminates at HTTP.
  A clinician still cannot trigger or see a handoff from a screen. Builder declared this.

Caveat the builder did not raise: `apps/api/dist/` is **tracked** in git (added before `dist/` hit
`.gitignore`) and is stale — `git show HEAD:apps/api/dist/services/clinical/ClinicalRouter.js` still
contains the mock, and `HEAD:apps/api/dist/routes/clinical.js` has **0** occurrences of
`phase-completions`. `package.json start` = `node dist/server.js`. So the fix is live under
`npm run dev` (tsx on src) but absent from the committed `dist` bundle unless a build runs first.
This is repo-wide and pre-existing (dist last committed 2026-07-24 by `8f1c9da6f chore: sync…`; no
feature commit since updates it), so it is **not** a C2 defect — but it qualifies the word "live".

---

## 4. PROOF AUDIT — every claimed command re-run verbatim

| Claim | My re-run | Result |
|---|---|---|
| TYPECHECK `npm run typecheck -w @dental/api` | same | `> tsc -p tsconfig.json --noEmit`, **EXIT=0** — REPRODUCED |
| UNIT `cd apps/api && node --import tsx --test src/services/clinical/ClinicalRouter.test.ts` | same | **EXIT=0**, tests 5 / pass 5 / fail 0 / **skipped 0** — same five Russian test names — REPRODUCED |
| API+DB `cd apps/api && node --import tsx ../../.agents/.../proof.ts` | same | **REPRODUCED end to end** (details below) |
| REGRESSION `npm test -w @dental/api` | same | `tests 883 / suites 144 / pass 882 / fail 1` — **exact match** |
| DEAD-CODE `rg -n "ClinicalRouter" --glob '!node_modules'` | same | REPRODUCED |
| DB baseline (table exists, 11 cols, enum, 0 rows) | migration + live SQL | REPRODUCED |

proof.ts second run, my output (new UUID, everything else identical to the claim):

```
POST /api/clinical/phase-completions -> 201   id 36a1708a-0b8f-4a74-b25b-885c25fcfa7c
SQL SELECT * FROM clinical_tasks WHERE id = 36a1708a-...
  row found: true | status: pending | task_type: prosthetics_handoff
  title bytes(base64): 0K3RgtCw0L8gSUk6INC/0LXRgNC10LTQsNGH0LAg0LIg0L7RgNGC0L7Qv9C10LTQuNGO
GET /api/clinical/tasks?patientId=... -> 200 count = 1   contains created task: true
SECOND GET -> 200 still contains created task: true
DUPLICATE POST -> 201 same id: true | POST unknown phase -> 400 | GET without token -> 401
cleanup done; clinical_tasks rowcount now: 0
```

I decoded the base64 myself: `Этап II: передача в ортопедию`. **UTF-8 landed intact in Postgres.**
This is the one claim in this packet that is content-verified rather than hash-verified — exactly
the class of proof the `mobile_light_documents.png` incident showed was missing elsewhere.

The single regression failure is `src/tests/routes/dayConfirmations.test.ts:217`
("по умолчанию берётся завтрашний день в поясе клиники", expected `2026-07-28`, got `2026-07-29`).
I read its imports: `db/client`, `db/communicationsSchema`, `db/schema`, `routes/dayConfirmations` —
none of them a C2 file. It is a post-midnight Europe/Moscow-vs-UTC+4 off-by-one. **Not C2's.**

Handoff debt claim #2 spot-checked and TRUE: `_journal.json` has 28 entries (0000…0027), only 9
snapshots on disk (0000…0008).

Encoding audit of all 10 packet files + the three commit messages: **0 mojibake lines, 0 latin1
artifacts, no BOM, all valid UTF-8**. All three subjects are Conventional Commits with a Russian
subject naming the defect.

---

## 5. Hypotheses I tested that the builder did NOT

Live probes against 127.0.0.1:4100 + SQL at 5432. All rows I created were deleted; final
`clinical_tasks` rowcount = 0.

- **Cross-tenant `assignedDoctorId`** (builder only proved `patientId`): org A token + org B user
  -> `404 ClinicalTaskReferenceNotFound field=assignedDoctorId`. **Guard holds on a second field.**
- **Cross-tenant read**: org B token asking for org A's patient -> `200`, count 0. Isolated.
- **Nonexistent but well-formed patient UUID** -> `404`, not 500.
- **Malformed patientId / malformed treatmentPlanId / numeric toothCodes / object notes / null
  body** -> all `400`. No 500s, no uuid-cast leak.
- **The declared race**: 12 simultaneous identical POSTs -> 12x`201`, **1 distinct id, 1 row in the
  table**. The `INSERT … WHERE NOT EXISTS` guard held. The debt is theoretically real (no unique
  index) but I could **not** make it fail. Builder's debt entry is conservative, not a cover story.
- **`treatmentPlanId` on live data — STILL UNPROVABLE, and the builder's closure recipe is wrong**:
  `SELECT count(*) FROM treatment_plans` = **0 rows in the entire database**. Debt item 4 says to
  close it by POSTing "a real treatmentPlanId from treatment_plans" — impossible until someone
  seeds that table. The code path is byte-identical to the `assignedDoctorId` path I did prove, so
  the risk is low, but the lead cannot close this item as written.

---

## 6. Structural checks — all clean

- **Second owner?** NO. `rg "clinical_tasks|clinicalTasks"` over `apps/api/src`, `apps/web/src`,
  `packages`, `scripts`: only `clinicalTasksQuery.ts` + comments. No `pgTable("clinical_tasks")` in
  `db/schema.ts`. No route-path collision (`/api/clinical/tasks` and `/api/clinical/phase-completions`
  each registered exactly once). The other task table, `communication_tasks`, is a
  channel/intent/priority outbox — wrong shape for a clinical handoff. **Table choice is correct.**
- **`db/schema.ts` untouched, no migration written** — as the packet required. CONFIRMED.
- **useAppLogic.tsx** — not touched by any of the three commits (no `apps/web` file is).
- **Listeners/intervals/subscriptions** — none added. Test closes the pool in `after`.
- **Hardcoded UUID / port / magic constant / fabricated default** — none in product code. The test
  and proof script both *discover* org and patient from the DB (I read the SQL). `status ?? "pending"`
  matches the column default; `null` is used for unknown FKs rather than an invented UUID.
- **Hardcoded Russian literals** — present (task titles/descriptions), i18n debt **declared** in the
  source comment, the commit body and handoff debt item 4. Not a silent violation.
- **Hollow facade** — the endpoint returns real DB rows with DB-generated `id`/`created_at`, proven
  by an independent SQL read. Not a facade. The one facade-adjacent behaviour is finding N1 below.

---

## 7. FINDINGS (none blocking; ranked)

**N1 — a silently discarded handoff is reported as `201 Created`.** `clinicalTasksQuery.ts:170-192`
+ `routes/clinical.ts:150`. The de-dup key is `(org, patient, task_type, title, description)` with
**no time window**. When the doctor supplies no notes and no teeth, `description` collapses to a
fixed constant, so *every* later PHASE_1_THERAPY completion for that patient returns the original
row for as long as it stays `pending`. Proved live: two empty-payload completions 1.2 s apart both
returned `201` with the **same id and the same `createdAt`**. The caller cannot distinguish
"recorded" from "discarded". Fix: `200` (or an `alreadyExisted` flag) on the fallback path, and/or
bound the guard to a short window.

**N2 — new authenticated write endpoint with no field length cap.** `server.ts:252` sets
`bodyLimit` to **256 MB**; `routes/clinical.ts:114-134` validates only *types*, never lengths, and
`description` is `text`. Proved live: `notes` of 1,000,000 chars -> `201`, stored description length
**1,000,095**; `toothCodes` array of 20,000 entries -> `201`, 128,981 chars. `toothCodes` content is
unvalidated too (`<script>`, `999`, `не зуб` all land verbatim in the clinical record). The de-dup
`SELECT` then compares that unindexed `text` column on every subsequent POST. Cap `notes` and
`toothCodes.length`, and validate a tooth code as a tooth code.

**N3 — the new route breaks the file's own validation pattern.** The three pre-existing mutation
routes in `routes/clinical.ts` all go through `parseClinicalPayload(<zod schema from @dental/shared>)`.
The new POST hand-rolls `typeof`/regex checks and a tri-state `optionalUuid` helper whose
`undefined` means "invalid" and `null` means "absent" — correct, but easy for the next agent to
misread. A shared zod schema would have given N2's length caps for free.

**N4 — `GET /api/clinical/tasks` is unbounded.** `clinicalTasksQuery.ts:215-224`: no `LIMIT`, no
pagination, `SELECT *` for the whole organization. Fine at 0 rows, not fine later. Compounds N2.

**N5 — two suite-global counts in the test make it concurrency-fragile.**
`ClinicalRouter.test.ts:171/179` compares `SELECT count(*) FROM clinical_tasks` before/after with no
run-tag scope, and `:204` counts leaked rows for the foreign patient globally. Another agent writing
to the table during the run turns these green tests red (or, worse, hides a real leak). Scope both
by the existing `runTag`.

**N6 — dead defensive branch.** `routes/clinical.ts:145-149` (`if (!task) return 400`) is
unreachable: `isClinicalPhaseCode` already ran at `:125`, and that is the only path on which
`handlePhaseCompletion` returns `null`.

**N7 — scope extension, disclosed.** Claim was "ClinicalRouter.ts (+ caller wiring if required, +
a node:test)". Delivered: a new 211-line DB access layer and two brand-new public HTTP endpoints.
The builder disclosed this in `handoff.md` §"Расширение клейма". Note also the tension in the brief
itself: point 3 says wiring an existing table "IS the fix", point 5 calls deleting proven-dead
fabrication the "preferred outcome". The builder proved it dead and then built instead of deleting.
Defensible under point 3, but it is the lead's call, not mine.

---

## 8. What this packet does NOT deliver

The dossier's user-facing sentence — "the next doctor opening the patient sees nothing" — is still
true. The handoff now survives in Postgres and over HTTP, but no screen writes it and no screen
reads it. The builder states this plainly in both `state.md` and `handoff.md`. Do not let the green
proofs in this packet be quoted later as "clinical handoffs work".

---

## 9. Cleanup

All probe rows I created were deleted; `clinical_tasks` rowcount is back to **0**. All scratch files
I created were removed. The only file I added to the tree is this `review.md`. I edited no source,
committed nothing, and ran no `git add`.
