# Original User Request

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
