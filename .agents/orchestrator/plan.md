# Operational Plan — DENTE CRM Hardening

## Overview
Comprehensive functional audit and architectural hardening of DENTE CRM (`C:\Clinic_MVP\dental-crm`).

## Phases & Strategy

### Phase 0: Parallel Reconnaissance & Survey
Dispatch 3 Explorer agents in parallel to perform structural analysis across `apps/web/src`:
- **Explorer 1 (R1 Audit)**: Map all instances of `try/catch` and `catch()` blocks in `apps/web/src`. Identify silent error swallows (`console.error`, empty catch blocks) and list candidates for `showToast` / `actionFailureToast` error routing.
- **Explorer 2 (R2 Audit)**: Map all form submit handlers (`onSubmit`), action buttons, async handlers, and network mutation triggers in `apps/web/src`. Identify missing `isSubmitting`/`isLoading` loading guards, un-disabled buttons, and missing `aria-busy={true}`.
- **Explorer 3 (R3 Audit)**: Survey structural search targets (`rg "await fetch|catch"`, `rg "onSubmit"`), execute Biome linter check (`npx biome lint apps/web/src`), typecheck (`npm run typecheck`), and analyze circular dependencies using `npx madge --circular --extensions ts,tsx apps/api/src apps/web/src`.

### Phase 1: Milestone 1 — Eradicate Silent Async Error Swallows (R1)
- Dispatch Worker to route all unhandled/swallowed async errors across `apps/web/src` to user-facing toasts (`showToast`, `actionFailureToast`).
- Dispatch 2 Reviewers to inspect error handling completeness.
- Dispatch 2 Challengers to verify error state UI feedback.
- Dispatch Forensic Auditor for integrity gate check.

### Phase 2: Milestone 2 — Harden Race Conditions & Double Submits (R2)
- Dispatch Worker to implement `isSubmitting`/`isLoading` state guards, `disabled={isSubmitting}`, and `aria-busy={true}` across form submits and action buttons in `apps/web/src`.
- Dispatch 2 Reviewers to review race-condition protection.
- Dispatch 2 Challengers to test rapid double-clicking and state locking.
- Dispatch Forensic Auditor for integrity gate check.

### Phase 3: Milestone 3 — Code Quality, Biome & Typecheck Compliance (R3)
- Dispatch Worker to resolve any remaining Biome linter errors (`npx biome lint apps/web/src`) and TypeScript compiler errors (`npm run typecheck -w @dental/web`, `npm run typecheck -w @dental/api`).
- Dispatch 2 Reviewers for code quality verification.
- Dispatch 2 Challengers for regression testing.
- Dispatch Forensic Auditor for integrity gate check.

### Phase 4: Project Verification & Completion Synthesis
- Synthesize all milestone handoff reports and terminal execution logs.
- Confirm zero TypeScript errors, zero Biome lint errors, zero silent error swallows, and 100% fortified state guards.
- Notify Sentinel / Parent of task completion.
