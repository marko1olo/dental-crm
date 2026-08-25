# Orchestrator Dispatch Context — 2026-08-21T04:05:00Z

## Request
Продолжаем глубокую работу без остановки (/teamwork-preview). Проведи сквозной аудит медицинских форм: карточка пациента, история болезней, интеграция одонтограммы с печатью справки 043/у и выгрузкой в ЕГИСЗ. Проверь надежность бекенда, транзакционность при записи пациентов и планов лечения. 100% честность, 0 моков.

## Scope of Work
1. **Medical Forms & Form 043/u Print & EMR Synchronization**:
   - Patient Card (`PatientCard.tsx`, `PatientOverviewTab.tsx`, `PatientHistoryTab.tsx`).
   - Medical history & SOAP visit chronology synchronization with odontogram state changes.
   - Form 043/u print certificate generation (`renderDocument.ts`, `clinicalHtmlRenderers.ts`, `clinicalProtocols043.ts`) with official GOST R 7.0.97-2016 requisites and Order 804n / ICD-10 diagnostics.
   - EGISZ CDA R2 / SEMD 108 export engine (`egiszCdaGenerator.ts`, `egiszOiisGateway.ts`) with accurate OIDs and validation.
2. **Backend Reliability & Concurrency/Transactions**:
   - Patient booking transactions in API (`apps/api/src/routes/` and database queries).
   - Treatment plan mutations and appointment scheduling concurrency guards.
   - Multi-write transaction safety (`db.transaction`).
3. **Static & Runtime Quality Gates**:
   - `npm run check:encoding`
   - `node scripts/check-css-tokens.mjs`
   - `npm run typecheck` across all packages (`@dental/shared`, `@dental/api`, `@dental/web`)
   - `npm test -w @dental/shared`, `npm test -w @dental/api`, `npm test -w @dental/web`
