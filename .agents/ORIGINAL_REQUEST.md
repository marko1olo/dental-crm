# Original User Request

## 2026-08-08T20:51:53Z

# Teamwork Project Prompt

Deep architectural audit, E2E Playwright verification, and God-Object dismantling (AppHelpers.tsx) for the DENTE CRM frontend, with absolute paranoia and zero AI optimism.

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: benchmark

## Requirements

### R1. Browser UI & E2E Verification
Physically launch Playwright (or similar headless browser testing) to log into the CRM and navigate through all major panels (Schedule, Patients, Finance). Verify that no UI components crash or throw React Error Boundary exceptions. Take screenshots and read browser console logs to ensure every button and field is rendering properly.

### R2. Paranoid Global Codebase Search
Before deleting ANY code or modifying `AppHelpers.tsx`, the swarm must perform exhaustive global searches (`ripgrep`, `ast-grep`) to verify the execution chain. DO NOT rely on a single file's context. Cross-reference all exported symbols against the entire `apps/web/src` directory.

### R3. God-Object Dismantling (AppHelpers.tsx)
Surgically extract domain logic (Finance, Telegram, Date/Time, Clinic Profile) from the 8000-line `AppHelpers.tsx` into dedicated `/utils/` modules. Every single step must be followed by `npm run typecheck -w @dental/web` to guarantee no broken imports.

### R4. Zero AI Optimism
The swarm must not assume that "it should work now." Every architectural rewrite must be proven by successful test runs, zero circular dependencies (`npx madge --circular apps/web/src/main.tsx`), and a clean typecheck.

## Acceptance Criteria

### Objective Programmatic Verification
- [ ] `npm run typecheck -w @dental/web` passes with 0 errors after every file move.
- [ ] `npx madge --circular apps/web/src/main.tsx` outputs exactly 0 circular dependencies.
- [ ] Playwright E2E tests execute successfully and physically confirm that the UI loads without crashing or throwing console errors.
- [ ] All architectural decisions and fixes are grounded using Google Search for industry best practices.

## 2026-08-08T21:40:35Z

# Teamwork Project Prompt — Draft

Perform a paranoid, objective reassessment of all "dead code" removals and flagged variables in the `apps/web/src` codebase. The goal is to identify false positives where agents incorrectly deleted or flagged actively used code, using the `useDocumentWorkflowModule.ts` failure as a baseline.

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

## Requirements

### R1. Root Cause Analysis of False Positives
Analyze exactly why `_selectedTaxDocumentPayerInn`, `_eligibleTaxPaymentIdsKey`, and `_eligiblePaymentReceiptIdsKey` were falsely flagged as dead code in `useDocumentWorkflowModule.ts` by the previous subagent, despite being actively used in the file. Identify the logical fallacy or tool failure that led to this AI optimism.

### R2. Global "Dead Code" Re-Audit
Execute a rigorous codebase-wide scan across `apps/web/src` (maximum paranoia). Verify if any other recently deleted or flagged "dead" functions/variables were actually part of an active call stack. You have no restrictions — you may use AST parsers (e.g., `ts-morph`), `tsc`, `madge`, `ripgrep`, or custom scripts.

### R3. Strict Execution Chain Verification
For every piece of code suspected of being dead, physically trace its execution chain. Who instantiates it? Is it part of a dynamically generated key, an export, or a larger object spread? Do not delete anything unless it is mathematically proven to be dead (0 references across the AST).

## Acceptance Criteria

### Verification
- [ ] Programmatic validation: An automated typescript check (`npm run typecheck -w @dental/web`) must pass, proving no deletions broke the build.
- [ ] Output validation: A detailed incident report is generated explaining the exact mechanism of the false positive in the workflow module.
- [ ] Output validation: Any other code falsely identified as dead in the recent refactoring must be restored and documented.

## Follow-up — 2026-08-08T21:41:28Z

USER OVERRIDE: The user specifically demands that the audit team aggressively use Git history (`git log -p`, `git diff`, etc.) to trace and investigate any lost or broken logic from recent refactorings. Ensure your orchestrator and subagents incorporate Git history analysis immediately into their workflow to find anything that might have been accidentally deleted or broken recently.


