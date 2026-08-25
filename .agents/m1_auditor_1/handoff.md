# Forensic Audit Report — Milestone M1

**Work Product**: Milestone M1 Changes (`apps/web/src/hooks/domains/useOnboardingLogic.ts`, `apps/web/src/hooks/usePatientResource.ts`, `apps/web/src/hooks/domains/useDashboardLoaderLogic.ts`, `apps/web/src/browserContinuity.ts`)  
**Profile**: General Project (DENTE Dental CRM)  
**Verdict**: **INTEGRITY VIOLATION**  
**Date**: 2026-08-18T21:26:00+04:00  
**Auditor**: `m1_auditor_1`

---

## 1. Observation

### Source Code Inspection of M1 Deliverables
1. `apps/web/src/hooks/domains/useOnboardingLogic.ts`:
   - Line 6: Added `import { logger } from "../../utils/logger";`.
   - Line 302: `logger.warn("[Dente] UI preferences sync queued:", preferencesError);` resolves cleanly.
   - Code contains 0 hardcoded test values, 0 mock interfaces, 0 dummy returns.

2. `apps/web/src/hooks/usePatientResource.ts`:
   - Line 132: `useEffect(..., [patientId, _reloadToken])` now properly watches `_reloadToken`.
   - Data-fetching logic uses `AbortController`, error state formatting, and cancellation tokens.
   - Code contains 0 hardcoded test values, 0 mock interfaces, 0 dummy returns.

3. `apps/web/src/hooks/domains/useDashboardLoaderLogic.ts`:
   - Lines 65-75: Catches 401/403 errors and session expiration to set `setAccessUnlockRequired(true)` without spamming error toasts.
   - Lines 76-86: Surfaces genuine 5xx server and network failures via `showToast(actionFailureToast(...), "error")` and `setError(...)`.
   - Lines 39-40, 57, 62: Implements sequence tracking (`dashboardRequestSeqRef`) and `isStaleResponse()` to prevent race condition data overrides.
   - Code contains 0 hardcoded test values, 0 mock interfaces, 0 dummy returns.

4. `apps/web/src/browserContinuity.ts`:
   - Lines 89-106: Removed intrusive error toast on IndexedDB capability probe failure.
   - Code contains 0 hardcoded test values, 0 mock interfaces, 0 dummy returns.

---

### Empirical Verification Results

#### Check 1: TypeScript Compiler Gate (`npm run typecheck`)
- Command: `npm run typecheck`
- Output:
```text
> dental-crm@0.1.0 typecheck
> npm run build -w @dental/shared && npm run typecheck -w @dental/shared && npm run typecheck:tests -w @dental/shared && npm run typecheck -w @dental/api && npm run typecheck:tests -w @dental/api && npm run typecheck -w @dental/web

> @dental/shared@0.1.0 build
> tsc -p tsconfig.json

> @dental/shared@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit

> @dental/shared@0.1.0 typecheck:tests
> tsc -p tsconfig.tests.json --noEmit

> @dental/api@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit

> @dental/api@0.1.0 typecheck:tests
> tsc -p tsconfig.tests.json --noEmit

> @dental/web@0.1.0 typecheck
> tsc -b --noEmit
```
- Exit Code: **0 (PASS)**

#### Check 2: Web Test Suite Execution (`npm test -w @dental/web`)
- Command: `npm test -w @dental/web`
- Output:
```text
ℹ tests 1463
ℹ suites 249
ℹ pass 1458
ℹ fail 5
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 35462.7739

✖ failing tests:

test at src\__tests__\m1AdversarialRemediation.test.ts:1:2949
✖ suppresses toasts on 401 Unauthorized and flags access unlock required (124.3936ms)
  TypeError: Cannot read properties of null (reading 'useRef')
      at process.env.NODE_ENV.exports.useRef (C:\Clinic_MVP\dental-crm\node_modules\react\cjs\react.development.js:1260:33)
      at useDashboardLoaderLogic (C:\Clinic_MVP\dental-crm\apps\web\src\hooks\domains\useDashboardLoaderLogic.ts:28:33)
      at TestContext.<anonymous> (C:\Clinic_MVP\dental-crm\apps\web\src\__tests__\m1AdversarialRemediation.test.ts:152:30)

test at src\__tests__\m1AdversarialRemediation.test.ts:1:4623
✖ suppresses toasts on 403 Forbidden and flags access unlock required (1.9065ms)
  TypeError: Cannot read properties of null (reading 'useRef')

test at src\__tests__\m1AdversarialRemediation.test.ts:1:6244
✖ shows toast and sets error on 500 Internal Server Error without triggering access unlock (44.109ms)
  TypeError: Cannot read properties of null (reading 'useRef')

test at src\__tests__\m1AdversarialRemediation.test.ts:1:7768
✖ handles network failure (fetch throws TypeError) by showing error toast (21.9268ms)
  TypeError: Cannot read properties of null (reading 'useRef')

test at src\__tests__\m1AdversarialRemediation.test.ts:1:9024
✖ discards stale responses when multiple loadDashboard requests race (31.0347ms)
  TypeError: Cannot read properties of null (reading 'useRef')

npm error Lifecycle script `test` failed with error:
npm error code 1
```
- Exit Code: **1 (FAIL)**

#### Check 3: Shared Test Suite Execution (`npm test -w @dental/shared`)
- Command: `npm test -w @dental/shared`
- Output:
```text
ℹ tests 211
ℹ suites 44
ℹ pass 211
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
- Exit Code: **0 (PASS)**

#### Check 4: UTF-8 Encoding Gate (`npm run check:encoding`)
- Command: `npm run check:encoding`
- Output:
```text
> dental-crm@0.1.0 check:encoding
> node scripts/check-encoding.mjs

Кодировка в порядке: проверено 2688 файлов, замечаний нет.
```
- Exit Code: **0 (PASS)**

---

## 2. Logic Chain

1. **Source Code Integrity Verification**:
   - Direct inspection of all four touched files confirms genuine implementations.
   - No hardcoded test responses, mock interfaces, or dummy return values exist in the modified source code.

2. **Gate & Behavioral Verification**:
   - Principle: Under Integrity Forensics (General Profile), all automated test suites must build and run cleanly to completion without failures.
   - Executing `npm test -w @dental/web` triggered 5 failing tests in `apps/web/src/__tests__/m1AdversarialRemediation.test.ts` (1458 passed, 5 failed; exit code 1).
   - The test failure occurs because `m1AdversarialRemediation.test.ts` calls the React hook `useDashboardLoaderLogic` directly in Node.js outside a React component render or hook harness, violating React hook execution rules (`TypeError: Cannot read properties of null (reading 'useRef')`).

3. **Mandate Compliance**:
   - Per AGENTS.md and Integrity Forensics protocol: "Build the project from source and run its test suite. The build must succeed and tests must execute — a project that doesn't build or whose tests don't run is automatically flagged."
   - A single gate failure mandates an **INTEGRITY VIOLATION** verdict until the failing test suite is rectified and executes green with exit code 0.

---

## 3. Caveats

- The production implementation code in the 4 target files is architecturally sound and clean.
- The failure is isolated to the newly added adversarial test harness in `apps/web/src/__tests__/m1AdversarialRemediation.test.ts` which improperly invokes React hooks without a render harness.
- Per auditor constraints ("Audit-only — do NOT modify implementation code"), this auditor reports the failure as an empirical finding without performing code edits.

---

## 4. Conclusion

**Verdict: INTEGRITY VIOLATION**

The work product cannot be certified as CLEAN because the test gate `npm test -w @dental/web` fails with exit code 1 (5 failing tests in `apps/web/src/__tests__/m1AdversarialRemediation.test.ts`).

### Required Remediation
- Refactor `apps/web/src/__tests__/m1AdversarialRemediation.test.ts` so that `useDashboardLoaderLogic` is tested either through a headless React component wrapper / `renderHook` or by extracting pure logic helpers if direct functional testing is intended.
- Re-run `npm test -w @dental/web` to confirm 100% pass (exit code 0).

---

## 5. Verification Method

To independently reproduce and verify this audit:
1. `npm run typecheck` — verify exit code 0.
2. `npm test -w @dental/web` — observe 5 failures in `apps/web/src/__tests__/m1AdversarialRemediation.test.ts` with exit code 1.
3. `npm test -w @dental/shared` — verify exit code 0 (211/211 pass).
4. `npm run check:encoding` — verify exit code 0 (2688 files clean).
