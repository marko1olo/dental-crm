# P3-syncdaemon — black box

STARTED 2026-07-28
Packet: P3-syncdaemon
Claim: apps/api/src/services/syncDaemon.ts (delete), plus any import/test/tsconfig reference that must follow.
Gate: npm run typecheck -w @dental/api
Do NOT touch: db/schema.ts (P2 owns), scratch/, syncEngine.ts deletion (report only).

## Milestones
- [x] STARTED
- [x] AUTHORITY READ (.agents/AGENTS.md full 163 lines, .agents/INDEX.md full 29 lines)
- [x] DEFECT CONFIRMED — read syncDaemon.ts full (327 lines) at HEAD 0b208ef17edba4b8e145bbdbb3e42ea68cd87267
      :185-196 response = ternary; false-branch is HARDCODED { success:true, cloudChanges:{5x empty} }
      :198 if (response.success) -> :200-233 FIVE db.update().set({isSynced:true}) (patients,
           visitDiaries, toothStates, treatmentPlans, patientInvoices). Zero network calls in file
           (imports are only drizzle-orm + db/schema; no fetch/http/axios/undici).
      :69-87 mockCloudVaultExchange SELECTs a real unpaid invoice, injects status:"paid", version+1.
      :293-298 merge path then INSERTs a fabricated cash_ledger row (paymentMethod "card") for it.
      :27 startSyncDaemon. :5 `organizations` imported and never used.
      Dossier drift: mock fn spans :51-101, not :51-99. Everything else cited was exact.
NEW (not in packet brief): the cash_ledger insert at :293-298 fabricates MONEY, not just isSynced.

## CENSUS (rg over apps packages scripts, and repo-wide for the name)
ZERO CALL SITES CONFIRMED MYSELF. startSyncDaemon/stopSyncDaemon/runSyncCycle/SyncReport/
mockCloudVaultExchange appear ONLY inside syncDaemon.ts. No services/index.ts barrel exists.
Every other repo hit for "syncDaemon" is a COMMENT or a doc, never an import:
  apps/api/tsconfig.json:17            comment (historical narrative)
  apps/api/src/services/syncEngine.ts:6 comment ("replaces the old custom syncDaemon")
  apps/api/src/db/schema.ts:1391,:2126  comments (P2 owns schema.ts — NOT TOUCHING)
  HANDOVER_AUDIT_2026-07-26.md:304-306, .agents/archon/*  docs
  .dente-ops-shots/backup/schema.ts     backup dump, not source
=> Deleting the file requires NO import fixes anywhere. No test references it.

## isSynced WRITERS — the question the lead asked
After deletion, NO code path writes isSynced:true anywhere. Remaining writers are all INSERT-false:
  apps/api/src/routes/workspaceProfile.ts:333   isSynced: false
  apps/api/src/routes/odontogram.ts:341,447,468 isSynced: false
  apps/api/src/tests/db/patientsQuery.test.ts:192 isSynced: false (fixture)
  apps/api/src/db/schema.ts:300,1319,1393,1435,1544  column def, .default(false)
The column becomes permanently false = honest (nothing IS backed up).

## syncEngine.ts STATUS (report only, do not delete this packet)
DEAD, but NOT the same fabrication class. Zero call sites (startSyncEngine/stopSyncEngine defined
and never called). Excluded from typecheck at apps/api/tsconfig.json:32. Imports @electric-sql/pglite
and @electric-sql/pglite-sync — NEITHER INSTALLED, in no package.json (verified). Takes a PGlite
client param; the PGlite engine is gone. It writes NOTHING to the DB and fabricates no success — it
would really call ElectricSQL if the deps existed. Its syncDaemon reference is a comment, not an import.
Separate smell: syncEngine.ts:42-43 builds a SQL WHERE by string-interpolating org ids.
- [x] EDIT WRITTEN
      1. `git rm apps/api/src/services/syncDaemon.ts` -> exit 0, file gone, deletion STAGED.
      2. apps/api/tsconfig.json comment (:16-20) no longer lists syncDaemon among live broken files;
         records that it was deleted and why. Comment-only — exclude list UNCHANGED.
      3. apps/api/dist/services/syncDaemon.js = orphaned compiled copy, UNTRACKED + gitignored
         (.gitignore:2 dist/). Nothing in dist imports it; dist/server.js (prod entry, `npm start`)
         has 0 hits. Removing from disk only, zero git effect.
      NOT touched: db/schema.ts (P2), syncEngine.ts (report only), scratch/, .env* (no refs found).
- [ ] ABOUT TO RUN (slow): npm run typecheck -w @dental/api  — the load-bearing gate for a deletion.
      Expect exit 0. Any error in a file I did not touch = another agent's in-flight edit, not mine.
- [x] GATE PASSED — `npm run typecheck -w @dental/api` exit 0, zero output. Clean after deletion.

!! COLLISION — REPORT LOUDLY !!
My `git rm` staged the deletion. Before I could commit, ANOTHER AGENT swept my staged deletion into
THEIR docs commit: 8c87dcd93 "[ARCHON] docs(агенты): закон утверждал, что базы нет на 5432...".
`git show --stat 8c87dcd93` = .agents/AGENTS.md, .agents/DATABASE.md, AND
apps/api/src/services/syncDaemon.ts | 326 ------ (mine).
Consequence: the deletion IS in history, but under a docs subject that never mentions it. Anyone
reading git log will not find why the daemon vanished. I did NOT amend/rebase another agent's commit.
My own commit below carries the tsconfig comment + the full defect record for the audit trail.
- [x] COMMITTED c97ceb4d8136e70d4c764050403eae166e379b4a (tsconfig portion + full defect record)
      git log -1 --stat: 1 file changed, 6 insertions(+), 2 deletions(-). Russian subject intact,
      no mojibake. No other agent's file rode along. Pre-commit hook "IRON GATE" ran gitleaks
      (no leaks); Biome skipped, not in PATH — I never invoked Biome.
      The FILE DELETION itself lives in 8c87dcd93 (another agent's docs commit, see collision above).
- [ ] ABOUT TO RUN (slow): npm test -w @dental/api  (node --import tsx --test src/**/*.test.ts)
      Also probing GET 127.0.0.1:4100/api/health to prove the running dev server survived the delete.
- [ ] COMMITTED <hash>
- [x] PROVEN
      TYPECHECK VERIFIED  npm run typecheck -w @dental/api -> exit 0, empty output.
      UNIT VERIFIED       npm test -w @dental/api -> exit 0. tests 844 / pass 844 / fail 0 / 20.5s.
                          No test referenced the daemon, so no test was deleted with it.
      API VERIFIED        curl 127.0.0.1:4100/api/health -> HTTP 200
                          {"ok":true,"service":"dental-crm-api","time":"2026-07-27T20:47:59.523Z"}
                          Dev server runs tsx watch, so it reloaded after the delete and stayed up =
                          independent corroboration of the zero-call-site census.
      ENCODING            check-encoding.mjs does NOT flag apps/api/tsconfig.json (grep -c = 0).
                          Brief understated the baseline: actual is 28 problems / 2041 files, not 1.
- [x] DONE — handoff.md written. Working tree clean for my paths. Only foreign untracked file in
      apps/api/src/services/ is patients/recallCandidates.ts (another agent's, not staged).
