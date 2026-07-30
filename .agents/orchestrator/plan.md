# Implementation Plan — DENTE Dental CRM UI/UX Overhaul

## Phase 1: Reconnaissance & Design System Audit (Milestone 1)
- Dispatch `teamwork_preview_explorer` to scan codebase using `ast-grep`, `rg`, `fd`.
- Identify all hardcoded inline styles, hardcoded colors, missing accessibility attributes, empty states, avatar components, shadow usages across the 11 views.
- Define missing CSS design tokens (glassmorphism, `var(--shadow-1)`, `var(--shadow-2)`, focus rings, badges, silhouette avatars, empty state styling).

## Phase 2: View Batch A UI/UX Overhaul (Milestone 2)
- Dispatch `teamwork_preview_worker` to refactor Shift, Schedule, Patients, Visit, Imaging.
- Upgrade to glassmorphism, soft gradients, hover states, micro-interactions, accessibility attributes, multi-theme variables.
- Commit each modified file individually.
- Dispatch `teamwork_preview_reviewer` to review changes.

## Phase 3: View Batch B UI/UX Overhaul (Milestone 3)
- Dispatch `teamwork_preview_worker` to refactor Documents, Finance, Analytics, Communications, Settings, Marketing.
- Apply glassmorphism cards, shadows, badges, silhouette avatars, focus rings, multi-theme variables.
- Commit each modified file individually.
- Dispatch `teamwork_preview_reviewer` to review changes.

## Phase 4: Visual Proof Matrix & Final Verification (Milestone 4)
- Dispatch `teamwork_preview_worker` / `teamwork_preview_challenger` to run `dente-redesign-shots.mjs` and execute `npm run typecheck`.
- Perform 4-state visual inspection across Desktop Light, Desktop Dark, Mobile Light, Mobile Dark.
- Ensure all files are individually committed and report `HEAD: <hash>` with test and typecheck results.
