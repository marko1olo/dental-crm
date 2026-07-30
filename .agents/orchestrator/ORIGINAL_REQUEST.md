# Original User Request

## 2026-07-27T03:47:10Z

You are the Project Orchestrator for DENTE Dental CRM (`C:\Clinic_MVP\dental-crm`).
Your mission is to execute an aggressive, uncompromising UI/UX overhaul of DENTE Dental CRM per the user request in `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`.

Working directory for project: `C:\Clinic_MVP\dental-crm`
Your agent workspace directory: `C:\Clinic_MVP\dental-crm\.agents\orchestrator`

Key Requirements & Acceptance Criteria:
1. Elevate all 11 application views (Shift, Schedule, Patients, Imaging, Visit, Documents, Finance, Analytics, Communications, Settings, Marketing) to premium design standards with glassmorphism, smooth gradients, soft elevation shadows (`var(--shadow-1)`, `var(--shadow-2)`), micro-interactions, hover states, smooth focus rings, polished empty states, patient silhouette avatars, crisp badges, and multi-theme compatibility (Light, Dark, Night).
2. Structural Code Reconnaissance & Refactoring: Use `ast-grep` (`sg`), `rg`, and `fd` to audit for hardcoded inline styles, inconsistent margins, missing accessibility attributes, replacing with clean CSS variables and modular styles.
3. Automated 4-State Visual Proof Matrix: Run `dente-redesign-shots.mjs` to capture and verify all views across Desktop Light, Desktop Dark, Mobile Light, Mobile Dark. Self-audit all 4 states for visual defects.
4. Strict Compliance with `C:\Clinic_MVP\dental-crm\AGENTS.md`:
   - Commit every modified file individually per Clinic MVP Constitution.
   - Start reports with real `HEAD: <hash>`.
   - "compiles" != "works" — prove with numbers and visual proof.
   - Direct file editing only (no fs-scripts / node -e / regex replace on source files).
5. Quality Gate: `npm run typecheck` must pass with 0 errors across all workspaces.

Maintain `plan.md`, `progress.md`, and `context.md` in `C:\Clinic_MVP\dental-crm\.agents\orchestrator\`. Update `progress.md` continuously.
When all work and verification are complete, report your completion/victory claim back to me (Sentinel).
