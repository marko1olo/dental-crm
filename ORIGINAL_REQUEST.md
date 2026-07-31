# Original User Request

## 2026-07-27T00:09:13Z

Execute a comprehensive UI unification and cohesion overhaul across all 11 modules of DENTE Dental CRM (`C:\Clinic_MVP\dental-crm`).

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: `development`

## Requirements

### R1. Cohesive UI Design System Unification
Unify all visual elements across all 11 views (Shift, Schedule, Patients, Imaging, Visit, Documents, Finance, Analytics, Communications, Settings, Marketing):
- Standardize card border-radii (`14px`), container paddings, typography scales (`Golos Text`), and elevation shadow depths.
- Harmonize button variants (Primary teal gradient, Secondary soft border, Ghost text) and status badges (`status-pill`) across all views.
- Ensure 100% theme consistency across Light, Dark, and Night modes without raw color mismatches.

### R2. Structural Inline Style Cleanup & Responsive Refactoring
Audit and refactor all view components to replace ad-hoc inline styles with unified CSS classes from `dente-redesign.css` and `main.css`. Ensure clean responsive flex/grid layouts without horizontal scrolling or text clipping on mobile (390px) and desktop (1440px).

### R3. Quality & Verification Gates
- Verify zero TypeScript errors (`npm run typecheck`).
- Execute `dente-redesign-shots.mjs` to capture 4-state visual proof (Desktop/Mobile x Light/Dark).
- Commit every modified file individually per Clinic MVP Constitution.

## Acceptance Criteria

### Verification
- [ ] `npm run typecheck` passes with 0 errors.
- [ ] All 11 views demonstrate a cohesive, unified visual language.
- [ ] 4-state visual proof matrix generated and self-audited.

## 2026-07-31T12:21:20Z

Full clinical and UI mounting sprint for Dental CRM (`C:\Clinic_MVP\dental-crm`) to bridge backend API capabilities with React web UI views, seed realistic clinical data, and verify visual quality across 4 layout/theme states.

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: development

## Requirements

### R1. UI Feature Mounting & Workflow Integration
Integrate unmounted backend query modules and Fastify routes into the React web client (`apps/web/src/`):
- Mount "Потерянные пациенты" (Lost Patients Filter from `lostPatientsFiltersQuery.ts`) in `AnalyticsDashboardView.tsx` and `PatientsView.tsx`.
- Mount No-Show Risk Indicator (`patientNoShowRiskQuery.ts`) badges on appointment cards in `ScheduleView.tsx`.
- Ensure zero broken/unmounted routes or dead-end buttons.

### R2. Clinical Seed Expansion & Realistic Demo Data
Expand base seed dataset in `apps/api/.data/dental-crm-state.json` and `seedOpsScreenshotDemo.ts`:
- Include at least 15 patients with full administrative profiles (Passport, SNILS, OMS/DMS).
- Seed completed EMK visits with objective findings and tooth formula statuses (teeth 11–48 crowns, fillings, missing teeth).
- Seed completed works acts, 54-FZ fiscal receipts, NDFL certificates (КНД 1151156 XML), and EGISZ CDA XML snapshots.

### R3. Automated Visual Proof & 4-State Verification
Verify UI quality and theme responsiveness using Playwright/CDP screenshot tools (`scripts/ops-panels-shots.mjs`):
- Fix session token re-hydration during theme changes to prevent shift lock screen fallbacks.
- Capture 4-state visual proof (PC Light, PC Dark, Mobile Light, Mobile Dark) without any `_ПУСТО.png` diagnostic screens.

### R4. Compilation, Encoding & Code Quality Gates
Enforce strict repository quality gates prior to commit:
- `npm run check:encoding` must pass with 0 encoding/mojibake errors.
- `npm run typecheck` must pass with 0 TypeScript compiler errors across all monorepo packages (`@dental/shared`, `@dental/api`, `@dental/web`).

## Acceptance Criteria

### Quality & Build Invariants
- [ ] `npm run check:encoding` passes with 0 errors across all codebase files.
- [ ] `npm run typecheck` passes cleanly with 0 TypeScript errors across `@dental/shared`, `@dental/api`, and `@dental/web`.
- [ ] `node scripts/ops-panels-shots.mjs` generates complete, non-empty screenshot panels without falling back to shift lock screens or diagnostic `_ПУСТО.png` placeholders.
- [ ] All 4 layout/theme states (PC Light, PC Dark, Mobile Light, Mobile Dark) are verified with clean visual rendering.
- [ ] All changes are committed to git with proper conventional commit messages and zero tool attributions.

