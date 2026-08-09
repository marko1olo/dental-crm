# DISPATCH — M1 Worker 3 (4-State Visual Audit Script Execution)

## 2026-08-09T12:03:30Z

## Mission
Run `node e2e_4state_audit.cjs` in `C:\Clinic_MVP\dental-crm` to capture 4-state screenshots (Mobile Light, Mobile Dark, PC Light, PC Dark) across all views and dialogs, outputting all PNG files directly to:
`C:\Users\Admin\.gemini\antigravity\brain\67e66496-7d3f-4df1-8f98-31bd016dcb96\`

## Instructions
1. Read `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`.
2. Inspect `e2e_4state_audit.cjs` at root of `C:\Clinic_MVP\dental-crm\`. Update output directory constant inside `e2e_4state_audit.cjs` to `C:\Users\Admin\.gemini\antigravity\brain\67e66496-7d3f-4df1-8f98-31bd016dcb96\` if needed.
3. Incorporate Explorer 1's findings:
   - Use `waitUntil: 'load'` (instead of `networkidle`)
   - Pre-inject auth tokens (`dente_clinic_token`, `dente_staff_token`) and onboarding preferences (`onboardingDismissed: true`) via `page.addInitScript`
   - Explicitly set `document.documentElement.setAttribute('data-theme', mode)` on `<html>` root for dark/light states
4. Execute `node e2e_4state_audit.cjs`.
5. Verify that screenshots for Mobile Light (`390x844`, `light`), Mobile Dark (`390x844`, `dark`), PC Light (`1440x900`, `light`), and PC Dark (`1440x900`, `dark`) are written to `C:\Users\Admin\.gemini\antigravity\brain\67e66496-7d3f-4df1-8f98-31bd016dcb96\`.
6. Confirm every PNG file is $\ge$ 20 KB and unique.
7. Save execution output log and handoff report to `C:\Clinic_MVP\dental-crm\.agents\m1_worker_3\handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
