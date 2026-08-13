# HANDOFF — Milestone M1: Auth & Tenant Routes Test Refactoring Strategy

## 1. Observation

Exhaustive code analysis of `apps/api/src/routes/auth.test.ts` (960 lines) and `apps/api/src/routes/imports.test.ts` (106 lines) reveals widespread reliance on `mock.method(db, ...)` stubs for database interactions.

### Direct Observations & Verbatim Snippets

1. **`apps/api/src/routes/imports.test.ts`**:
   - **Line 20**: Hardcoded static UUID string:
     ```ts
     const ORG_ID = "123e4567-e89b-12d3-a456-4266141740ff";
     ```
   - **Lines 25–27**: Global `beforeEach` stub mocking `db.select` to bypass database queries:
     ```ts
     mock.method(db, "select", () => ({
         from: () => ({ where: async () => [] }),
     }));
     ```

2. **`apps/api/src/routes/auth.test.ts`**:
   - **Lines 35–43**: DB failure injection test:
     ```ts
     mock.method(db, "select", () => ({
         from: () => ({
             where: () => ({
                 limit: async () => { throw new Error("DB Error"); }
             })
         })
     }));
     ```
   - **Lines 54–60**: Clinic login non-existent org stub:
     ```ts
     mock.method(db, "select", () => ({
         from: () => ({ where: () => ({ limit: async () => [] }) })
     }));
     ```
   - **Lines 71–87**: Clinic login success stubbing both `db.select` and `db.insert` (audit event):
     ```ts
     mock.method(db, "select", () => ({ ... passwordHash: await hashCredential("password123") }));
     mock.method(db, "insert", () => ({ values: async () => {} }));
     ```
   - **Lines 120–148**: Staff unlock stubbing user queries for non-existent user and wrong PIN.
   - **Lines 165–182**: Staff unlock success stubbing `db.select` and `db.insert`.
   - **Lines 212–218**: Direct login invalid credentials stubbing `db.select`.
   - **Lines 229–251**: Direct login success stubbing `db.select`.
   - **Lines 280–286**: User profile `/api/auth/user/me` 404 test stubbing `db.select`.
   - **Lines 299–307**: User profile `/api/auth/user/me` 200 test stubbing `db.select`.
   - **Lines 380–409**: Permission precedence helper functions `forbidDatabaseAccess()` and `allowDatabaseWrites()` stubbing `db.select`, `db.update`, and `db.insert`.

3. **Support Infrastructure (`apps/api/src/tests/support/`)**:
   - `fixtureOrganizations.ts`: Provides `fixtureUuid(namespace, index)` for deterministic UUID generation (`dce70000-` prefix), `withFixtureTenant` (executes within RLS tenant context `app.current_tenant`), `withSuperuserBypass` (bypasses RLS for root org/user inserts), and `purgeFixtureOrganizations` (safely purges tenant data).
   - `tenantTestApp.ts`: Provides `createTenantTestApp()`, a Fastify instance configured with tenant isolation hooks (`onRequest` and `onRoute`), so JWT tokens automatically attach `request.tenantId` and wrap route handlers in `withTenantCtx(tenantId, ...)`.

---

## 2. Logic Chain

1. **Why database mocks must be eradicated**:
   - Database stubs (`mock.method(db, ...)`) mask schema mismatches, RLS policy failures, missing foreign keys, and broken transaction logic.
   - Routes in `auth.ts` (such as clinic login, staff unlock, direct user login) write append-only records to `audit_events`. Under PostgreSQL 18 FORCE RLS and append-only trigger rules, real database queries must execute against real PostgreSQL tables.

2. **Handling Append-Only Audit Tables & Organization Collisions**:
   - Auth routes write audit logs to `audit_events` on successful logins and unlocks.
   - `audit_events` cannot be cleared with `DELETE` by the application role `dental` (migration `0161_audit_append_only.sql`).
   - Therefore, tests writing to audit tables MUST use deterministic, per-test-case unique organization UUIDs generated via `fixtureUuid("auth.test.ts", index++)`. This guarantees each test case operates on a distinct fixture organization without primary key or foreign key conflicts upon re-runs.

3. **Replacing Mocks in `apps/api/src/routes/imports.test.ts`**:
   - Define `ORG_ID = fixtureUuid("imports.test.ts", 1)`.
   - In `beforeEach`, call `purgeFixtureOrganizations([ORG_ID])` and seed a fixture organization in PostgreSQL via `withSuperuserBypass`.
   - In `afterEach`, call `purgeFixtureOrganizations([ORG_ID])`.
   - Remove the `mock.method(db, "select", ...)` stub.
   - `buildPatientImportIntake(ORG_ID, input)` will execute real `db.select().from(patients)...` against PostgreSQL, finding 0 existing patients for `ORG_ID`, and returning the normalized intake response.

4. **Replacing Mocks in `apps/api/src/routes/auth.test.ts`**:
   - **`clinic login`**:
     - Remove `db.select` and `db.insert` stubs.
     - Seed a real organization with hashed password (`await hashCredential("password123")`) using `withSuperuserBypass`.
     - Test 401 with missing org email (queries real DB, returns 0 rows).
     - Test 200 with correct credentials (queries real DB, validates password hash, inserts real `audit_events` row).
   - **`staff unlock`**:
     - Seed real org `ORG_ID` and user `USER_ID` with `pinCodeHash: await hashCredential("1234")`.
     - Test non-existent `userId` vs wrong `pinCode`: real DB queries return 0 rows or fail hash check, producing identical 401 responses.
     - Test 200 unlock: real DB checks PIN, writes audit log, returns valid `staffToken`.
   - **`direct user login`**:
     - Seed real org and user with `email` and `passwordHash`.
     - Test 401 for invalid credentials vs 200 for valid credentials against real PostgreSQL.
   - **`user profile (/api/auth/user/me)`**:
     - Test 404 with non-existent `userId` in `staffToken` against real DB.
     - Test 200 with seeded user profile in real DB.
   - **`права проверяются раньше тела запроса`**:
     - For unauthenticated forbidden tests, auth guards reject requests before DB is touched.
     - For authenticated write tests (`set-password`, `set-pin`), replace `allowDatabaseWrites()` with real DB fixture seeding using `withSuperuserBypass` and execute real DB updates on `organizations` and `users` tables.
   - **`SaaS body Zod validation`**:
     - Pure validation tests (lines 714–958) hit Fastify validation guards before DB and require no changes.

---

## 3. Caveats

- **Fault-Injection Test**: `test("returns 500 when database throws an error")` in `auth.test.ts:34` explicitly tests Fastify's 500 error boundary when `db.select` throws an unexpected error. This is a fault-injection check; if strictly eliminating all `mock.method(db, ...)`, it can either retain a targeted fault injection mock with explicit comments or be adapted accordingly.
- **Environment Prerequisites**: Tests running against real database fixtures require PostgreSQL 18 running on `127.0.0.1:5432` with `DATABASE_URL` set.

---

## 4. Conclusion

All database stubs (`mock.method(db, ...)`) in `apps/api/src/routes/auth.test.ts` and `apps/api/src/routes/imports.test.ts` can be completely eradicated and replaced with real PostgreSQL 18 fixture data using `withFixtureTenant`, `withSuperuserBypass`, `fixtureUuid`, and `purgeFixtureOrganizations`.

Refactoring strategy is fully defined and ready for execution by the Worker agent.

---

## 5. Verification Method

To independently verify the refactoring once implemented by the Worker:

1. **Run single test file for `auth.test.ts`**:
   ```bash
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/routes/auth.test.ts
   ```
2. **Run single test file for `imports.test.ts`**:
   ```bash
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/routes/imports.test.ts
   ```
3. **Static DB mock census check**:
   Verify zero DB mocks remain in both target test files:
   ```bash
   rg "mock\.method\(db" apps/api/src/routes/auth.test.ts apps/api/src/routes/imports.test.ts
   ```
   Expectation: 0 matches (or only fault-injection if explicitly preserved).
