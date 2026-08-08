# Project: DENTE CRM Architectural Hardening & God-Object Dismantling

## Architecture
- Frontend Client: `apps/web` (React 19, Vite 6, Tailwind CSS v4, hash-based routing).
- Monorepo Packages: `@dental/web` (SPA client), `@dental/api` (Fastify server, PostgreSQL 18, Drizzle ORM), `@dental/shared` (Zod schemas, types).
- Utilities Refactoring Architecture: Extract domain logic from monolithic `apps/web/src/AppHelpers.tsx` (8,078 lines) into modular domain utilities under `apps/web/src/utils/`, maintaining 100% backwards compatibility via `AppHelpers.tsx` as a barrel re-export.
- E2E Verification Infra: Playwright test suite (`apps/web/tests/e2e/smoke.spec.ts`) + standalone CDP visual screenshot audit (`scripts/dente-redesign-shots.mjs`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Playwright E2E Setup & Auth Injection | Launch Playwright, inject `dente_clinic_token` & `dente_staff_token`, test login & load | M1 | R1 |
| 2 | Panel Navigation & Error Boundary Check | Navigate `#schedule`, `#patients`, `#finance`, check console logs & Error Boundary exceptions | M1 | R1 |
| 3 | Visual Screenshot Matrix Capture | Capture 4-state visual proof (PC Light, PC Dark, Mobile Light, Mobile Dark) | M1 | R1 |
| 4 | Paranoid Symbols Census | Run ripgrep & ast-grep census on all 517 exported symbols of `AppHelpers.tsx` | M2 | R2 |
| 5 | Execution Chain Verification | Map usages of Top 7 God-symbols and identify 161 orphaned exports | M2 | R2 |
| 6 | Modular Domain Schema & Barrel Blueprint | Define contracts and module boundaries for 9 domain utility files in `apps/web/src/utils/` | M2 | R2 & R3 |
| 7 | Incremental AppHelpers Extraction | Extract Finance, Auth, DateTime, Telegram, Patient, Clinic, UI Message, Format, and Document utilities | M3 | R3 |
| 8 | Barrel Re-Export & Backward Compatibility | Wire `AppHelpers.tsx` as barrel re-exporter so existing imports continue working without breaking changes | M3 | R3 |
| 9 | Circular Dependency Eradication | Audit circular dependencies with `npx madge --circular apps/web/src/main.tsx`, ensuring 0 cycles | M4 | R4 |
| 10| Full System Typecheck & Quality Gates | Execute `npm run typecheck -w @dental/web` and `npm run check:encoding` with zero errors | M4 | R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | E2E Browser Verification & Screenshot Matrix | Run Playwright E2E smoke tests, navigate Schedule/Patients/Finance, capture screenshots, intercept console/page errors | None | IN_PROGRESS |
| M2 | Codebase Census & Utility Schema Definition | Execute paranoid `rg` and `ast-grep` census across `apps/web/src`, verify call stacks, map domain boundaries | M1 | PLANNED |
| M3 | Modular Extraction of AppHelpers.tsx | Surgically extract 8,078-line `AppHelpers.tsx` into 9 `/utils/` domain modules with barrel re-exports; verify typecheck after every file move | M2 | PLANNED |
| M4 | Zero AI Optimism & Circular Dependency Audit | Validate `npx madge --circular apps/web/src/main.tsx`, execute full monorepo typecheck, Playwright re-runs, and Forensic Audit | M3 | PLANNED |

## Interface Contracts

### 1. `apps/web/src/utils/auth/authHelpers.ts`
- `auth`: constant authorization state object / helper functions.

### 2. `apps/web/src/utils/finance/moneyUtils.ts`
- `money(value: number | string | null | undefined): string` (kopeck-exact ruble formatting).
- Additional finance helpers (`parseRubleAmount`, `formatKopecks`, etc.).

### 3. `apps/web/src/utils/datetime/dateUtils.ts`
- Date, time, ISO formatting, clinic schedule slot calculations.

### 4. `apps/web/src/utils/telegram/telegramUtils.ts`
- Telegram staff escalation, notification payload formatters.

### 5. `apps/web/src/utils/clinic/clinicProfileUtils.ts`
- Clinic info, staff profile, license & address helpers.

### 6. `apps/web/src/utils/patient/patientUtils.ts`
- `patientName(patient: any): string` (first, last, middle name formatting).
- Anamnesis, OMS/DMS, Form 043/у helper functions.

### 7. `apps/web/src/utils/ui/uiMessageUtils.ts`
- `responseErrorMessage(err: unknown): string`.
- `operatorWorkflowFailureMessage(reason: string): string`.

### 8. `apps/web/src/utils/format/formatUtils.ts`
- General text, phone number, passport, SNILS string formatters.

### 9. `apps/web/src/utils/document/documentUtils.ts`
- `documentTextLines(...)`, `confirmedDocumentLiteral(...)`.
- EMK acts, fiscal receipts, NDFL certificates text generation.

### Barrel File: `apps/web/src/AppHelpers.tsx`
- Re-exports all exported symbols from the 9 utility modules above to ensure 100% backward compatibility for existing imports (`import { ... } from './AppHelpers'`).

## Code Layout
```
apps/web/src/
├── AppHelpers.tsx                # Barrel file re-exporting from utils/
├── main.tsx                      # SPA Entry Point
├── components/                   # UI View Components
└── utils/                        # Extracted Domain Utility Modules
    ├── auth/authHelpers.ts
    ├── finance/moneyUtils.ts
    ├── datetime/dateUtils.ts
    ├── telegram/telegramUtils.ts
    ├── clinic/clinicProfileUtils.ts
    ├── patient/patientUtils.ts
    ├── ui/uiMessageUtils.ts
    ├── format/formatUtils.ts
    └── document/documentUtils.ts
```
