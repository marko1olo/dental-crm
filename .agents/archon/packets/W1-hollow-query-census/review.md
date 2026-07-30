# ADVERSARIAL REVIEW — W1-hollow-query-census

Commit under attack: a7b0b2706b04a2bacbf7f9aa1ff3fb79d6e93d45 (one of 8 packet commits)
Reviewer: adversarial, did not write this code. Posture: disbelief.

## VERDICT: SOUND_WITH_NITS

Every load-bearing claim reproduced exactly, including the two the builder honestly refused to claim.
Numbers re-derived independently, premise confirmed against live PostgreSQL, git hygiene clean under
a dirty shared index. The residue is one already-dead script left dangling, one over-compressed
blocker claim, and one regression guard that now asserts nothing.

## RE-DERIVED NUMBERS (all independently reproduced unless noted)

| Claim | My measurement | Verdict |
|---|---|---|
| db/*Query.ts 42 -> 23 | git ls-tree 2ff49559b^ = 42; HEAD = 23; disk = 23 | CONFIRMED |
| clinical.ts 527 -> 444 lines | 527 (git show parent) -> 444 (wc -l) | CONFIRMED |
| routes 29 -> 15 | rg -c on app.(get/post/patch/put/delete)( = 29 -> 15 | CONFIRMED |
| hollow 5 of 23 now | census exit 0: hollow 5, mixed 2, live 14, live-raw-SQL 1, no-tables 1 = 23 | CONFIRMED |
| 19 modules / 9 widgets deleted | git show --name-status per commit: 9+3+2+1+2+2 = 19 modules; 3+2+1+2+1 = 9 widgets | CONFIRMED |
| 14 routes deleted | enumerated from git diff of clinical.ts across the packet: exactly 14 paths | CONFIRMED |
| KNOWN_MISSING 26 -> 25, bound in lockstep | list parses to exactly 25 entries; assertion is `<= 25`. Zero slack | CONFIRMED |
| 24 hollow of 42 at start | not directly reproducible (tool reads disk; cannot run at parent), but arithmetically consistent: 24-19=5, 42-19=23, non-hollow buckets unchanged (2/14/1/1) | CONSISTENT, not independently run |
| all 19 tables 0 rows in live PG 18 | my own read-only `select count(*)` on all 19: every one = 0 | CONFIRMED |
| zero writers for those tables | repo-wide rg over apps + packages + scripts + drizzle for `insert(<id>)` and `INSERT INTO <sql_name>`: zero hits. Broader scope than the tool's own | CONFIRMED |
| Encoding smoke 416 files / 0 mojibake | reproduced exactly | CONFIRMED |
| CSS 151 declared / 2979 var() / 0 unresolvable | reproduced exactly | CONFIRMED |

## PROOF AUDIT — every claimed command re-run by me

- census tool, no flag: exit 0, 5 hollow. CONFIRMED.
- `node --import tsx --test scripts/census-hollow-query-modules.test.mjs` -> tests 6 pass 6 fail 0, exit 0. CONFIRMED.
- `node --import tsx --test apps/api/src/tests/webCallsExistingRoutes.test.ts` -> tests 3 pass 3 fail 0, exit 0. CONFIRMED.
- `node --import tsx --test apps/api/src/services/clinical/ClinicalRouter.test.ts` -> tests 5 pass 5 fail 0, exit 0. CONFIRMED.
- `npm run smoke:web-text-encoding` -> exit 0, `ok true, checkedFiles 416, mojibakeHits 0, garbledQuestionHits 0`. CONFIRMED.
- `node scripts/check-css-tokens.mjs` -> exit 0, `151 declared, 2979 var() uses, 0 unresolvable`. CONFIRMED.
- `npm run typecheck -w @dental/api` -> exit 0, clean. (Builder said NEVER RAN; it is in fact green.)
- Live probes (server already running post-deletion code, so the 404s are not a stale-server artefact):
  `/api/health` 200; 7 deleted routes all 404; `/api/hr/recent-patients`,
  `/api/analytics/lost-patients-filters`, `/api/clinical/tasks`, `/api/crm/custom-task-types` all 401.
  CONFIRMED exactly as claimed.
- Commit messages: **0** real mojibake digraphs. My first regex reported 5 hits; all five were FALSE
  POSITIVES OF MY OWN MAKING — "Ра"/"Ре"/"РЕ"/"РВ" are legitimate Russian word starts. Precise
  digraph scan returns 0. Builder's claim CONFIRMED.
- ast-grep genuinely absent: `npx --yes @ast-grep/cli --version` exit 1 ("could not determine
  executable to run"), `sg` not on PATH, `node_modules/@ast-grep` absent. The TypeScript-compiler
  substitution is justified, not defiance of §8.

## THE TWO ITEMS LABELLED "NOT PROVEN" BOTH CLOSE GREEN UNDER MY RUN

- `npm run build -w @dental/api` -> exit 0. (I rebuilt before every dist-dependent proof, as ordered.)
- `node scripts/smoke-clinical-mutation-guard.mjs` -> **exit 0**, `"ok": true`,
  `routeTableEntries 436`, `probedRoutes 434`, `mutatingRoutesProbed 187`,
  `buildFreshness: { staleOutputCount: 0, missingOutputCount: 0 }`.
  The builder's blocker was real (stale dist) and its stated closing command is the right one.
- `npm run typecheck -w @dental/api` -> exit 0.

## WAS THE DEFECT REAL BEFORE THE COMMIT?

Yes, and provably so without needing to run the parent. At 2ff49559b^ the widget
`ConfirmationPerformanceReportsWidget` fetched `/api/analytics/confirmation-performance-reports`,
which read `confirmation_performance_reports`. I measured that table at **0 rows** in live
PostgreSQL 18 and **0 writers anywhere in the repo** — so the panel returned `[]` on all three
screens it was mounted on (AnalyticsDashboardView, ShiftView, and the CommunicationsView comment
that kept it alive "because analytics and shift still need it"). Same for the other 18 tables. The
fix is reachable by a real user: the panels are gone from the rendered trees, and the deleted
addresses answer 404 on the live server.

## MSYS TRAP — the builder's handoff saved my own scan

handoff.md warns that Git Bash rewrites any argument starting with `/` into a Windows path, so
`rg "/api/..."` silently returns nothing. My first web-reference scan used leading slashes and was
therefore worthless. Re-ran MSYS-safe (`rg "api/<path>"`) with two positive controls that DID hit
(`api/crm/custom-crm-task-types`, `api/hr/rebooking-conversion-rules`). Result stands: the web
references **none** of the 14 deleted routes.

## DELETION REFERENCE CHECK

`git grep -n "<BaseName>" HEAD -- apps/` for all 19 module basenames and all 9 widget basenames:
no live code reference. Every hit is prose inside a comment block, each verified by reading context
(ScheduleView.tsx:677/694/695, ShiftView.tsx:431/500, PatientsView.tsx:681/682,
CommunicationsView.tsx:457, AnalyticsDashboardView.tsx:563, clinicalTasksQuery.ts:22,
drizzle/0119_add_treatment_plan_stages.sql:5). The route-existence guard is not blinded by these
comments: `serverRoutes()` requires a literal `app.<verb>(` call, so a path in prose is never counted
as a live route.

## GIT HYGIENE — exemplary

All 8 commits are ancestors of HEAD. `--name-status` per commit shows ONLY packet files. Zero
foreign paths: no `.agents/AGENTS.md`, no `packages/shared/dist`, no `apps/api/.data/*`, no
`tsconfig.tsbuildinfo`, no `scratch/`, despite all of those sitting dirty in the shared worktree.
Each deletion commit is one whole feature (module + route + widget + mount point) — the ordered shape.
The second author's `git rm` of AppRouter.tsx / PayrollView.tsx was committed by **41a22b63d**, the
second author's own commit, never by this packet. Claim of no sweep-in: TRUE.

## FINDING 1 — CONFIRMED HALF-DELETION OUTSIDE THE GREP PATHSPEC

`scripts/test-edge-cases-wave16.mjs` imports FOUR modules this packet deleted and now dies at load:

    Error [ERR_MODULE_NOT_FOUND]: Cannot find module
    'C:\Clinic_MVP\dental-crm\apps\api\src\db\visitExaminationPhotoLinksQuery.js'
    imported from C:\Clinic_MVP\dental-crm\scripts\test-edge-cases-wave16.mjs
    EXIT=1

Also imports bulkImageOperationLogsQuery.js, uisCallSpeechTranscriptsQuery.js,
familyRecommendationSourcesQuery.js — all deleted. The builder's grep was scoped
`-- apps/api/src apps/web/src`, and the brief's own wording was `-- apps/`; both exclude `scripts/`,
which is where the builder put its OWN new tool. MITIGATION: the script was already red before the
packet — it asserts `length === 0 -> throw "expected non-empty array"` against tables I measured at
0 rows, so it could never pass. Failure mode changed from assertion to unresolved import. Stale
reference debt, not a working thing broken. The honest fix is deletion, not repair: it is
fabricated-proof scaffolding from an earlier "wave" that asserts data which cannot exist.

## FINDING 2 — CONFIRMED: the "blocked solely by the second author" claim is false

Reported: "all 5 remaining are blocked solely because their widgets live in SettingsView.tsx /
components/settings/** / MarketingView.tsx, which the second author holds."

Actual mount points (rg over apps/web/src):
- `RebookingConversionRulesWidget` -> MarketingView.tsx **AND apps/web/src/pages/AnalyticsDashboardView.tsx:570**
- `CustomCrmTaskTypesWidget` -> MarketingView.tsx, components/settings/SettingsRulesTab.tsx **AND apps/web/src/PatientsView.tsx**

Both extra files were edited BY THIS PACKET (a7b0b2706 and 93a2f1803). Neither is held by the second
author. Both widgets are hollow by the packet's own standard — I measured `rebooking_conversion_rules`
= 0 rows and `custom_crm_task_types` = 0 rows, routes alive (401, so an authenticated user gets `[]`).
In AnalyticsDashboardView.tsx:569 the packet removed one hollow cell from a `lg:grid-cols-3` grid and
left another hollow cell as its only remaining child.

Mitigating: the builder's own handoff.md table DOES name `pages/AnalyticsDashboardView.tsx`, and
commit 93a2f1803's body explicitly says CustomCrmTaskTypesWidget "в этой же сетке НЕ тронут
намеренно". So this is disclosed-but-not-closed plus an inaccurate compression in the summary — not
concealment. The handoff table does omit PatientsView.tsx for customCrmTaskTypes.

## FINDING 3 — CONFIRMED: the dynamic-import regression guard is now vacuous

`scripts/census-hollow-query-modules.test.mjs`, test "динамический await import учтён как настоящий
потребитель", guards the exact bug that broke HEAD twice this campaign. Its fixtures are
`patientServiceLineagesQuery` and `prodoctorovSyncExportsQuery` — **both deleted by this same
packet** — and the body is `if (!entry) continue;`. At HEAD the test executes zero assertions and
reports pass. Live fixtures were available: clinical.ts:246/257/268/344/377/388/399 still
`await import()` rebookingConversionRules, singleSessionEnforcements, dadataGeocodedAddresses,
customCrmTaskTypes, landingFieldMappings.

## FINDING 4 — census scope blind spot (disclosed by the builder)

The tool censuses only `db/*Query.ts` and only walks `apps/api/src`. Invisible to it:
- `routes/egisz.ts:163` `/api/egisz/multiple-diagnoses` reads `egisz_multiple_diagnoses` directly,
  bypassing any module — I measured 0 rows, 0 writers. Hollow read survives with no module to census.
- `ExternalScheduleActionLogsWidget` (ScheduleView.tsx) calls a KNOWN_MISSING 404 address and has no
  `*Query.ts` at all.
- Writers in `apps/api/scripts/` or root `scripts/` would be missed entirely, not just misclassified.
Both concrete cases are named in handoff.md by the builder. Disclosed debt, but the "true count" of
this defect class is still understated by the census as scoped.

## NITS

- `update`/`delete`/`select` accesses are collected into `accessByTable` but `writerSummary()` only
  ever reads `.insert` — collected and discarded. Harmless (a pure-UPDATE writer implies no rows) but
  the tool appears to check more than it does.
- "Three hits are prose inside /* */ comment blocks" undercounts: under the stated pathspec there are
  10 (1 module + 9 widget). Substance holds; the number is wrong.
- ShiftView's new header uses hardcoded px in inline styles (32px/14px/12px/9px) against the
  Multi-Scale "use rem/em/%" mandate. Consistent with the whole surrounding file (pre-existing
  `fontSize: "12.5px"` two lines below), so not a regression introduced here.

## CLEARED ON INSPECTION (checked, NOT a finding)

- `treatmentPlanStages` in apps/web (documentStore.ts:1195, DocumentsView.tsx:2678,
  useAppLogic.tsx:1454) is a client-side `string` textarea field for a printed document. Name
  collision only; unrelated to the DB table `treatment_plan_stages`. Deleting
  treatmentPlanStagesAutoArchiveQuery.ts does not touch it.
- Orphan `apps/web/src/components/documents/NdflTaxCalculatorsWidget.tsx` was ALREADY orphaned at
  2ff49559b^ (git grep at the parent shows only self-references). Pre-existing debt.
- The census unit test is a real test, not a tautology: 5 of its 6 tests assert substantively
  (census-vs-disk consistency, auditQuery ЖИВОЙ with >0 writers on auditEvents, hollow means zero
  runtime writers AND zero migration seeds on every read table, mixed has both live and dead,
  every importer path exists on disk).

## CONSTITUTION CHECK

- §1 depth not facade: PASSES. Nothing replaced by a placeholder. The one hole deletion would have
  left (ShiftView section heading + analytics toggle carried by the dead widget) got a real heading:
  `Gauge` imported line 14 and used line 441, title + explanatory line, and the toggle wired
  end-to-end (state 159 -> aria-expanded 455 -> gates content 463) over real
  `dashboard.shiftIntelligence` data. Not one claim rests on a typecheck.
- §3 grandmother: PASSES. Nine forever-empty panels removed rather than left saying "отсутствуют".
  New heading is plain Russian, no jargon.
- §4 no overload: PASSES, with the AnalyticsDashboardView 3-col-grid-with-one-hollow-cell exception
  under Finding 2. DocumentsView's grid container was removed entirely, not left empty (verified in
  the diff). ScheduleView / PatientsView / PatientOverviewTab all retain live children.
- §5 imported-and-used: PASSES. No orphan created by this packet.
- §10 no invented contracts: PASSES. Nothing invented; tables and migrations left in place as debt
  rather than fantasised away, and each missing-writer case is recorded with a reason.
- Multi-Theme: PASSES. --teal-soft/--teal-dark/--ink/--ink-2 are redefined in three theme blocks of
  dente-redesign.css (light ~18-24, dark ~73-79, third ~121-127). No hex in the new block.

## NOT THIS PACKET — do not penalise

- `npm run typecheck -w @dental/web` exit 1: three errors, all App.tsx:4775/4789/4797
  ("inventory"/"scanner"/"leads" not assignable to `LazyWorkspaceView`, declared at
  apps/web/src/workspaceRouteErrorBoundary.tsx:3). Introduced by 41a22b63d, which is NOT one of the
  8 packet commits and which landed interleaved mid-packet between 908be0f54 and 93a2f1803. No
  packet commit touches App.tsx or workspaceRouteErrorBoundary.tsx. Zero web typecheck errors
  attributable here. The builder's un-run typecheck is a §10 procedural gap that concealed nothing
  of its own.

## REQUIRED REWORK (numbered, non-blocking)

1. Delete `scripts/test-edge-cases-wave16.mjs`. It imports four modules that no longer exist and,
   before that, asserted non-empty arrays from tables that have always had 0 rows. It cannot be
   repaired into a true test; it is proof scaffolding for features that never worked.
2. Re-point `scripts/census-hollow-query-modules.test.mjs` test 3 at a fixture that still exists —
   `customCrmTaskTypesQuery` or `rebookingConversionRulesQuery`, both still reached only via
   `await import()` in routes/clinical.ts — and drop the `if (!entry) continue;` escape so the guard
   cannot silently go vacuous again.
3. Unmount `RebookingConversionRulesWidget` from `apps/web/src/pages/AnalyticsDashboardView.tsx:570`
   and `CustomCrmTaskTypesWidget` from `apps/web/src/PatientsView.tsx`. Both tables are 0-row /
   0-writer, both files are the builder's own, neither is held by the second author. Leave the widget
   files in place for the MarketingView / SettingsRulesTab mounts.
4. Correct the handoff's blocker table: add `PatientsView.tsx` to the `customCrmTaskTypesQuery` row,
   and drop the "blocked solely by the second author's files" framing for the two widgets that also
   sit in files this packet edited.
5. Widen the next census pass beyond `db/*Query.ts` and beyond `apps/api/src`, so hollow reads that
   live directly in routes (`routes/egisz.ts:163`) and widgets with no query module
   (`ExternalScheduleActionLogsWidget`) are counted rather than footnoted.
6. Re-run `npm run typecheck -w @dental/web` once 41a22b63d's `LazyWorkspaceView` break is fixed by
   its owner. It is red at HEAD for reasons outside this packet; nobody should read that red as
   this packet's.
