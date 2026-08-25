## 2026-08-16T15:53:50Z
<USER_REQUEST>
You are teamwork_preview_explorer surveying the backend architecture for Dental CRM (DENTE).
Your working directory is: C:/Clinic_MVP/dental-crm/.agents/explorer_survey_backend

Read the following documents and source files thoroughly:
- C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md
- C:/Clinic_MVP/dental-crm/.agents/AGENTS.md
- docs/architecture/SYSTEM_AUDIT_AND_DEBT_SPEC.md
- docs/AgentTasks/TASK_BACKLOG_AND_SPECIFICATIONS.md
- apps/api/src/db/schema.ts and any files in apps/api/src/db/
- apps/api/src/routes/sbpQr.ts, apps/api/src/routes/billing.ts
- apps/api/src/routes/imaging.ts, apps/api/src/routes/smartImports.ts, apps/api/src/routes/diary.ts
- apps/api/src/workers/ (backupWorker.ts, biAnalyticsWorker.ts, recallScheduler.ts)

Your investigation objectives:
1. R1 / TASK-1.3 (Fiscal Print Buffer):
   - Assess current receipt and payment handling in sbpQr.ts and billing.ts.
   - Detail the exact schema requirements for `fiscal_receipt_queue` (fields, states: pending_print, hardware_offline, printed, failed, organizationId, etc.) and migration requirements.
   - Detail how physical KKT timeout handling and GET /api/billing/fiscal-queue/pending and retry dispatch endpoints should be structured.
2. R2 / TASK-2.1 (Drizzle Schema Decomposition):
   - Survey the current `apps/api/src/db/schema.ts` (number of tables, relations, enums).
   - Detail the 10 domain sub-modules under `apps/api/src/db/schema/` (`auth.ts`, `patients.ts`, `schedule.ts`, `billing.ts`, `clinical.ts`, `imaging.ts`, `inventory.ts`, `communications.ts`, `system.ts`) and root re-exports in `apps/api/src/db/schema/index.ts`.
3. R2 / TASK-2.2 (Service Extraction):
   - Analyze `imaging.ts`, `smartImports.ts`, `diary.ts` lines and logic blocks.
   - Detail exact domain service classes to extract under `apps/api/src/services/` (e.g. ImagingService, SmartImportService, ClinicalDiaryService).
4. R2 / TASK-2.3 (PostgreSQL Background Jobs Queue):
   - Analyze current workers (`backupWorker.ts`, `biAnalyticsWorker.ts`, `recallScheduler.ts`).
   - Detail the `system_background_jobs` table schema and the `SELECT ... FOR UPDATE SKIP LOCKED` locking mechanism.

Write your findings to `C:/Clinic_MVP/dental-crm/.agents/explorer_survey_backend/analysis.md` and `C:/Clinic_MVP/dental-crm/.agents/explorer_survey_backend/handoff.md`.
Send a message when done with summary and path.
Do not modify any source code.
</USER_REQUEST>
