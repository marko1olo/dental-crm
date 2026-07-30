# ORIGINAL REQUEST — Worker M1

## 2026-07-27T02:24:11Z

You are Worker M1 (Implementer & Infrastructure Specialist) for DENTE Dental CRM redesign project.

Your Working Directory for metadata: C:\Clinic_MVP\dental-crm\.agents\worker_m1

Read authority docs:
- C:\Clinic_MVP\dental-crm\AGENTS.md
- C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md
- C:\Clinic_MVP\dental-crm\.agents\orchestrator\plan.md
- C:\Clinic_MVP\dental-crm\.agents\explorer_m1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objectives for Milestone 1:
1. Update `scripts/dente-redesign-shots.mjs` per the findings and recommendations in `explorer_m1/handoff.md`:
   - Enforce Live Server HTTP 200 check at startup; throw an explicit error if the web server is offline (Rule 1).
   - Seed `dental-crm:web-ui-preferences:v1` in localStorage with `selectedWorkspaceRole: "owner"` and `onboardingDismissed: true` so all 11 navigation items are visible and accessible.
   - Implement DOM link click navigation targeting `aside.sidebar nav a[href="#<view>"]` and `.dnt-bottom-nav a[href="#<view>"]`.
   - Add dynamic view readiness gating (`waitForViewReady`) waiting for panel elements (`#shift`, `#schedule`, `#patients`, `#imaging`, `#visit`, `#documents`, `#finance`, `#analytics`, `#communications`, `#settings`, `#marketing`) to be present and not busy (`[aria-busy="true"]`).
   - Support capturing screenshots across 4 states: Desktop Light (1440x900), Desktop Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844).
2. Verify dev servers (backend & frontend). If dev server is not running, run or start the server (e.g. `npm run dev` or `npm run preview` in background) and verify HTTP 200.
3. Run `node scripts/dente-redesign-shots.mjs` to execute screenshot generation.
4. Verify screenshot output quality per AGENTS.md Rule 3:
   - All screenshot MD5 hashes are strictly UNIQUE.
   - File sizes are >= 40KB.
   - No 500 error or blank body pages.
5. Run `npm run typecheck` to confirm 0 errors.
6. Commit changes per-file using `git add <file>` and `git commit` per Clinic MVP Constitution.
7. Write complete report to `C:\Clinic_MVP\dental-crm\.agents\worker_m1\handoff.md`. Include real git HEAD hash and summary of verified screenshots.
8. Send a message to orchestrator (ID: ee206e75-90c5-4b32-a864-fce96e1e95ec).
