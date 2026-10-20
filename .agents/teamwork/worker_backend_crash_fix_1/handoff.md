# Handoff Report: Backend TypeScript Compilation Crash Remediation, PostgreSQL 18 Indexes & Fastify ACID Transactions

**Agent:** `worker_backend_crash_fix_1`  
**Parent / Caller:** `47f9f488-23df-448d-9d14-106c107b506b`  
**Roles:** Implementer, QA, Specialist  
**Working Directory:** `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_backend_crash_fix_1`  
**Date:** 2026-10-20  

---

## 1. Observation

### A. Initial Compiler State
Initial run of `npx tsc -p apps/api/tsconfig.json --noEmit` yielded 92 compiler errors across `apps/api`:
1. `apps/api/src/routes/shifts/index.ts:51`: `error TS2304: Cannot find name 'AutoCloseExpiredShiftsOptions'`.
2. `apps/api/src/routes/sbp/fiscalReceiptService.ts` and `apps/api/src/routes/fiscal/receiptRoutes/*`:
   - `error TS2339: Property 'trim' does not exist on type '{}'` on `clientMutationId`.
   - `error TS18048: 'input.sbpKopecks' / 'input.electronicCardKopecks' is possibly 'undefined'`.
   - `error TS18048: 'item.quantity' is possibly 'undefined'`.
   - `error TS2345: Argument of type '... | undefined' is not assignable to parameter of type 'Tag1054OperationType'` / `Ffd12TaxationSystem`.
3. `apps/api/src/services/kkt/FiscalReceiptFactory.ts`:
   - Property `quantity` incompatibility: `number | undefined` rejected where `number` required.
   - Non-nullable enum parameters in helper resolvers (`resolveTag1054`, `resolveTag1055`, `resolveTag1212`, `resolveTag1214`, `resolveTag1199`, `resolveTag2108`).
   - String normalization rejecting `undefined` or `{}` for `cashierInn`, `customerInn`, `customerName`.
4. `apps/api/src/routes/portal/index.ts:33`: `error TS2554: Expected 2 arguments, but got 1` calling `registerPortalMockStorageRoutes(server)`.

### B. Database Schema & Index Observations
1. `visit_diaries` (`apps/api/src/db/schema/clinical/visitsSchema.ts`):
   - Table lacked indexes on `doctor_id` foreign key, compound index on `(organization_id, created_at)`, and tenant composite index `(organization_id, visit_id)`.
2. `patient_invoices` (`apps/api/src/db/schema/billingModules/billingInvoicesSchema.ts`):
   - Table lacked an index on foreign key `visit_id` (frequently joined in billing and clinical odontogram modules) and compound sorting index `(organization_id, created_at DESC)`.
3. `payments` (`apps/api/src/db/schema/billingModules/billingPaymentsAndFiscalSchema.ts`):
   - Column `document_id` referencing `accounting_documents` lacked an index.

### C. Fastify ACID Boundaries Observations
1. In `apps/api/src/routes/visits/visitQuickRoutes.ts`:
   - `createPatientInDb`, `createAppointmentInDb`, and `openVisitForAppointmentInDb` ran as uncoordinated sequential operations outside an overarching transaction. An error during appointment booking (such as `CHAIR_OVERBOOKING_COLLISION`) created orphan patients in the database.
2. In `apps/api/src/routes/visits/visitOpenRoutes.ts`:
   - `openVisitForAppointmentInDb` executed in its own internal transaction, followed by `database.update(appointments)` in a separate operation. A disconnect or failure left the visit created while the appointment remained in `planned` status.
3. In `apps/api/src/db/visitsQueryModules/visitScheduleQueries.ts`:
   - `openVisitForAppointmentInDb` hardcoded `db.transaction(...)` and did not accept an optional outer transaction executor, preventing callers from nesting it into multi-table atomic workflows.

---

## 2. Logic Chain

1. **Missing Type Import Fix**:
   - `apps/api/src/routes/shifts/shiftAutoCloseService.ts` exports `interface AutoCloseExpiredShiftsOptions`.
   - Adding `type AutoCloseExpiredShiftsOptions` to the import list in `apps/api/src/routes/shifts/index.ts` resolved `TS2304` directly.

2. **Fiscal & SBP Type Alignment**:
   - In `packages/shared`, `createFiscalReceiptPayloadSchema` contains `.preprocess(...)` for strings and `.default(...)` for amounts and enums.
   - Using `z.input<...>` in `routes/sbp/types.ts` typed preprocessed fields as `{}` and defaulted fields as `T | undefined`.
   - Changing `CreateFiscalReceiptPayloadInput` to `z.infer<typeof createFiscalReceiptPayloadSchema>` in `apps/api/src/routes/sbp/types.ts` and adopting `CreateFiscalReceiptPayloadOutput` in `receiptFfdValidator.ts`, `receiptKktSender.ts`, and `receiptDraftHandlers.ts` provided strictly typed objects for validated request bodies.
   - In `FiscalReceiptFactory.ts`, method signatures for `resolveTag1054`, `resolveTag1055`, `resolveTag1212`, `resolveTag1214`, `resolveTag1199`, and `resolveTag2108` were updated to accept optional arguments with standard fallback values, and string fields (`cashierInn`, `customerInn`, `customerName`, `customerContact`) were safely normalized with `typeof x === "string"` checks.
   - In `portalMockStorageRoutes.ts`, changing `export const registerPortalMockStorageRoutes: FastifyPluginAsync = ...` to standard Fastify route group function `export async function registerPortalMockStorageRoutes(server: FastifyInstance): Promise<void>` eliminated `TS2554`.

3. **PostgreSQL 18 Index Hardening**:
   - In `visitDiaries`, added `doctorIdIdx` on `doctorId`, `orgCreatedAtIdx` on `(organizationId, createdAt)`, and `orgVisitIdx` on `(organizationId, visitId)`.
   - In `patientInvoices`, added `visitIdIdx` on `visitId` and `orgCreatedAtDescIdx` on `(organizationId, createdAt)`.
   - In `payments`, added `documentIdIdx` on `documentId`.

4. **ACID Transaction Boundary Encapsulation**:
   - In `visitScheduleQueries.ts`, introduced `DbClientOrTransaction` type (`typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]`) and updated `openVisitForAppointmentInDb` to accept an optional `executor?: DbClientOrTransaction`. When provided, queries run directly on the caller's transaction; otherwise, a standalone transaction is established.
   - In `visitQuickRoutes.ts`, wrapped patient creation, appointment scheduling, and visit opening in a single `database.transaction(async (tx) => { ... })`. Any conflict (such as chair/doctor overbooking) now triggers a full rollback, preventing orphan patient records.
   - In `visitOpenRoutes.ts`, grouped visit opening and appointment status transition into a single atomic `database.transaction(async (tx) => { ... })`. WebSocket broadcasts (`wsBroker.broadcastToOrganization`) are dispatched strictly after the transaction commits successfully.
   - In `appointmentsStatusRoutes.ts`, forwarded the active `tx` parameter into `openVisitForAppointmentInDb(orgId, appointmentId, tx)`.

---

## 3. Caveats

- **No Mocks or Suppressions**: No `any`, `@ts-ignore`, `@ts-nocheck`, or `eslint-disable` annotations were introduced. All types are derived from Zod schemas and Drizzle table definitions.
- **Dirty Worktree Discipline**: All existing untracked/dirty files from peer agents were preserved. Only assigned target files were edited via `replace_file_content`.

---

## 4. Conclusion

1. **TypeScript Compilation Crash Eliminated**:
   - `npx tsc -p apps/api/tsconfig.json --noEmit` exits with code 0 (0 errors, down from 92).
2. **Database Schema Hardened**:
   - Critical missing indexes on foreign keys (`visit_diaries.doctor_id`, `patient_invoices.visit_id`, `payments.document_id`) and compound sorting columns (`(organization_id, created_at)`) added to Drizzle schema.
3. **ACID Transaction Invariants Enforced**:
   - Multi-step clinical workflows in Fastify routes now execute atomically within database transactions, guaranteeing zero orphan rows on failures.
4. **Unit Tests Passing**:
   - 32/32 tests across 5 test suites pass cleanly with Exit Code 0.

---

## 5. Verification Method

### 1. TypeScript Compiler Verification
```bash
npx tsc -p apps/api/tsconfig.json --noEmit
```
**Observed Result:**
```
Exit Code: 0
Stdout: (empty)
Stderr: (empty)
```

### 2. Scoped Unit Test Execution
```bash
node --max-old-space-size=1024 --import tsx --test src/tests/compliance/fiscalReceiptFactory.test.ts src/tests/routes/sbpQrFiscalEngine.test.ts src/tests/routes/shiftBatchDeduction.test.ts src/tests/routes/fiscalReceiptRoutes.test.ts
```
**Observed Result:**
```
ℹ tests 32
ℹ suites 5
ℹ pass 32
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 19900.5739
Exit Code: 0
```
