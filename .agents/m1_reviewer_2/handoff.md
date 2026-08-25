# Handoff Report — Milestone M1 Review (Independent Reviewer 2)

**HEAD: 2f87c57fca2dbe95cb2e841172e52a73e8dda0fb**
**Date: 2026-08-18T17:26:00Z**
**Role: Independent Reviewer 2 (Milestone M1: Compiler Gate & Core Hydration/Toast Remediation)**
**Verdict: REQUEST_CHANGES**

---

## 1. Observation

### Evaluated Source Files & Modifications
1. `apps/web/src/hooks/domains/useOnboardingLogic.ts` (Line 6):
   - `import { logger } from "../../utils/logger";` added to resolve TS2304 reference on line 302 (`logger.warn("[Dente] UI preferences sync queued:", preferencesError);`).
2. `apps/web/src/hooks/usePatientResource.ts` (Line 132):
   - `useEffect` dependency array updated from `[patientId]` to `[patientId, _reloadToken]`, enabling `reload()` triggers via `setReloadToken((token) => token + 1)`.
3. `apps/web/src/hooks/domains/useDashboardLoaderLogic.ts` (Lines 61-86):
   - Catch block restructured:
     - `if (isStaleResponse()) return;` moved to the top of catch handler.
     - `isAuthError` checks status `401 || 403` or matching regex message.
     - 401/403 errors set `accessUnlockRequired(true)` and `accessUnlockMessage(...)` without user-facing red error toast.
     - 5xx and network disconnects preserve `showToast(actionFailureToast(...), "error")` and `setError(...)`.
4. `apps/web/src/browserContinuity.ts` (Lines 1-3, 93-105):
   - Unused `showToast` and `actionFailureToast` imports removed.
   - `browserIndexedDbWritable()` catch block no longer fires UI toasts on background storage capability checks.

### Verification Gate Execution Results

1. **Monorepo Compiler Gate (`npm run typecheck`)**:
   - Command: `npm run typecheck`
   - Exit code: `0` (PASS)
   - Scope: `@dental/shared` build + typecheck + tests, `@dental/api` typecheck + tests, `@dental/web` typecheck. Zero TypeScript errors.

2. **Shared Package Test Suite (`npm test -w @dental/shared`)**:
   - Command: `npm test -w @dental/shared`
   - Exit code: `0` (PASS)
   - Results: 211 tests passed across 44 suites, 0 failures.

3. **UTF-8 Encoding Gate (`npm run check:encoding`)**:
   - Command: `npm run check:encoding`
   - Exit code: `0` (PASS)
   - Results: 2687 files scanned, 0 encoding/mojibake defects.

4. **Web Package Test Suite (`npm test -w @dental/web`)**:
   - Command: `npm test -w @dental/web`
   - Exit code: `1` (FAIL)
   - Results: 1458 passed, 5 failed across 249 suites.
   - Verbatim error log:
     ```text
     ✖ failing tests:

     test at src\__tests__\m1AdversarialRemediation.test.ts:1:2949
     ✖ suppresses toasts on 401 Unauthorized and flags access unlock required (1.3812ms)
       TypeError: Cannot read properties of null (reading 'useRef')
           at process.env.NODE_ENV.exports.useRef (C:\Clinic_MVP\dental-crm\node_modules\react\cjs\react.development.js:1260:33)
           at useDashboardLoaderLogic (C:\Clinic_MVP\dental-crm\apps\web\src\hooks\domains\useDashboardLoaderLogic.ts:28:33)
           at TestContext.<anonymous> (C:\Clinic_MVP\dental-crm\apps\web\src\__tests__\m1AdversarialRemediation.test.ts:152:30)

     test at src\__tests__\m1AdversarialRemediation.test.ts:1:4623
     ✖ suppresses toasts on 403 Forbidden and flags access unlock required (0.6348ms)
       TypeError: Cannot read properties of null (reading 'useRef')

     test at src\__tests__\m1AdversarialRemediation.test.ts:1:6244
     ✖ shows toast and sets error on 500 Internal Server Error without triggering access unlock (0.6518ms)
       TypeError: Cannot read properties of null (reading 'useRef')

     test at src\__tests__\m1AdversarialRemediation.test.ts:1:7768
     ✖ handles network failure (fetch throws TypeError) by showing error toast (0.6154ms)
       TypeError: Cannot read properties of null (reading 'useRef')

     test at src\__tests__\m1AdversarialRemediation.test.ts:1:9024
     ✖ discards stale responses when multiple loadDashboard requests race (0.8354ms)
       TypeError: Cannot read properties of null (reading 'useRef')
     ```

---

## 2. Logic Chain

1. **Source Code Implementation Correctness**:
   - The 4 target source files (`useOnboardingLogic.ts`, `usePatientResource.ts`, `useDashboardLoaderLogic.ts`, `browserContinuity.ts`) implement the required fixes cleanly:
     - `useOnboardingLogic.ts` imports `logger` from `../../utils/logger`, directly satisfying TS2304.
     - `usePatientResource.ts` connects `_reloadToken` to the effect dependency array, ensuring component mutations that call `reload()` reliably re-fetch data while maintaining `AbortController` cancellation semantics.
     - `useDashboardLoaderLogic.ts` correctly classifies 401/403 status codes and suppresses redundant error toasts when transitioning to the access unlock screen, while properly reporting 5xx and network faults.
     - `browserContinuity.ts` cleanly silences background IndexedDB diagnostic failures.
   - Code inspections reveal **zero integrity violations**: no hardcoded test responses, no mock stubs, and no bypassed business logic.

2. **Root Cause of Test Suite Failure**:
   - File `apps/web/src/__tests__/m1AdversarialRemediation.test.ts` was added to test the M1 adversarial requirements.
   - However, the test invokes `useDashboardLoaderLogic(props)` directly as a vanilla function in a Node.js test environment.
   - Because `useDashboardLoaderLogic` invokes React hooks (`useRef`, `useCallback`), calling it outside a React render context causes React's dispatcher (`ReactCurrentDispatcher.current`) to be `null`, throwing `TypeError: Cannot read properties of null (reading 'useRef')`.
   - As a consequence, running the standard verification command `npm test -w @dental/web` fails with exit code 1.

3. **Review Policy & Verdict Determination**:
   - Under project guidelines (AGENTS.md, Mandate 8b, Reviewer & Adversarial Critic Doctrine), a milestone cannot be approved while the test gate command `npm test -w @dental/web` exits with failure.
   - Therefore, the verdict must be `REQUEST_CHANGES` so that the test harness in `m1AdversarialRemediation.test.ts` is corrected to properly mock/dispatch React hooks or wrap them in a lightweight test runner.

---

## 3. Caveats

- The source code in `apps/web/src/hooks/domains/useDashboardLoaderLogic.ts` and the other 3 implementation files is sound and bug-free; the failure is localized exclusively to the test harness execution model in `apps/web/src/__tests__/m1AdversarialRemediation.test.ts`.
- Database migrations and API routes were not modified in this milestone.

---

## 4. Conclusion & Findings

### Verdict: **REQUEST_CHANGES**

### Findings Summary:

#### [Major] Finding 1 — Test Harness Crash on Direct Hook Invocation
- **What**: 5 tests in `apps/web/src/__tests__/m1AdversarialRemediation.test.ts` fail with `TypeError: Cannot read properties of null (reading 'useRef')`.
- **Where**: `apps/web/src/__tests__/m1AdversarialRemediation.test.ts:152, 206, 260, 308, 374`
- **Why**: `useDashboardLoaderLogic` uses `useRef` at line 28. In Node.js unit tests without React dispatcher context, direct invocation of the hook throws a null reference error.
- **Remediation**: Update `m1AdversarialRemediation.test.ts` to mock `React.useRef` and `React.useCallback` (e.g. `(globalThis as any).React = ...` or mocking the React module) when executing the callback logic, or extract the core loader logic into a testable standalone helper.

#### [Positive] Finding 2 — Source Code Quality & Integrity
- All 4 source modifications adhere to zero-mock, UTF-8, and strict TypeScript typing standards.
- `npm run typecheck`: 0 errors.
- `npm test -w @dental/shared`: 211/211 pass.
- `npm run check:encoding`: 2687/2687 pass.

---

## 5. Verification Method

To verify resolution of the requested changes:
1. Run `npm run typecheck` — expect exit code 0.
2. Run `npm test -w @dental/web` — expect exit code 0 (1463+ tests pass, 0 fail).
3. Run `npm test -w @dental/shared` — expect exit code 0 (211 tests pass).
4. Run `npm run check:encoding` — expect 0 encoding remarks.
