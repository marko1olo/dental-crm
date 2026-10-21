# Handoff Report — Explorer Survey 2: API Test Infrastructure & DB Mock Audit

## Executive Summary
This report presents an exhaustive survey of the backend test infrastructure in `apps/api/src/` for Dente CRM. It details how real PostgreSQL database testing operates under Row-Level Security (RLS) and FORCE RLS, and identifies all 7 non-route test files that currently contain database mocks (`t.mock.method(db, ...)` or `mock.method(db, ...)`).

---

## 1. Observation

### 1.1 Test Support Infrastructure (`apps/api/src/tests/support/`)

#### A. Pool Teardown (`apps/api/src/tests/support/poolTeardown.ts`)
- **File Path**: `apps/api/src/tests/support/poolTeardown.ts`
- **Mechanism**: Registers a global `node:test` `after()` hook that calls `await endPool()` from `apps/api/src/db/client.ts`.
- **Purpose**: Idempotently closes the `pg.Pool` connection at process completion so node test processes do not hang due to active socket handles.

#### B. Fixture Organizations & RLS (`apps/api/src/tests/support/fixtureOrganizations.ts`)
- **File Path**: `apps/api/src/tests/support/fixtureOrganizations.ts`
- **Key Functions & Mechanisms**:
  1. `fixtureUuid(namespace: string, slot: number): string`
     - Computes a deterministic UUIDv4 in prefix space `dce70000-` via SHA-256 hash of `namespace` + hex `slot`.
     - Solves UUID collisions across concurrent parallel test processes without manual block allocation.
  2. `withFixtureTenant<T>(organizationId: string, seed: (tx: TenantDb) => Promise<T>): Promise<T>`
     - Runs seed operations under `withTenantCtx(organizationId, seed)`.
     - In PostgreSQL under FORCE RLS (`NOSUPERUSER/NOBYPASSRLS` app role `dental`), RLS policies check `WITH CHECK (id = app.current_tenant)` for inserts into `organizations`, `patients`, `users`, `clinics`, etc. Setting session variable `app.current_tenant` allows fixture seeding to pass RLS without error `42501`.
  3. `withSuperuserBypass<T>(fn: (tx: TenantDb) => Promise<T>): Promise<T>`
     - Sets session variable `app.superuser_bypass = 'on'` in transaction.
     - Required to insert the base `organizations` row before setting `app.current_tenant` to that organization ID.
  4. `purgeFixtureOrganizations(organizationIds: readonly string[]): Promise<FixturePurgeReport>`
     - Safely cleans test clinics matching `dce70000-` prefix.
     - Inspects `information_schema.columns` for tables with `organization_id`.
     - Identifies deletable tables vs. append-only audit tables (`audit_events`, `clinical_audit_logs` where `DELETE` privilege was revoked by migration `0161_audit_append_only.sql`).
     - Performs up to 8 delete passes using `SAVEPOINT` + `ROLLBACK TO SAVEPOINT` per table within tenant context.
     - Handles append-only tables cleanly: if an organization has append-only audit log entries, the root `organizations` row is preserved (avoiding FK constraint `23503`), but dependent rows in deletable tables are purged.

#### C. Fastify Tenant Test App (`apps/api/src/tests/support/tenantTestApp.ts`)
- **File Path**: `apps/api/src/tests/support/tenantTestApp.ts`
- **Key Function**: `createTenantTestApp(): FastifyInstance`
- **Mechanism**: Attaches `onRequest` and `onRoute` hooks to Fastify to extract tenant ID from JWT identity headers and wrap route handler execution inside `withTenantCtx(tenantId, ...)`. This mirrors production behavior in `server.ts` so route tests execute under live RLS tenant isolation.

---

### 1.2 Inventory of Non-Route Test Files Containing Database Mocks

Exhaustive search across `apps/api/src/` (excluding route test suites in `routes/`) revealed exactly **7 non-route test files** utilizing database mocks:

#### File 1: `apps/api/src/db/tests/billingQuery.test.ts`
- **File Path**: `apps/api/src/db/tests/billingQuery.test.ts`
- **Lines**: 72-76 (`mock.method(db, "transaction", ...)`), 52-71 (fake `tx.select` and `tx.insert`)
- **Mock Pattern**:
  ```ts
  mock.method(db, "transaction", async (callback: (tx: unknown) => unknown) => callback(tx));
  ```
  Stubs `db.transaction` with a fake transaction object (`tx`) providing dummy `select` and `insert` builders returning `mockPaymentData`.
- **Target Function**: `createPaymentInDb(orgId, paymentData)` in `apps/api/src/db/billingQuery.ts`.
- **Prerequisites for Real DB Interaction**:
  - `fixtureUuid("billing-query", testIndex)` for dynamic org and patient UUID generation.
  - `purgeFixtureOrganizations([orgId])` in `beforeEach`/`afterEach`.
  - `withSuperuserBypass` to seed `organizations`, `patients`, `visits` in DB.
  - `withFixtureTenant(orgId, ...)` to execute `createPaymentInDb`.
- **Audit Log Involvement**:
  - Payment insertion updates patient balance and may generate audit events. Since append-only triggers prevent deletion of audit log entries, unique `fixtureUuid("billing-query", testIndex)` with `testIndex++` per test run is required.

#### File 2: `apps/api/src/db/tests/clinicalQuery.test.ts`
- **File Path**: `apps/api/src/db/tests/clinicalQuery.test.ts`
- **Lines**: 16-26 (`mockDbResponse` wrapper mocking `db.select`)
- **Mock Pattern**:
  ```ts
  mock.method(db, "select", () => ({ from: () => ({ where: async () => records }) }));
  ```
- **Target Function**: `evaluateClinicalRulesInDb(orgId, params)` in `apps/api/src/db/clinicalQuery.ts`.
- **Prerequisites for Real DB Interaction**:
  - `fixtureUuid("clinical-query-eval", testIndex)` for org ID.
  - `purgeFixtureOrganizations([orgId])` in cleanup.
  - `withSuperuserBypass` to seed `organizations` and `clinical_rules` rows with test rule JSON payloads (`triggerServiceIdsJson`, `requiredServiceIdsJson`, `blockedServiceIdsJson`).
  - `withFixtureTenant(orgId, ...)` to execute `evaluateClinicalRulesInDb`.
- **Audit Log Involvement**:
  - Evaluation is read-only. No append-only audit entries created during evaluation.

#### File 3: `apps/api/src/tests/db/patientsQuery.test.ts`
- **File Path**: `apps/api/src/tests/db/patientsQuery.test.ts`
- **Lines**: 51-57 (`t.mock.method(db, "select", ...)`), 66-72 (`t.mock.method(db, "insert", ...)`), 81-89 (`t.mock.method(db, "update", ...)`), 101-109 (`t.mock.method(db, "update", ...)`), 121-139, 147-168, 176-185
- **Mock Pattern**:
  ```ts
  t.mock.method(db, "select", () => ({ from: () => ({ where: async () => { throw DB_DOWN; } }) }));
  t.mock.method(db, "insert", () => ({ values: () => ({ returning: async () => { throw DB_DOWN; } }) }));
  t.mock.method(db, "update", () => ({ set: () => ({ where: () => ({ returning: async () => [...] }) }) }));
  ```
- **Target Functions**: `getPatientsFromDb`, `createPatientInDb`, `updatePatientInDb`, `updatePatientAdministrativeProfileInDb` in `apps/api/src/db/patientsQuery.ts`.
- **Prerequisites for Real DB Interaction**:
  - Tests 1-4 test DB error propagation when `DENTAL_STATE_PERSISTENCE=on`.
  - Tests 5-7 test real CRUD operations and must be converted to use real DB fixtures: `fixtureUuid("patients-query", testIndex)`, `purgeFixtureOrganizations([orgId])`, `withSuperuserBypass` for org setup, and `withFixtureTenant(orgId, ...)` for CRUD.
- **Audit Log Involvement**:
  - Patient creation and updates touch audit logging. Unique `testIndex++` UUIDs per test case are required.

#### File 4: `apps/api/src/tests/db/clinicalQuery.test.ts`
- **File Path**: `apps/api/src/tests/db/clinicalQuery.test.ts`
- **Lines**: 12-16 (`t.mock.method(db, "select", ...)`), 23-46 (`t.mock.method(db, "select", ...)` returning JSON string fields)
- **Mock Pattern**:
  ```ts
  t.mock.method(db, "select", () => ({ from: () => ({ where: async () => [...] }) }));
  ```
- **Target Function**: `getClinicalRules(orgId)` in `apps/api/src/db/clinicalQuery.js`.
- **Prerequisites for Real DB Interaction**:
  - `fixtureUuid("clinical-query-rules", testIndex)`.
  - `purgeFixtureOrganizations([orgId])`.
  - `withSuperuserBypass` to seed test rows into `clinical_rules` table.
  - `withFixtureTenant(orgId, ...)` to invoke `getClinicalRules`.
- **Audit Log Involvement**:
  - Read-only query. No audit log rows created.

#### File 5: `apps/api/src/services/tests/biAnalyticsWorker.test.ts`
- **File Path**: `apps/api/src/services/tests/biAnalyticsWorker.test.ts`
- **Lines**: 105-110 (`t.mock.method(db, "select", ...)` for worker scheduling test)
- **Mock Pattern**:
  ```ts
  t.mock.method(db, "select", () => ({ from: () => Promise.resolve([]) }));
  ```
- **Target Function**: `startBiAnalyticsWorker()` in `apps/api/src/services/biAnalyticsWorker.ts`.
- **Prerequisites for Real DB Interaction**:
  - `fixtureUuid("bi-analytics-worker", testIndex)`.
  - Seed organizations, payments, appointments.
  - Execute worker under `withSuperuserBypass` or `withFixtureTenant`.
- **Audit Log Involvement**:
  - Worker reads DB metrics and writes snapshots.

#### File 6: `apps/api/src/services/tests/postOpCareTrigger.test.ts`
- **File Path**: `apps/api/src/services/tests/postOpCareTrigger.test.ts`
- **Lines**: 33-36 (`mock.method(db, "insert", ...)`)
- **Mock Pattern**:
  ```ts
  mock.method(db, "insert", (schema) => {
    assert.strictEqual(schema, outgoingNotifications);
    return { values: valuesMock };
  });
  ```
- **Target Function**: `triggerPostOpCare(orgId, patientId, itemTitle)` in `apps/api/src/services/postOpCareTrigger.ts`.
- **Prerequisites for Real DB Interaction**:
  - `fixtureUuid("post-op-care", testIndex)`.
  - `purgeFixtureOrganizations([orgId])`.
  - `withSuperuserBypass` to seed `organizations` and `patients`.
  - `withFixtureTenant(orgId, ...)` to run `triggerPostOpCare`.
  - Verify inserted row in `outgoing_notifications` via real `db.select()`.
  - Note: Fix legacy `after()` block which calls `await pool.end()`.
- **Audit Log Involvement**:
  - Notification triggers may create audit records.

#### File 7: `apps/api/src/services/notificationWorker.test.ts`
- **File Path**: `apps/api/src/services/notificationWorker.test.ts`
- **Lines**: 20-28 (`t.mock.method(db, "select", ...)`)
- **Mock Pattern**:
  ```ts
  const dbSelectMock = t.mock.method(db, "select", () => ({
    from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) })
  }));
  ```
- **Target Function**: `startNotificationWorker()` in `apps/api/src/services/notificationWorker.ts`.
- **Prerequisites for Real DB Interaction**:
  - `fixtureUuid("notification-worker", testIndex)`.
  - `purgeFixtureOrganizations([orgId])`.
  - `withSuperuserBypass` to insert `organizations` and `outgoing_notifications` rows.
  - Execute worker tick and assert status changes in real database table.
- **Audit Log Involvement**:
  - Processing notifications updates outgoing notification rows and delivery status logs.

---

## 2. Logic Chain

1. **Observed System Architecture**:
   - Dente CRM backend utilizes native PostgreSQL 18 with RLS enabled on all tenant tables (`organizations`, `patients`, `users`, `payments`, `clinical_rules`, etc.).
   - The application database role `dental` runs under `FORCE RLS` (`NOSUPERUSER/NOBYPASSRLS`).
   - Tables `audit_events` and `clinical_audit_logs` are append-only; `DELETE` permissions were revoked by migration `0161_audit_append_only.sql`.

2. **Impact on Database Testing**:
   - Hand-rolled database mocks (`t.mock.method(db, ...)`) bypass RLS, fail to test real SQL queries, miss schema mismatch bugs, and provide false confidence.
   - Under FORCE RLS, executing raw queries without `app.current_tenant` returns 0 rows or throws RLS policy error `42501`.
   - Real DB tests MUST use `withSuperuserBypass` to create the tenant organization, and `withFixtureTenant(orgId, ...)` for seeded entities and query executions.

3. **Purge & Cleanup Mechanics**:
   - Because `audit_events` and `clinical_audit_logs` prevent row deletion, attempt to delete organizations with audit logs throws FK error `23503`.
   - `fixtureOrganizations.ts` addresses this by using `fixtureUuid(namespace, testIndex++)` to generate unique deterministic UUIDs per test file and test run. `purgeFixtureOrganizations` safely cleans deletable dependent tables while gracefully skipping append-only audit rows without failing the test runner.

---

## 3. Caveats

- **Scope Boundary**: This investigation focused exclusively on non-route test files under `apps/api/src/`. Route test files (`apps/api/src/routes/**/*.test.ts` and `apps/api/src/tests/routes/**/*.test.ts`) are assigned to separate explorer agents.
- **Assumptions**: PostgreSQL 18 must be running locally at `127.0.0.1:5432` with `DATABASE_URL` configured when executing real DB integration tests.
- **Invalidation Conditions**: If database schema changes or new append-only tables are added, `fixtureOrganizations.ts` dynamically queries `information_schema` to detect `DELETE` privileges, ensuring safe teardowns without manual file adjustments.

---

## 4. Conclusion

All test support mechanics (`poolTeardown.ts`, `fixtureOrganizations.ts`, `tenantTestApp.ts`) are fully established, proven, and operational in Dente CRM. Exactly **7 non-route test files** in `apps/api/src/` currently rely on `db` mocks:

1. `apps/api/src/db/tests/billingQuery.test.ts`
2. `apps/api/src/db/tests/clinicalQuery.test.ts`
3. `apps/api/src/tests/db/patientsQuery.test.ts`
4. `apps/api/src/tests/db/clinicalQuery.test.ts`
5. `apps/api/src/services/tests/biAnalyticsWorker.test.ts`
6. `apps/api/src/services/tests/postOpCareTrigger.test.ts`
7. `apps/api/src/services/notificationWorker.test.ts`

These 7 files can be systematically rewritten using `fixtureUuid`, `withFixtureTenant`, `withSuperuserBypass`, and `purgeFixtureOrganizations` to achieve 100% real PostgreSQL database verification with zero mocks.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Existing Fixture Support Infrastructure**:
   ```bash
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/tests/support/fixtureOrganizations.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/tests/support/tenantTestApp.test.ts
   ```

2. **Verify Flagged Non-Route Test Files**:
   ```bash
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/db/tests/billingQuery.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/db/tests/clinicalQuery.test.ts
   node --import tsx --import ./src/tests/db/patientsQuery.test.ts
   node --import tsx --import ./src/tests/db/clinicalQuery.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/tests/biAnalyticsWorker.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/tests/postOpCareTrigger.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/notificationWorker.test.ts
   ```

3. **Verify Static Absence of DB Mocks (Post-Refactoring Gate)**:
   ```bash
   rg "t\.mock\.method\(db" apps/api/src -g "!apps/api/src/routes/**" -g "!apps/api/src/tests/routes/**"
   rg "mock\.method\(db" apps/api/src -g "!apps/api/src/routes/**" -g "!apps/api/src/tests/routes/**"
   ```
