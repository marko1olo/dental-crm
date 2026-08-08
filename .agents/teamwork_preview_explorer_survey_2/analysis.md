# Technical Analysis: E2E Playwright Testing & Infrastructure Survey

**Workspace**: `C:\Clinic_MVP\dental-crm`  
**Author**: E2E Playwright Testing & Infra Explorer  
**Date**: 2026-08-08  
**Target Path**: `C:\Clinic_MVP\dental-crm\.agents\teamwork_preview_explorer_survey_2\analysis.md`  

---

## 1. Executive Summary

This report provides a comprehensive architectural survey of the E2E Playwright testing setup, browser automation infrastructure, authentication handling, panel navigation, screenshot validation, and error monitoring mechanisms in the **DENTE Dental CRM** codebase (`C:\Clinic_MVP\dental-crm`).

The repository features a sophisticated dual-tier browser testing strategy:
1. **Playwright Test Runner Suite** (`@playwright/test`): Standard spec-driven testing (`apps/web/tests/e2e/smoke.spec.ts`, `apps/web/tests/e2e/documents-lifecycle.spec.ts`) utilizing mocked API routes or Vite dev server integration.
2. **Direct CDP & Custom Automation Infrastructure**: Heavyweight, production-grade visual audit and panel snapshot runners (`scripts/ops-panels-shots.mjs`, `scripts/dente-redesign-shots.mjs`, `scripts/playwright-audit.cjs`, `scripts/lib/shot-audit.mjs`) operating over Chrome DevTools Protocol (CDP) with strict theme validation, palette fingerprinting, MD5 uniqueness checks, and byte-size threshold guards.

---

## 2. Playwright & Test Infrastructure Overview

### 2.1 Configuration (`apps/web/playwright.config.ts`)
The primary Playwright configuration file is located at `apps/web/playwright.config.ts`:

```typescript
// Key configuration properties in apps/web/playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 2.2 Test Files Inventory & Locations
| File Location | Purpose & Framework | Key Functions |
|---|---|---|
| `apps/web/tests/e2e/smoke.spec.ts` | Main Playwright E2E smoke suite (220 lines) | Tests token injection, login screen fallback, dashboard load, hash routing, and Error Boundary absence |
| `apps/web/tests/e2e/documents-lifecycle.spec.ts` | E2E Document Generation spec | Patient navigation, document generation workflow |
| `apps/web/tests/smoke.spec.ts` | Standalone Web Smoke Test | Validates main page load, captures page errors & console errors |
| `e2e.cjs` | Standalone Node/Playwright Script | Simple page load check & artifact screenshot generator |
| `scripts/playwright-audit.cjs` | CDP-based Audit Runner (362 lines) | Full panel navigation, local API route mocking, screenshot capture |
| `scripts/ops-panels-shots.mjs` | Operational Panels CDP Script (1369 lines) | Multi-theme (Light/Dark/Night) snapshot proof for operational surfaces |
| `scripts/dente-redesign-shots.mjs` | 11-View 4-State Visual Audit (752 lines) | Desktop (1440x900) & Mobile (390x844) x Light/Dark screenshot engine |
| `scripts/lib/shot-audit.mjs` | Common Shot Security & Audit Engine (376 lines) | Theme assertion, palette fingerprinting SHA-256, MD5 uniqueness |

### 2.3 `package.json` Test Scripts
* **Root `package.json`**:
  * `"smoke:all"`: `node scripts/run-smoke-suite.mjs`
  * `"smoke:documents-lifecycle"`: `npm run smoke:documents-lifecycle --workspace=@dental/web`
  * `"smoke:schedule-configuration"`: `npm run db:reset-seed && node scripts/smoke-schedule-configuration.mjs`
  * `"db:reset-seed"`: `npx tsx apps/api/src/scripts/migrateStateToDb.ts`
* **`apps/web/package.json`**:
  * `"dev"`: `"vite --host 127.0.0.1 --port 5173"`
  * `"test"`: `"node --import tsx --import ./testCssStub.mjs --test \"src/**/*.test.ts\" \"src/**/*.test.tsx\""`
  * `"smoke:documents-lifecycle"`: `"playwright test tests/e2e/documents-lifecycle.spec.ts"`

---

## 3. App Launch, Authentication & Seeding Mechanisms

### 3.1 App Launch Strategy
* **Web Client**: Launched on `http://127.0.0.1:5173` via Vite (`vite --host 127.0.0.1 --port 5173`).
* **API Server**: Fastify backend running on `http://127.0.0.1:3000` (or default port).
* **Dual Execution Modes**:
  1. **Mocked Mode** (`smoke.spec.ts`, `playwright-audit.cjs`): Intercepts `/api/**` calls via `page.route()` and returns synthetic JSON payloads (`MOCK_USER`, `MOCK_DASHBOARD`, `MOCK_PREFERENCES`). This permits headless E2E verification without running the Fastify/PostgreSQL backend.
  2. **Live Integration Mode** (`ops-panels-shots.mjs`, `dente-redesign-shots.mjs`): Requires an active HTTP 200 server at `127.0.0.1:5173` and live Fastify/PostgreSQL 18 database.

### 3.2 Authentication & LocalStorage Architecture
Authentication state in `@dental/web` relies on client-side tokens stored in browser `localStorage`:
* `dente_clinic_token`: Clinic-level tenant token (constant key: `DENTE_CLINIC_TOKEN_KEY`)
* `dente_staff_token`: Staff member session token (constant key: `DENTE_STAFF_TOKEN_KEY`)

#### Token Injection Pattern (`apps/web/tests/e2e/smoke.spec.ts` lines 43–58)
To bypass the login UI and test authenticated surfaces directly, Playwright injects tokens **before** React mounts using `addInitScript`:

```typescript
async function injectAuthTokens(page: Page) {
  await page.addInitScript(
    ({ clinicKey, staffKey, clinicToken, staffToken }) => {
      localStorage.setItem(clinicKey, clinicToken);
      localStorage.setItem(staffKey, staffToken);
    },
    {
      clinicKey: "dente_clinic_token",
      staffKey: "dente_staff_token",
      clinicToken: "test-clinic-token-abc123",
      staffToken: "test-staff-token-xyz789",
    },
  );
}
```

### 3.3 Database Seeding & Token Generation
The seed script `apps/api/src/scripts/seedOpsScreenshotDemo.ts` manages database seeding and auth token generation:
* **Tenant Organization ID**: `d0000000-0000-4000-8000-00000000d001` ("Демо-клиника для снимков").
* **Output File**: Writes valid signed JWT tokens to `.ops-shot-tokens.json` in root directory.
* **Command Execution**:
  ```bash
  cd apps/api && DENTAL_ALLOW_DESTRUCTIVE_DB_RESET=YES npx tsx src/scripts/seedOpsScreenshotDemo.ts > ../../.ops-shot-tokens.json
  ```

### 3.4 Login & Unlock Overlays Handling
When tokens are omitted or expired, tests interact with these UI elements (`scripts/playwright-audit.cjs` & `scripts/dente-redesign-shots.mjs`):
1. **Boot Unlock Screen**: Selector `.boot-unlock-form input[type="password"]` (default password: `dente123`).
2. **Staff PIN Pad**: Selector `.staff-pin-pad` / `.pin-lock-screen` -> click staff card (`.staff-card`) -> enter PIN `0000`.
3. **Onboarding Wizard Bypass**: Sets `localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }))`.

---

## 4. Primary Panel Navigation Architecture

### 4.1 Hash-Based Routing System
The React client uses hash routing (`window.location.hash`). The 11 core primary panels map directly to hashes:

| Panel Name | Hash Route | Target Container Selector (`VIEW_CONTAINERS`) |
|---|---|---|
| **Shift** | `#shift` | `#shift, .shift-hero` |
| **Schedule** | `#schedule` | `#schedule, .schedule-panel` |
| **Patients** | `#patients` | `#patients, .patients-panel` |
| **Imaging** | `#imaging` | `#imaging, .imaging-panel` |
| **Visit** | `#visit` | `#visit, .visit-panel` |
| **Documents** | `#documents` | `#documents, .documents-panel` |
| **Finance** | `#finance` | `#finance, .finance-panel` |
| **Analytics** | `#analytics` | `#analytics, .analytics-panel` |
| **Communications** | `#communications` | `#communications, .communications-panel` |
| **Settings** | `#settings` | `#settings, .settings-zone` |
| **Marketing** | `#marketing` | `#marketing, .marketing-panel` |

### 4.2 Programmatic Navigation Patterns
In Playwright tests:
```typescript
// Hash change via page evaluation
await page.evaluate((h) => { window.location.hash = `#${h}`; }, "schedule");
await page.waitForTimeout(700);

// Hash change via anchor selection
await page.click('aside.sidebar nav a[href="#schedule"]');
```

### 4.3 Panel Ready-State & Busy Gate Detection (`scripts/lib/shot-audit.mjs`)
To prevent taking screenshots while data is loading or while transitioning, tests monitor `[aria-busy="true"]`:

```javascript
// Busy selector construction in scripts/lib/shot-audit.mjs
export function busySelector(selectorList) {
  const parts = String(selectorList).split(",").map((p) => p.trim()).filter(Boolean);
  return parts.map((part) => `${part}[aria-busy="true"]`).join(", ");
}
```
The test waits until the panel container is present **and** no element matching `busySelector` exists.

---

## 5. Observability: Console Logs, Screenshots & Error Monitoring

### 5.1 Console Error Interception
Playwright specs capture browser logs using `page.on("console")`:

```typescript
const consoleErrors: string[] = [];
page.on("console", (msg) => {
  if (msg.type() === "error") {
    const text = msg.text();
    // Exclude noise network errors if desired
    if (!text.includes("net::ERR_") && !text.includes("Failed to load resource")) {
      consoleErrors.push(text);
    }
  }
});
```

### 5.2 Uncaught JS Exceptions (`pageerror`)
Browser JS crashes and unhandled promise rejections are captured via `pageerror`:

```typescript
const pageErrors: string[] = [];
page.on("pageerror", (err) => {
  pageErrors.push(`PageError: ${err.message}\nStack: ${err.stack}`);
});
```

### 5.3 React Error Boundary Detection
Tests explicitly assert that React Error Boundaries have not caught fatal exceptions:

```typescript
const bodyText = await page.locator("body").innerText();
expect(bodyText).not.toContain("Something went wrong");
expect(bodyText).not.toContain("Что-то пошло не так");
expect(pageErrors, `JS crashes:\n${pageErrors.join("\n")}`).toEqual([]);
```

### 5.4 4-State Visual Proof Matrix & Viewports
For visual verification, screens are rendered across 4 layout/theme states:
1. **PC Light**: Viewport `1440x900`, `data-theme="light"`
2. **PC Dark**: Viewport `1440x900`, `data-theme="dark"`
3. **Mobile Light**: Viewport `390x844`, `data-theme="light"`, `mobile: true`
4. **Mobile Dark**: Viewport `390x844`, `data-theme="dark"`, `mobile: true`

### 5.5 Screenshot Verification & Fraud Prevention Security Gates (`scripts/lib/shot-audit.mjs`)
The repository implements strict verification rules for screenshots:
1. **Theme State Pre-Shot Assertion**: Verifies `document.documentElement.dataset.theme`, theme store mode (`window.__useThemeStore`), class names on `<html>`, and calculates a SHA-256 fingerprint of all CSS custom property variables.
2. **Byte-Size Threshold Guard (`MIN_PLAUSIBLE_SHOT_BYTES = 20_000`)**: Screenshots smaller than 20 KB are rejected as empty white screens or crashed renders.
3. **MD5 Uniqueness Audit**: `createShotAudit` hashes each captured PNG. Identical MD5 hashes across different views/themes trigger an immediate build failure to prevent cloned proof artifacts.

---

## 6. Synthesis & Recommendations for E2E Verification

| Area | Current Implementation Status | Recommendation for Execution |
|---|---|---|
| **Test Runner** | Playwright Test (`@playwright/test`) configured in `apps/web` | Run `npx playwright test` inside `apps/web` |
| **API Mocking** | Full mocking in `smoke.spec.ts` | Ideal for fast CI smoke runs without needing live DB |
| **Auth Strategy** | `addInitScript` with `dente_clinic_token` & `dente_staff_token` | Best approach for fast navigation without login UI latency |
| **Navigation** | Hash-based (`#schedule`, `#patients`, `#finance`) | Toggle via `window.location.hash` or direct anchor clicks |
| **Error Monitoring** | `pageerror` + `console` (error level) + DOM text check | Use composite error array assertion |
| **Visual Proof** | 4-State matrix + `shot-audit.mjs` protection | Check theme attributes & MD5 uniqueness |

