# Handoff Report — Explorer Survey 1

## 1. Observation

A full codebase search was performed using `rg` and `fd` across `apps/api/src` to identify all test files employing database mocks (`t.mock.method(db, ...)`, `mock.method(db, ...)`, `mockDb`, etc.).

### Search Command Executed
```bash
rg "(mock.*db|db.*mock|t\.mock\.method\(.*db|mock\.method\(db)" apps/api/src --glob "*.test.ts"
```

### Complete Inventory of Test Files with Database Mocks

#### A. Route Test Files (`apps/api/src/routes` and `apps/api/src/tests/routes`)

1. **`apps/api/src/routes/auth.test.ts`**
   - **Line Numbers**: Lines 35 (`mock.method(db, "select", ...)`), 54, 71, 85 (`mock.method(db, "insert", ...)`), 154 (`mock.method(db, "update", ...)`).
   - **Mocked DB Methods**: `db.select`, `db.insert`, `db.update`.
   - **Dependent Entities**: `organizations`, `users` (staff), `audit_events`.
   - **Audit Events Triggered**: **Yes**. Auth flows log to `audit_events`. Append-only trigger requires unique organization IDs per test case (e.g., `fixtureUuid("authRouteTest", index++)`).

2. **`apps/api/src/routes/dicomweb.test.ts`**
   - **Line Numbers**: Line 20 (`t.mock.method(db, "select", select)` in helper `mockDb`).
   - **Mocked DB Methods**: `db.select`.
   - **Dependent Entities**: `organizations`, `imaging_studies`, `imaging_instances`.
   - **Audit Events Triggered**: **No**.

3. **`apps/api/src/routes/imports.test.ts`**
   - **Line Numbers**: Line 25 (`mock.method(db, "select", ...)`).
   - **Mocked DB Methods**: `db.select`.
   - **Dependent Entities**: `patients`, `organizations`.
   - **Audit Events Triggered**: **No**.

4. **`apps/api/src/routes/tests/imaging.test.ts`**
   - **Line Numbers**: Lines 88 (`mock.method(db, "select", ...)`), 93 (`mock.method(db, "insert", ...)`), 103 (`mock.method(db, "insert", ...)`).
   - **Mocked DB Methods**: `db.select`, `db.insert`.
   - **Dependent Entities**: `patients`, `imaging_studies`, `organizations`.
   - **Audit Events Triggered**: **No**.

5. **`apps/api/src/tests/routes/clinicalRuleDelete.test.ts`**
   - **Line Numbers**: Lines 120 (`mock.method(db, "delete", ...)`), 135 (`mock.method(db, "select", ...)`).
   - **Mocked DB Methods**: `db.delete`, `db.select`.
   - **Dependent Entities**: `clinical_rules`, `organizations`.
   - **Audit Events Triggered**: **No**.

6. **`apps/api/src/tests/routes/clinical.test.ts`**
   - **Line Numbers**: Lines 96 (`mock.method(db, "select", ...)`), 156 (`mock.method(db, "insert", ...)`), 231 (`mock.method(db, "select", ...)`), 258 (`mock.method(db, "update", ...)`).
   - **Mocked DB Methods**: `db.select`, `db.insert`, `db.update`.
   - **Dependent Entities**: `clinical_rules`, `organizations`.
   - **Audit Events Triggered**: **No**.

---

#### B. Database Query Test Files (`apps/api/src/db/tests` and `apps/api/src/tests/db`)

7. **`apps/api/src/db/tests/billingQuery.test.ts`**
   - **Line Numbers**: Line 72 (`mock.method(db, "transaction", ...)` stubbing `tx.select`, `tx.insert`).
   - **Mocked DB Methods**: `db.transaction`, `tx.select`, `tx.insert`.
   - **Dependent Entities**: `patients`, `payments`, `visits`, `documents`, `organizations`.
   - **Audit Events Triggered**: **Yes** (Payment creation writes to financial audit trails; requires `fixtureUuid("billingQueryTest", index++)`).

8. **`apps/api/src/db/tests/clinicalQuery.test.ts`**
   - **Line Numbers**: Line 16 (`mock.method(db, "select", ...)` in `mockDbResponse`).
   - **Mocked DB Methods**: `db.select`.
   - **Dependent Entities**: `clinical_rules`, `organizations`.
   - **Audit Events Triggered**: **No**.

9. **`apps/api/src/tests/db/clinicalQuery.test.ts`**
   - **Line Numbers**: Lines 12 (`t.mock.method(db, "select", ...)`), 23 (`t.mock.method(db, "select", ...)`).
   - **Mocked DB Methods**: `db.select`.
   - **Dependent Entities**: `clinical_rules`, `organizations`.
   - **Audit Events Triggered**: **No**.

10. **`apps/api/src/tests/db/patientsQuery.test.ts`**
    - **Line Numbers**: Lines 51 (`t.mock.method(db, "select", ...)`), 66 (`t.mock.method(db, "insert", ...)`), 80 (`t.mock.method(db, "update", ...)`).
    - **Mocked DB Methods**: `db.select`, `db.insert`, `db.update`.
    - **Dependent Entities**: `patients`, `organizations`.
    - **Audit Events Triggered**: **No**.
    - **Special Note**: This test tests DB error propagation (`DB_DOWN`). Fault-injection tests must be preserved or handled via real pool error handling.

---

#### C. Service Worker Test Files (`apps/api/src/services`)

11. **`apps/api/src/services/notificationWorker.test.ts`**
    - **Line Numbers**: Line 25 (`t.mock.method(db, "select", ...)`).
    - **Mocked DB Methods**: `db.select`.
    - **Dependent Entities**: `communications_outbox`, `organizations`.
    - **Audit Events Triggered**: **No**.

12. **`apps/api/src/services/tests/postOpCareTrigger.test.ts`**
    - **Line Numbers**: Line 30 (`mock.method(db, "insert", ...)`).
    - **Mocked DB Methods**: `db.insert`.
    - **Dependent Entities**: `post_op_care_records`, `visits`, `patients`, `organizations`.
    - **Audit Events Triggered**: **No**.

13. **`apps/api/src/services/tests/biAnalyticsWorker.test.ts`**
    - **Line Numbers**: Line 20 (`t.mock.method(db, "select", ...)`).
    - **Mocked DB Methods**: `db.select`.
    - **Dependent Entities**: `analytics_metrics`, `organizations`.
    - **Audit Events Triggered**: **No**.

---

## 2. Logic Chain

1. **Observation 1**: The codebase search using `rg` identified 13 distinct test files in `apps/api/src` that mock `db` calls (`db.select`, `db.insert`, `db.update`, `db.delete`, `db.transaction`).
2. **Observation 2**: Over 50 other route test files in `apps/api/src/tests/routes/` (e.g. `visitSignAuditTrail.test.ts`, `patientInsightDropsCancelledTreatment.test.ts`, `refundSettlesCashDesk.test.ts`, `treatmentPlanFeedsMoney.test.ts`) already execute against real PostgreSQL 18 using `createTenantTestApp`, `withFixtureTenant`, `withSuperuserBypass`, and `fixtureUuid`.
3. **Reasoning Step 1**: The established infrastructure for real DB test execution (`withFixtureTenant`, `fixtureUuid`, `createTenantTestApp`, `poolTeardown.ts`) is well-tested and actively used across the majority of the route test suite.
4. **Reasoning Step 2**: To eliminate DB mocks from the remaining 13 files, each mock setup can be replaced by inserting real entities into PostgreSQL using `withFixtureTenant` / `db.insert` before test execution, and running queries against PostgreSQL 18 on `127.0.0.1:5432`.
5. **Reasoning Step 3**: For tests touching `audit_events` or `clinical_audit_logs` (e.g. `auth.test.ts` and `billingQuery.test.ts`), because append-only DB triggers forbid truncating audit tables, every test run must generate a fresh UUID using `fixtureUuid(namespace, testIndex++)` and clean up tenant records via `purgeFixtureOrganizations([ORGANIZATION_ID])` in `before` / `after` blocks.

---

## 3. Caveats

1. **DB Fault Propagation Tests**: `apps/api/src/tests/db/patientsQuery.test.ts` specifically tests what happens when `db` throws an error (`DB_DOWN`). When refactoring, error simulation can use explicit connection failure simulation or mock restoration after error testing.
2. **Non-DB Mocks**: External service mocks (such as `globalThis.fetch` for AssemblyAI/Telegram/Groq in `ai/treatmentPlanPersonalize.test.ts` or `fsPromises` in `routes/documents.test.ts`) are network/filesystem mocks, not database mocks. Per requirements R1 & R2, database operations must hit PostgreSQL, while external network calls remain mockable where appropriate.

---

## 4. Conclusion

- A total of **13 test files** under `apps/api/src` contain database mocks.
- **Primary Route Targets** (6 files):
  1. `apps/api/src/routes/auth.test.ts`
  2. `apps/api/src/routes/dicomweb.test.ts`
  3. `apps/api/src/routes/imports.test.ts`
  4. `apps/api/src/routes/tests/imaging.test.ts`
  5. `apps/api/src/tests/routes/clinicalRuleDelete.test.ts`
  6. `apps/api/src/tests/routes/clinical.test.ts`
- **DB Query & Service Worker Targets** (7 files):
  7. `apps/api/src/db/tests/billingQuery.test.ts`
  8. `apps/api/src/db/tests/clinicalQuery.test.ts`
  9. `apps/api/src/tests/db/clinicalQuery.test.ts`
  10. `apps/api/src/tests/db/patientsQuery.test.ts`
  11. `apps/api/src/services/notificationWorker.test.ts`
  12. `apps/api/src/services/tests/postOpCareTrigger.test.ts`
  13. `apps/api/src/services/tests/biAnalyticsWorker.test.ts`

- Replacement with real PostgreSQL 18 fixtures is straight-forward using `withFixtureTenant`, `createTenantTestApp`, and `fixtureUuid`.

---

## 5. Verification Method

To independently verify the inventory and run real DB integration tests:

1. **Search Verification Command**:
   ```bash
   rg "(mock\.method\(db|t\.mock\.method\(db|mockDb\(t)" apps/api/src --glob "*.test.ts"
   ```

2. **Test Execution Command** (against PostgreSQL 18 on `127.0.0.1:5432`):
   ```bash
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/routes/auth.test.ts
   ```

3. **Full Suite Test Execution**:
   ```bash
   npm run test -w @dental/api
   ```
