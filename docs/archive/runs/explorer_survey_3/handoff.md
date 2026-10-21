# Handoff Report — Explorer Survey 3: Complete DB Mock Census in API Tests

## 1. Observation

### System Overview & Tool Execution
- **Target Scope**: `apps/api/src/**/*.test.ts`
- **Total Test Files Discovered**: **206 test files**
- **Total Test Cases**: **1,914 test cases**
- **Execution Commands**:
  - `rg "(?:\b(?:t|test)\.mock\.method|\bmock\.method)\s*\(\s*(?:db|dbRaw)\b" apps/api/src --glob "*.test.ts"`
  - `rg "global\.fetch|mock\.method.*fetch" apps/api/src --glob "*.test.ts"`
  - Custom AST and line-by-line census runners (`C:\Users\Admin\.gemini\antigravity\brain\669b4fe9-28b4-479d-9622-9bf60984cfae\scratch\verify_all_db_mocks.cjs`)

### Census Results Summary
| Metric | Count |
|---|---|
| **Total Test Files** | 206 files |
| **Total Test Cases** | 1,914 test cases |
| **Files with Real DB Fixtures (`withFixtureTenant` / `withSuperuserBypass`)** | 53 files |
| **Files with Database Mocks (`db` / `dbRaw`)** | **13 files** |
| **Test Cases in DB Mock Files** | **106 test cases** |
| **Files with External API Mocks (`global.fetch`)** | 4 files (19 test cases) |
| **Files with System Mocks (`fs`, `console`, `process`, timers)** | 12 files (94 test cases) |
| **Pure Unit / Utility Test Files (no DB, no mocks)** | 137 files |

### Complete Inventory of 13 Database Mock Files (106 Test Cases)

1. **`apps/api/src/db/tests/billingQuery.test.ts`**
   - **Test Cases**: 3
   - **Mock Target**: `mock.method(db, "transaction", ...)`
   - **Lines**: 72

2. **`apps/api/src/db/tests/clinicalQuery.test.ts`**
   - **Test Cases**: 7
   - **Mock Target**: `mock.method(db, "select", ...)`
   - **Lines**: 16

3. **`apps/api/src/routes/auth.test.ts`**
   - **Test Cases**: 34
   - **Mock Targets**: `mock.method(db, "select", ...)`, `mock.method(db, "insert", ...)`, `mock.method(db, "update", ...)`
   - **Lines**: 35, 54, 71, 85, 120, 135, 165, 180, 212, 230, 280, 299, 386, 387, 388, 394, 401, 406

4. **`apps/api/src/routes/dicomweb.test.ts`**
   - **Test Cases**: 17
   - **Mock Targets**: `t.mock.method(db, "select", ...)`, `t.mock.method(dbRaw, ...)` via helper `mockDb(t, ...)`
   - **Lines**: 111, 134, 150, 214, 231, 255, 275, 294, 313, 333, 355, 374, 396, 416, 432, 451, 477, 500, 519, 539

5. **`apps/api/src/routes/imports.test.ts`**
   - **Test Cases**: 4
   - **Mock Target**: `mock.method(db, "select", ...)`
   - **Lines**: 25

6. **`apps/api/src/routes/tests/imaging.test.ts`**
   - **Test Cases**: 2
   - **Mock Targets**: `mock.method(db, "select", ...)`, `mock.method(db, "insert", ...)`
   - **Lines**: 88, 93, 160

7. **`apps/api/src/services/notificationWorker.test.ts`**
   - **Test Cases**: 1
   - **Mock Target**: `t.mock.method(db, "select", ...)`
   - **Lines**: 20

8. **`apps/api/src/services/tests/biAnalyticsWorker.test.ts`**
   - **Test Cases**: 8
   - **Mock Target**: `t.mock.method(db, "select", ...)`
   - **Lines**: 105

9. **`apps/api/src/services/tests/postOpCareTrigger.test.ts`**
   - **Test Cases**: 1
   - **Mock Target**: `mock.method(db, "insert", ...)`
   - **Lines**: 33

10. **`apps/api/src/tests/db/clinicalQuery.test.ts`**
    - **Test Cases**: 2
    - **Mock Target**: `t.mock.method(db, "select", ...)`
    - **Lines**: 12, 23

11. **`apps/api/src/tests/db/patientsQuery.test.ts`**
    - **Test Cases**: 9
    - **Mock Targets**: `t.mock.method(db, "select", ...)`, `t.mock.method(db, "insert", ...)`, `t.mock.method(db, "update", ...)`
    - **Lines**: 51, 66, 81, 101, 121, 148, 179

12. **`apps/api/src/tests/routes/clinical.test.ts`**
    - **Test Cases**: 10
    - **Mock Targets**: `mock.method(db, "select", ...)`, `mock.method(db, "insert", ...)`, `mock.method(db, "update", ...)`
    - **Lines**: 96, 156, 231, 258

13. **`apps/api/src/tests/routes/clinicalRuleDelete.test.ts`**
    - **Test Cases**: 8
    - **Mock Targets**: `mock.method(db, "delete", ...)`, `mock.method(db, "select", ...)`
    - **Lines**: 138, 150

---

## 2. Logic Chain

1. **Discovery & Filtering**: Initial naive search looking strictly for `t.mock.method(db` returned only 5 files. A deeper scan searching for `mock.method` imported from `"node:test"` (`import { mock } from "node:test"`) expanded the match set to 13 files.
2. **Disambiguation of Mocks**:
   - **DB Mocks**: Direct interceptors of Drizzle ORM calls (`db.select`, `db.insert`, `db.update`, `db.delete`, `db.transaction`). These bypass real database operations and prevent integration verification against PostgreSQL 18.
   - **External HTTP Mocks (`global.fetch`)**: Found in 4 files (`ai/treatmentPlanPersonalize.test.ts`, `tests/ai/visitDraft.test.ts`, `tests/ai/visitFlow.test.ts`, `tests/ai.test.ts`). These mock third-party Groq LLM API responses.
   - **System Infrastructure Mocks (`fsPromises`, `console`, `process`, `net`, `timers`)**: Found in 12 files. These mock local disk I/O, process environment, stdout, and TCP sockets.
3. **Clustering Strategy**:
   The 13 database mock test files span 4 major technical domains. Grouping them into logical clusters allows orchestrators to assign bounded, independent tasks to worker agents.

---

## 3. Milestone Clusters for Eradication

### Cluster 1: Auth & Tenant Management Routes
- **Files**:
  - `apps/api/src/routes/auth.test.ts` (34 tests)
  - `apps/api/src/routes/imports.test.ts` (4 tests)
- **Total Test Cases**: 38
- **Complexity**: **High**. Requires setting up fixture staff accounts, PIN hashing, session tokens, and tenant isolation using `withFixtureTenant`.

### Cluster 2: Clinical, Imaging & Patient Routes & Queries
- **Files**:
  - `apps/api/src/routes/dicomweb.test.ts` (17 tests)
  - `apps/api/src/routes/tests/imaging.test.ts` (2 tests)
  - `apps/api/src/tests/routes/clinical.test.ts` (10 tests)
  - `apps/api/src/tests/routes/clinicalRuleDelete.test.ts` (8 tests)
  - `apps/api/src/db/tests/clinicalQuery.test.ts` (7 tests)
  - `apps/api/src/tests/db/clinicalQuery.test.ts` (2 tests)
  - `apps/api/src/tests/db/patientsQuery.test.ts` (9 tests)
- **Total Test Cases**: 55
- **Complexity**: **High**. Involves DICOM WADO/STOW metadata, clinical rule evaluation, patient records, and tooth chart state.

### Cluster 3: Billing & Finance Database Queries
- **Files**:
  - `apps/api/src/db/tests/billingQuery.test.ts` (3 tests)
- **Total Test Cases**: 3
- **Complexity**: **Medium**. Involves `db.transaction`, `for("update")` pessimistic locks on patient balances, and cash desk payments.

### Cluster 4: Background Workers & Communication Triggers
- **Files**:
  - `apps/api/src/services/notificationWorker.test.ts` (1 test)
  - `apps/api/src/services/tests/biAnalyticsWorker.test.ts` (8 tests)
  - `apps/api/src/services/tests/postOpCareTrigger.test.ts` (1 test)
- **Total Test Cases**: 10
- **Complexity**: **Medium**. Involves background queue polling, SMS delivery triggers, and BI analytics event processing.

---

## 4. Caveats

1. **Append-Only Audit Tables**: Tables such as `audit_events` and `clinical_audit_logs` have database triggers preventing row deletion during teardown. Any test writing audit records MUST generate unique tenant/organization IDs (e.g. `fixtureUuid("audit", testIndex++)`) to avoid `organizations_pkey` conflicts on re-runs.
2. **Concurrent Database Locks**: Integration tests hit the live PostgreSQL 18 instance on `127.0.0.1:5432`. Worker agents MUST run test files sequentially or use isolated fixture organizations to prevent transaction locks.
3. **External API (`global.fetch`) Mocks**: `global.fetch` mocks in `ai/treatmentPlanPersonalize.test.ts` and `tests/ai/*.test.ts` test LLM JSON schema parsing. Unless a real local LLM endpoint is provided, network fault/response mocks for Groq should remain network-level mocks rather than DB mocks.

---

## 5. Conclusion

- A total of **13 test files** (comprising **106 test cases**) in `apps/api/src` currently rely on database mocks (`db.select`, `db.insert`, `db.update`, `db.delete`, `db.transaction`).
- The remaining **53 database test files** in `apps/api/src` already successfully run against real PostgreSQL 18 fixtures (`withFixtureTenant`).
- All 13 mock files have been mapped to 4 actionable, bounded clusters for immediate execution by refactoring workers.

---

## 6. Verification Method

To independently verify the status of database mocks in `apps/api/src`:

1. **Check for remaining DB mocks**:
   ```bash
   rg "(?:\b(?:t|test)\.mock\.method|\bmock\.method)\s*\(\s*(?:db|dbRaw)\b" apps/api/src --glob "*.test.ts"
   ```
   *Expected result before refactoring*: 13 matching files.
   *Expected result after refactoring*: 0 matching files.

2. **Run a single integration test file against live PostgreSQL 18**:
   ```bash
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/db/tests/billingQuery.test.ts
   ```
