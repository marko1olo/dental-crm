# Y3-mount-chain-guard — state (REWORK pass, cycle 9)

STATUS: STARTED (rework)
HEAD at rework start: 320329492e61d56b5a61cc9fc1457a8b36857b14
Claim status at start: `git status --porcelain -- apps/web/src/components/workspace/ scripts/` =>
  ` M scripts/dente-redesign-shots.mjs`, ` M scripts/ops-panels-shots.mjs`, `?? scripts/lib/shot-audit.mjs`
  — NOT MINE (another author's shot scripts). My own files
  (scripts/check-component-mount-reachability.mjs, scripts/lib/component-mount-rules.yml,
  scripts/tests/check-component-mount-reachability.test.mjs) are CLEAN at HEAD.
  apps/web/src/components/workspace/ is clean.

## Prior pass (same packet, earlier agent) — ALREADY COMMITTED
- 75db7eb5d508343b57831df41ef95d9c53da94f4 — the guard (3 files, +1319)
- ab33125957d739350fd7166c2f67fd9a3a00d18e — deletion of the dead onboarding chain (10 files, -1888)
Reviewer verdict in review.md: **NEEDS_REWORK**. Deletion half SOUND (C1-C10 reproduced).
Guard half has a proven false-negative class + a false proof claim.

## MY JOB THIS PASS = the 7 REQUIRED REWORK items in review.md:254-278
1. component-decl blind to 38/197 declarations: `export const X: React.FC<P> = () => {}` (37 files)
   and `export function X(): JSX.Element {}` (1). Teach both. Publish new denominator (~197).
   Add POSITIVE-control tests per form.
2. Rule on the 3 orphans the fix surfaces: components/ConsentTemplateEditor.tsx:4,
   pages/PublicBookingWidget.tsx:46 (LIVE BACKEND at apps/api/src/server.ts:457 -> lead's call, do NOT
   delete), components/plan/ComparativePlannerDashboard.tsx:125.
3. Allowlist reason must be LOAD-BEARING: blank/missing reason => reject (exit 2). Withdraw the false
   CLAIMED PROVEN sentence. Test must inject a reasonless entry and assert refusal.
4. Report contradiction: a row printed [НАРУШЕНИЕ] must be counted in ИТОГ; an allowlisted row must
   print `разрешено` + reason.
5. Wire the guard into package.json, or state in writing why not.
6. Declare relationship with apps/web/src/tests/panelsAreMounted.test.ts and
   documentsViewDecomposition.test.ts (F4: two pre-existing owners of this invariant).
7. Add the blind-spot section to the handoff's «Границы точности».

## Log
- [x] STARTED (this file written)
- [ ] AUTHORITY READ
- [ ] DEFECT CONFIRMED (the reviewer's F1/F2 reproduced by me, not trusted)
- [ ] INVENTORIES
- [ ] EDIT WRITTEN
- [ ] SELF-CHECK PASSED
- [ ] COMMITTED <hash>
- [ ] PROVEN
- [ ] DONE
