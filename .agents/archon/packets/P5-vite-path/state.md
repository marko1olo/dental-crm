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

NEXT: write helper + edit 3 call sites.
