# BRIEFING — 2026-09-24T17:46:00Z

## Mission
Unify Recalls schemas and contracts in `@dental/shared`, wire up `recallCandidates.ts` and `patientRecall.ts`, and deduplicate 804n nomenclature seeding in `pricelist.ts` / `settings.ts`.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa
- Working directory: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m1_1
- Original parent: 6d15d988-47c3-4836-97b3-58f3eb0d6502
- Milestone: M1 (Backend Contracts & Anti-Staleness)

## 🔒 Key Constraints
- Single-Compiler Gate: ВОРКЕРАМ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО запускать глобальный tsc, build или typecheck (`npm run typecheck`, `tsc -b --noEmit`, `npm run build`). Проверять синтаксис точечно через single-file юнит-тесты (например `npm test -- apps/api/src/money/patientDebt.test.ts`) или ast-grep.
- File ownership: Write only to:
  * `packages/shared/src/recalls/` (or contracts)
  * `packages/shared/src/index.ts`
  * `apps/api/src/services/patients/recallCandidates.ts`
  * `apps/api/src/routes/patientRecall.ts`
  * `apps/api/src/routes/pricelist.ts`
  * `apps/api/src/routes/settings.ts`
- DO NOT touch files in apps/web!
- No mocks, no // TODO. Full real PostgreSQL 18 / Drizzle typing.
- Integrity Mandate: Zero cheating, genuine implementations, no hardcoded results.

## Current Parent
- Conversation ID: 6d15d988-47c3-4836-97b3-58f3eb0d6502
- Updated: not yet

## Task Summary
- **What to build**:
  1. Export canonical schemas & types for Recalls in `packages/shared/src/` (`recallBandSchema`, `recallCandidateSchema`, `recallReportSchema`, `RecallBand`, `RecallCandidate`, `RecallReport`) from `packages/shared/src/index.ts`.
  2. In `apps/api/src/services/patients/recallCandidates.ts`: use canonical types from `@dental/shared` instead of local duplicates.
  3. In `apps/api/src/routes/patientRecall.ts`: sync Fastify route `GET /api/patients/recall-candidates` with exported Zod schemas and contracts.
  4. In `apps/api/src/routes/pricelist.ts` and `apps/api/src/routes/settings.ts`: deduplicate 804n seeding. `POST /api/pricelist/seed-baseline-804n` is canonical; `settings.ts` endpoint `/catalog-seed-baseline` must delegate/reuse shared logic.
  5. Run isolated test for backend (`npm test -- apps/api/src/money/patientDebt.test.ts`).
  6. Write `handoff.md` and notify parent.
- **Success criteria**: All types aligned, single source of truth, 0 compiler thrashing, tests pass, detailed handoff report.
- **Interface contracts**: PROJECT.md & THE_HAMMER_MASTER_PROMPT.md

## Change Tracker
- **Files modified**: none yet
- **Build status**: pending
- **Pending issues**: none

## Quality Status
- **Build/test result**: pending
- **Lint status**: pending
- **Tests added/modified**: pending

## Loaded Skills
- None explicitly requested beyond standard toolkit.

## Key Decisions Made
- [Initial]: Follow Mandate 8t Single-Compiler Gate strictly.

## Artifact Index
- DISPATCH.md — Assignment instructions
- progress.md — Liveness heartbeat
- handoff.md — Final self-contained handoff report
