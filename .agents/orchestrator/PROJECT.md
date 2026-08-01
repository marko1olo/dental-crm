# Project: DENTE Dental CRM Quality, Security & Visual Proof Sprint

## Architecture
- **Frontend**: React monorepo client (`apps/web/src`) styled with CSS modules / variables / theme tokens (Light, Dark, Night).
- **Backend API**: Fastify API (`apps/api`) with Drizzle ORM over native PostgreSQL 18 at `127.0.0.1:5432` (`pg.Pool`).
- **Shared Package**: `@dental/shared` containing queries, types, financial logic (`money.ts`), XML generators.
- **Visual Testing Matrix**: Playwright/CDP screenshot tools (`scripts/dente-redesign-shots.mjs` / `scripts/ops-panels-shots.mjs`) generating 4-state matrix (PC Light, PC Dark, Mobile Light, Mobile Dark).

## Code Layout
- `apps/api/src/db/` — Drizzle ORM schema (`schema.ts`), migrations (`drizzle/`), db connection.
- `apps/api/src/routes/` — Fastify API endpoints (finance, patients, visits, documents, etc.).
- `apps/web/src/views/` — `VisitView.tsx` (Form 043/у & Odontogram), `ScheduleView.tsx`, `PatientsView.tsx`, `FinanceView.tsx`, `SettingsView.tsx`.
- `apps/web/src/components/` — `OdontogramModule.tsx`, `VisitDiaryEditor.tsx`, financial ledgers, settings tabs.
- `scripts/dente-redesign-shots.mjs` — Automated 4-state visual testing runner.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Database & Security Safety Audit | Verify PostgreSQL 18.4 clean migrations, zero secrets/CSRF tokens/plain-text credentials, strict tenant isolation (`organization_id` filter). | None | DONE |
| 2 | Form 043/у & Odontogram Completeness | Fix clinical diary layout shifts, clipped text, missing data, verify zero Cyrillic mojibake. | None | DONE |
| 3 | Kopeck-Exact Financial Accounting | Ensure integer arithmetic (1 RUB = 100 kopecks) across all pricing, ledgers, and transaction endpoints; zero float ops. | None | DONE |
| 4 | 4-State Visual Proof Matrix | Run Playwright 4-state visual proof across Visit, Schedule, Patients, Finance, Settings routes; pass `typecheck` and `check:encoding`. | M1, M2, M3 | IN_PROGRESS |
| 5 | Forensic Audit & Sentinel Report | Run independent forensic audit (`teamwork_preview_auditor`) for integrity, commit per-file, report to Sentinel. | M4 | PLANNED |

## Interface Contracts
- `apps/api/src/db/schema.ts`: `organization_id` column enforced on all tenant-specific tables with non-null foreign keys / filters.
- Financial arithmetic: All money fields stored and processed in kopecks (`packages/shared/src/utils/money.ts`). Zero `float` or JS float division for currency.
- `Form 043/у` & `Odontogram`: Complete patient anamnesis, objective data, tooth formula 11–48 rendered with proper Tailwind/CSS flex-grid responsive styling without text truncation or layout shifts.
- 4-State Matrix: Visual screenshots output for 5 primary routes x 4 states (Mobile Light, Mobile Dark, PC Light, PC Dark) in workspace artifacts directory.
