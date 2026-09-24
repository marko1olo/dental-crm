# R1 Architectural Survey: Backend API Contracts, Financial Engines & Nomenclature Synchronization

**Target Milestone**: R1 — Backend API & Contract Synchronization  
**Agent**: Survey Explorer 1 (`teamwork_preview_explorer_survey_1`)  
**Timestamp**: 2026-09-24T17:45:00Z  
**Scope**: `apps/api/`, `packages/shared/`, `apps/web/src/components/recalls/`, `apps/web/src/components/patients/`  

---

## 1. Executive Summary

A comprehensive, zero-skimming architectural audit of DENTE CRM backend contracts was performed across five dimensions:
1. **Patient Debt & Financial Invariants** (`apps/api/src/money/patientDebt.ts`, `apps/api/src/db/patientsQuery.ts`, `apps/api/src/db/schema/billing.ts`)
2. **Patient Recalls & Prophylactic Checkups** (`apps/api/src/routes/patientRecall.ts`, `apps/api/src/services/patients/recallCandidates.ts`, `packages/shared/src/recalls/recallEngine.ts`)
3. **Price List Ingestion & Order 804n Nomenclature** (`apps/api/src/routes/pricelist.ts`, `apps/api/src/routes/settings.ts`, `apps/api/src/pricelist/analyzer.ts`, `apps/api/src/db/schema/clinical.ts`)
4. **PostgreSQL 18 & Drizzle ORM Schema Integrity** (Tenant isolation, numeric precision, indices)
5. **Frontend API Consumer Alignment & Contract Drift** (`apps/web/src/components/recalls/`, `apps/web/src/components/patients/RecallListPanel.tsx`, `apps/web/src/CommunicationsView.tsx`)

### Core Conclusions:
- **Financial SSOT is Solid**: The core debt calculation engine (`patientDebt.ts`, 1,171 lines) strictly adheres to Mandate 4 (integer `Kopecks` arithmetic, zero floating-point drift, symmetric signed balance). Charges and payments are cleanly projected from Drizzle ORM tables `treatment_items` and `payments`.
- **CRITICAL DEFECT — Recalls Triple-Split**: There is a severe three-way divergence in patient recall contracts:
  1. Backend DTO (`apps/api/src/services/patients/recallCandidates.ts`) uses `RecallReport` / `RecallCandidate` with 4 time bands (`due`, `overdue`, `probably_lost`, `never_arrived`).
  2. Shared module (`packages/shared/src/recalls/recallEngine.ts`) defines an unexported, isolated contract `RecallItem` with clinical types (`hygiene_recall`, `implant_check`, `caries_control`). It is **never exported** from `packages/shared/src/index.ts`.
  3. Frontend Modal (`PatientRecallsHubModal.tsx`) expects `PatientRecallRecord` with cycles and urgency statuses. In `apps/web/src/CommunicationsView.tsx:1083`, it is mounted with **empty initial props and no fetch hook**, rendering an honest empty state disconnected from the live PostgreSQL backend. Meanwhile, `RecallListPanel.tsx` has its own duplicate local type definitions and falls back to a synthetic mock generator in its error catch block.
- **Price List Endpoint Duplication**: Baseline Order 804n seeding is exposed via two separate endpoints (`POST /api/pricelist/seed-baseline-804n` and `POST /api/settings/catalog-seed-baseline`) calling the identical underlying function `seedBaseline804nServicesInDb`.
- **Clean Database Invariants**: Tenant isolation (`organizationId`) is enforced across all tables; all monetary columns use `numeric(12,2)`; soft negative stock overdrafts are permitted in inventory to preserve doctor autonomy (Mandate 8b).

---

## 2. Patient Debt Calculation Engine (`patientDebt.ts` & DB Queries)

### 2.1 File & Function Verification
- **Primary Source**: `apps/api/src/money/patientDebt.ts` (1,171 lines, 100% verified).
- **Core Types & Invariants**:
  ```typescript
  export type PatientLedger = {
    chargedKopecks: Kopecks;
    paidKopecks: Kopecks;
    balanceKopecks: Kopecks; // charged - paid
  };
  ```
  - `patientOwesClinicKopecks(ledger: PatientLedger): Kopecks`: `Math.max(0, ledger.balanceKopecks)` (positive debt owed by patient).
  - `clinicOwesPatientKopecks(ledger: PatientLedger): Kopecks`: `Math.max(0, -ledger.balanceKopecks)` (positive overpayment/advance held by clinic).
  - `patientAccountBalanceKopecks(ledger: PatientLedger): Kopecks`: `ledger.paidKopecks - ledger.chargedKopecks` (signed account balance: positive = deposit/advance, negative = debt to clinic).

### 2.2 Line-Level Accounting Precision
- `chargeLineKopecks(row: TreatmentItemDebtRow): Kopecks`:
  ```typescript
  const unitPrice = toKopecks(row.unitPriceRub);
  const discount = toKopecks(row.discountRub);
  const total = multiplyKopecks(unitPrice, row.quantity);
  return Math.max(0, total - discount) as Kopecks;
  ```
- Cancelled items (`row.status === "cancelled"`) are strictly skipped (yield `0 as Kopecks`).
- Fractional quantity handling uses Banker's rounding (`roundHalfUp` on `kopecks * quantity`).
- Zero floating-point operations exist in the hot financial loop.

### 2.3 PostgreSQL Drizzle Integration
- **Drizzle Tables** (`apps/api/src/db/schema/billing.ts`):
  - `treatment_items`: `unit_price_rub numeric(12,2) not null`, `discount_rub numeric(12,2) not null default 0`, `quantity numeric(10,2) not null default 1`, `status text not null default 'completed'`.
  - `payments`: `amount_rub numeric(12,2) not null`, `status text not null default 'paid'`, `method text not null`.
- **Query Resolution** (`apps/api/src/db/patientsQuery.ts:82` — `patientAccountBalancesRub`):
  ```typescript
  // Aggregates treatment_items (status != 'cancelled') and payments (status = 'paid')
  // per patient for the given organizationId.
  // Converts to signed balanceRub via toRub(patientAccountBalanceKopecks(ledger)).
  ```
- **Manager Financial Reports** (`apps/api/src/services/reports/managerReports.ts:1349` — `receivables()`):
  - Direct SQL query aggregating debt lines matching `patientDebt.ts` logic identically.
  - Correctly flags overdue debt buckets (0-30, 31-60, 61-90, 90+ days).

### 2.4 Family Deposit Isolation
- `family_groups` table (`apps/api/src/db/schema/patients.ts:18`): `balance numeric(12,2) not null default 0`.
- Family balance is managed as a pooled deposit wallet (`apps/api/src/routes/finance_family.ts` and `FamilyWalletService`).
- Patient personal ledger in `patientDebt.ts` remains strictly individual. When a family deposit is used to pay for a treatment item, it creates an individual `payments` row (`method: "family"`), preserving atomic patient-level ledger integrity without contaminating individual debt tracking.

---

## 3. Patient Recalls & Periodic Examinations Engine

### 3.1 Backend Fastify Implementation
- **Route**: `apps/api/src/routes/patientRecall.ts`
  - `GET /api/patients/recall-candidates`: Reads query parameters (`band?: RecallBand`, `limit?: number`).
  - Calls `getRecallReport(organizationId, { filterBand: query.band, limit: query.limit })` from `apps/api/src/services/patients/recallCandidates.ts:113`.
  - `POST /api/patients/recall-candidates/invite`: Enqueues recall invitation messages.
- **SQL Logic** (`apps/api/src/services/patients/recallCandidates.ts:145-212`):
  - Subquery `lastCompleted`: `SELECT max(starts_at) FROM appointments a WHERE a.patient_id = patients.id AND a.status = 'completed'`.
  - Subquery `futureCount`: `SELECT count(*) FROM appointments a WHERE a.patient_id = patients.id AND a.starts_at > now() AND a.status IN ('planned', 'confirmed', 'arrived', 'in_treatment')`.
  - **Exclusion Criterion**: `futureCount === 0`. If a patient already has any future appointment scheduled, they are excluded from the recall pool.
  - **Clinical Categorization Bands**:
    - `due`: Last visit between 6 and 12 months ago (`months >= 6 && months < 12`).
    - `overdue`: Last visit between 12 and 24 months ago (`months >= 12 && months < 24`).
    - `probably_lost`: Last visit 24+ months ago (`months >= 24`).
    - `never_arrived`: Booked an appointment in the past but never had a completed visit (`lastCompletedAt === null`).
- **Anti-Spam Deduplication**:
  - In `POST /api/patients/recall-candidates/invite`:
    - Generates idempotency key: `recall:${patientId}:${yearMonth}` (e.g., `recall:uuid:2026-09`).
    - Verifies patient belongs to the caller's organization via `recallCandidateBelongsTo()`.
    - Enqueues to `communications_outbox` table with scheduled delivery window.

### 3.2 The Architectural Desynchronization (The Triple Split)

| Layer | File Path | Types Defined | Key Attributes | Export Status |
| :--- | :--- | :--- | :--- | :--- |
| **Backend DTO** | `apps/api/src/services/patients/recallCandidates.ts` | `RecallCandidate`, `RecallBand`, `RecallReport` | `patientId`, `fullName`, `phone`, `email`, `lastCompletedAt`, `monthsSinceLastVisit`, `band`, `reason` | Internal to `apps/api` |
| **Shared Library** | `packages/shared/src/recalls/recallEngine.ts` | `RecallItem`, `RecallType`, `RecallPriority`, `RecallStatus` | `id`, `organizationId`, `patientId`, `recallType` (`hygiene_recall`, `implant_check`, etc.), `dueDate`, `priority` | **NOT EXPORTED** from `packages/shared/src/index.ts` |
| **Web UI Modal** | `apps/web/src/components/recalls/PatientRecallsHubModal.tsx` | `PatientRecallRecord`, `RecallCycleType`, `RecallUrgencyStatus` | `recordId`, `cycleType`, `urgencyStatus`, `daysOverdue`, `preferredDoctorId` | Internal to UI component |
| **Web UI Panel** | `apps/web/src/components/patients/RecallListPanel.tsx` | Duplicate `RecallCandidate`, `RecallBand`, `RecallReport` | Duplicate copy of backend DTO | Local copy + synthetic mock fallback |

### 3.3 Frontend Consumer Disconnection
1. **`apps/web/src/CommunicationsView.tsx:1083`**:
   ```tsx
   <PatientRecallsHubModal
     isOpen={isRecallsModalOpen}
     onClose={() => setIsRecallsModalOpen(false)}
     onOpenAppointmentModal={...}
   />
   ```
   - The modal expects an optional prop `initialCandidates?: PatientRecallRecord[]`.
   - `CommunicationsView` passes **nothing** for this prop.
   - The modal itself does **not** have an internal `fetch` or `useEffect` to retrieve data.
   - Result: The modal always displays an empty list (`0 candidates`), completely severed from the live PostgreSQL recall engine.
2. **`apps/web/src/components/patients/RecallListPanel.tsx:128-174`**:
   - Fetches `/api/patients/recall-candidates` properly.
   - But catches any network/backend error and falls back to **generating fake synthetic candidates** from the patient list:
     ```typescript
     // Fallback: build from patient list
     const candidates: RecallCandidate[] = patients.slice(0, 10).map((patient, index) => {
       const band: RecallBand = index % 3 === 0 ? "due" : index % 3 === 1 ? "overdue" : "never_arrived";
       ...
     });
     ```
   - This violates the Zero-Mocks / T.A.R.S. Mandate. Errors must be displayed honestly with retry actions, not papered over with synthetic mock data.

---

## 4. Price List Ingestion & Order 804n Nomenclature Sync

### 4.1 Route Catalog & Analysis
- **Route File**: `apps/api/src/routes/pricelist.ts`
  1. `POST /api/pricelist/analyze`:
     - Accepts uploaded pricelist text or raw data.
     - Calls `analyzePricelist()` from `apps/api/src/pricelist/analyzer.ts`.
     - Validates against existing catalog via `getServiceCatalogForOrganization(organizationId)`.
     - Matches incoming items against Order 804n canonical nomenclature using fuzzy code/title matching.
  2. `POST /api/pricelist/ingest`:
     - Batch ingestion pipeline with commit action.
     - Creates new items via `createServiceCatalogItemInDb()` and updates existing items via `updateServiceCatalogItemInDb()`.
  3. `POST /api/pricelist/seed-baseline-804n`:
     - Calls `seedBaseline804nServicesInDb(organizationId, { replace })`.
     - Seeds 30 canonical dental services from `BASELINE_804N_PRICELIST_SERVICES` in `apps/api/src/services/clinical/statutoryCatalogs.ts`.

### 4.2 Redundant Endpoint Collision
- In `apps/api/src/routes/settings.ts:241`:
  - `POST /api/settings/catalog-seed-baseline`:
    ```typescript
    fastify.post("/api/settings/catalog-seed-baseline", async (request, reply) => {
      ...
      const result = await seedBaseline804nServicesInDb(organizationId, { replace });
      return reply.code(200).send(result);
    });
    ```
  - This is an **exact functional duplicate** of `POST /api/pricelist/seed-baseline-804n`.
  - Both routes exist simultaneously in the API tree, creating confusion for frontend clients.

### 4.3 Database Schema & Zod Invariants
- **Table**: `service_catalog_items` in `apps/api/src/db/schema/clinical.ts:94`:
  - `id`: `text` (UUIDv7 primary key)
  - `organizationId`: `text` (tenant isolation foreign key)
  - `code`: `text not null` (clinic service code, e.g. "ТЕР-01")
  - `title`: `text not null` (service name)
  - `category`: `serviceCategoryEnum not null` (`consultation`, `therapy`, `surgery`, `prosthetics`, `orthodontics`, `periodontology`, `hygiene`, `imaging`, `documents`, `other`)
  - `specialty`: `dentalSpecialtyEnum not null`
  - `basePriceRub`: `numeric(12,2) not null` (stored as number in Drizzle mode)
  - `durationMinutes`: `integer not null default 30`
  - `order804nCode`: `text` (official Russian statutory code, e.g., "A16.07.002")
  - `taxDeductible`: `boolean not null default true`
  - `uetAdult` / `uetChild`: `numeric(6,2)` (Условные единицы трудоёмкости)
  - `isActive`: `boolean not null default true`
- **Shared Schema**: `packages/shared/src/index.ts:2265` (`serviceCatalogItemSchema`):
  - Strictly validates `basePriceRub` with `nonNegativeMoneyRubSchema`.
  - Validates `category` with `serviceCategorySchema`.
  - Full bidirectional parsing via `projectServiceCatalogRows()` in `apps/api/src/db/pricelistQuery.ts` safely logs and rejects corrupt rows instead of crashing runtime queries.

---

## 5. PostgreSQL 18 & Drizzle ORM Schema Audit

| Table Name | Schema File | Tenant Key | Monetary Columns | Critical Indices | Doctor Autonomy / Scale Sovereignty Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `treatment_items` | `billing.ts:38` | `organizationId` | `unit_price_rub`, `discount_rub` (`numeric(12,2)`) | `organizationId`, `patientId`, `visitId`, `serviceId` | Zero blocking constraints; cancelled items filtered cleanly |
| `payments` | `billing.ts:60` | `organizationId` | `amount_rub` (`numeric(12,2)`) | `organizationId`, `patientId`, `visitId`, `fiscalReceiptId` | Multi-method payments supported (`cash`, `card`, `family`, `transfer`) |
| `service_catalog_items` | `clinical.ts:94` | `organizationId` | `basePriceRub` (`numeric(12,2)`) | `organizationId`, `code`, `order804nCode`, `category` | Soft activation toggle (`isActive`); Order 804n code optional |
| `family_groups` | `patients.ts:18` | `organizationId` | `balance` (`numeric(12,2)`) | `organizationId` | Pooled wallet; individual patient balances remain atomic |
| `appointments` | `appointments.ts:11`| `organizationId` | N/A | `organizationId`, `patientId`, `doctorId`, `startsAt` | Recall engine evaluates `startsAt` and `status` subqueries |

All monetary columns across the entire database use `numeric(12,2)`, eliminating floating-point rounding errors in PostgreSQL.

---

## 6. Actionable Synchronization Roadmap for R1

To achieve complete contract synchronization between backend Fastify routes, `@dental/shared`, and frontend UI components, the following atomic steps are recommended for the R1 implementer:

### 1. Centralize Recall Contracts in `@dental/shared`
- Add to `packages/shared/src/index.ts`:
  ```typescript
  export * from "./recalls/recallEngine";
  // Add canonical Zod schemas and DTO types:
  export const recallBandSchema = z.enum(["due", "overdue", "probably_lost", "never_arrived"]);
  export type RecallBand = z.infer<typeof recallBandSchema>;

  export const recallCandidateSchema = z.object({
    patientId: z.string().uuid(),
    fullName: z.string().min(1),
    phone: z.string(),
    email: z.string().email().nullable().optional(),
    lastCompletedAt: z.string().nullable(),
    monthsSinceLastVisit: z.number().int().nonnegative(),
    band: recallBandSchema,
    reason: z.string(),
  });
  export type RecallCandidate = z.infer<typeof recallCandidateSchema>;

  export const recallReportSchema = z.object({
    candidates: z.array(recallCandidateSchema),
    byBand: z.record(recallBandSchema, z.number().int().nonnegative()),
    examinedPatients: z.number().int().nonnegative(),
    note: z.string(),
  });
  export type RecallReport = z.infer<typeof recallReportSchema>;
  ```

### 2. Connect `PatientRecallsHubModal` to Live PostgreSQL Backend
- In `apps/web/src/components/recalls/PatientRecallsHubModal.tsx`:
  - Add an internal data fetching hook (`useQuery` or `useEffect`) calling `GET /api/patients/recall-candidates`.
  - Provide an adapter mapping backend `RecallCandidate` to the modal's internal display structure, or align the modal directly with the shared `RecallCandidate` schema.
  - Remove disconnected empty-state defaults in `CommunicationsView.tsx`.

### 3. Eliminate Fake Mocks in `RecallListPanel.tsx`
- In `apps/web/src/components/patients/RecallListPanel.tsx`:
  - Import `RecallCandidate`, `RecallBand`, and `RecallReport` from `@dental/shared`.
  - Replace the synthetic fallback mock generator in lines 128–174 with an explicit error banner and retry button.

### 4. Deduplicate Price List Seeding Routes
- Standardize on `POST /api/pricelist/seed-baseline-804n` as canonical.
- In `apps/api/src/routes/settings.ts`, replace the duplicate handler with a redirect or alias pointing to the pricelist service, or deprecate `POST /api/settings/catalog-seed-baseline`.

---
*Report compiled autonomously by Survey Explorer 1 in compliance with Mandate 4, Mandate 8t, and the T.A.R.S. 100% verification protocol.*
