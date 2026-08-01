# Original User Request

## 2026-07-31T22:19:51Z

DENTE Dental CRM is a high-performance clinical management platform for dentistry. Your agent swarm will autonomously audit database integrity, complete Form 043/у visual styling, enforce kopeck-exact financial accounting, and verify 4-state UI responsiveness (Mobile Light, Mobile Dark, PC Light, PC Dark).

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: demo

## Requirements

### R1. Form 043/у & Odontogram Completeness
The clinical diary (Form 043/у) and interactive tooth map (Odontogram) must render correctly without layout shifts, clipped text, or missing patient data.

### R2. Kopeck-Exact Financial & Tenant Isolation
All transaction calculations, pricing, and patient balance ledgers must execute with kopeck-exact integer arithmetic (1 RUB = 100 kopecks), strict tenant isolation, and zero floating-point rounding errors.

### R3. 4-State Visual Verification & Automated Playwright Proof
Every primary UI route (Visit, Schedule, Patients, Finance, Settings) must pass automated 4-state visual testing: Mobile Light (390x844), Mobile Dark (390x844), PC Light (1440x900), and PC Dark (1440x900).

## Acceptance Criteria

### Clinical & UI Integrity
- Form 043/у renders with complete patient anamnesis, treatment history, and active odontogram state.
- Zero mojibake encoding corruption across all Russian Cyrillic strings in UI and API responses.
- All 4 visual states (Mobile Light/Dark, PC Light/Dark) generate crisp, non-overlapping screenshots.

### Database & Security Safety
- PostgreSQL 18.4 migrations execute cleanly (0 failed migrations).
- All database queries enforce strict tenant/organization isolation (organization_id filter).
- Zero hardcoded secrets, CSRF tokens, or plain-text credentials in source or committed files.
