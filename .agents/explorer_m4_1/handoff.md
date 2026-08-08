# Handoff Report — Requirement R4: Playwright E2E Verification

## 1. Observation

### Existing Playwright Configuration & Dependencies
- **Configuration File**: `apps/web/playwright.config.ts`
  - `testDir: './tests/e2e'` (line 5)
  - `baseURL: 'http://127.0.0.1:5173'` (line 24)
  - `reporter: 'html'` (line 20)
  - `projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]` (lines 30-35)
  - `webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI }` (lines 39-44)
- **Package Manifests**:
  - `package.json`: `@playwright/test: "^1.51.0"` (line 163), `playwright: "^1.61.1"` (line 166), `"smoke": "npm run smoke:documents-lifecycle --workspace=@dental/web"` (line 160).
  - `apps/web/package.json`: `"smoke:documents-lifecycle": "playwright test tests/e2e/documents-lifecycle.spec.ts"` (line 12).
- **Existing Spec Files**:
  - `apps/web/tests/e2e/smoke.spec.ts`: 16 lines. Asserts `page.locator('#root')` is visible.
  - `apps/web/tests/e2e/documents-lifecycle.spec.ts`: 22 lines. Clicks `Пациенты` and `Документы`.
  - `apps/web/tests/smoke.spec.ts`: 43 lines (outside `tests/e2e/`). Listens to `pageerror` and `console.error`.

### Auth & Application Boot Infrastructure
- **Boot Unlock**: `AppBootState.tsx` renders `.boot-unlock-form` with input `input[type="password"]` when admin secret or clinic lock is active.
- **Staff PIN Pad**: `StaffPinPad.tsx` handles staff profile selection (e.g. `Dr. Smith`) and 4-digit PIN entry (`/api/auth/staff/unlock`).
- **Storage Pre-seeding**: `scripts/playwright-audit.cjs` (lines 245-270) demonstrates bypassing onboarding and auth prompts via `localStorage`:
  - `dente_clinic_token`: `"mock_clinic_token"`
  - `dente_staff_token`: `"mock_token"`
  - `dente_ui_preferences_v1`: `JSON.stringify({ onboardingDismissed: true, version: 1 })`
  - `dental-crm:onboarding:v1:org:1`: `JSON.stringify({ version: 1, dismissed: true, savedAt: "2026-07-06", draftMode: false })`

### Theme & Responsive System
- **Theme Stores & DOM Attributes**: `store/themeStore.ts` and `lib/themeClasses.ts` set `document.documentElement.dataset.theme` to `"light"`, `"dark"`, or `"night"`.
- **4-State Viewports**:
  - Mobile Light / Mobile Dark: Viewport `width: 390, height: 844`
  - PC Light / PC Dark: Viewport `width: 1440, height: 900`

### Server Ports & Architecture
- **Fastify API Server**: Listens on `127.0.0.1:4100` (`API_PORT` default in `apps/api/src/server.ts`).
- **Vite Web Server**: Listens on `127.0.0.1:5173` (`apps/web/vite.config.ts`), proxying `/api` requests to `127.0.0.1:4100`.

---

## 2. Logic Chain

1. **Defect Identification in Existing Test Suite**:
   - `npx playwright test` looks for test files under `apps/web/tests/e2e/`.
   - Currently, `smoke.spec.ts` only checks if `#root` exists, and `documents-lifecycle.spec.ts` only attempts basic patient tab clicking.
   - Neither existing test verifies the 5 primary routes (`Visit`, `Schedule`, `Patients`, `Finance`, `Settings`), nor do they assert zero unhandled console errors or capture 4-state visual screenshots.

2. **Formulation of Requirements R3 & R4 E2E Test Suite**:
   - To achieve full compliance with R4 and acceptance criteria, a dedicated Playwright spec `apps/web/tests/e2e/workspace-e2e.spec.ts` must be introduced.
   - The test spec must:
     1. Pre-inject auth tokens into `localStorage` before page load to bypass boot unlock and onboarding overlays.
     2. Attach event listeners for `pageerror` and `console` of type `error`, accumulating errors into an array and asserting `expect(errors).toEqual([])`.
     3. Sequentially navigate all 5 primary UI routes: `#visit`, `#schedule`, `#patients`, `#finance`, `#settings`.
     4. Assert that each route container (e.g. `#visit.visit-panel`, `#schedule.schedule-panel`, `#patients.patients-panel`, `#finance.finance-panel`, `#settings.settings-zone`) is visible and free of `.workspace-route-error`.
     5. Iterate through the 4 visual states (PC Light, PC Dark, Mobile Light, Mobile Dark), setting viewport sizes and updating `document.documentElement.dataset.theme`.
     6. Capture screenshots for each route in each visual state and save them to `artifacts/screenshots/`.

3. **Proposed Implementation Code Structure**:

```typescript
import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

test.describe('DENTE CRM Workspace E2E & 4-State Verification', () => {
  const routes = [
    { name: 'visit', hash: '#visit', selector: '#visit, .visit-panel, .tooth-map' },
    { name: 'schedule', hash: '#schedule', selector: '#schedule, .schedule-panel' },
    { name: 'patients', hash: '#patients', selector: '#patients, .patients-panel' },
    { name: 'finance', hash: '#finance', selector: '#finance, .finance-panel' },
    { name: 'settings', hash: '#settings', selector: '#settings, .settings-zone' },
  ];

  const states = [
    { name: 'pc_light', width: 1440, height: 900, theme: 'light' },
    { name: 'pc_dark', width: 1440, height: 900, theme: 'dark' },
    { name: 'mobile_light', width: 390, height: 844, theme: 'light' },
    { name: 'mobile_dark', width: 390, height: 844, theme: 'dark' },
  ];

  test('Primary workspace routes load without console errors and pass 4-state visual capture', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('pageerror', (err) => {
      consoleErrors.push(`[PAGE_ERROR] ${err.message}\n${err.stack}`);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[CONSOLE_ERROR] ${msg.text()}`);
      }
    });

    // Seed authentication & bypass onboarding in localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('dente_clinic_token', 'mock_clinic_token');
      localStorage.setItem('dente_staff_token', 'mock_token');
      localStorage.setItem('dente_theme_mode', 'light');
      localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true, version: 1 }));
      localStorage.setItem('dental-crm:onboarding:v1:org:1', JSON.stringify({ version: 1, dismissed: true, savedAt: '2026-07-06' }));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.app-shell, #root')).toBeVisible({ timeout: 15000 });

    const artifactsDir = path.resolve(process.cwd(), 'artifacts/screenshots');
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    for (const route of routes) {
      await page.goto(`/${route.hash}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(route.selector, { timeout: 10000 });
      await expect(page.locator('.workspace-route-error')).toHaveCount(0);

      for (const state of states) {
        await page.setViewportSize({ width: state.width, height: state.height });
        await page.evaluate((t) => {
          document.documentElement.dataset.theme = t;
          document.documentElement.classList.toggle('dark', t === 'dark');
          document.documentElement.classList.toggle('light', t === 'light');
        }, state.theme);

        await page.waitForTimeout(300);

        const screenshotPath = path.join(artifactsDir, `${route.name}_${state.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
      }
    }

    expect(consoleErrors).toEqual([]);
  });
});
```

---

## 3. Caveats

- **Live Server vs API Mocking**:
  - In a full live test, the Fastify server on `127.0.0.1:4100` and PostgreSQL 18 DB on `127.0.0.1:5432` must be active.
  - If Playwright runs in isolated mode without live API responses, `page.route('**/api/**', ...)` mocks (as implemented in `scripts/playwright-audit.cjs`) must be enabled to prevent network fetch failures from generating console errors.
- **Animation & Layout Reflow Timings**:
  - Responsive reflows and CSS theme color transitions require a minimal pause (`300ms`) between changing `dataset.theme` / viewport and taking the screenshot.
- **Browser Binary Availability**:
  - Playwright uses `@playwright/test` bundled Chromium. Ensure `npx playwright install chromium` has been run on host machine if Chromium binary is missing.

---

## 4. Conclusion

The Playwright E2E infrastructure in `apps/web/playwright.config.ts` is well-configured and ready for execution. Creating `apps/web/tests/e2e/workspace-e2e.spec.ts` with the complete 4-state visual capture and console error assertion logic will fully satisfy Requirement R4 and the acceptance criteria.

---

## 5. Verification Method

To independently verify Requirement R4:

1. **Typecheck Verification**:
   ```bash
   npm run typecheck -w @dental/web
   ```
   Ensure stage 5 passes with 0 TypeScript compilation errors.

2. **Execute Playwright E2E Suite**:
   ```bash
   npx playwright test tests/e2e/workspace-e2e.spec.ts --project=chromium
   ```
   from `apps/web/` directory or root workspace.

3. **Output & Artifact Inspection**:
   - Verify Playwright reports `1 passed` with 0 failures and 0 unhandled console errors.
   - Inspect generated screenshots in `artifacts/screenshots/` to confirm non-overlapping layouts across Mobile Light/Dark and PC Light/Dark for Visit, Schedule, Patients, Finance, and Settings.
