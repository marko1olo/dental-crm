# P5-vite-path — black box

STARTED 2026-07-28 — packet P5-vite-path
Claimed files:
- scripts/smoke-workspace-live-routes.mjs
- scripts/smoke-workspace-live-core-actions.mjs
- scripts/smoke-workspace-live-settings-actions.mjs
Compile gate: the three smokes themselves.

AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/COMMANDS_AND_TESTS.md (all complete).
  Dossier/brief correction: AGENTS.md:7 in the live tree ALREADY says "native PostgreSQL 18 at
  127.0.0.1:5432 (pg.Pool, DATABASE_URL required; PGlite is NOT installed)". The brief's claim that
  line 7 still says PGlite is STALE. AGENTS.md:141 still wrongly says "Тесты: Playwright".
  COMMANDS_AND_TESTS.md:44 does list the wrong key `smoke:documents-lifecycle`.
  My three smokes are documented NOWHERE in COMMANDS_AND_TESTS.md.

HEAD at start = 94c6caa15a1dfcbf1774942a62b7a3dd8e4bdb2c (lead cited f09869601 — tree has moved on).
git status --porcelain on all 3 claimed files = EMPTY (clean, no collision).

DEFECT CONFIRMED — read all three files IN FULL (415 / 941 / 838 lines).
  routes:36            const vitePath = path.resolve("apps/web/node_modules/vite/bin/vite.js");
  settings-actions:43  same
  core-actions:44      same
  FILESYSTEM PROOF: `ls apps/web/node_modules/vite` -> "No such file or directory".
                    `ls node_modules/vite/bin/vite.js` -> EXISTS (hoisted to root). vite 6.4.3.
  Misleading message at routes:73-75, settings:67-71, core:68-72 claims deps are not installed.
  Idiom survey: grep "node_modules/vite" across scripts/ + package.json = ONLY these 3 files.
                No 4th file to report to the lead for this defect.
  Prereqs for running the smokes all present: apps/api/dist/server.js EXISTS,
  msedge.exe EXISTS. All three self-allocate ports via findFreePort() -> NO collision with
  the shared dev server on 5173/4100. Each has a finally{} that stopTracked()s web+api+browser.

PLAN: new shared helper scripts/lib/resolveViteBin.mjs (real module resolution via createRequire on
  "vite/package.json", tried from BOTH repo root and apps/web, bin path read from the package manifest
  rather than hardcoded), + 3 one-line call sites. Deliberately a 4th file OUTSIDE the strict claim
  list: triplicating the resolver would be exactly the "four dead copies of getDefaultOrganizationId"
  sin the brief bans. New file = zero collision risk with the other 3 agents. Declared in handoff.

EDIT WRITTEN — new scripts/lib/resolveViteBin.mjs + 3 call sites. In each script the hardcoded
  const was deleted and `const vitePath = resolveViteBin();` now sits exactly where the old
  existsSync guard was, so error precedence (browser -> api dist -> vite) is unchanged.
  In routes.mjs it is scoped INSIDE the `if (!baseTargetUrl)` isolated branch, so external-URL
  mode still never requires vite.

GATE PASSED — `node --check` OK on all 4 files.
  resolveViteBin() -> C:\Clinic_MVP\dental-crm\node_modules\vite\bin\vite.js (exists: true).
  Failure path re-tested with valid absolute roots: throws and lists all 4 attempted paths.
  (First failure test was invalid — bash ate the backslashes, `C:\nowhere-a` became `C:`+newline,
   so Node fell back to cwd lookup and "succeeded". Retested with forward slashes: MODULE_NOT_FOUND
   correctly scoped per-root.)

COMMITTED 2646c8064a8272b7cb23b53e89c78529b2a05f24
  Subject intact, no mojibake, 6 files, none belonging to another agent.
  NOT staged (other agents' in-flight work, left alone): scripts/ops-panels-shots.mjs,
  scripts/smoke-visit-workflow-forms-lifecycle.mjs.

NEXT — SLOW STEP, running now, ONE AT A TIME (each has a 90s watchdog + finally{} teardown;
each self-allocates api/web/cdp ports via findFreePort, so NO contact with the shared 5173/4100):
  1. npm run smoke:workspace-live-routes
  2. npm run smoke:workspace-live-core-actions
  3. npm run smoke:workspace-live-settings-actions
If I die here: the fix is already committed at 2646c8064. Only the proof is missing.

PROVEN — all three smokes RUN now and vite launches in every one of them:
  routes           -> vite starts, browser opens, dies at "shift app shell did not become ready"
  core-actions     -> "VITE v6.4.3 ready in 319 ms" on port 50246, dies at HTTP 401
  settings-actions -> "VITE v6.4.3 ready in 356 ms", dies at HTTP 401
  NONE of the three exits 0. The vite gate is passed; a SECOND, PRE-EXISTING defect stops them.

SECOND DEFECT (NOT MINE, NOT FIXED — reported to lead):
  GET /api/dashboard returns 401 AuthRequired. The three smokes send no auth at all.
  apps/api/src/routes/dashboard.ts:12  requireOrganizationId(request, reply)
  apps/api/src/security/identity.ts:132-142  -> 401 {"error":"AuthRequired"} when no org identity
  dashboard.ts:7-11 documents this as a DELIBERATE security fix (anonymous callers used to get the
  demo org's financial summary). The security fix is right; the smokes were never updated.
  Note DENTE_CLINICAL_ALLOW_UNGUARDED_READS=1 (set only by routes.mjs) does NOT help — dashboard.ts
  calls requireOrganizationId directly and never consults accessGuard.
  TWO STRIKES: same 401 in 2 of 2 log-dumping runs -> STOPPED, did not add auth glue.

DONE. HEAD moved to aa649990 (other agents committed after me); 2646c8064 intact in history.
Tree clean for all my files. No junk committed.
