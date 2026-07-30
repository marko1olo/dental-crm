# U6-state-snapshot-writes — state

STATUS: DONE
Packet: U6-state-snapshot-writes
Claim: apps/api/src/sampleData.ts (owner of mutableStateSnapshot/persistMutableState) + a node:test
Gate: npm run typecheck -w @dental/api -> EXIT=0 (twice)

## HEAD
- at start: e14c09862cf9ba58c7bfa05713695b4fcfece8da
- at handoff: 94871d09a9b99d9a4122cb8a7299a175e6c5ef50

## COMMITS (mine, verified with git log -1 --stat each time)
- 01f7a797b52dacc024b7cebe53530e6595e36a52  fix(состояние) — apps/api/src/sampleData.ts (+80/-1)
- 0d219199e708fbbae66073cef69e195ad15c8c25  test(состояние) — new test file (+226)
- 94871d09a9b99d9a4122cb8a7299a175e6c5ef50  test(состояние) — mixed call sites (+34/-3)
Another agent committed 87e367c40 (fix(дневник)) between my commits. Nothing foreign in mine.

## Dirty at start (NOT mine)
apps/api/.data/dental-crm-state.json, apps/api/.data/speech-key-health.json,
apps/web/src/DocumentsView.tsx, apps/web/src/store/documentStore.ts,
apps/web/src/styles/main.css, apps/web/tsconfig.tsbuildinfo, scratch/audit-settings-props.mjs
=> apps/api/src/sampleData.ts was CLEAN. No collision. My files are clean at handoff.

## DEFECT CONFIRMED
apps/api/src/sampleData.ts:4782 persistMutableState() -> savePersistentState(mutableStateSnapshot()),
31 call sites, synchronous, on the request path. persistentState.ts:242-265 does per call:
full JSON.stringify + sha256, full-file copy into backups/, readdir + statSync per backup,
second full JSON.stringify (pretty), writeFileSync + rename.

## DOSSIER CORRECTION
§5.7 says 32 call sites. Real = 31; 32 is the rg hit count including the declaration line 4782.

## MEASURED BEFORE (measure-state-write.mjs, os.tmpdir only, median of 10)
- live file 236,648 B pretty / 177,187 compact; clinicalRules 79,488 B, auditEvents 76,401 B
- CASE A (3 patients): 4.61 ms/save (checksum 1.08 + rotation 1.61 + stringify 0.78 + write 1.00)
- CASE B (10,000 patients): 49.54 ms/save, 5,803,929 B/save, 11.6 MB I/O per action

## MEASURED AFTER (node:test, real fs.writeFileSync counted)
- 20 actions: 20 writes / 725,680 B  ->  1 write / 36,284 B
- 25 actions over ~250 ms: 7 writes, not 25 (fixed window, no starvation)
- mixed call sites (uiPreferences + recordAuditEvent + uiPreferences): 1 write containing all three
- 7/7 pass, exit 0. Full suite: tests 964 / pass 964 / fail 0 / 25,966 ms, exit 0.

## REACHABILITY
routes/telegram.ts:36-65 imports 12 persisting mutators from sampleData (15 of 31 call sites);
registered at server.ts:41; the same file hydrates Postgres rows at :1477 before mutating.
The other 16 sites sit in mutators whose *InDb twins are what routes actually call.

## NOT VERIFIED
- API VERIFIED not claimed (health 200 only). Closing command written in handoff.md §НЕ ПРОВЕРЕНО.
- CASE B is synthetic scale (patients cloned from real records), labelled as such.

## FILES LEFT ON DISK
state.md, commitmsg.txt, commitmsg-test.txt, commitmsg-test2.txt, handoff.md,
measure-state-write.mjs (the measurement harness, so the numbers are re-runnable)

## Log
STARTED -> AUTHORITY READ -> DEFECT CONFIRMED -> EDIT WRITTEN -> GATE PASSED ->
COMMITTED 01f7a797b -> PROVEN (0d219199e, 94871d09a) -> DONE
