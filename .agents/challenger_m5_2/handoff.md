# Handoff Report — Challenger 2 (Boundary & Concurrency Challenger)

**Verdict**: REQUEST_CHANGES

## 1. Observation

Direct empirical execution of the integration test suite (`npm run test -w @dental/api` and direct `node --test` calls against PostgreSQL 18 at `127.0.0.1:5432`) revealed the following exact outputs and failures:

### A. Consecutive Execution & Key Collision (`organizations_pkey`)
1. Running `src/audit.test.ts` and `src/db/auditQuery.test.ts` a second time against a database that has recorded audit events produces a hard failure:
   ```
   cause: error: повторяющееся значение ключа нарушает ограничение уникальности "organizations_pkey"
   Detail: Ключ "(id)=(dce70000-b81f-437a-8043-a6f767e70001)" уже существует.
   code: '23505', table: 'organizations', constraint: 'organizations_pkey'
   ```
2. Cause in `src/audit.test.ts` (lines 14-26) and `src/db/auditQuery.test.ts` (lines 14-26):
   - Module top-level initializes `let testIndex = 0;`.
   - `beforeEach` runs `testIndex++; orgId = fixtureUuid("audit", testIndex);`.
   - On the first process run, `testIndex = 1` yields `orgId = dce70000-...-0001`.
   - The test inserts an organization and writes rows into `audit_events` or `clinical_audit_logs`.
   - Per migration `0161_audit_append_only.sql`, `audit_events` rows are append-only (role `dental` DELETE privilege revoked). `purgeFixtureOrganizations([orgId])` correctly detects remaining audit rows and preserves the organization.
   - On the next test suite execution (or consecutive run), `testIndex` resets to 0. Test 1 requests `testIndex = 1` -> `dce70000-...-0001`. `beforeEach` executes `db.insert(organizations).values(...)` without `onConflictDoNothing()`.
   - PostgreSQL rejects the insert with `23505` (`organizations_pkey` violation).

### B. Broken Imports & Schema Mismatches in Audit Tests
1. `src/clinicalAuditService.test.ts` fails to load entirely:
   ```
   SyntaxError: The requested module './db/schema.js' does not provide an export named 'clinicalAuditEvents'
   ```
   - Line 6 of `src/clinicalAuditService.test.ts` attempts to import `clinicalAuditEvents` from `./db/schema.js`.
   - `apps/api/src/db/schema.ts` exports `clinicalAuditLogs` (table `"clinical_audit_logs"`), not `clinicalAuditEvents`.

2. `src/audit.test.ts` (test 2: "записывает автора события, когда вызывающий его передал"):
   ```
   cause: error: значение NULL в столбце "full_name" отношения "users" нарушает ограничение NOT NULL
   code: '23502', table: 'users', column: 'full_name'
   ```
   - Line 62 of `src/audit.test.ts` inserts into `users` with `name: "Test User"`. The schema column is `fullName`, so `full_name` evaluates to `NULL`.

### C. Authentic 500 Error Paths (DB Mock Eradication Verification)
1. `src/routes/auth.test.ts` (line 58, test `"returns 500 when database throws an error"`):
   - Payloads `email: "test\0@example.com"`.
   - Directly verified output:
     ```
     cause: error: неверная последовательность байт для кодировки "UTF8": 0x00
     code: '22021', file: 'mbutils.c', routine: 'report_invalid_encoding'
     ```
   - The null-byte `\0` is processed by PostgreSQL's C engine (`mbutils.c`), raising authentic error `22021`. Fastify catches this real database driver error and returns status `500` with `{ error: "AuthUnavailable" }`.
   - Zero DB mocks (`t.mock.method(db, ...)`) are used. All 34 tests in `auth.test.ts` pass cleanly in 3.1s.

---

## 2. Logic Chain

1. **Premise**: Integration tests must be repeatable, idempotent, and resilient under consecutive execution without residual state corruption or key collisions.
2. **Observation**: `audit_events` and `clinical_audit_logs` are append-only tables by database policy. Organizations with audit records cannot be purged by `purgeFixtureOrganizations`.
3. **Deduction**: Deterministic fixture IDs derived from fixed indices (`testIndex = 1, 2...`) will collide on any subsequent run if the seeding logic uses explicit `insert` without collision handling (`onConflictDoNothing()` or unique runtime namespace per run).
4. **Observation**: `clinicalAuditService.test.ts` has a broken import (`clinicalAuditEvents`), and `audit.test.ts` has a schema mismatch (`name` vs `fullName`).
5. **Conclusion**: The integration test suite fails under consecutive execution due to fixed UUID index collisions on append-only audit tables and schema import bugs. Therefore, the suite cannot be approved until these boundary defects are resolved.

---

## 3. Caveats

- Tests that do NOT write to append-only audit tables (e.g. `auth.test.ts`, `imports.test.ts`, `dicomweb.test.ts`, `imaging.test.ts`, `billingQuery.test.ts`) clean up after themselves properly via `purgeFixtureOrganizations` and pass cleanly.
- No DB mocks were detected on database query methods in the refactored integration tests (`rg "mock\.method.*db"` returns 0 matches). Real PostgreSQL 18 RLS and connection error paths are active.

---

## 4. Conclusion

**Verdict**: REQUEST_CHANGES

### Required Fixes for Approval:
1. **Fix `src/clinicalAuditService.test.ts`**:
   - Change import in line 6 from `clinicalAuditEvents` to `clinicalAuditLogs` (matching `apps/api/src/db/schema.ts`).
2. **Fix `src/audit.test.ts`**:
   - Fix line 64 user insert: change `name: "Test User"` to `fullName: "Test User"`.
   - Update org seeding in `beforeEach` to handle existing append-only orgs using `.onConflictDoNothing()` or randomized/timestamped run namespaces.
3. **Fix `src/db/auditQuery.test.ts`**:
   - Update org seeding in `beforeEach` to handle existing append-only orgs using `.onConflictDoNothing()` or unique run namespaces.
4. **Re-run Full Suite**:
   - Ensure `npm run test -w @dental/api` passes 100% on two consecutive runs without any `organizations_pkey` collisions or schema errors.

---

## 5. Verification Method

To verify the findings and any subsequent fixes:

1. **Run `clinicalAuditService.test.ts`**:
   ```bash
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/clinicalAuditService.test.ts
   ```
2. **Run `audit.test.ts` twice consecutively**:
   ```bash
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/audit.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/audit.test.ts
   ```
3. **Run `db/auditQuery.test.ts` twice consecutively**:
   ```bash
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/db/auditQuery.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/db/auditQuery.test.ts
   ```
4. **Run full API test suite twice consecutively**:
   ```bash
   npm run test -w @dental/api
   npm run test -w @dental/api
   ```
