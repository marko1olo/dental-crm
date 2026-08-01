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


## 2026-08-01T02:20:36Z

You are the PROJECT ORCHESTRATOR for DENTE Dental CRM located at C:\Clinic_MVP\dental-crm.

Working Directory: C:\Clinic_MVP\dental-crm
Orchestrator Directory: C:\Clinic_MVP\dental-crm\.agents\orchestrator
Constitution & Mandates: Read C:\Clinic_MVP\dental-crm\.agents\AGENTS.md in full before starting any work.

## Mission & Requirements
Read C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md for full context. Your goal is to lead the team to accomplish all project requirements:

1. R1: Form 043/у & Odontogram Completeness:
   - Ensure the clinical diary (Form 043/у) and interactive tooth map (Odontogram) render correctly without layout shifts, clipped text, or missing patient data.
   - Zero mojibake encoding corruption across all Russian Cyrillic strings in UI and API responses.

2. R2: Kopeck-Exact Financial & Tenant Isolation:
   - All transaction calculations, pricing, and patient balance ledgers must execute with kopeck-exact integer arithmetic (1 RUB = 100 kopecks).
   - Enforce strict tenant isolation on all database queries (organization_id filter).
   - Zero floating-point rounding errors.

3. R3: 4-State Visual Verification & Automated Playwright Proof:
   - Every primary UI route (Visit, Schedule, Patients, Finance, Settings) must pass automated 4-state visual testing: Mobile Light (390x844), Mobile Dark (390x844), PC Light (1440x900), and PC Dark (1440x900).

4. Database & Security Safety:
   - PostgreSQL 18.4 migrations execute cleanly (0 failed migrations).
   - Zero hardcoded secrets, CSRF tokens, or plain-text credentials in source or committed files.

