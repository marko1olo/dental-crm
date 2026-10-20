# Handoff Report: Backend Compilation Crash, Drizzle DB Indexes & Fastify ACID Audit

**Agent:** `teamwork_preview_explorer_backend_crash_db`  
**Parent / Caller:** `47f9f488-23df-448d-9d14-106c107b506b`  
**Mode:** Read-Only Explorer Investigation (No production code modified)  
**Date:** 2026-10-20  

---

## 1. Observation

### A. TypeScript Compiler Crash in `apps/api`
Running `npx tsc -p apps/api/tsconfig.json --noEmit` reveals 92 errors across 5 primary modules (full log captured in `tsc_errors.txt`):

1. **`apps/api/src/routes/shifts/index.ts:51`**:
   ```
   apps/api/src/routes/shifts/index.ts(51,19): error TS2304: Cannot find name 'AutoCloseExpiredShiftsOptions'.
   ```
   - **File check**: `shiftAutoCloseService.ts:22` exports `export interface AutoCloseExpiredShiftsOptions`.
   - In `apps/api/src/routes/shifts/index.ts:19-24`, the import statement is:
     ```typescript
     import {
       DEFAULT_MAX_SHIFT_HOURS,
       DEFAULT_SHIFT_BUFFER_MINUTES,
       checkAndAutoCloseExpiredShifts,
     } from "./shiftAutoCloseService.js";
     ```
     `type AutoCloseExpiredShiftsOptions` is completely missing from the import list while referenced at line 51:
     ```typescript
     autoCloseOptions?: AutoCloseExpiredShiftsOptions;
     ```

2. **`apps/api/src/routes/sbp/types.ts` vs `packages/shared/src/fiscal/fiscalValidation/receiptTotalsValidation.ts`**:
   - In `receiptTotalsValidation.ts`:
     ```typescript
     export type CreateFiscalReceiptPayloadInput = z.input<typeof createFiscalReceiptPayloadSchema>;
     export type CreateFiscalReceiptPayloadOutput = z.infer<typeof createFiscalReceiptPayloadSchema>;
     ```
   - `createFiscalReceiptPayloadSchema` contains preprocessed fields (`z.preprocess(...)`) for `clientMutationId`, `cashierInn`, `customerInn`, `customerName`, as well as defaults (`.default(...)`) for `sbpKopecks`, `electronicCardKopecks`, `operationType`, `taxationSystem`, item `quantity`, `subject`, `method`, `vatRate`, `measure`.
   - In `apps/api/src/routes/sbp/types.ts:16`:
     ```typescript
     export type CreateFiscalReceiptPayload = z.input<typeof createFiscalReceiptPayloadSchema>;
     ```
   - And in `apps/api/src/routes/fiscal/receiptRoutes/receiptFfdValidator.ts:13`:
     ```typescript
     import type { CreateFiscalReceiptPayloadInput as CreateFiscalReceiptPayload } from "@dental/shared";
     ```
   - Because `z.input` is used instead of `z.infer` / `CreateFiscalReceiptPayloadOutput`:
     - Preprocessed fields have type `{}` (empty object) instead of `string | null | undefined`.
     - Fields with `.default(...)` are typed as `T | undefined` instead of `T`.
   - This directly triggers 80+ compiler errors across:
     - `apps/api/src/routes/fiscal/receiptRoutes/receiptDraftHandlers.ts:84, 86, 88`: `error TS18048: 'item.quantity' is possibly 'undefined'`.
     - `apps/api/src/routes/fiscal/receiptRoutes/receiptFiscalizeHandlers.ts:68, 69, 123, 124`: `error TS2339: Property 'trim' does not exist on type '{}'`.
     - `apps/api/src/routes/fiscal/receiptRoutes/receiptFiscalizeHandlers.ts:94`: `error TS2345: Types of property 'operationType' are incompatible: Type 'undefined' is not assignable to type 'string'`.
     - `apps/api/src/routes/fiscal/receiptRoutes/receiptKktSender.ts:89, 95, 174, 205`: `error TS2345: Argument of type '... undefined' is not assignable to parameter...`.
     - `apps/api/src/routes/sbp/fiscalReceiptService.ts:163`: `error TS2322: 'item.quantity' is number | undefined`.
     - `apps/api/src/routes/sbp/fiscalReceiptService.ts:257`: `error TS2769: Argument of type '{}' is not assignable to parameter of type 'string | SQLWrapper'` on `eq(payments.clientMutationId, input.clientMutationId)`.
     - `apps/api/src/routes/sbp/fiscalReceiptService.ts:284`: `error TS2339: Property 'trim' does not exist on type '{}'`.
     - `apps/api/src/routes/sbp/fiscalReceiptService.ts:352, 354, 453, 455, 594`: `error TS18048: 'input.sbpKopecks' / 'input.electronicCardKopecks' is possibly 'undefined'`.
     - `apps/api/src/routes/sbp/fiscalReceiptService.ts:588, 589, 591, 592, 595`: enum/number assignment errors from `undefined`.
     - `apps/api/src/services/kkt/FiscalReceiptFactory.ts:242-246, 290-297`: item properties and header fields reject `undefined` or `{}`.

---

### B. Drizzle Database Schema & Index Audit

1. **`visits` (`apps/api/src/db/schema/clinical/visitsSchema.ts:133-144`)**:
   - **[ПРОВЕРЕНО: В НОРМЕ]**:
     - `visits_organization_id_idx`: on `organization_id`
     - `idx_visits_org_created_at`: on `(organization_id, created_at)`
     - `idx_visits_org_patient`: on `(organization_id, patient_id)`
     - `visits_patient_id_idx`: on `patient_id`
     - `visits_appointment_id_idx`: on `appointment_id`

2. **`visit_diaries` (`apps/api/src/db/schema/clinical/visitsSchema.ts:195-200`)**:
   - **[ДЕФЕКТ: ОТСУТСТВУЮТ КРИТИЧЕСКИЕ ИНДЕКСЫ]**:
     - Currently defined:
       ```typescript
       export const visitDiaries = pgTable("visit_diaries", { ... }, (table) => [
         index("visit_diaries_org_idx").on(table.organizationId),
         index("visit_diaries_visit_id_idx").on(table.visitId),
       ]);
       ```
     - **Missing Index 1 (Foreign Key `doctorId`)**: Foreign key `doctor_id` has NO index! Queries filtering by doctor diaries (`WHERE doctor_id = :doctorId AND organization_id = :orgId`) perform sequential scans.
     - **Missing Index 2 (Composite `(organization_id, created_at)`)**: Missing composite index for timeline and audit history sorting.
     - **Missing Index 3 (Composite `(organization_id, visit_id)`)**: Missing tenant-isolated composite lookup.

3. **`patient_invoices` (`apps/api/src/db/schema/billingModules/billingInvoicesSchema.ts:117-128`)**:
   - **[ДЕФЕКТ: ОТСУТСТВУЮТ КРИТИЧЕСКИЕ ИНДЕКСЫ]**:
     - Currently defined:
       - `orgIdx`: on `organization_id`
       - `patientIdx`: on `patient_id`
       - `orgStatusIdx`: on `(organization_id, status)`
       - `orgPatientCreatedIdx`: on `(organization_id, patient_id, created_at)`
     - **Missing Index 1 (Foreign Key `visitId`)**: Column `visit_id` is a foreign key referenced in route queries (e.g. `installationBillingAndOdontogram.ts:36`: `eq(patientInvoices.visitId, visitId)`) but has NO index! Every check for existing invoice for a visit causes a full table scan.
     - **Missing Index 2 (Composite `(organization_id, created_at DESC)`)**: Clinic-wide invoice listings paginated by date cannot utilize `orgPatientCreatedIdx` (which requires `patient_id`).

4. **`payments` (`apps/api/src/db/schema/billingModules/billingPaymentsAndFiscalSchema.ts:153-163`)**:
   - **[ПРОВЕРЕНО / 1 ДЕФЕКТ]**:
     - Has: `orgPaidAtIdx`, `orgCreatedAtDescIdx`, `orgPatientIdx`, `patientIdx`, `visitIdx`, `orgClientMutationIdx`.
     - **Missing Index (Foreign Key `documentId`)**: `document_id` references `accounting_documents.id` without an index.

5. **`patients` (`apps/api/src/db/schema/patientsSchema/patientIndexes.ts:1-25`)**:
   - **[ПРОВЕРЕНО: В НОРМЕ]**:
     - Has `idx_patients_org_created`, `idx_patients_org_created_desc`, GIN index for search, `idx_patients_phone`, `idx_patients_org_status`.

6. **`appointments` (`apps/api/src/db/schema/schedule.ts:25-36`)**:
   - **[ПРОВЕРЕНО: В НОРМЕ]**:
     - Has composite `(organization_id, starts_at, ends_at)`, `(organization_id, doctor_user_id, starts_at)`, and FK indexes on `patient_id`, `doctor_user_id`, `chair_id`.

---

### C. Fastify ACID Transaction Boundaries & Fractures

1. **`apps/api/src/routes/visits/visitQuickRoutes.ts:65-87` (Uncoordinated Multi-Step Mutation)**:
   ```typescript
   // 1. Patient created
   const patient = await createPatientInDb(database, ...);
   // 2. Appointment created
   const appointment = await createAppointmentInDb(database, ...);
   // 3. Visit opened
   const visit = await openVisitForAppointmentInDb(database, ...);
   ```
   - **Fracture**: Operations 1, 2, and 3 run without an overarching database transaction. If appointment creation throws `CHAIR_OVERBOOKING_COLLISION` or validation fails on doctor schedule, the newly created patient is never rolled back, polluting the clinic database with phantom "Быстрый прием" patients.

2. **`apps/api/src/routes/visits/visitOpenRoutes.ts:88-97` (Fractured Appointment State Transition)**:
   ```typescript
   const visit = await openVisitForAppointmentInDb(database, { ... });
   await database
     .update(appointments)
     .set({ status: "in_treatment", updatedAt: new Date() })
     .where(and(eq(appointments.id, appointmentId), eq(appointments.organizationId, organizationId)));
   ```
   - **Fracture**: `openVisitForAppointmentInDb` internally commits its own transaction. The subsequent `database.update(appointments)` runs outside that transaction. If a network blip or server shutdown occurs between lines 90 and 91, the visit exists in `in_progress` state, but the appointment remains stuck in `planned`.

3. **`apps/api/src/db/visitsQueryModules/visitScheduleQueries.ts:49-53` (Transaction Composing Inflexibility)**:
   ```typescript
   export async function openVisitForAppointmentInDb(
     db: Database,
     params: OpenVisitForAppointmentParams,
   ): Promise<VisitRecord> {
     return db.transaction(async (tx) => { ... });
   }
   ```
   - **Fracture**: Hardcodes `db.transaction`. It does not accept an optional `tx?: DbTransaction`. Any caller route attempting to wrap the workflow in an atomic outer transaction cannot pass its transaction client into this function, creating nested connection issues or preventing proper multi-table atomicity.

4. **`apps/api/src/routes/leadsConversion.ts:569-623`**:
   - Performs `db.insert(patients)`, then `db.insert(crmLeadStageHistory)`, then `db.update(crmLeads)` sequentially without a single transaction block.

5. **`apps/api/src/routes/clinicalImplants/installationBillingAndOdontogram.ts:14-15`**:
   - Declares `tx: any` with an `eslint-disable` comment, bypassing type safety and violating zero-tolerance for `any`.

---

## 2. Logic Chain

```
[Observation 1: TS2304 in shifts/index.ts]
      │
      ├─► shiftAutoCloseService.ts exports interface AutoCloseExpiredShiftsOptions.
      ├─► shifts/index.ts imports functions from ./shiftAutoCloseService.js but omitted the type.
      └─► Deduction: Adding `type AutoCloseExpiredShiftsOptions` resolves TS2304 with zero runtime side-effects.

[Observation 2: 80+ TS2339/TS2769/TS18048/TS2345 errors in sbp, fiscal, and kkt]
      │
      ├─► packages/shared defines createFiscalReceiptPayloadSchema.
      ├─► z.preprocess converts empty strings to null for customerInn, cashierInn, clientMutationId.
      │   Zod types unparsed preprocessed inputs as unknown / {}.
      ├─► .default(...) specifies defaults for quantity, operationType, sbpKopecks, etc.
      │   Zod types unparsed defaulted inputs as T | undefined.
      ├─► In routes/sbp/types.ts and receiptFfdValidator.ts:
      │   CreateFiscalReceiptPayload was typed as z.input<...> instead of z.infer<...>.
      ├─► In reality, all routes validate request.body with createFiscalReceiptPayloadSchema.safeParse().
      │   The output data is ALREADY parsed and defaulted (CreateFiscalReceiptPayloadOutput / z.infer).
      ├─► Because the service functions accepted z.input, TypeScript inferred {} for strings and undefined for numbers/enums.
      └─► Deduction: Changing CreateFiscalReceiptPayload to z.infer<typeof createFiscalReceiptPayloadSchema>
          (and adapting FiscalReceiptFactory to safely accept either or provide fallback defaults)
          eliminates the entire cascade of type mismatches cleanly without any `any` or `@ts-ignore`.

[Observation 3: Missing indexes in visit_diaries and patient_invoices]
      │
      ├─► Clinical and billing queries frequently join visit_diaries ON doctor_id and patient_invoices ON visit_id.
      ├─► Table scans on multi-tenant tables scale with O(N) where N is total rows across all clinics.
      ├─► Drizzle schemas for visit_diaries and patient_invoices lack indices on these foreign keys and compound sorting columns.
      └─► Deduction: Adding index definitions in Drizzle schemas prevents query degradation and index lock stalls.

[Observation 4: Multi-step mutations without ACID transaction wrappers]
      │
      ├─► Fastify handlers execute multiple sequential DB calls (e.g., patient -> appointment -> visit).
      ├─► Partial execution on errors leaves orphaned records (orphaned patients, mismatched statuses).
      ├─► Helper functions like openVisitForAppointmentInDb do not accept an outer transaction.
      └─► Deduction: Refactoring queries to accept `db: Database | DbTransaction` and wrapping routes in `db.transaction()`
          guarantees all-or-nothing rollback on conflict or failure.
```

---

## 3. Caveats

1. **Read-Only Explorer Invariant**: In accordance with the Explorer role and system instructions, NO production files in `apps/api/` or `packages/shared/` were modified during this investigation.
2. **Drizzle Migration Generation**: Adding indices to Drizzle schemas in `apps/api/src/db/schema/` will require generating and applying a migration (`npm run db:generate`) before executing in environments with existing tables.
3. **Database Performance Testing**: No live benchmark load testing was run on PostgreSQL 18 during this session to avoid host CPU/RAM lockup; index recommendations are based on PostgreSQL query planner rules for foreign key joins and multi-tenant compound filters.

---

## 4. Conclusion & Surgical Remediation Plan

The backend build failures and database fragility stem from two distinct root causes:
1. **Type Inversion in Fiscal Types**: Using `z.input` instead of `z.infer` for already-validated payloads.
2. **Omission of Import & Transaction Boundaries**: An omitted type import in `shifts/index.ts` and uncoordinated multi-step mutations in `visitQuickRoutes.ts` and `visitOpenRoutes.ts`.

### Concrete Implementation Blueprint for the Implementation Worker:

#### Step 1: Fix `apps/api/src/routes/shifts/index.ts`
At line 19, update the import:
```typescript
// BEFORE:
import {
  DEFAULT_MAX_SHIFT_HOURS,
  DEFAULT_SHIFT_BUFFER_MINUTES,
  checkAndAutoCloseExpiredShifts,
} from "./shiftAutoCloseService.js";

// AFTER:
import {
  DEFAULT_MAX_SHIFT_HOURS,
  DEFAULT_SHIFT_BUFFER_MINUTES,
  checkAndAutoCloseExpiredShifts,
  type AutoCloseExpiredShiftsOptions,
} from "./shiftAutoCloseService.js";
```

#### Step 2: Fix Fiscal Receipt Payload Types
1. In `apps/api/src/routes/sbp/types.ts:16`:
   ```typescript
   // BEFORE:
   export type CreateFiscalReceiptPayload = z.input<typeof createFiscalReceiptPayloadSchema>;

   // AFTER:
   export type CreateFiscalReceiptPayload = z.infer<typeof createFiscalReceiptPayloadSchema>;
   ```
2. In `apps/api/src/routes/fiscal/receiptRoutes/receiptFfdValidator.ts:13`:
   ```typescript
   // BEFORE:
   import type { CreateFiscalReceiptPayloadInput as CreateFiscalReceiptPayload } from "@dental/shared";

   // AFTER:
   import type { CreateFiscalReceiptPayloadOutput as CreateFiscalReceiptPayload } from "@dental/shared";
   ```
3. In `apps/api/src/services/kkt/FiscalReceiptFactory.ts`:
   - Support `CreateFiscalReceiptPayloadOutput` (or union `CreateFiscalReceiptPayloadOutput | CreateFiscalReceiptPayloadInput`).
   - Cleanly coalesce optional defaults:
     ```typescript
     const quantity = typeof item.quantity === "number" ? item.quantity : 1;
     const subject = item.subject ?? "service";
     const method = item.method ?? "full_payment";
     const vatRate = item.vatRate ?? "vat_none";
     const measure = item.measure ?? "piece";
     ```
   - In `resolveTag1054`, `resolveTag1055`, `resolveTag1212`, `resolveTag1214`, `resolveTag1199`, `resolveTag2108`: make parameters optional with sensible defaults (`operationType?: Ffd12OperationType`).
   - Coalesce preprocessed string fields safely:
     ```typescript
     cashierInn: typeof input.cashierInn === "string" ? input.cashierInn : null,
     customerInn: typeof input.customerInn === "string" ? input.customerInn : null,
     customerName: typeof input.customerName === "string" ? input.customerName : null,
     ```

#### Step 3: Add Missing Database Indexes
1. In `apps/api/src/db/schema/clinical/visitsSchema.ts` (`visitDiaries`):
   ```typescript
   export const visitDiaries = pgTable(
     "visit_diaries",
     { ... },
     (table) => [
       index("visit_diaries_org_idx").on(table.organizationId),
       index("visit_diaries_visit_id_idx").on(table.visitId),
       index("visit_diaries_doctor_id_idx").on(table.doctorId),
       index("idx_visit_diaries_org_created_at").on(table.organizationId, table.createdAt),
       index("idx_visit_diaries_org_visit").on(table.organizationId, table.visitId),
     ],
   );
   ```
2. In `apps/api/src/db/schema/billingModules/billingInvoicesSchema.ts` (`patientInvoices`):
   ```typescript
   export const patientInvoices = pgTable(
     "patient_invoices",
     { ... },
     (table) => [
       index("patient_invoices_org_idx").on(table.organizationId),
       index("patient_invoices_patient_idx").on(table.patientId),
       index("patient_invoices_visit_id_idx").on(table.visitId),
       index("idx_patient_invoices_org_created_desc").on(table.organizationId, table.createdAt),
       index("idx_patient_invoices_org_status").on(table.organizationId, table.status),
       index("patient_invoices_org_patient_created_idx").on(
         table.organizationId,
         table.patientId,
         table.createdAt,
       ),
     ],
   );
   ```
3. In `apps/api/src/db/schema/billingModules/billingPaymentsAndFiscalSchema.ts` (`payments`):
   ```typescript
   index("payments_document_id_idx").on(table.documentId),
   ```

#### Step 4: Encapsulate Multi-Step Mutations in ACID Transactions
1. In `apps/api/src/db/visitsQueryModules/visitScheduleQueries.ts`:
   Refactor `openVisitForAppointmentInDb` to accept an optional transaction executor:
   ```typescript
   export async function openVisitForAppointmentInDb(
     dbOrTx: Database | DbTransaction,
     params: OpenVisitForAppointmentParams,
   ): Promise<VisitRecord> {
     const runInTx = async (tx: DbTransaction) => {
       // ... existing query logic using tx
     };
     // If dbOrTx is already a transaction, run directly; otherwise wrap in db.transaction
     if ("transaction" in dbOrTx && typeof dbOrTx.transaction === "function") {
       return dbOrTx.transaction(runInTx);
     }
     return runInTx(dbOrTx as DbTransaction);
   }
   ```
2. In `apps/api/src/routes/visits/visitQuickRoutes.ts:65-87`:
   Wrap patient creation, appointment scheduling, and visit opening in a single `database.transaction(async (tx) => { ... })`.
3. In `apps/api/src/routes/visits/visitOpenRoutes.ts:88-97`:
   Wrap `openVisitForAppointmentInDb(tx, ...)` and `tx.update(appointments)...` inside a single `database.transaction(async (tx) => { ... })`.

---

## 5. Verification Method

To independently verify the diagnosis and future remediation:

1. **Compiler Verification**:
   ```bash
   npx tsc -p apps/api/tsconfig.json --noEmit
   ```
   *Expected Result*: 0 errors after applying Steps 1 and 2.

2. **Scoped Test Verification**:
   ```bash
   npm --prefix apps/api test -- src/routes/shifts
   npm --prefix apps/api test -- src/routes/sbp
   npm --prefix apps/api test -- src/routes/fiscal
   ```
   *Expected Result*: All tests pass without type coercion or timeout issues.

3. **Index Verification**:
   Inspect `visitDiaries`, `patientInvoices`, and `payments` definitions in `apps/api/src/db/schema/`. Run `npx drizzle-kit generate` in non-destructive dry-run mode to confirm index migrations match table column names.
