# W3-unreachable-views — state

STATUS: AUTHORITY READ -> RECON IN PROGRESS
HEAD at start: e75df11857f4e2e7202bb4e7ffa557c487147720

## Claim clean check (run)
`git status --porcelain -- apps/web/src/App.tsx apps/web/src/workspaceShell.tsx
 apps/web/src/workspacePreload.ts apps/web/src/AppRouter.tsx ...` -> EMPTY. All claimed files CLEAN.
Dirty in tree but NOT mine: .agents/AGENTS.md, apps/api/.data/*.json, apps/web/tsconfig.tsbuildinfo,
packages/shared/dist/*, scratch/audit-settings-props.mjs.

## Authority read
.agents/AGENTS.md (full), .agents/INDEX.md (full), .agents/UI_STANDARDS.md (full),
.agents/archon/RECON_DOSSIER.md §0-§6 (read through line 400).

## DEFECT CONFIRMED (real lines)
- apps/web/src/AppRouter.tsx:1-12 — header literally says "ВНИМАНИЕ: МЁРТВЫЙ ФАЙЛ".
- apps/web/src/workspaceShell.tsx:29 — appViews = 11 entries; none of
  inventory/payroll/leads/inbox/scanner.
- AppRouter.tsx:330-356 — the only render sites for InventoryView/PayrollView/LeadsKanbanView/
  OmnichannelInboxView/ScannerView.
- apps/web/src/tests/panelsAreMounted.test.ts:118-138 — guard asserting AppRouter stays marked dead.
- apps/web/src/__tests__/workspaceShellNav.test.ts:55 — `assert.equal(appViews.length, 11)` HARD-CODES 11.
  Adding any view breaks this test. Test title says "at least the eleven shipped views".

## LIVE ENDPOINT PROBE (curl to 127.0.0.1:4100, run)
    /api/health                              -> 200
    /api/sterilization/logs                  -> 401 AuthRequired  (route EXISTS)
    /api/leads                               -> 401 AuthRequired  (route EXISTS)
    /api/dashboard                           -> 401 AuthRequired  (route EXISTS)
    /api/auth/user/me                        -> 401 AuthRequired  (route EXISTS)
    /api/billing/payouts                     -> 404 Not Found     (DOES NOT EXIST)
    /api/communications/inbox                -> 404 Not Found     (DOES NOT EXIST)
    /api/communications/patients/search?q=a  -> 404 Not Found     (DOES NOT EXIST)
    /api/inventory                           -> 404 (prefix only; real path is /api/inventory/:orgId)
`rg -rn "inbox" apps/api/src` -> only a test fixture string. No inbox route exists at all.
`rg -n "payouts" apps/api/src` -> ZERO hits.

## DECISION PER VIEW (justified)
REAL -> ROUTE:
1. InventoryView (1487) — 8/8 endpoints exist in routes/inventory.ts and match
   components/inventory/useInventoryLogic.ts exactly (`/:orgId`, `/:orgId/:itemId`,
   `/:orgId/:itemId/stock`, `/:orgId/rules/:serviceId`, `/:orgId/rules`, `/:orgId/rules/:ruleId`).
   Real table inventoryItems with real inserts. Every practice needs stock + expiry.
2. ScannerView (192) — routes/sterilization.ts registered at server.ts:412, real insert into
   sterilizationLogs + ws broadcast. СанПиН journal is needed by solo practices too.
3. LeadsKanbanView (996) — 6/6 endpoints in routes/leads.ts registered at server.ts:394,
   real crmLeads table, real convert-to-patient transaction. Gated: hidden for solo_doctor.

FACADE -> DELETE:
4. PayrollView (871) — only data source `/api/billing/payouts` = 404 live; ZERO hits for
   "payouts" in apps/api/src outside the debt list. Nothing computes payouts anywhere.
5. OmnichannelInboxView (1306) — `/api/communications/inbox`, `/inbox/:id`, `/inbox/:id/send`,
   `/patients/search` ALL 404. INBOX_NEW_MESSAGE ws frames are emitted, but there is no
   list/send API at all, so the screen can only ever be empty and the send button 404s.
6. AppRouter.tsx (359) — dead by its own header; nothing left to hold once 1-5 are resolved.
   Also deleting OmnichannelInboxView.css (orphaned, imported by nobody).

## COLLISION — REPORTED, NOT REVERTED
Packet W2 was editing apps/web/src/workspaceShell.tsx concurrently (clinicMode rail filter:
`getVisibleRailViews`, `resolveClinicMode`, `visibleStaffRoles`, `useAppLogicContext` reads in
WorkspaceSidebar/WorkspaceTopbar). My claim names the same file for `appViews`.
My regions (registry, labels, hints, icon maps, role arrays) are disjoint from theirs EXCEPT one
line I added inside their `getVisibleRailViews` to hide `leads` for solo_doctor (§5).
`apps/web/src/lib/clinicCapabilities.ts` was CLEAN and its symbols were already at HEAD
(47c09002a / 58fabefb3), so their lines compile — committing the file does NOT break HEAD.
**Commit 41a22b63d therefore CARRIES ~50 uncommitted lines of W2's work in workspaceShell.tsx.**
I did not revert or reset anything. Verified swept lines with
`git show 41a22b63d -- apps/web/src/workspaceShell.tsx | rg "^\+.*getVisibleRailViews"`.

## COMMITTED
41a22b63dec9291ce6e539a47f44102cda8d44c3
13 files, 792 insertions, 2966 deletions. Index was EMPTY at commit time.

## Log
- [x] STARTED
- [x] AUTHORITY READ
- [x] DEFECT CONFIRMED
- [x] EDIT WRITTEN
- [x] SELF-CHECK PASSED (5/5 + 7/7, exit 0)
- [x] COMMITTED 41a22b63d, then e2d41dc74 (StaffAuthRequired message + type-safety)
- [x] PROVEN — UNIT 12/12 exit 0; API 3x200 vs live 4100 with real tokens; deletions grep-clean;
      check-css-tokens exit 0; smoke:web-text-encoding exit 0 (0 mojibake)
- [x] DONE — handoff.md written. Claim clean: `git status --porcelain -- apps/web/src/` shows
      only W2's untracked __tests__/clinicModeSurface.test.ts.
      Lead still owes: `npm run typecheck -w @dental/web` (§7a, not mine).
- [ ] SELF-CHECK PASSED
- [ ] COMMITTED <hash>
- [ ] PROVEN
- [ ] DONE
