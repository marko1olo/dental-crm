## 2026-08-07T23:11:53Z

You are Worker 1 for Milestone 1 (R1 Async Error Swallows Remediation). Your working directory is C:\Clinic_MVP\dental-crm\.agents\worker_1. Create your directory if it does not exist.

Your mission is to eradicate silent async error swallows across `apps/web/src` by routing caught errors to user-facing toasts:
1. Read `C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md`, `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`, and the Explorer 1 inventory at `C:\Clinic_MVP\dental-crm\.agents\explorer_1\handoff.md`.
2. Target Scope: Refactor all silent async error swallow sites in `apps/web/src` identified in `explorer_1/handoff.md`:
   - Import `showToast` from `apps/web/src/components/GlobalToast.tsx` (or parent hook/context where applicable) and `actionFailureToast` from `apps/web/src/lib/panelStateText.ts`.
   - Update `catch` blocks and `.catch()` callbacks to invoke `showToast(actionFailureToast("...", err?.status ?? null), "error")` or `showToast(err.message || "...", "error")`.
   - Preserve existing local state resets (e.g. `setLoading(false)`) and cleanups in `finally` blocks.
3. Quality & Verification Gates:
   - Run `npm run typecheck -w @dental/web` to verify 0 TypeScript compiler errors.
   - Run `npx biome lint apps/web/src` to verify no new linter errors.
4. Mandatory Git Rule:
   - Commit your changes using semantic commit messages (`fix: route silent async errors to user toasts in apps/web/src`).
   - ZERO tool attribution trailers in commits (no Co-Authored-By, no Generated with...).
5. DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
6. Write your complete handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_1\handoff.md` including terminal command output proof (`npm run typecheck`).
7. Send a message to orchestrator with the path to your handoff report when complete.
