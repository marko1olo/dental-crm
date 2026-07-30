# W2-clinicmode-really-hides — state

STATUS: DONE (PARTIAL — one file blocked by a live cross-packet collision)
HEAD at start: e75df11857f4e2e7202bb4e7ffa557c487147720
COMMITTED: 58fabefb3938871b40b271d49a56b79b25f79d99 (3 files)
COMMITTED: 47c09002a (prototype-chain fix + 91 lines of test)
HELD, NOT COMMITTED: apps/web/src/workspaceShell.tsx, apps/web/src/__tests__/clinicModeSurface.test.ts

## Milestone log
- STARTED: packet dir + state.md written before reading anything.
- AUTHORITY READ: .agents/AGENTS.md, INDEX.md, UI_STANDARDS.md complete.
- DEFECT CONFIRMED: settingsStore.ts:158 real, but it gates NOTHING (dossier mechanism wrong).
- EDIT WRITTEN: clinicCapabilities.ts, settingsStore.ts, useSettingsDerivations.tsx, workspaceShell.tsx,
  new __tests__/clinicModeSurface.test.ts.
- SELF-CHECK PASSED: own test files, exit 0.
- COMMITTED 58fabefb3, then COMMITTED 47c09002a.
- PROVEN: see handoff.md ПРОВЕРЕНО.
- DONE.

## COLLISION — reported, not touched
A second author edited apps/web/src/workspaceShell.tsx WHILE I held it, twice:
1. added views inventory/scanner/leads to appViews + labels/hints/sidebarIcons/actionIcons (11 -> 14);
2. extended MY new getVisibleRailViews() with a `leads` filter and its own Russian rationale.
Their work is coherent and I did NOT revert or alter it (per instruction).
They are also mid-restructure: App.tsx, workspacePreload.ts, workspaceShellNav.test.ts,
panelsAreMounted.test.ts modified; AppRouter.tsx, PayrollView.tsx, OmnichannelInboxView.tsx/css DELETED.

WHY I DID NOT COMMIT workspaceShell.tsx — measured, not assumed:
  git show HEAD:apps/web/src/App.tsx | rg 'currentView === "(inventory|scanner|leads)"' -> no match
  git show HEAD:apps/web/src/workspacePreload.ts | rg "Inventory|Scanner|Leads"      -> no match
Committing the 14-view registry without their App.tsx render branches would put three entries on
the nav rail that render nothing, and would turn tests/panelsAreMounted.test.ts red at HEAD.
That is the cycle-1 "HEAD unable to compile" failure. The file must land atomically with THEIR
App.tsx + workspacePreload.ts. That is a cross-packet commit and belongs to the lead / W3.

My test __tests__/clinicModeSurface.test.ts imports getVisibleRailViews, so it is held with the file:
committing it alone would leave HEAD with a test importing a non-existent export.

## Lead must run (I may not — §7a)
npm run typecheck -w @dental/web
