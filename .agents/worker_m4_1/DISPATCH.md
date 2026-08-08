## 2026-08-08T20:16:22Z

You are a Worker subagent for DENTE CRM.
Working directory: C:\Clinic_MVP\dental-crm\.agents\worker_m4_1

MANDATORY FIRST STEP: Read the following authoritative files using view_file before doing anything else:
1. C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md
2. C:\Clinic_MVP\dental-crm\.agents\AGENTS.md
3. C:\Clinic_MVP\dental-crm\.agents\explorer_m4_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Execute Milestone 4: Playwright E2E Verification Test Suite Creation & Execution.

Instructions:
1. Read `C:\Clinic_MVP\dental-crm\.agents\explorer_m4_1\handoff.md` for the test suite design.
2. Create `apps/web/tests/e2e/workspace-e2e.spec.ts` implementing Playwright E2E tests:
   - Registers listeners for `pageerror` and `console` (type `error`), asserting `expect(consoleErrors).toEqual([])`.
   - Seeds `localStorage` authentication tokens (`dente_clinic_token`, `dente_staff_token`, `dente_ui_preferences_v1`, `dental-crm:onboarding:v1:org:1`).
   - Navigates through primary UI routes (`#visit`, `#schedule`, `#patients`, `#finance`, `#settings`).
   - Cycles through all 4 visual states (PC Light 1440x900, PC Dark 1440x900, Mobile Light 390x844, Mobile Dark 390x844), setting `document.documentElement.dataset.theme`.
   - Captures screenshots for each route & state into `artifacts/screenshots/`.
3. Run Playwright E2E tests using `npx playwright test tests/e2e/workspace-e2e.spec.ts --project=chromium` (or `npx playwright test`).
4. Run `npm run typecheck -w @dental/web` to confirm exit code 0.
5. Write your complete handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_m4_1\handoff.md`.
6. Send a completion message back to parent orchestrator.
