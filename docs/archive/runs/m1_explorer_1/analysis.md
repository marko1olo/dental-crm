# Milestone 1 E2E Verification Strategy & Execution Analysis

## Executive Summary
This document defines the Milestone 1 E2E Verification Strategy for DENTE Dental CRM (`C:\Clinic_MVP\dental-crm`). It synthesizes an in-depth examination of `apps/web/tests/e2e/smoke.spec.ts`, `scripts/playwright-audit.cjs`, and `scripts/dente-redesign-shots.mjs` to formulate an unambiguous, step-by-step execution plan for Worker 1.

---

## 1. Deep Dive Examination of E2E & Visual Screenshot Artifacts

### 1.1 `apps/web/tests/e2e/smoke.spec.ts` (Mocked API Playwright Test Suite)
- **Role & Framework**: Official Playwright test suite using `@playwright/test`, configured via `apps/web/playwright.config.ts`.
- **Target Base URL**: `http://127.0.0.1:5173` (configured with `webServer` auto-start option).
- **API Mocking Strategy**:
  - Uses `page.route("**/api/**")` interceptors to mock key endpoints (`/api/auth/user/me`, `/api/dashboard`, `/api/settings/preferences`, `/api/settings/clinic/profile`, `/api/system/**`, etc.).
  - Enables fast, deterministic smoke testing without requiring a running Fastify server or PostgreSQL database.
- **Token Injection Architecture**:
  - Injects `dente_clinic_token` (`test-clinic-token-abc123`) and `dente_staff_token` (`test-staff-token-xyz789`) prior to page load using `page.addInitScript(...)`.
  - Ensures React client mounts directly into an authenticated state during test runs.
- **Test Coverage (5 Specs)**:
  1. `1. Authenticated workspace mounts`: Validates `#root` inner text > 10 chars, catches page exceptions.
  2. `2. Login screen renders`: Strips localStorage tokens via `addInitScript` and verifies email input visibility.
  3. `3. Dashboard loads`: Verifies sidebar navigation rail and app shell mounting.
  4. `4. Hash routing`: Iterates through hashes (`#schedule`, `#patients`, `#settings`, `#finance`, `#imaging`) with `window.location.hash` and checks for crashes.
  5. `5. No error boundaries`: Listens to `page.on('console')` and `page.on('pageerror')`, navigates `#schedule` -> `#patients` -> `#finance`, and explicitly asserts `body` text does NOT contain "Something went wrong" or "Что-то пошло не так".

### 1.2 `scripts/playwright-audit.cjs` (Standalone Chromium Audit Script)
- **Role & Framework**: Standalone CommonJS script using `playwright` (`chromium.launch({ headless: true })`).
- **API Interception & State Handling**:
  - Intercepts `/api/dashboard` and `/api/patients` with structured mock payloads.
  - Sets tokens and onboarding completion flags directly in `localStorage` post-load, followed by `page.reload()`.
  - Handles interactive overlay gates: Boot unlock password form (`dente123`), Onboarding skip panel, and `StaffPinPad` (`Dr. Smith`, PIN `0000`).
- **Screenshot Output**: Generates desktop (1440x900) and mobile (375x812) screenshots into `artifacts/screenshots/` for 7 core views (Dashboard, Schedule, Patients, Visit, Imaging, Finance, Settings).

### 1.3 `scripts/dente-redesign-shots.mjs` (Live Server 4-State Visual Proof Suite)
- **Role & Framework**: Standalone ES module using Chrome DevTools Protocol (CDP) WebSocket communication over headless Edge/Chrome.
- **Live Server Dependency**: **Mandatory** live web server (`http://127.0.0.1:5173`) AND live Fastify API backend (`/api/auth/login`). Executes actual POST requests to obtain valid session tokens.
- **4-State Visual Proof Matrix**:
  - Captures 4 layout/theme states across all 11 CRM views (`shift`, `schedule`, `patients`, `imaging`, `visit`, `documents`, `finance`, `analytics`, `communications`, `settings`, `marketing`):
    1. **Desktop Light (1440x900)** + collapsed sidebar variant (`desktop_light_shift_collapsed.png`)
    2. **Desktop Dark (1440x900)**
    3. **Mobile Light (390x844)**
    4. **Mobile Dark (390x844)**
- **Quality Verification Safeguards**:
  - Asserts exact container elements per view (`VIEW_CONTAINERS`, e.g., `#schedule, .schedule-panel`, `#patients, .patients-panel`, `#finance, .finance-panel`).
  - Verifies DOM `data-theme` attribute and color palette fingerprint (`paletteFingerprint`).
  - Rejects blank/empty PNG files smaller than `MIN_PLAUSIBLE_SHOT_BYTES = 20000`.
  - Outputs audit manifest to `C:/Clinic_MVP/dental-crm/.dente-redesign-shots/theme-audit.json`.

---

## 2. Step-by-Step Execution Plan for Worker 1

### Phase 1: Pre-Flight Environment Checks
1. **Directory**: Ensure working directory is `C:\Clinic_MVP\dental-crm`.
2. **Typecheck Gate**: Run `npm run typecheck -w @dental/web` to confirm zero TypeScript compilation errors.
3. **Web Server Verification**: Verify Vite dev server is accessible at `http://127.0.0.1:5173`. (If not running, launch `npm run dev` or allow Playwright's `webServer` config to start it).

### Phase 2: Launch Playwright Test Suite (`npx playwright test`)
1. **Command**:
   ```bash
   npx playwright test apps/web/tests/e2e/smoke.spec.ts
   ```
2. **Token Injection & Auth Verification**:
   - Confirm `injectAuthTokens(page)` injects `dente_clinic_token` and `dente_staff_token` before navigation.
   - Verify Spec 1 passes with visible root content and zero JS page errors.
   - Verify Spec 2 successfully verifies login screen fallback when tokens are absent.

### Phase 3: Panel Navigation Verification
1. Verify Spec 4 and Spec 5 navigate across core panels:
   - Schedule panel (`#schedule`)
   - Patients panel (`#patients`)
   - Finance panel (`#finance`)
   - Additional views: Settings (`#settings`), Imaging (`#imaging`).

### Phase 4: Console Log & Error Boundary Monitoring
1. Monitor `page.on('console')` for browser console errors.
2. Monitor `page.on('pageerror')` for unhandled exceptions.
3. Confirm assertion:
   - `expect(bodyText).not.toContain("Something went wrong")`
   - `expect(bodyText).not.toContain("Что-то пошло не так")`

### Phase 5: 4-State Visual Proof Matrix Screenshot Generation
1. **Live API Pre-Requisite**: Ensure Fastify backend API is running (`npm run dev`).
2. **Execute Screenshot Script**:
   ```bash
   node scripts/dente-redesign-shots.mjs
   ```
3. **Visual Matrix Verification**:
   - Inspect output directory: `C:\Clinic_MVP\dental-crm\.dente-redesign-shots\`
   - Check `theme-audit.json` for 44+ generated screenshot entries.
   - Confirm presence of Desktop Light, Desktop Dark, Mobile Light, and Mobile Dark plates for Schedule, Patients, Finance, and all 11 CRM views.
   - Ensure zero `_НЕ_ОТКРЫЛСЯ_` diagnostic images.

---

## 3. Summary of Verification Commands for Worker 1

| Verification Target | Command / Tool | Success Criteria |
|---------------------|----------------|------------------|
| Playwright E2E Smoke | `npx playwright test apps/web/tests/e2e/smoke.spec.ts` | 5 passed tests, exit code 0 |
| Fastify + Vite Dev Server | `npm run dev` | Server listening on ports 5173 & 3000 |
| 4-State Visual Matrix | `node scripts/dente-redesign-shots.mjs` | 44+ plates in `.dente-redesign-shots/`, clean `theme-audit.json` |
| Web Typecheck Gate | `npm run typecheck -w @dental/web` | 0 errors, exit code 0 |
