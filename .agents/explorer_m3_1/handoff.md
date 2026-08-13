# Handoff Report — Explorer M3 (Milestone M3: Billing & Finance Queries)

**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\explorer_m3_1`  
**Target Test File**: `apps/api/src/db/tests/billingQuery.test.ts`  
**Target Module**: `apps/api/src/db/billingQuery.ts`  
**Recipient**: Parent Orchestrator (`9aa5b0cc-e98b-4043-822c-b589d295d409`)  

---

## 1. Observation

1. **Target Test File Inspection**:
   - Path: `apps/api/src/db/tests/billingQuery.test.ts` (133 total lines).
   - Lines 47–76: Function `stubTransaction` replaces `db.transaction` using `mock.method(db, "transaction", ...)` at line 72.
   - Lines 84, 100, 116: Tests call `stubTransaction()` to return fake `lockedPatients` arrays and fake `insertedRows` arrays.
   - Test suite currently contains only 3 test cases, all targeting `createPaymentInDb` via mock object interaction.

2. **Target Query Module Inspection**:
   - Path: `apps/api/src/db/billingQuery.ts` (312 total lines).
   - Exports 8 database helper functions:
     - `getDefaultOrganizationId()` (line 14)
     - `findPaymentByClientMutationIdInDb()` (line 19)
     - `getPatientForBilling()` (line 61)
     - `getVisitForBilling()` (line 78)
     - `getDocumentForBilling()` (line 95)
     - `createPaymentInDb()` (line 112)
     - `applyPaymentRefundSettlementsInDb()` (line 235)
     - `getPaymentsByPatientIdInDb()` (line 272)
   - Currently, 7 out of 8 exported functions in `billingQuery.ts` have 0 test coverage in `billingQuery.test.ts`.

3. **Existing Fixture Infrastructure**:
   - `apps/api/src/tests/support/fixtureOrganizations.ts`:
     - `withFixtureTenant(organizationId, seed)`: Runs queries inside RLS tenant context (`app.current_tenant`).
     - `withSuperuserBypass(fn)`: Runs queries under RLS bypass mode (`app.superuser_bypass = 'on'`).
     - `fixtureUuid(namespace, slot)`: Generates deterministic UUIDv4 identifiers in `dce70000-` prefix block.
     - `purgeFixtureOrganizations(organizationIds)`: Safely purges tenant rows by querying DB catalog under tenant RLS, while handling append-only audit tables (`audit_events`, `clinical_audit_logs`).

4. **Live Execution Test Run**:
   - Command: `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/db/tests/billingQuery.test.ts` (executed in `apps/api`).
   - Result: Passed 3 tests in 4.27ms, proving tests currently run purely against memory mocks without hitting PostgreSQL.

---

## 2. Logic Chain

1. **Observation 1 & 4**: `billingQuery.test.ts` passes in 4.27ms because `mock.method(db, "transaction")` stubs out `db.transaction` and replaces Drizzle's database driver calls with fake object returns (`stubTransaction`).
2. **Observation 2 & 3**: PostgreSQL 18 is running natively on `127.0.0.1:5432` with FORCE RLS enabled. The helper module `fixtureOrganizations.ts` provides `withFixtureTenant`, `withSuperuserBypass`, `fixtureUuid`, and `purgeFixtureOrganizations` specifically designed to seed and clean up live DB tenant rows without mock stubs.
3. **Logic Step A**: To eradicate DB mocks for Milestone M3, all usages of `mock.method(db, "transaction")` and `stubTransaction()` in `billingQuery.test.ts` must be removed.
4. **Logic Step B**: Real DB entity rows (`organizations`, `patients`, `visits`, `generated_documents`) must be seeded in `before()` using `withSuperuserBypass` and `withFixtureTenant` with deterministic UUIDs generated via `fixtureUuid("m3.billingQuery.test.ts", slot)`.
5. **Logic Step C**: Tests for `createPaymentInDb` must execute against real PostgreSQL 18, exercising the actual pessimistic row lock `tx.select({ id: schema.patients.id }).from(schema.patients)...for("update")` and insertion into `schema.payments`.
6. **Logic Step D**: The test suite should be expanded to cover all 8 exported functions in `billingQuery.ts` (including `applyPaymentRefundSettlementsInDb`, `findPaymentByClientMutationIdInDb`, `getPatientForBilling`, `getVisitForBilling`, `getDocumentForBilling`, `getPaymentsByPatientIdInDb`, and `getDefaultOrganizationId`), ensuring 100% DB integration coverage for Milestone M3.

---

## 3. Caveats

- **Audit Table Append-Only Behavior**: While `payments`, `patients`, `visits`, and `generated_documents` are fully purgeable by `purgeFixtureOrganizations`, any future triggers writing to `audit_events` or `clinical_audit_logs` will lock those audit rows from being deleted by the app role `dental`. Using deterministic `fixtureUuid("m3.billingQuery.test.ts", slot)` ensures that tenant UUIDs are reused deterministically and old rows are safely cleaned up on fixture entry (`before` hook).
- No other caveats.

---

## 4. Conclusion

Milestone M3 (`apps/api/src/db/tests/billingQuery.test.ts`) is fully analyzed. All DB mock calls (`mock.method(db, "transaction")` and `stubTransaction`) have been catalogued, all entity dependencies identified, and an exact PostgreSQL 18 fixture strategy designed. The refactoring blueprint is ready in `analysis.md` for worker execution.

---

## 5. Verification Method

1. **Static Mock Eradication Check**:
   Run:
   ```bash
   rg "mock\.method\(db" apps/api/src/db/tests/billingQuery.test.ts
   ```
   *Expected Output*: 0 matches.

2. **Integration Test Suite Execution**:
   Run from `apps/api`:
   ```bash
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/db/tests/billingQuery.test.ts
   ```
   *Expected Output*: All test cases pass against PostgreSQL 18 without mock errors or foreign key constraint failures.

3. **Full API Package Test Suite Verification**:
   Run from repository root:
   ```bash
   npm run test -w @dental/api
   ```
   *Expected Output*: Full test suite completes with zero failing tests.
