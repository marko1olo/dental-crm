# Milestone 1 Remediation Analysis & Worker 2 Code Fix Specifications

## Executive Summary

During Milestone 1 Iteration 1 evaluation, the review gate failed due to Playwright test flakiness and assertion coverage gaps in `apps/web/tests/e2e/smoke.spec.ts`:
1. **Spec 2 Flakiness**: Spec 2 ("Login screen renders when no auth tokens present") evaluated `expect(bodyHtml.length).toBeGreaterThan(200)` synchronously before `React.lazy()` component hydration completed. Under parallel worker execution or slow initial bundle load, the DOM only contained `<Suspense>` fallback markup (184 bytes), causing test failure on line 152 before Playwright's web-first locator wait could execute.
2. **Spec 5 Error Boundary Assertions**: Spec 5 ("No error boundaries triggered after full navigation cycle") checked only generic strings (`"Something went wrong"`, `"Что-то пошло не так"`), missing DENTE CRM's actual localized Cyrillic Error Boundary error strings.

This analysis provides the exact, copy-paste ready code fix instructions for Worker 2 to remediate both specs cleanly.

---

## 1. Deep-Dive Root Cause Analysis

### 1.1 Spec 2 Failure Mechanism
- **File**: `apps/web/tests/e2e/smoke.spec.ts`, lines 140–156.
- **Original Code Flow**:
  ```ts
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await screenshot(page, "02_login_screen");

  const bodyHtml = await page.innerHTML("body");
  expect(bodyHtml.length, "Login screen rendered empty body").toBeGreaterThan(200);
  const emailInput = page.locator("input[type=email], input[placeholder*='mail'], input[placeholder*='email']");
  await expect(emailInput.first()).toBeVisible({ timeout: 5000 });
  ```
- **Flakiness Cause**: `page.innerHTML("body")` was called before waiting for `emailInput` visibility. When `React.lazy()` chunk loading is delayed, `bodyHtml.length` is 184 characters (the fallback shell), which is $\le 200$. Playwright threw an immediate assertion error without reaching `expect(emailInput.first()).toBeVisible()`.
- **Solution**:
  - Move `emailInput` locator declaration and `await expect(emailInput.first()).toBeVisible({ timeout: 10000 });` BEFORE inspecting `bodyHtml.length`.
  - The web-first locator assertion will auto-retry up to 10000ms until the login form is hydrated and visible.
  - Asserting visibility of `emailInput.first()` directly validates form rendering. Subsequent `bodyHtml.length` check will evaluate against the fully rendered AuthHub DOM (> 1000 bytes).

### 1.2 Spec 5 Error Boundary Coverage Gap
- **File**: `apps/web/tests/e2e/smoke.spec.ts`, lines 187–219.
- **Original Assertion**:
  ```ts
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toContain("Something went wrong");
  expect(bodyText).not.toContain("Что-то пошло не так");
  ```
- **Gap**: DENTE CRM error boundary components (`workspaceRouteErrorBoundary.tsx`, `bootErrorBoundary.tsx`, etc.) output domain-specific Cyrillic failure messages when a view crashes.
- **Solution**: Expand negative assertions to include:
  - `"не открылось"`
  - `"Раздел временно не открылся"`
  - `"Не удалось открыть"`
  - `"Ошибка рендеринга"`

---

## 2. Worker 2 Implementation Instructions

Target File: `apps/web/tests/e2e/smoke.spec.ts`

### 2.1 Instruction A: Fix Spec 2 ("Login screen renders when no auth tokens present")

Replace lines 140–156 in `apps/web/tests/e2e/smoke.spec.ts`:

#### Target Content to Replace:
```ts
	test("2. Login screen renders when no auth tokens present", async ({ page }) => {
		// Override: remove tokens so auth gate kicks in
		await page.addInitScript(() => {
			localStorage.removeItem("dente_clinic_token");
			localStorage.removeItem("dente_staff_token");
		});

		await page.goto("/", { waitUntil: "load" });
		await page.waitForTimeout(2000);
		await screenshot(page, "02_login_screen");

		const bodyHtml = await page.innerHTML("body");
		expect(bodyHtml.length, "Login screen rendered empty body").toBeGreaterThan(200);
		// Login form should have an email input
		const emailInput = page.locator("input[type=email], input[placeholder*='mail'], input[placeholder*='email']");
		await expect(emailInput.first()).toBeVisible({ timeout: 5000 });
	});
```

#### Replacement Content:
```ts
	test("2. Login screen renders when no auth tokens present", async ({ page }) => {
		// Override: remove tokens so auth gate kicks in
		await page.addInitScript(() => {
			localStorage.removeItem("dente_clinic_token");
			localStorage.removeItem("dente_staff_token");
		});

		await page.goto("/", { waitUntil: "load" });

		// Login form should have an email input — wait for React lazy component hydration
		const emailInput = page.locator("input[type=email], input[placeholder*='mail'], input[placeholder*='email']");
		await expect(emailInput.first()).toBeVisible({ timeout: 10000 });

		await screenshot(page, "02_login_screen");

		const bodyHtml = await page.innerHTML("body");
		expect(bodyHtml.length, "Login screen rendered empty body").toBeGreaterThan(200);
	});
```

---

### 2.2 Instruction B: Fix Spec 5 ("No error boundaries triggered after full navigation cycle")

Replace lines 210–213 in `apps/web/tests/e2e/smoke.spec.ts`:

#### Target Content to Replace:
```ts
		const bodyText = await page.locator("body").innerText();
		expect(bodyText).not.toContain("Something went wrong");
		expect(bodyText).not.toContain("Что-то пошло не так");
```

#### Replacement Content:
```ts
		const bodyText = await page.locator("body").innerText();
		expect(bodyText).not.toContain("Something went wrong");
		expect(bodyText).not.toContain("Что-то пошло не так");
		expect(bodyText).not.toContain("не открылось");
		expect(bodyText).not.toContain("Раздел временно не открылся");
		expect(bodyText).not.toContain("Не удалось открыть");
		expect(bodyText).not.toContain("Ошибка рендеринга");
```

---

## 3. Verification Protocol for Worker 2 & Reviewer

Worker 2 must execute the following commands and record unedited stdout logs in `handoff.md`:

1. **TypeScript Typecheck**:
   ```bash
   npm run typecheck -w @dental/web
   ```
   *Expected Result*: Exit Code 0 with 0 compiler errors.

2. **Playwright E2E Smoke Tests**:
   ```bash
   npx playwright test tests/e2e/smoke.spec.ts
   ```
   *Expected Result*: 5 passed (all 5 specs pass cleanly with Exit Code 0).
