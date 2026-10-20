# BRIEFING — 2026-10-20T02:26:00Z

## Mission
Red Team backend and DB architecture explorer: pinpoint root causes of apps/api compilation failures (sbp, shifts, kkt), audit Drizzle DB schemas for missing indexes (organization_id, created_at, foreign keys), and verify ACID boundaries in Fastify routes.

## 🔒 My Identity
- Archetype: explorer
- Roles: Red Team Backend & DB Architect Investigator
- Working directory: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_backend_crash_db
- Original parent: 47f9f488-23df-448d-9d14-106c107b506b
- Milestone: Investigation and Surgical Remediation Plan

## 🔒 Key Constraints
- Read-only investigation — do NOT modify production code!
- Write exclusively to C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_backend_crash_db\
- Zero-tolerance for `any` or lint suppression (@ts-ignore, @ts-nocheck, eslint-disable)
- Strict typing with @dental/shared and Drizzle ORM
- No heavy global builds or tests locking the host

## Current Parent
- Conversation ID: 47f9f488-23df-448d-9d14-106c107b506b
- Updated: 2026-10-20T02:26:00Z

## Investigation State
- **Explored paths**:
  - `apps/api/src/routes/shifts/index.ts` & `shiftAutoCloseService.ts`
  - `packages/shared/src/fiscal/fiscalValidation/receiptTotalsValidation.ts`
  - `apps/api/src/routes/sbp/types.ts` & `fiscalReceiptService.ts`
  - `apps/api/src/routes/fiscal/receiptRoutes/*`
  - `apps/api/src/services/kkt/FiscalReceiptFactory.ts`
  - `apps/api/src/db/schema/clinical/visitsSchema.ts`
  - `apps/api/src/db/schema/billingModules/billingInvoicesSchema.ts`
  - `apps/api/src/db/schema/billingModules/billingPaymentsAndFiscalSchema.ts`
  - `apps/api/src/db/schema/patientsSchema/patientIndexes.ts`
  - `apps/api/src/db/schema/schedule.ts`
  - `apps/api/src/routes/visits/visitQuickRoutes.ts` & `visitOpenRoutes.ts`
  - `apps/api/src/db/visitsQueryModules/visitScheduleQueries.ts`
  - `apps/api/src/routes/leadsConversion.ts`
  - `apps/api/src/routes/clinicalImplants/installationBillingAndOdontogram.ts`
- **Key findings**:
  1. `shifts/index.ts:51` crashes due to missing `type AutoCloseExpiredShiftsOptions` in import.
  2. 80+ errors in `sbp`, `fiscal`, and `kkt` are caused by typing `CreateFiscalReceiptPayload` as `z.input<...>` instead of `z.infer<...>` (`CreateFiscalReceiptPayloadOutput`).
  3. `visit_diaries` lacks indices on foreign key `doctor_id` and composite `(organization_id, created_at)`.
  4. `patient_invoices` lacks index on foreign key `visit_id` and composite `(organization_id, created_at DESC)`.
  5. `payments` lacks index on foreign key `document_id`.
  6. `visitQuickRoutes` and `visitOpenRoutes` execute multi-step mutations without transaction rollback wrappers, and `openVisitForAppointmentInDb` hardcodes its own transaction without supporting caller `tx`.
- **Unexplored areas**: None for this scope. All compiler errors, DB indexes, and ACID boundaries thoroughly diagnosed.

## Key Decisions Made
- Maintained strict read-only explorer status: zero modifications made to production files.
- Documented precise before-and-after blueprints for all fixes in `handoff.md`.
- Formulated zero-tolerance fix without `any` or lint suppressions.

## Artifact Index
- DISPATCH.md — Initial dispatch log
- BRIEFING.md — Working memory
- progress.md — Heartbeat and step tracking
- tsc_errors.txt — Verbatim tsc compiler log (92 lines)
- handoff.md — Final 5-component report
