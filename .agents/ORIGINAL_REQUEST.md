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
