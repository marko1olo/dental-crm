# Execution Plan — DENTE Dental CRM Clinical & Quality Sprint

## Milestone 1: Database & Security Safety (PostgreSQL 18.4 & Secrets & Tenant Isolation)
- Dispatch Explorer (`teamwork_preview_explorer`) to audit:
  1. PostgreSQL 18.4 migrations status (`apps/api/src/db/drizzle/`).
  2. Scan codebase for hardcoded secrets, CSRF tokens, plain-text credentials (`grep_search`).
  3. Verify tenant isolation (`organization_id` filter) across all Fastify routes and database queries in `apps/api/src/`.
- Dispatch Worker (`teamwork_preview_worker`) if fixes needed.
- Dispatch Reviewer (`teamwork_preview_reviewer`) to verify M1 findings.

## Milestone 2: Form 043/у & Odontogram Completeness & UTF-8 Encoding Audit
- Dispatch Explorer (`teamwork_preview_explorer`) to inspect:
  1. Clinical diary (Form 043/у) and Odontogram components in `apps/web/src/` for layout shifts, clipped text, missing data.
  2. Run encoding check script (`npm run check:encoding`) and inspect Cyrillic strings in UI and API responses.
- Dispatch Worker (`teamwork_preview_worker`) if layout fixes or encoding fixes needed.
- Dispatch Reviewer (`teamwork_preview_reviewer`) to verify M2 fixes.

## Milestone 3: Kopeck-Exact Financial Accounting & Ledger Verification
- Dispatch Explorer (`teamwork_preview_explorer`) to audit:
  1. All price/balance calculation logic in backend (`apps/api/src/routes/finance/`, billing modules) and frontend stores/components.
  2. Verify all monetary operations use integer arithmetic (kopecks, 1 RUB = 100 kopecks) with zero floating-point division/rounding.
- Dispatch Worker (`teamwork_preview_worker`) if integer arithmetic refactoring or rounding fixes needed.
- Dispatch Reviewer (`teamwork_preview_reviewer`) to verify M3 financial integrity.

## Milestone 4: 4-State Visual Verification & Automated Playwright Proof Matrix
- Dispatch Worker (`teamwork_preview_worker`) to:
  1. Execute automated Playwright 4-state visual proof generator across Visit, Schedule, Patients, Finance, Settings views (Mobile Light 390x844, Mobile Dark 390x844, PC Light 1440x900, PC Dark 1440x900).
  2. Verify zero empty screens or shift lock screen fallbacks.
  3. Run `npm run typecheck` (0 errors across monorepo) and `npm run check:encoding` (0 errors).
  4. Perform individual per-file git commits per Clinic MVP Constitution.
- Dispatch Reviewer (`teamwork_preview_reviewer`) to review visual proof artifacts and quality gates.

## Milestone 5: Forensic Audit & Sentinel Reporting
- Dispatch Forensic Auditor (`teamwork_preview_auditor`) to verify:
  1. Zero integrity violations, zero mock/fake data, zero hardcoded test bypasses.
  2. Strict tenant isolation & kopeck-exact math verification.
  3. Verified passing build & test outputs.
- Report task completion to Project Sentinel.
