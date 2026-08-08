# Handoff Report — E2E Playwright Testing & Infra Survey

**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork_preview_explorer_survey_2`  
**Role**: E2E Playwright Testing & Infra Explorer  
**Date**: 2026-08-08  
**Analysis File**: `C:\Clinic_MVP\dental-crm\.agents\teamwork_preview_explorer_survey_2\analysis.md`  

---

## 1. Observation

Direct code observations from repository inspection:

* **Playwright Config Path**: `C:\Clinic_MVP\dental-crm\apps\web\playwright.config.ts`
  * Lines 5, 24, 39–44:
    ```typescript
    testDir: './tests/e2e',
    baseURL: 'http://127.0.0.1:5173',
    webServer: {
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
    }
    ```
* **E2E Spec Files**:
  * `apps/web/tests/e2e/smoke.spec.ts` (220 lines): Implements mocked API endpoints (`/api/auth/user/me`, `/api/dashboard`, `/api/settings/preferences`, etc.), injects auth tokens before page load, navigates hash routes (`#schedule`, `#patients`, `#settings`, `#finance`, `#imaging`), intercepts `pageerror` and `console` errors, and checks for Error Boundary fallbacks (`expect(bodyText).not.toContain("Something went wrong");`).
  * `apps/web/tests/e2e/documents-lifecycle.spec.ts` (22 lines): Tests navigation to Patients tab, selecting patient row, and navigating to Documents tab.
  * `apps/web/tests/smoke.spec.ts` (43 lines): Smoke test for main page load and console error tracking.
* **Standalone CDP Audit & Screenshot Scripts**:
  * `scripts/playwright-audit.cjs` (362 lines): CDP Chromium script with inline API mocks, localStorage token injection, boot unlock password filling (`dente123`), Staff PIN entry (`0000`), and multi-tab desktop/mobile screenshot generation.
  * `scripts/ops-panels-shots.mjs` (1369 lines): Heavyweight operational panels screenshot engine for Light/Dark/Night themes with web server availability check at `http://127.0.0.1:5173`.
  * `scripts/dente-redesign-shots.mjs` (752 lines): 11-view visual audit script capturing 4-state visual matrix (Desktop Light, Desktop Dark, Mobile Light, Mobile Dark).
  * `scripts/lib/shot-audit.mjs` (376 lines): Common security & verification module enforcing dataset theme matching, SHA-256 palette fingerprinting, byte size minimum (`MIN_PLAUSIBLE_SHOT_BYTES = 20_000`), and MD5 duplicate detection.
* **Authentication Storage Keys**:
  * `apps/web/src/lib/safeLocalStorage.ts`: `DENTE_CLINIC_TOKEN_KEY = "dente_clinic_token"`, `DENTE_STAFF_TOKEN_KEY = "dente_staff_token"`.
* **Database Seeding & Auth Token Generator**:
  * `apps/api/src/scripts/seedOpsScreenshotDemo.ts`: Seeds demo org `d0000000-0000-4000-8000-00000000d001` and writes JWT tokens to `.ops-shot-tokens.json`.

---

## 2. Logic Chain

1. **Test Infrastructure Dualism**: The project supports two execution modes for browser testing:
   - *Mocked API Mode*: Used by Playwright test specs (`smoke.spec.ts`, `playwright-audit.cjs`) via `page.route("**/api/**")`. This allows instant unit/smoke testing of frontend UI components without database dependencies.
   - *Live Integration Mode*: Used by visual proof scripts (`ops-panels-shots.mjs`, `dente-redesign-shots.mjs`). Requires live Fastify API server, PostgreSQL 18 database, and seeded demo tokens from `seedOpsScreenshotDemo.ts`.
2. **Authentication Flow**:
   - The web client checks `localStorage` for `dente_clinic_token` and `dente_staff_token` on startup.
   - If missing, the app shows the login form (`/api/auth/login`) or boot unlock screen (`.boot-unlock-form input[type="password"]`).
   - Playwright specs bypass authentication latency by invoking `page.addInitScript()` before page navigation to inject valid tokens directly into `localStorage`.
3. **Primary Panel Navigation**:
   - Navigation uses hash routes (`#schedule`, `#patients`, `#finance`, `#visit`, `#shift`, `#imaging`, `#documents`, `#analytics`, `#communications`, `#settings`, `#marketing`).
   - Playwright sets `window.location.hash` or clicks navigation links (`a[href="#schedule"]`), then waits for panel-specific container selectors (`VIEW_CONTAINERS`) and checks `[aria-busy="true"]` removal.
4. **Error & Exception Monitoring**:
   - JS runtime crashes are caught via `page.on('pageerror')`.
   - Browser console errors are caught via `page.on('console')`.
   - React Error Boundary crashes are detected by checking `body` inner text for strings like `"Something went wrong"` or `"Что-то пошло не так"`.
5. **Visual Proof Verification**:
   - Screenshot scripts capture the 4-state visual matrix (Desktop/Mobile x Light/Dark).
   - Strict guards prevent false positives: `assertThemeBeforeShot` validates CSS variable resolution and palette SHA-256 fingerprints, `MIN_PLAUSIBLE_SHOT_BYTES` blocks <20KB empty screens, and MD5 hashing ensures no duplicate/cloned screens.

---

## 3. Caveats

* **Network Idle Caution**: `waitUntil: "networkidle"` should NOT be used in Playwright specs for this application because active polling background tasks keep network traffic open indefinitely. Specs must use `waitUntil: "load"` or `waitUntil: "domcontentloaded"` combined with explicit selector waits.
* **Database State for Live Tests**: Live screenshot scripts (`ops-panels-shots.mjs`) require `.ops-shot-tokens.json` generated by `seedOpsScreenshotDemo.ts` with `DENTAL_ALLOW_DESTRUCTIVE_DB_RESET=YES`.
* **Read-Only Scope**: This survey was conducted in read-only investigation mode without executing live server state changes or modifying application source code.

---

## 4. Conclusion

The Playwright testing and browser automation infrastructure for DENTE CRM is robust, well-structured, and fortified with defensive quality gates. Authentication, hash routing, panel container ready-states, console error interception, and 4-state screenshot proofing are fully documented and ready for E2E verification tasks.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Playwright Config**:
   ```powershell
   Get-Content C:\Clinic_MVP\dental-crm\apps\web\playwright.config.ts
   ```
2. **Execute Playwright E2E Smoke Spec (Mocked API Mode)**:
   ```powershell
   cd C:\Clinic_MVP\dental-crm\apps\web
   npx playwright test tests/e2e/smoke.spec.ts
   ```
3. **Inspect Analysis Report**:
   ```powershell
   Get-Content C:\Clinic_MVP\dental-crm\.agents\teamwork_preview_explorer_survey_2\analysis.md
   ```
