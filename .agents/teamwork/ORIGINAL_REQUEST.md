# Original User Request

## 2026-09-24T17:31:44Z

«Читайте документ по такому адресу: 
C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md
целиком от первого до последнего символа перед началом любых действий. Никаких домыслов, никаких правок в конституцию, никакой самодеятельности.»

# Teamwork Project Prompt

Comprehensive campaign to eliminate architectural staleness across neglected domains in DENTE CRM: synchronize backend API contracts (patient debt, recalls, statutory pricing), revitalize patient retention pipelines (recalls 6-month engine, lead conversion), and harden statutory compliance (EGISZ CDA XML and electronic prescriptions).

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

## Requirements

### R1. Backend API & Contract Synchronization (Anti-Staleness)
Audit and synchronize outdated backend services and API routes (`apps/api/src/money/patientDebt.ts`, `apps/api/src/routes/patientRecall.ts`, `apps/api/src/routes/pricelist.ts`) with modern Drizzle schemas and frontend contracts (`packages/shared`), guaranteeing authentic PostgreSQL 18 persistence without mock data fallbacks.

### R2. CRM Core & Patient Retention Revitalization (Recalls & Leads)
Harden the patient recall engine (`apps/web/src/components/recalls/`) and lead intake pipeline (`apps/web/src/components/leads/`):
- Automated identification of patients overdue for preventive sanitation (>= 6 months since last completed appointment) with 1-click contact generation;
- Non-blocking lead conversion to appointment without mandatory bureaucratic fields, ensuring seamless 1-click scheduling per Doctor & Admin Autonomy (Mandates 8e, 8n).

### R3. Statutory & Regulatory Assurance (EGISZ & Prescriptions)
Harden the EGISZ and statutory prescription pipelines:
- EGISZ export engine (`apps/web/src/components/egisz/`) must generate structurally valid CDA R2 XML records according to Russian Ministry of Health REMD specifications without schema violations;
- Electronic prescriptions (`apps/web/src/components/prescriptions/`) must conform to Order 1094n statutory fields with offline validation and printable QR encoding.

### R4. Single-Compiler Gate & Quality Assurance
The campaign must maintain complete codebase integrity:
- Single-Compiler Gate sequentially verified (`npm run typecheck -w @dental/web` and `npm run typecheck -w @dental/api` passing cleanly);
- 4-State visual proof captured via Playwright Chromium (Desktop Light, Desktop Dark, Mobile Light, Mobile Dark) for any touched UI screens;
- Zero regressions in encoding (`npm run check:encoding` passing 5050+ files).

## Acceptance Criteria

### Backend Contract & Persistence
- [ ] API endpoints for patient debt calculation, recalls, and statutory services return HTTP 200/201 with verified PostgreSQL database records.
- [ ] No hardcoded mock patient or financial objects exist in backend production routes.

### Clinical & CRM Ergonomics
- [ ] Overdue recall list renders cleanly with accurate patient categorization and 1-click reminder dispatching.
- [ ] Lead conversion flow creates a real appointment in `ScheduleView` in <= 2 clicks without modal lockups.
- [ ] 7 Deadly Sins of UI respected: max 1 row toolbar (32–36px), <= 2 primary action buttons per card, 0 cartoon emojis in medical forms.

### Statutory Validity
- [ ] Generated EGISZ CDA R2 XML validates against Ministry of Health schematron rules without fatal errors.
- [ ] Prescription printouts match standard forms (107-1/у) with required legal requisites.

### Machine Verification
- [ ] Automated unit test suites for all 3 updated modules pass cleanly (Exit Code 0).
- [ ] Single-Compiler Gate passes with 0 new TypeScript errors.
- [ ] 4-State visual screenshots verified for all modified UI views.

## 2026-09-24T19:08:50Z

Продолжай выполнение Milestone 4. Проверь результат Single-Compiler Gate (typecheck @dental/web), зафиксируй атомарные коммиты для M1, M2, M3, M4 и пришли итоговый рапорт по Конституции.

