# Handoff Report: R1 Backend API & Contract Synchronization Survey

**Handoff Type**: Hard (Task Complete)  
**Agent**: Survey Explorer 1 (`teamwork_preview_explorer_survey_1`)  
**Target Milestone**: R1 — Backend API & Contract Synchronization  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_1`  
**Timestamp**: 2026-09-24T17:48:00Z  

---

## 1. Observation

Direct observations verified across the codebase with exact file paths and line numbers:

1. **Patient Debt Calculation SSOT**:
   - `apps/api/src/money/patientDebt.ts:1-1171`: Contains the complete financial math engine.
   - Line 74: `export type PatientLedger = { chargedKopecks: Kopecks; paidKopecks: Kopecks; balanceKopecks: Kopecks; };`
   - Line 83: `patientOwesClinicKopecks(ledger)` calculates `Math.max(0, ledger.balanceKopecks)`.
   - Line 90: `clinicOwesPatientKopecks(ledger)` calculates `Math.max(0, -ledger.balanceKopecks)`.
   - Line 97: `patientAccountBalanceKopecks(ledger)` calculates `ledger.paidKopecks - ledger.chargedKopecks`.
   - Line 159: `chargeLineKopecks(row)` calculates line totals in integer kopecks using `multiplyKopecks` and subtracts discount, skipping `row.status === "cancelled"`.
   - `apps/api/src/db/patientsQuery.ts:82-140`: `patientAccountBalancesRub()` executes live PostgreSQL aggregation queries over Drizzle tables `treatment_items` (excluding cancelled items) and `payments` (status 'paid'), mapping them cleanly to signed rubles using `toRub(patientAccountBalanceKopecks(ledger))`.
   - `apps/api/src/db/schema/billing.ts:38-72`: `treatment_items` and `payments` tables store all prices and amounts in `numeric(12,2)`.

2. **Patient Recalls Backend Route & SQL Query**:
   - `apps/api/src/routes/patientRecall.ts:50-104`: Fastify endpoint `GET /api/patients/recall-candidates` calls `getRecallReport(organizationId, { filterBand: query.band, limit: query.limit })`.
   - `apps/api/src/services/patients/recallCandidates.ts:145-212`: Executes an authentic PostgreSQL query with subqueries:
     - `lastCompleted`: `SELECT max(starts_at) FROM appointments a WHERE a.patient_id = patients.id AND a.status = 'completed'`
     - `futureCount`: `SELECT count(*) FROM appointments a WHERE a.patient_id = patients.id AND a.starts_at > now() AND a.status IN ('planned', 'confirmed', 'arrived', 'in_treatment')`
     - Filters out patients with `futureCount > 0`.
     - Categorizes patients into 4 clinical bands: `due` (6-12m), `overdue` (12-24m), `probably_lost` (>=24m), and `never_arrived` (null completed appointment).
   - `apps/api/src/routes/patientRecall.ts:106-155`: `POST /api/patients/recall-candidates/invite` validates input, checks organization ownership via `recallCandidateBelongsTo()`, and enqueues to `communications_outbox` with deduplication key `recall:${patientId}:${YYYY-MM}`.

3. **Recalls Contract Disconnection (The Triple Split)**:
   - Observation 3a: `packages/shared/src/recalls/recallEngine.ts:1-120` defines `RecallItem` with `RecallType` (`hygiene_recall`, `implant_check`, `ortho_adjustment`, etc.), but this entire file is **NOT exported** in `packages/shared/src/index.ts`.
   - Observation 3b: `apps/web/src/components/recalls/PatientRecallsHubModal.tsx:1-45` defines its own UI type `PatientRecallRecord` with `cycleType` and `urgencyStatus`.
   - Observation 3c: In `apps/web/src/CommunicationsView.tsx:1083-1088`:
     ```tsx
     <PatientRecallsHubModal
       isOpen={isRecallsModalOpen}
       onClose={() => setIsRecallsModalOpen(false)}
       onOpenAppointmentModal={(patientId, patientName) => { ... }}
     />
     ```
     `PatientRecallsHubModal` is rendered without passing the `initialCandidates` prop, and has no internal `fetch` call. It displays an empty candidate list permanently.
   - Observation 3d: In `apps/web/src/components/patients/RecallListPanel.tsx:12-40`, `RecallCandidate`, `RecallBand`, and `RecallReport` are duplicated locally as handwritten TypeScript types instead of being imported from shared packages. In lines 128-174, the catch block synthesizes fake mock candidates when the API call fails.

4. **Price List Seeding & Statutory Nomenclature 804n**:
   - `apps/api/src/routes/pricelist.ts:245-267`: Defines `POST /api/pricelist/seed-baseline-804n` which calls `seedBaseline804nServicesInDb(organizationId, { replace })`.
   - `apps/api/src/routes/settings.ts:241-255`: Defines `POST /api/settings/catalog-seed-baseline` which executes the exact same call: `seedBaseline804nServicesInDb(organizationId, { replace })`.
   - `apps/api/src/services/clinical/statutoryCatalogs.ts:1-200`: Houses `BASELINE_804N_PRICELIST_SERVICES` (30 canonical Russian dental services conforming to Order 804n).
   - `apps/api/src/db/schema/clinical.ts:94-135`: `service_catalog_items` table stores `order804nCode`, `category`, `basePriceRub` (`numeric(12,2)`), `taxDeductible`, `uetAdult`, and `isActive`.
   - `packages/shared/src/index.ts:2265`: `serviceCatalogItemSchema` validates price catalog entries using Zod with non-negative ruble constraints.

---

## 2. Logic Chain

1. **Financial Integrity**:
   - From Observation 1, `patientDebt.ts` implements strict integer arithmetic using `@dental/shared` `Kopecks` with symmetric logic (`patientOwesClinicKopecks` vs `clinicOwesPatientKopecks`), and `patientsQuery.ts` maps this directly to PostgreSQL `treatment_items` and `payments` tables with tenant isolation.
   - Therefore, the financial and debt engine is mathematically robust, compliant with Mandate 4, and requires no core formula alterations.

2. **Recall System Disconnection**:
   - From Observation 2, backend Fastify has a fully functional PostgreSQL recall candidate engine with clinical time banding and anti-spam deduplication.
   - From Observations 3a, 3b, 3c, and 3d:
     - `packages/shared` fails to export recall types.
     - Backend defines `RecallCandidate` and `RecallReport` locally in `apps/api/src/services/patients/recallCandidates.ts`.
     - Frontend `RecallListPanel.tsx` duplicates these types locally and falls back to generating fake mock candidates on network error.
     - Frontend `PatientRecallsHubModal.tsx` defines a third conflicting type `PatientRecallRecord` and is never passed data by `CommunicationsView.tsx`.
   - Therefore, the patient recall system suffers from an architectural contract split that renders the Hub modal dormant and leaves the list panel vulnerable to contract drift and fake data.

3. **Price List Route Duplication**:
   - From Observation 4, both `POST /api/pricelist/seed-baseline-804n` and `POST /api/settings/catalog-seed-baseline` invoke `seedBaseline804nServicesInDb` with identical parameters.
   - Therefore, there is API route duplication that should be consolidated to avoid maintenance split.

---

## 3. Caveats

- **No Live DB Queries Executed**: In accordance with the Read-Only Explorer mandate and Mandate 8t, live SQL queries and compiler builds (`npm run typecheck`) were not run directly during this survey phase.
- **Frontend State Management**: Did not modify or mount the React DOM to test browser-level event dispatching; findings are based on static AST and code trace analysis.
- **No other caveats**: All backend routes, schemas, and contract files in scope were inspected directly.

---

## 4. Conclusion

1. **Patient Debt**: The debt calculation engine is complete, robust, and correctly grounded in PostgreSQL 18 schemas. No structural changes needed.
2. **Patient Recalls**: Requires immediate harmonization in Milestone R1:
   - Centralize and export `recallCandidateSchema`, `recallReportSchema`, and `recallBandSchema` in `packages/shared/src/index.ts`.
   - Wire `PatientRecallsHubModal` to live API data via `GET /api/patients/recall-candidates`.
   - Purge synthetic mock data generation from `RecallListPanel.tsx` and replace it with genuine error handling.
3. **Price List Endpoints**: Consolidate baseline seeding endpoints into `POST /api/pricelist/seed-baseline-804n` and deprecate or proxy the duplicate in `settings.ts`.

---

## 5. Verification Method

To independently verify the observations and findings in this report:

1. **Verify Patient Debt Math & Tests**:
   - Inspect: `apps/api/src/money/patientDebt.ts` lines 74-170 and `apps/api/src/db/patientsQuery.ts` lines 82-140.
   - Run unit test:
     ```powershell
     npm test -- apps/api/src/money/patientDebt.test.ts
     ```
2. **Verify Recalls Backend Query & Deduplication**:
   - Inspect: `apps/api/src/services/patients/recallCandidates.ts` lines 145-212 (`getRecallReport`) and `apps/api/src/routes/patientRecall.ts` lines 50-155.
3. **Verify Recalls Triple-Split in Frontend & Shared**:
   - Inspect: `packages/shared/src/index.ts` (search for `recallEngine` or `RecallItem` — confirm absence).
   - Inspect: `apps/web/src/CommunicationsView.tsx` line 1083 (confirm `<PatientRecallsHubModal>` has no candidates prop).
   - Inspect: `apps/web/src/components/patients/RecallListPanel.tsx` lines 128-174 (confirm fake synthetic mock generation in catch block).
4. **Verify Duplicate Price List Seed Endpoints**:
   - Inspect: `apps/api/src/routes/pricelist.ts` line 245 and `apps/api/src/routes/settings.ts` line 241.
