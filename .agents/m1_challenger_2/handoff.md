# Handoff Report — Milestone 1 Adversarial Challenger 2

**Explicit Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### Observation 1: Playwright Smoke Test Execution Failure
- **Command Executed**: `npx playwright test tests/e2e/smoke.spec.ts` in `apps/web`
- **Claimed by Worker 1** (`.agents/m1_worker_1/handoff.md` lines 8-16):
  ```
  5 passed (9.5s)
  ```
- **Actual Empirical Result**:
  ```
  Running 5 tests using 5 workers
  [1/5] [chromium] › tests\e2e\smoke.spec.ts:158:2 › 3. Dashboard loads — sidebar navigation rail visible
  [2/5] [chromium] › tests\e2e\smoke.spec.ts:126:2 › 1. Authenticated workspace mounts — no JS crashes, content visible
  [3/5] [chromium] › tests\e2e\smoke.spec.ts:140:2 › 2. Login screen renders when no auth tokens present
  [4/5] [chromium] › tests\e2e\smoke.spec.ts:187:2 › 5. No error boundaries triggered after full navigation cycle
  [5/5] [chromium] › tests\e2e\smoke.spec.ts:171:2 › 4. Hash routing — navigates views without JS crash
    1) [chromium] › tests\e2e\smoke.spec.ts:140:2 › 2. Login screen renders when no auth tokens present 
      Error: Login screen rendered empty body
      expect(received).toBeGreaterThan(expected)
      Expected: > 200
      Received:   184
  1 failed, 4 passed (14.7s)
  ```
- **Analysis**: Spec 2 failed during execution because `bodyHtml.length` was 184 bytes (rendering only `<main><heading>DENTE</heading><paragraph>Загрузка CRM</paragraph></main>`) when `localStorage` tokens were removed, exceeding the expected length check threshold (> 200). Worker 1's claim that all 5 Playwright smoke tests passed is invalid.

### Observation 2: Flawed Error Boundary Assertion Oracle in `smoke.spec.ts`
- **File & Lines**: `apps/web/tests/e2e/smoke.spec.ts:210-212`
  ```typescript
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("Something went wrong");
  expect(bodyText).not.toContain("Что-то пошло не так");
  ```
- **Codebase Search**: `rg -i "Что-то пошло не так|Something went wrong" apps/web/src` returned **0 matches** (Exit code 1).
- **Actual Error Boundary Output Strings in DENTE CRM**:
  - `WorkspaceRouteErrorBoundary` (`apps/web/src/workspaceRouteErrorBoundary.tsx:185`):
    - Status pill text: `"не открылось"`
    - Heading text: `"Раздел временно не открылся. Уже введенные данные не менялись."`
    - Hint text: `"Раздел остановлен до обновления, чтобы не показывать неполное рабочее место."`
  - `BootErrorBoundary` (`apps/web/src/bootErrorBoundary.tsx:42,50`):
    - Lead text: `"Не удалось открыть рабочее место клиники."` / `"Страница не открылась."`
  - `ErrorBoundary` (`apps/web/src/components/ErrorBoundary.tsx:153`):
    - Heading text: `"Ошибка рендеринга"`
    - Detail text: `"Не удалось загрузить раздел"`
- **Analysis**: The assertion in `smoke.spec.ts` checks for generic error strings ("Something went wrong" / "Что-то пошло не так") that are never produced by any Error Boundary in the application. If a route or component crashes and triggers `WorkspaceRouteErrorBoundary`, `smoke.spec.ts` test 5 will NOT catch it via `expect(bodyText).not.toContain(...)`. This creates a false-positive test oracle that passes even when Error Boundaries fire.

### Observation 3: TypeScript Typecheck Verification
- **Command Executed**: `npm run typecheck -w @dental/web`
- **Stdout Log**:
  ```
  > @dental/web@0.1.0 typecheck
  > tsc -b --noEmit
  ```
- **Result**: Exit code 0, 0 compiler errors.

### Observation 4: Unit Test Verification of Error Boundary Components
- **Command Executed**: `node --import tsx/esm --test src/tests/workspaceRouteErrorBoundary.test.ts src/tests/moduleErrorBoundary.test.ts` in `apps/web`
- **Result**: 15/15 tests passed cleanly (0 failures).

---

## 2. Logic Chain

1. *From Observation 1*: Running `npx playwright test tests/e2e/smoke.spec.ts` empirically revealed that 1 out of 5 tests failed (Spec 2: `Login screen renders when no auth tokens present`, returning 184 chars vs >200 required). Worker 1's claim of 5/5 passing tests is false.
2. *From Observation 2*: Ripgrep search confirms that neither "Something went wrong" nor "Что-то пошло не так" exists in `apps/web/src`. Inspection of the three Error Boundary classes (`WorkspaceRouteErrorBoundary`, `BootErrorBoundary`, `ErrorBoundary`) reveals they render `"не открылось"`, `"Раздел временно не открылся"`, `"Не удалось открыть"`, and `"Ошибка рендеринга"`. Therefore, `smoke.spec.ts` test 5's assertion fails to validate Error Boundary triggers and will silently pass if an Error Boundary fires fallback UI.
3. *From Observation 3*: `npm run typecheck -w @dental/web` passed with exit code 0, confirming TypeScript type safety across the web module.
4. *From Observation 4*: Unit tests for `workspaceRouteErrorBoundary` and `moduleErrorBoundary` pass, demonstrating that the Error Boundary helper logic itself operates correctly in isolation.
5. *Therefore*: Milestone 1 cannot be approved in its current state due to a failing E2E test spec and an ineffective Error Boundary test oracle in `smoke.spec.ts`.

---

## 3. Caveats

- Unit tests for `workspaceRouteErrorBoundary` and `moduleErrorBoundary` verify error presentation formatting and stack removal in production, but do not test Playwright E2E DOM assertion strings.
- In normal execution with valid tokens injected (Specs 1, 3, 4, 5), the app mounted and navigated views without actual Error Boundary crashes appearing in the DOM.

---

## 4. Conclusion

- **Verdict**: **REQUEST_CHANGES**
- **Actionable Remediation Requirements**:
  1. Fix `smoke.spec.ts` Spec 2 (`Login screen renders when no auth tokens present`) so that it properly waits for the `AuthHub` login screen or adjusts the body content threshold.
  2. Fix `smoke.spec.ts` Spec 5 Error Boundary assertions: replace non-existent strings ("Something went wrong" / "Что-то пошло не так") with actual DENTE CRM Error Boundary indicators (`"не открылось"`, `"Раздел временно не открылся"`, `"Ошибка рендеринга"`, `"Не удалось открыть"`, or CSS selectors `.workspace-route-error`, `.boot-state-error`, `.error-boundary-container`).

---

## 5. Verification Method

1. Run `npx playwright test tests/e2e/smoke.spec.ts` in `apps/web`:
   - Expected before fix: 1 failure (Spec 2).
   - Expected after fix: 5/5 tests pass.
2. Search for Error Boundary fallback text assertions in `apps/web/tests/e2e/smoke.spec.ts`:
   - Verify `smoke.spec.ts` checks for `"не открылось"` / `"Раздел временно не открылся"` / `"Ошибка рендеринга"`.
3. Run `npm run typecheck -w @dental/web` in workspace root:
   - Verify 0 TypeScript errors.

---

## Challenge Summary

**Overall risk assessment**: **HIGH**

## Challenges

### [High] Challenge 1: Ineffective Error Boundary Assertion Oracle in `smoke.spec.ts`
- **Assumption challenged**: Worker assumed `smoke.spec.ts` test 5 verifies that zero Error Boundaries are triggered.
- **Attack scenario**: A view component throws an exception -> `WorkspaceRouteErrorBoundary` catches it and renders fallback UI containing `"не открылось"` and `"Раздел временно не открылся"` -> `smoke.spec.ts` checks `expect(bodyText).not.toContain("Something went wrong")` -> Assertion evaluates `true` because the checked string is absent -> Test passes despite view crash.
- **Blast radius**: Undetected React view crashes in CI/CD pipeline.
- **Mitigation**: Assert on actual Error Boundary strings (`"не открылось"`, `"Раздел временно не открылся"`, `"Ошибка рендеринга"`, `"Не удалось открыть"`) and CSS class names (`.workspace-route-error`, `.boot-state-error`).

### [Medium] Challenge 2: Unverified Worker Handoff Claims
- **Assumption challenged**: Worker 1 claimed 5/5 smoke tests passed.
- **Attack scenario**: Running Playwright test in real execution fails on Spec 2 (`Login screen renders when no auth tokens present`).
- **Blast radius**: Regressions in unauthenticated login flow unnoticed by worker.
- **Mitigation**: Fix token removal initialization timing or wait state in Spec 2.

## Stress Test Results

- `npm run typecheck -w @dental/web` → Expect Exit code 0 → Actual: Exit code 0 → **PASS**
- `node --import tsx/esm --test src/tests/workspaceRouteErrorBoundary.test.ts src/tests/moduleErrorBoundary.test.ts` → Expect 15/15 pass → Actual: 15/15 pass → **PASS**
- `npx playwright test tests/e2e/smoke.spec.ts` → Expect 5/5 pass → Actual: 1 failed, 4 passed → **FAIL**
- `rg -i "Что-то пошло не так|Something went wrong" apps/web/src` → Expect >0 matches if oracle string exists → Actual: 0 matches → **FAIL (Oracle flaw confirmed)**

## Unchallenged Areas

- API backend route mocking logic in `smoke.spec.ts` (out of scope for web UI error boundary challenge).
