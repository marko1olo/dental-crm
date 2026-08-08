# Operational Plan — DENTE CRM Hardening & Verification

## Overview
Comprehensive circular dependency eradication, architectural/UI audit, console.log migration, and Playwright E2E verification of DENTE CRM (`apps/web`).

## Milestones & Strategy

### Milestone 1: Circular Dependency Eradication (R1)
- Dispatch Explorers to inspect the exact circular import edges reported by `madge` for `useAppLogic.tsx`, `workspaceShell.tsx`, `AppLogicContext.tsx`, `hooks/useWorkspaceProfile.ts`.
- Dispatch Worker to sever static circular import dependencies (extracting shared types/helpers, converting to type imports, or decoupling imports).
- Dispatch Reviewers, Challengers, and Forensic Auditor to verify `npx madge --circular apps/web/src/main.tsx` outputs 0 cycles and build/typecheck remains healthy.

### Milestone 2: Deep Architectural & UI Audit (R2)
- Dispatch Explorers to audit call stacks, orphaned state, form submit guards, button click handlers across UI modules.
- Dispatch Worker to fix any broken call stacks or unhandled error boundaries and achieve 0 typecheck errors (`npm run typecheck -w @dental/web`).
- Dispatch Reviewers, Challengers, and Auditor to verify zero regressions.

### Milestone 3: console.log Migration (R3)
- Dispatch Explorers to inventory all `console.log`, `console.warn`, `console.error` calls across `apps/web/src`.
- Dispatch Worker to migrate all raw logging statements to `logger` module (`apps/web/src/utils/logger.ts` or appropriate logger helper).
- Dispatch Reviewers & Auditor to verify `rg "console\.(log|error|warn)" apps/web/src` returns 0 results (excluding logger itself).

### Milestone 4: Playwright E2E Verification (R4)
- Dispatch Explorer/Worker to inspect E2E setup, write/update Playwright test scripts to simulate user login, workspace navigation, view inspection, and browser console error catching.
- Run E2E test suite (`npx playwright test`), capture screenshots & logs.

### Milestone 5: Verification Gate & Final Forensic Audit (R5)
- Collect all gate verdicts (`GATE_STATUS.md`), verify all 5 acceptance criteria, run final forensic audit, and deliver handoff report to Sentinel / Parent.
