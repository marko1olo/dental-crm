# C2-clinical-not-persisted — state

STATUS: DONE
Agent: implementer under [ARCHON]

## Commits
- **2f18e4406ded25216d1a9d2dc5afde44fa694b08** — the fix (3 files, +423/-55)
- **669c812a5c79da9fa4199c63386e8a88162862fb** — SQL cast fix + real-DB test (2 files, +220/-66)
- packet docs commit — see git log for hash

## Verdict on the packet
DEFECT REAL, and worse than the dossier described: not only was the handoff never persisted,
the module had ZERO production callers. It was dead fabrication, not a live data-loss bug.
FIXED by wiring the ALREADY-EXISTING `clinical_tasks` table and adding the missing route.
No migration. `db/schema.ts` NOT touched.

## Reachability (was dead, now live)
server.ts:356 `await registerClinicalRoutes(app)`
  -> routes/clinical.ts:109 POST /api/clinical/phase-completions   [NEW]
  -> routes/clinical.ts:160 GET  /api/clinical/tasks               [NEW]
  -> ClinicalRouter.ts:106 handlePhaseCompletion / :124 listTasks
  -> db/clinicalTasksQuery.ts insertClinicalTaskInDb / getClinicalTasksFromDb
Reachable over HTTP and PROVEN so (201 from the live server at 127.0.0.1:4100).
NOT reachable from the UI: `rg "phase-completions|clinical/tasks" apps/web/src` => 0 hits.
The chain terminates at the HTTP boundary. A human clinician cannot yet trigger it from a screen.

## Findings

### 1. Defect CONFIRMED
- ClinicalRouter.ts:3  `// Mocking db imports to keep it simple and compileable in the backend`
- ClinicalRouter.ts:4-13 hand-rolled `interface ClinicalTask` instead of a DB model
- ClinicalRouter.ts:43-44 `// In a real implementation, we would insert into the DB via Drizzle:`
- ClinicalRouter.ts:46-57 built in memory, console.logged, returned. Nothing persisted.

### 2. EXECUTION CHAIN before the fix: DEAD. ZERO PRODUCTION CALLERS.
`rg -n "ClinicalRouter" --glob '!node_modules'` => the file itself (:15, :56), its own test
(:3, :6), and stale scratch/*.txt captures. `rg "services/clinical|handlePhaseCompletion"`
over apps/ packages/ scripts/ => same. No dynamic import. Not registered on any route.
The old test was green precisely BECAUSE nothing was written — it asserted the defect.

### 3. THE TABLE ALREADY EXISTED. NO MIGRATION NEEDED.
`clinical_tasks` created by drizzle/0000_freezing_randall_flagg.sql:210, physically present in
127.0.0.1:5432/dental_crm. All 11 columns confirmed by information_schema; enum
`clinical_task_status` = pending,in_progress,completed,cancelled — exactly the TS union at :10.
ROWCOUNT was 0: nothing had ever been written.
No Drizzle model in TS anywhere => parameterized SQL on the shared pool
(precedent: db/patientServiceLineagesQuery.ts). db/schema.ts untouched, as the packet required.

### 4. Multi-tenancy hole found while wiring
FKs check row EXISTENCE only, not org ownership: org A could write a task row carrying its own
organization_id and org B's patient_id. Guard added for patientId / treatmentPlanId /
assignedDoctorId.

## Files changed
- apps/api/src/db/clinicalTasksQuery.ts               NEW  (insert + read + ownership guard)
- apps/api/src/services/clinical/ClinicalRouter.ts    rewritten (persists; mock/console.log gone)
- apps/api/src/routes/clinical.ts                     +2 routes (caller wiring)
- apps/api/src/services/clinical/ClinicalRouter.test.ts  rewritten onto the real DB

### Claim extension, disclosed
db/clinicalTasksQuery.ts is a NEW file => zero collision surface, and house layering puts DB
access in db/*Query.ts. routes/clinical.ts is "caller wiring", explicitly permitted; it was
clean before I touched it. server.ts NOT touched (non-fleet author's territory) — not needed,
registerClinicalRoutes was already called at server.ts:356.

## PROOFS (every command below was actually executed)
- TYPECHECK VERIFIED: `npm run typecheck -w @dental/api` exit 0, run before each commit.
- UNIT VERIFIED: `cd apps/api && node --import tsx --test src/services/clinical/ClinicalRouter.test.ts`
  exit 0 — tests 5 / pass 5 / fail 0 / skipped 0.
- API VERIFIED + DB VERIFIED:
  `cd apps/api && node --import tsx ../../.agents/archon/packets/C2-clinical-not-persisted/proof.ts`
    POST /api/clinical/phase-completions -> 201
    SQL SELECT by id -> row found: true, status pending, org/patient correct
      title base64 0K3RgtCw0L8gSUk6INC/0LXRgNC10LTQsNGH0LAg0LIg0L7RgNGC0L7Qv9C10LTQuNGO
      = «Этап II: передача в ортопедию» — UTF-8 intact in the DB, not mojibake
    GET -> 200 contains task; SECOND GET -> 200 still contains it (the handoff survives)
    DUPLICATE POST -> 201 same id; unknown phase -> 400; no token -> 401
    cleanup: row deleted, rowcount back to 0
  Re-verified green after the script was moved into the packet dir.
- REGRESSION: `npm test -w @dental/api` => tests 883 / pass 882 / fail 1.
  The one failure is src/tests/routes/dayConfirmations.test.ts:217 (expects "tomorrow in
  Europe/Moscow" = 2026-07-28, got 2026-07-29). NOT MINE: it imports only db/client,
  db/communicationsSchema, routes/dayConfirmations. It breaks in the post-midnight window.

## Gotcha for the next agent
The dev auth secret is resolved per-cwd. AUTH_TOKEN_SECRET lives in apps/api/.env and
loadServerEnv reads cwd/.env FIRST. Run any token-signing proof from apps/api, or you get a
401 from a token signed with the repo-root secret and will wrongly conclude the route is broken.

## Log
- STARTED
- AUTHORITY READ (.agents/AGENTS.md, .agents/INDEX.md, .agents/CLINICAL_RULES.md)
- DEFECT CONFIRMED + dead-code proof + live-DB table proof
- EDIT WRITTEN
- GATE PASSED (typecheck exit 0)
- COMMITTED 2f18e4406
- UNIT run found a real runtime bug (PG 42846) that typecheck could not see
- GATE PASSED again, COMMITTED 669c812a5
- PROVEN (unit + api + db + full-suite regression)
- DONE
