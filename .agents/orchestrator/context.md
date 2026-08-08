# Context & State Overview

## Project Scope
- Codebase: `C:\Clinic_MVP\dental-crm`
- Frontend: `apps/web/src`
- E2E Tests: `apps/web/e2e` or `apps/web/tests`

## Current Mission Goals
1. R1: Eradicate 4 circular dependencies reported by madge involving `useAppLogic.tsx`, `workspaceShell.tsx`, `AppLogicContext.tsx`, `hooks/useWorkspaceProfile.ts`. Target: `npx madge --circular apps/web/src/main.tsx` outputs 0 cycles.
2. R2: Deep Architectural & UI Audit. Target: 0 typecheck errors (`npm run typecheck -w @dental/web`), 0 broken call stacks, no broken UI buttons/widgets.
3. R3: console.log Migration. Target: `rg "console\.(log|error|warn)" apps/web/src` returns 0 results (excluding logger itself).
4. R4: Playwright E2E Verification. Target: `npx playwright test` passes, UI renders without console errors.
5. R5: Zero AI Optimism & Strict Verification. Target: verified with madge, typecheck, playwright, and forensic audit.

## Current Stage
Milestone 1 (Circular Dependency Eradication) — Dispatching Explorers.
