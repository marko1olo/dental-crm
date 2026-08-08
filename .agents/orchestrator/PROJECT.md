# Project: DENTE CRM Architectural Hardening (`apps/web`)

## Architecture
- Monorepo: `apps/web` (React client), `apps/api` (Fastify backend).
- Primary Entry: `apps/web/src/main.tsx`
- State Context & Shell: `apps/web/src/useAppLogic.tsx`, `apps/web/src/components/workspace/workspaceShell.tsx`, `apps/web/src/contexts/AppLogicContext.tsx`, `apps/web/src/hooks/useWorkspaceProfile.ts`
- Logging Module: `apps/web/src/utils/logger.ts` (or equivalent unified logger module)
- E2E Tests: `apps/web/e2e/` (Playwright)

## Feature & Requirement Inventory

| # | Feature / Requirement | Description | Target Files / Scope | Milestone |
|---|---|---|---|---|
| 1 | Circular Dependency Eradication | Resolve circular dependencies reported by madge involving useAppLogic.tsx, workspaceShell.tsx, AppLogicContext.tsx, hooks/useWorkspaceProfile.ts | apps/web/src/ | M1 |
| 2 | Deep Architectural & UI Audit | Audit codebase for broken call stacks, orphaned logic, button/field functionality, and ensure 0 typecheck errors | apps/web/src/ | M2 |
| 3 | console.log Migration | Replace raw console.log, console.warn, console.error calls across apps/web/src with unified logger module | apps/web/src/ | M3 |
| 4 | Playwright E2E Verification | Write & execute Playwright E2E tests simulating browser, login, navigation, screenshots, browser logs check | apps/web/e2e/ | M4 |
| 5 | Zero AI Optimism & Verification Gate | Verify all acceptance criteria with madge, typecheck, playwright tests, and forensic audit | Monorepo | M5 |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Circular Dependency Eradication | Sever circular imports between useAppLogic.tsx, workspaceShell.tsx, AppLogicContext.tsx, and hooks/useWorkspaceProfile.ts | None | IN_PROGRESS |
| M2 | Deep Architectural & UI Audit | Comprehensive audit of call stacks, orphaned logic, form button state guards, and 0 typecheck errors | M1 | PLANNED |
| M3 | console.log Migration | Replace all raw console.log, console.warn, console.error calls across apps/web/src with logger | M1 | PLANNED |
| M4 | Playwright E2E Verification | Create & run E2E Playwright tests verifying UI loads, logs in, navigates without console errors | M2, M3 | PLANNED |
| M5 | Verification Gate & Forensic Audit | Final verification of all criteria (madge = 0, typecheck = 0, console.log = 0, E2E = PASS, clean audit) | M1, M2, M3, M4 | PLANNED |

## Code Layout & Guidelines
- All modifications must preserve existing functionality, bugfixes, and UI features.
- No hardcoded test fallbacks or dummy empty functions allowed.
- All Russian strings written to files must be UTF-8 without BOM; use write_to_file tool.
- Commit before reporting, include HEAD hash.
