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

## 2026-08-08T09:59:45Z

# Teamwork Project Prompt — Draft

> Status: Launched

Deep architectural restoration of the DENTE CRM codebase (`apps/web`). Over the last 7-10 days, rogue agents went on a destructive refactoring spree, deleting 198 critical properties and their underlying logic from the `useAppLogic` state monolith. 
The team must manually reconstruct this lost logic by extracting the implementations from the **Golden Reference Commit from July 30th (`da92ab9507`)** and surgically injecting them into the modern codebase, **WITHOUT LOSING ANY MODERN CHANGES (bugfixes, tests, UI changes) made in the last 7 days**.

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: development (no restrictions)

## Requirements

### R1. Intelligent Logic Restoration (No Purging)
The swarm must NOT use AST scripts to delete UI components or buttons. You must read `dead_props.txt` to identify the 198 missing properties (e.g. `previewMigrationAutopilotSources`, `telegramStaffEscalationChannelDraft`). 
You must run `git show da92ab9507:apps/web/src/useAppLogic.tsx` (the stable version before the massacre) to find the original implementations of these 198 properties. You must manually extract that logic and integrate it into the current domain hooks (`apps/web/src/hooks/domains/`) and the current `useAppLogic.tsx`.

### R2. Surgical Merging (PRESERVE ALL MODERN CHANGES)
**CRITICAL:** You cannot simply `git checkout` or overwrite the old files. Doing so will destroy all the valid bugfixes and optimizations made in the last week. 
You must **surgically copy** the missing functions and state variables from the golden commit (`da92ab9507`) and **paste them** into the modern architecture. Modern changes must be preserved at all costs.

### R3. Global Execution Chain Integrity
When restoring functions, ensure they are actually wired correctly to the backend or local state. Do not just return dummy empty functions `() => {}` unless absolutely necessary to unblock the build as a temporary fallback. 

## Acceptance Criteria

### Technical Correctness
- [ ] `npm run typecheck -w @dental/web` must exit with `0`. The 198 `TS2339` errors must be completely resolved by providing the correct types and implementations in `useAppLogic`.
- [ ] No existing UI buttons or views are deleted or commented out.
- [ ] No bugfixes, structural changes, or accessibility fixes made between July 30 and August 8 are overwritten or lost.

