# Project: DENTE Dental CRM Clinical Mounting & 4-State Verification Sprint

## Architecture
- **Frontend**: React monorepo client (`apps/web/src`) styled with CSS modules / variables / theme tokens (Light, Dark, Night).
- **Backend API**: Fastify API (`apps/api`) with file-backed JSON store (`apps/api/.data/dental-crm-state.json`) and seed scripts (`seedOpsScreenshotDemo.ts`).
- **Shared Package**: `@dental/shared` containing queries, types, XML generators (NDFL КНД 1151156, EGISZ CDA).
- **Visual Testing Matrix**: `scripts/ops-panels-shots.mjs` generating 4-state matrix (PC Light, PC Dark, Mobile Light, Mobile Dark).

## Code Layout
- `apps/web/src/views/` — `AnalyticsDashboardView.tsx`, `PatientsView.tsx`, `ScheduleView.tsx`, `AppointmentCard.tsx`.
- `apps/api/.data/` — `dental-crm-state.json` (state database).
- `apps/api/src/scripts/seedOpsScreenshotDemo.ts` — Demo state seeder.
- `scripts/ops-panels-shots.mjs` — Playwright/CDP screenshot verification script.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Reconnaissance & Architecture Audit | Audit R1 queries, R2 seed format, R3 session token flow in theme changes, and R4 build tools. | None | DONE |
| 2 | R1 UI Feature Mounting | Mount lost patients filter in Analytics & Patients views, mount no-show risk badges on ScheduleView, ensure zero broken routes. | M1 | IN_PROGRESS |
| 3 | R2 Clinical Seed Data Expansion | Expand `dental-crm-state.json` & `seedOpsScreenshotDemo.ts` to >=15 full patient profiles (Passport, SNILS, OMS/DMS), completed EMK visits, tooth formula 11-48, acts, 54-FZ receipts, NDFL КНД 1151156 XML, EGISZ CDA XML. | M1 | PLANNED |
| 4 | R3 & R4 Visual Proof & Quality Gates | Fix session token re-hydration on theme toggle, run `ops-panels-shots.mjs` for 4-state proof, pass `npm run check:encoding` and `npm run typecheck`, perform per-file git commits. | M2, M3 | PLANNED |

## Interface Contracts
- `PatientsView.tsx`: Toolbar button toggling `showLostPatientsOnly` filtering `displayPatients`.
- `AnalyticsDashboardView.tsx`: Lost Patients summary card querying `/api/analytics/lost-patients-filters` and navigating to PatientsView with lost patients filter.
- `ScheduleView.tsx` / `AppointmentCard.tsx`: Risk chip (`high` -> red, `medium` -> amber, `low` -> green) mounted on appointment cards.
- `apps/api/.data/dental-crm-state.json` & `seedOpsScreenshotDemo.ts`: 15+ patients with full administrative profiles (Passport, SNILS, OMS/DMS), completed EMK visits with objective findings and tooth formula 11-48 statuses, completed works acts, 54-FZ receipts, NDFL КНД 1151156 XML certificates, EGISZ CDA XML snapshots.
- `App.tsx` & `scripts/ops-panels-shots.mjs`: Session token re-hydration on theme toggles preventing shift lock screen fallbacks and `_ПУСТО.png` diagnostic screens.
