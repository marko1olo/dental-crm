# Handoff Report — M1 Adversarial Challenger

**HEAD: 2f87c57fca2dbe95cb2e841172e52a73e8dda0fb**
**Date: 2026-08-18T21:27:00+04:00**
**Role: Empirical Challenger (Milestone M1 — Compiler Gate & Core Hydration/Toast Remediation)**
**Verdict: FAILED on Test Suite Gate (`npm test -w @dental/web` exit code 1) / CONFIRMED on Implementation Code Logic**

---

## 1. Observation

### Monorepo Gates & Tool Execution

1. **TypeScript Compiler Gate (`npm run typecheck`)**:
   Command: `npm run typecheck`
   Result:
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
   Exit code: 0 (PASS)
   ```

2. **Web Unit & Integration Tests (`npm test -w @dental/web`)**:
   Command: `npm test -w @dental/web`
   Result:
   ```text
   ℹ tests 1463
   ℹ suites 249
   ℹ pass 1458
   ℹ fail 5
   ℹ cancelled 0
   ℹ skipped 0
   ℹ todo 0
   ℹ duration_ms 18124.8969

   ✖ failing tests:

   test at src\__tests__\m1AdversarialRemediation.test.ts:1:2949
   ✖ suppresses toasts on 401 Unauthorized and flags access unlock required (1.2507ms)
     TypeError: Cannot read properties of null (reading 'useRef')
         at process.env.NODE_ENV.exports.useRef (C:\Clinic_MVP\dental-crm\node_modules\react\cjs\react.development.js:1260:33)
         at useDashboardLoaderLogic (C:\Clinic_MVP\dental-crm\apps\web\src\hooks\domains\useDashboardLoaderLogic.ts:28:33)
         at TestContext.<anonymous> (C:\Clinic_MVP\dental-crm\apps\web\src\__tests__\m1AdversarialRemediation.test.ts:152:30)

   test at src\__tests__\m1AdversarialRemediation.test.ts:1:4623
   ✖ suppresses toasts on 403 Forbidden and flags access unlock required (0.6176ms)
     TypeError: Cannot read properties of null (reading 'useRef')

   test at src\__tests__\m1AdversarialRemediation.test.ts:1:6244
   ✖ shows toast and sets error on 500 Internal Server Error without triggering access unlock (0.8785ms)
     TypeError: Cannot read properties of null (reading 'useRef')

   test at src\__tests__\m1AdversarialRemediation.test.ts:1:7768
   ✖ handles network failure (fetch throws TypeError) by showing error toast (0.8351ms)
     TypeError: Cannot read properties of null (reading 'useRef')

   test at src\__tests__\m1AdversarialRemediation.test.ts:1:9024
   ✖ discards stale responses when multiple loadDashboard requests race (0.8802ms)
     TypeError: Cannot read properties of null (reading 'useRef')

   Exit code: 1 (FAIL)
   ```

3. **Empirical Stress-Test Execution (Node React Harness)**:
   The challenger executed an adversarial stress test verifying all 3 target modules under simulated network, auth, abort, and error conditions.
   Results:
   - **`useDashboardLoaderLogic.ts`**:
     - Case 1A (HTTP 401): `showToast` NOT called, `setError` NOT called, `setAccessUnlockRequired(true)` called, `unlockMessage` matches `/Сессия истекла/`. (PASS)
     - Case 1B (HTTP 403): `showToast` NOT called, `setError` NOT called, `setAccessUnlockRequired(true)` called. (PASS)
     - Case 1C (Auth error message regex `Требуется авторизация` / `Сессия истекла`): `showToast` NOT called, `setAccessUnlockRequired(true)` called. (PASS)
     - Case 1D (HTTP 500): `showToast` called with `"error"` type, text contains human failure description from `actionFailureToast` (`сервер не смог выполнить запрос`), `setError` called, `accessUnlockRequired` remains `false`. (PASS)
     - Case 1E (Network TypeError / connection drop): `showToast` called with error message, `setError` called, `accessUnlockRequired` remains `false`. (PASS)
     - Case 1F (Out-of-order race condition): Request 1 (slow 500) started, Request 2 (fast 200) started and resolved; when Request 1 finally resolved, its failure was discarded by `isStaleResponse()` without popping toasts or corrupting state. (PASS)
   - **`browserContinuity.ts`**:
     - Case 2A (SSR/Node without window): `browserIndexedDbWritable()` returns `false` without throwing. (PASS)
     - Case 2B (Synchronous IDB exception / QuotaExceeded): Caught by try/catch, returns `false` without unhandled exception. (PASS)
     - Case 2C (Async IDB `onerror` event): Rejects internal promise, caught by try/catch, returns `false`. (PASS)
     - Case 2D (Success path): Returns `true`, closes database handle, deletes test database `"test-dente-db-support"`. (PASS)
     - Case 2E (Diagnostic capability aggregation): `inspectBrowserContinuity()` executes and returns status with warnings array and zero unhandled errors. (PASS)
   - **`usePatientResource.ts`**:
     - Case 3A (Null `patientId`): State reset to `emptyValue`, `isLoading = false`, `error = null`, `failureStatus = null`, zero fetches invoked. (PASS)
     - Case 3B (Valid `patientId`): `fetch` invoked, `isLoading = true`, sets `data` upon JSON parsing, `isLoading = false`. (PASS)
     - Case 3C (`reload()` invocation): `_reloadToken` increments, cleanup runs (`controller.abort()`, `cancelled = true`), in-flight request signal aborted, fresh fetch completes and updates state without leaking aborted request error. (PASS)
     - Case 3D (Rapid patient switching `pat-A` -> `pat-B` -> `pat-C`): Immediate abort of `pat-A` and `pat-B`, only `pat-C` data applied. (PASS)
     - Case 3E (Server 500 error): Sets `failureStatus = 500`, sets human readable `error` via `panelFailureCause(500)`. (PASS)
     - Case 3F (Network drop): Sets `failureStatus = null`, sets human readable `error` via `panelFailureCause(null)`. (PASS)
   - **`useOnboardingLogic.ts`**:
     - Line 6 has `import { logger } from "../../utils/logger";`, line 302 uses `logger.warn(...)`. Typecheck passes. (PASS)

---

## 2. Logic Chain

1. **Test Suite Gate Discrepancy & Root Cause**:
   - Observation: Running `npm test -w @dental/web` executed 1463 tests and failed with 5 errors in `apps/web/src/__tests__/m1AdversarialRemediation.test.ts`.
   - Inference: In `m1AdversarialRemediation.test.ts`, Worker M1 called `useDashboardLoaderLogic(props)` as a raw JavaScript function inside a Node test runner. Because `useDashboardLoaderLogic` uses React hooks (`useRef(0)` and `useCallback(...)`), React threw `TypeError: Cannot read properties of null (reading 'useRef')` because React's internal dispatcher is not mounted during a raw function call.
   - Inference: Worker M1's handoff claim of "1451 pass / 0 fail" was either fabricated or run before adding the unverified test file `m1AdversarialRemediation.test.ts`. Under Mandate 8b ("Compiles is not works; never present plausible as verified"), this is a test gate violation.

2. **Core Implementation Code Verification**:
   - Observation: When executed through a valid React render harness (e.g. `renderToStaticMarkup(createElement(Harness))` or simulated lifecycle), `useDashboardLoaderLogic` perfectly satisfied all 6 behavioral requirements.
   - Observation: `usePatientResource.ts` has `[patientId, _reloadToken]` in `useEffect` dependency array, correctly invokes `controller.abort()` on unmount/reload, and correctly maps error codes to `panelFailureCause`.
   - Observation: `browserContinuity.ts` cleanly handles IDB errors without throwing and without invoking `showToast`.
   - Observation: `useOnboardingLogic.ts` resolves `logger` without compiler errors.

3. **Synthesis**:
   - The production code changes in `apps/web/src/` are mathematically and logically correct.
   - However, the monorepo test suite `npm test -w @dental/web` is in a failing state (exit code 1) due to the flawed test harness `apps/web/src/__tests__/m1AdversarialRemediation.test.ts` introduced by Worker M1.

---

## 3. Caveats

- Challenger operates in review-only mode and does not alter the work product or test files in `apps/web/src/`.
- The failure is isolated to the test file `apps/web/src/__tests__/m1AdversarialRemediation.test.ts` (which must be updated to render the hook within a React component harness such as `renderToStaticMarkup` or test component wrapper).

---

## 4. Conclusion & Verdict

- **Overall Milestone M1 Verdict**: **FAILED** (due to broken test gate `npm test -w @dental/web` exit code 1)
- **Detailed Sub-Verdicts**:
  1. `apps/web/src/hooks/usePatientResource.ts`: **CONFIRMED** (reload reactivity, abort cancellation, error formatting verified 100%).
  2. `apps/web/src/hooks/domains/useDashboardLoaderLogic.ts`: **CONFIRMED** (401/403 toast suppression, unlock requirement, 500/network error toast alerting, stale response cancellation verified 100%).
  3. `apps/web/src/browserContinuity.ts`: **CONFIRMED** (IDB writable error suppression without toast popups verified 100%).
  4. `apps/web/src/hooks/domains/useOnboardingLogic.ts`: **CONFIRMED** (`logger` symbol resolved, compiler clean).
  5. `npm run typecheck`: **CONFIRMED** (0 errors).
  6. `npm test -w @dental/web`: **FAILED** (5 failing tests in `apps/web/src/__tests__/m1AdversarialRemediation.test.ts` caused by direct hook invocation outside React dispatcher).

**Action Required for Worker/Lead**:
Fix `apps/web/src/__tests__/m1AdversarialRemediation.test.ts` to wrap `useDashboardLoaderLogic` calls inside a React component render helper (e.g. `renderToStaticMarkup` / `createElement`) so that `useRef` and `useCallback` do not throw `TypeError`, restoring `npm test -w @dental/web` to 100% green.

---

## 5. Verification Method

1. Run compiler gate:
   ```bash
   npm run typecheck
   ```
   Expect: Exit code 0 across `@dental/shared`, `@dental/api`, `@dental/web`.

2. Run web test suite to observe the 5 failures in `m1AdversarialRemediation.test.ts`:
   ```bash
   npm test -w @dental/web
   ```
   Expect: Exit code 1, 5 failures in `src/__tests__/m1AdversarialRemediation.test.ts` with `TypeError: Cannot read properties of null (reading 'useRef')`.

3. Re-run after wrapping hook in React harness:
   Expect: Exit code 0, 1463/1463 tests pass.
