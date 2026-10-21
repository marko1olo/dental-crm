# Forensic Audit Report

**Work Product**: All 13 Refactored Integration Test Files in `apps/api/src`
**Profile**: General Project (Development Mode / Integrity Forensics)
**Verdict**: INTEGRITY_VIOLATION

---

## Executive Summary

A forensic integrity audit was conducted on all 13 refactored integration test files in `apps/api/src`.
The audit verified that **DB query mocks have been 100% eradicated** across `apps/api/src` and that all 13 test files execute against live PostgreSQL 18 with real tenant fixtures. However, the audit failed the execution gate: `apps/api/src/tests/db/patientsQuery.test.ts` has 4 test failures during execution against live PostgreSQL 18 due to locale-sensitive error assertions (`/invalid input syntax for type uuid/` vs Russian PostgreSQL 18 error output `неверный синтаксис для типа uuid`).

Per Forensic Audit rules ("A single failure = INTEGRITY VIOLATION"), the work product receives a verdict of **INTEGRITY_VIOLATION** and must be rejected until `patientsQuery.test.ts` is fixed.

---

## Audit Phase Results

| Check | Target / Description | Status | Details |
|---|---|---|---|
| 1. Static DB Mock Census | `rg "mock\.method\(db"` across `apps/api/src` | **PASS** | 0 matches found. Zero DB query mocks exist in `apps/api/src`. |
| 2. Genuine DB Interaction | All 13 refactored integration test files | **PASS** | 100% genuine PostgreSQL 18 operations using `withFixtureTenant`, `withSuperuserBypass`, `purgeFixtureOrganizations`, and `fixtureUuid`. |
| 3. Cheating / Facade Audit | Hardcoded mock returns / fake assertions | **PASS** | Zero dummy mocks bypassing DB queries found across all 13 test files. |
| 4. Live Test Execution | Execute all 13 test files against PostgreSQL 18 | **FAIL** | 12 files passed 100%. 1 file (`apps/api/src/tests/db/patientsQuery.test.ts`) failed 4 tests due to locale regex mismatch. |
| 5. Full Test Suite Run | `npm run test -w @dental/api` | **FAIL** | Failed due to 4 test failures in `patientsQuery.test.ts` and 1 unexported module error in non-milestone `clinicalAuditService.test.ts`. |

---

## Detailed File-by-File Audit Inventory

| # | Test File Path | Tests Executed | Passed | Failed | Genuine DB? | DB Mocks? | Execution Status |
|---|---|---|---|---|---|---|---|
| 1 | `apps/api/src/routes/auth.test.ts` | 34 | 34 | 0 | Yes (PostgreSQL 18) | None | **PASS** |
| 2 | `apps/api/src/routes/imports.test.ts` | 4 | 4 | 0 | Yes (PostgreSQL 18) | None | **PASS** |
| 3 | `apps/api/src/routes/dicomweb.test.ts` | 17 | 17 | 0 | Yes (PostgreSQL 18) | None (1 fault injection test) | **PASS** |
| 4 | `apps/api/src/routes/tests/imaging.test.ts` | 2 | 2 | 0 | Yes (PostgreSQL 18) | None | **PASS** |
| 5 | `apps/api/src/tests/routes/clinical.test.ts` | 10 | 10 | 0 | Yes (PostgreSQL 18) | None | **PASS** |
| 6 | `apps/api/src/tests/routes/clinicalRuleDelete.test.ts` | 7 | 7 | 0 | Yes (PostgreSQL 18) | None | **PASS** |
| 7 | `apps/api/src/db/tests/clinicalQuery.test.ts` | 7 | 7 | 0 | Yes (PostgreSQL 18) | None | **PASS** |
| 8 | `apps/api/src/tests/db/clinicalQuery.test.ts` | 2 | 2 | 0 | Yes (PostgreSQL 18) | None | **PASS** |
| 9 | `apps/api/src/tests/db/patientsQuery.test.ts` | 8 | 4 | 4 | Yes (PostgreSQL 18) | None | **FAIL** |
| 10 | `apps/api/src/db/tests/billingQuery.test.ts` | 8 | 8 | 0 | Yes (PostgreSQL 18) | None | **PASS** |
| 11 | `apps/api/src/services/notificationWorker.test.ts` | 1 | 1 | 0 | Yes (PostgreSQL 18) | None (timer mock only) | **PASS** |
| 12 | `apps/api/src/services/tests/biAnalyticsWorker.test.ts` | 8 | 8 | 0 | Yes (PostgreSQL 18) | None (timer mock only) | **PASS** |
| 13 | `apps/api/src/services/tests/postOpCareTrigger.test.ts` | 1 | 1 | 0 | Yes (PostgreSQL 18) | None | **PASS** |

---

## 5-Component Handoff Protocol

### 1. Observation

- **Static DB Mock Search**: Command `rg "mock\.method\(db" apps/api/src` returned exit code 1 with **0 matches**.
- **Inspection of Mocks**:
  - `dicomweb.test.ts`: Uses `t.mock.method(dbRaw, "transaction", ...)` to inject a connection drop error to verify 503 HTTP status (`OrganizationCheckUnavailable`).
  - `notificationWorker.test.ts` & `biAnalyticsWorker.test.ts`: Use `t.mock.timers.enable(...)` for Node.js timer control.
  - Zero database query mocks or fake data returns exist.
- **Empirical Execution Failures in `patientsQuery.test.ts`**:
  - Command: `node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/tests/db/patientsQuery.test.ts`
  - Exit Code: `1`
  - Output excerpt:
    ```
    ✖ getPatientsFromDb передаёт ошибку наружу при сбое базы (ошибка синтаксиса UUID)
      AssertionError [ERR_ASSERTION]: The input did not match the regular expression /invalid input syntax for type uuid/.
      actual: Error: Failed query: select ... params: not-a-uuid ... cause: error: неверный синтаксис для типа uuid: "not-a-uuid"

    ✖ createPatientInDb передаёт ошибку наружу при невалидных данных (ошибка синтаксиса UUID)
    ✖ updatePatientInDb передаёт ошибку наружу при невалидных данных
    ✖ updatePatientAdministrativeProfileInDb передаёт ошибку наружу при невалидных данных
    ```

### 2. Logic Chain

1. Ground-Truth User Request in `ORIGINAL_REQUEST.md` and `PROJECT.md` requires:
   - Zero database mocks (`rg "mock\.method\(db"` returns 0 matches).
   - 100% genuine PostgreSQL 18 database interactions.
   - All 13 test files execute against live PostgreSQL 18 and pass cleanly.
2. Static census confirmed zero database query mocks (`rg "mock\.method\(db"` = 0).
3. Inspection confirmed genuine DB interactions across all 13 test files using `withFixtureTenant` and real Drizzle ORM operations on PostgreSQL 18.
4. However, live execution of `apps/api/src/tests/db/patientsQuery.test.ts` produced 4 test failures because the test asserts English PostgreSQL error message `/invalid input syntax for type uuid/`, while the live PostgreSQL 18 instance running on the host is localized to Russian and outputs `неверный синтаксис для типа uuid`.
5. Because 1 of the 13 required test files fails to pass cleanly against live PostgreSQL 18, check 3c ("Verify that all 13 test files execute against live PostgreSQL 18 and pass cleanly") fails.
6. Under Integrity Forensics Rules ("A single failure = INTEGRITY VIOLATION"), the overall verdict MUST be `INTEGRITY_VIOLATION`.

### 3. Caveats

- No caveats. All 13 test files were individually executed and reviewed empirically.
- The failure in `patientsQuery.test.ts` is straightforward to mitigate (updating regex to `/invalid input syntax|неверный синтаксис.*uuid/i`), but as an auditor, I do NOT modify test or implementation code.

### 4. Conclusion

- **Audit Verdict**: `INTEGRITY_VIOLATION`
- **Reason**: `apps/api/src/tests/db/patientsQuery.test.ts` fails 4 test cases when executed against PostgreSQL 18.
- **Required Action**: The refactoring team must update the error assertion regexes in `apps/api/src/tests/db/patientsQuery.test.ts` to support localized PostgreSQL error messages (e.g., `/invalid input syntax|неверный синтаксис.*uuid/i`), ensuring 100% clean test execution across all 13 files.

### 5. Verification Method

To independently verify this audit finding:

1. **Static DB Mock Census Check**:
   ```bash
   rg "mock\.method\(db" apps/api/src
   ```
   *Expected Output*: 0 matches.

2. **Run `patientsQuery.test.ts` Live Execution**:
   ```bash
   cd apps/api
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/tests/db/patientsQuery.test.ts
   ```
   *Expected Output*: Exit code 1 with 4 failing test cases due to `AssertionError: The input did not match the regular expression /invalid input syntax for type uuid/`.

3. **Run All Other 12 Test Files**:
   ```bash
   cd apps/api
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/routes/auth.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/routes/imports.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/routes/dicomweb.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/routes/tests/imaging.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/tests/routes/clinical.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/tests/routes/clinicalRuleDelete.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/db/tests/clinicalQuery.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/tests/db/clinicalQuery.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/db/tests/billingQuery.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/services/notificationWorker.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/services/tests/biAnalyticsWorker.test.ts
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test ./src/services/tests/postOpCareTrigger.test.ts
   ```
   *Expected Output*: All 12 files pass 100% cleanly against live PostgreSQL 18.

---

## Raw Evidence Snippet

```
AssertionError [ERR_ASSERTION]: The input did not match the regular expression /invalid input syntax for type uuid/. Input:

'Error: Failed query: select "administrative_profile" from "patients" where ("patients"."organization_id" = $1 and "patients"."id" = $2) limit $3\n' +
  'params: not-a-uuid,dce70000-1127-4010-8cab-3fa0f0fe000a,1'

    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async TestContext.<anonymous> (C:\Clinic_MVP\dental-crm\apps\api\src\tests\db\patientsQuery.test.ts:98:3)
    at async Test.run (node:internal/test_runner/test:1113:7)
    at async Suite.processPendingSubtests (node:internal/test_runner/test:788:7) {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: Error: Failed query: select "administrative_profile" from "patients" where ("patients"."organization_id" = $1 and "patients"."id" = $2) limit $3
  params: not-a-uuid,dce70000-1127-4010-8cab-3fa0f0fe000a,1
      ...
      [cause]: error: неверный синтаксис для типа uuid: "not-a-uuid"
```
