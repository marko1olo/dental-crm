# Y2-clinicmode-one-vocabulary — state

STATUS: COLLISION MAPPED — 2 of 5 claimed files are dirty with OTHER AGENTS' work. See «OWNERSHIP» below.
       Предыдущий экземпляр пакета умер ПОСЛЕ записи правок, ДО коммита.

## OWNERSHIP OF THE DIRTY CLAIMED FILES — DECIDED BY READING THE DIFF BODIES
| file | dirty with | commit? |
|---|---|---|
| apps/api/src/db/schema.ts | MY clinic-mode work (3 hunks, all clinic_mode) | YES |
| apps/api/src/routes/workspaceProfile.ts | MY clinic-mode work (4 hunks, all clinic_mode) | YES |
| apps/api/src/db/domainStateHydration.ts | **Y1's pricelist work** (projectServiceCatalogRows, SERVICE_CATALOG_EMPTY_MESSAGE). ZERO clinic-mode content; line 350 `.catch()` UNTOUCHED. | **NO — committing it would commit Y1's whole in-flight change** |
| packages/shared/src/index.ts | **another agent's money/kopecks work** (nonNegativeMoneyRubSchema ×30). ZERO clinic-mode content. | **NO** |
| apps/web/src/lib/clinicCapabilities.ts | clean | mine if I edit it |

=> The `.catch()` at domainStateHydration.ts:350 CANNOT be edited by me this cycle.
   Fix routed through the DB CHECK constraint instead, which makes it structurally unreachable.
   clinicModeSchema needs NO change (it is already the correct 4-value enum) — so losing write
   access to packages/shared/src/index.ts costs the packet nothing.

## §5 JUDGEMENT BLOCKER (packet item 5)
TWO test files OUTSIDE my claim hard-pin one_chair -> marketingSection:
- apps/web/src/tests/clinicCapabilities.test.ts:131  assert.equal(hasCapability("one_chair","marketingSection"), true)
- apps/web/src/__tests__/clinicModeSurface.test.ts:305 assert.ok(getVisibleRailViews("owner","one_chair").includes("marketing"))
Changing ONE_CHAIR without those two files breaks the web suite (610/610 green at dispatch).

HEAD at first start (dead instance): 2cf36a1e7a2decc3323b92ed721a969382eaabdf
HEAD at resume:                      320329492e61d56b5a61cc9fc1457a8b36857b14

## Log
- [x] STARTED
- [x] AUTHORITY READ (dead instance) — re-reading myself, cannot inherit the claim
- [x] git status: claimed files DIRTY **BY MY OWN PREDECESSOR**, not by a collision.
      Evidence: the diff bodies are clinic-mode Russian commentary naming "миграция 0140",
      and apps/api/drizzle/0140_clinic_mode_one_vocabulary.sql exists untracked.
      Another agent has STAGED deletions (rebookingConversionRulesQuery.ts,
      RebookingConversionRulesWidget.tsx) — PATHSPEC COMMIT MANDATORY.
- [x] DEFECT CONFIRMED (live DB probe, exit 0)
- [ ] INVENTORIES
- [ ] EDIT WRITTEN (partial on disk — clinicCapabilities.ts NOT yet touched, no test file yet)
- [ ] SELF-CHECK PASSED
- [ ] COMMITTED <hash>
- [ ] PROVEN
- [ ] DONE

## Inherited work on disk (NOT yet verified by me)
- apps/api/src/db/schema.ts            +45 -1
- apps/api/src/db/domainStateHydration.ts +76 -48
- apps/api/src/routes/workspaceProfile.ts +71 -1
- packages/shared/src/index.ts         +162 -40   <-- must confirm this is clinicModeSchema ONLY
- apps/api/drizzle/0140_clinic_mode_one_vocabulary.sql (untracked, 8031 bytes)
- MISSING: apps/web/src/lib/clinicCapabilities.ts (packet item 5 — marketingSection judgement)
- MISSING: the node:test file (packet PROOF EXPECTED)
- MISSING: migration ledger entry
- packages/shared/dist/** is dirty and GENERATED — NEVER STAGE.

## MEASURED, not inherited (dead instance, to be re-measured)
- **2 organizations, not 4.** Both clinic_mode='demo'. Dispatch said 4 — to re-verify.
- column default: 'demo'::text, NOT NULL, text. No CHECK constraints on organizations.

## Vocabularies found (to re-confirm at real lines)
1. packages/shared/src/index.ts:797 — solo_doctor|one_chair|small_clinic|network_clinic (the typed one)
2. apps/api/src/db/schema.ts:228 — .default("demo"), comment "// demo, single, network"
3. apps/api/src/routes/workspaceProfile.ts:684 — writes "single"/"network"
   (DOSSIER SAID 580,651 — WRONG. One writer, at 684.)
4. apps/api/src/scripts/setup-fresh-db.ts:92 — INSERT ... 'single'  (NOT in dossier at all)
5. apps/api/drizzle/0000_freezing_randall_flagg.sql:770 — DEFAULT 'demo'

## Silent coercions found (TWO, not one)
- apps/api/src/db/domainStateHydration.ts:350 — clinicModeSchema.catch("one_chair")
- apps/api/src/db/settingsQuery.ts:39 — safeParse fallback "solo_doctor" (NOT in dossier)
  => SAME org reads one_chair on dashboard path, solo_doctor on settings path.
  settingsQuery.ts is OUTSIDE my claim -> debt; structural CHECK makes it unreachable.
