# Playwright E2E Infrastructure & 4-State Visual Audit Survey — Handoff Report

**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork_preview_explorer_survey_1`  
**Target Repository**: `C:\Clinic_MVP\dental-crm`  
**Date**: 2026-08-09  

---

## 1. Observation

Exhaustive inspection was conducted on all Playwright E2E configuration files, test scripts, dev server options, authentication token mechanisms, and 4-state screenshot storage logic within `C:\Clinic_MVP\dental-crm`.

### 1.1 Key Script & Configuration Files Inspected

1. **`apps/web/playwright.config.ts`** (Lines 1-46):
   - Configures test directory: `./tests/e2e`
   - Configures `baseURL: "http://127.0.0.1:5173"`
   - Uses `webServer`: `command: "npm run dev"`, `url: "http://127.0.0.1:5173"`, `reuseExistingServer: !process.env.CI`
   - Defines Chromium project profile using `devices['Desktop Chrome']`.

2. **`e2e_4state_audit.cjs`** (Lines 1-194):
   - Node.js Playwright script for 4-state visual capture across 9 hash-routed views (`shift`, `schedule`, `patients`, `imaging`, `documents`, `finance`, `analytics`, `communications`, `settings`).
   - Defines 4 configurations (Line 29-34):
     - `Mobile_Light`: `devices['Pixel 5']`, `colorScheme: 'light'`
     - `Mobile_Dark`: `devices['Pixel 5']`, `colorScheme: 'dark'`
     - `PC_Light`: `viewport: { width: 1280, height: 800 }`, `colorScheme: 'light'`
     - `PC_Dark`: `viewport: { width: 1280, height: 800 }`, `colorScheme: 'dark'`
   - Pre-seeds `localStorage` before page mount using `page.addInitScript`:
     ```javascript
     localStorage.setItem('dente_clinic_token', 'e2e-clinic-token-fake');
     localStorage.setItem('dente_staff_token', 'e2e-staff-token-fake');
     localStorage.setItem('dental-crm:web-ui-preferences:v1', UI_PREFS);
     localStorage.setItem('dente_ui_preferences_v1', JSON.stringify({ onboardingDismissed: true }));
     ```
   - Intercepts API routes (`/api/auth/user/me`, `/api/dashboard`, `/api/appointments`, `/api/patients`, etc.) returning mock JSON payloads to bypass live backend requirements.

3. **`scripts/dente-redesign-shots.mjs` & `scripts/lib/shot-audit.mjs`** (Lines 1-752 & 1-376):
   - CDP (Chrome DevTools Protocol) / Node.js test script targeting live Vite web server (`http://127.0.0.1:5173`) and Fastify API server (`http://127.0.0.1:4100`).
   - Implements anti-fabrication guards:
     - **Theme Verification**: `readThemeState()` executes `THEME_STATE_EXPRESSION` on `document.documentElement` to inspect `data-theme`, `window.__useThemeStore.getState().themeMode`, `className`, and palette token values SHA-256 fingerprint.
     - **Unique MD5 Check**: `register()` calculates SHA-256 / MD5 hash of output screenshot PNG buffer and rejects identical twin images across different views/themes.
     - **Minimum Size Floor**: `MIN_PLAUSIBLE_SHOT_BYTES = 20_000` (Line 561). Rejects blank white screens (< 20KB).
     - **View Ready Check**: `waitForViewReady(viewName)` checks container IDs (`#shift`, `#schedule`, etc.) and ensures no `[aria-busy="true"]` selector is present.
     - **Fresh Browser Profile**: Creates isolated temporary profile dir `dente-shot-profile-TIMESTAMP` per run to prevent stale `localStorage` contamination.

4. **`apps/web/tests/e2e/smoke.spec.ts`** (Lines 1-347):
   - Playwright test suite for React SPA boot state, login form rendering, hash navigation (`#schedule`, `#patients`, `#settings`, `#finance`, `#imaging`), and error boundary checks.
   - Asserts absence of error boundary text (`Something went wrong`, `Что-то пошло не так`, `Раздел временно не открылся`).

5. **Server Setup & Network Topology**:
   - `apps/web/package.json` (Line 7): `"dev": "vite --host 127.0.0.1 --port 5173"`
   - `apps/api/package.json` (Line 7): `"dev": "tsx watch src/server.ts"`
   - `apps/api/src/server.ts` (Line 812): `const port = Number(process.env.API_PORT ?? 4100);`
   - `apps/web/vite.config.ts` (Line 9-10 & 359-366): Proxies `/api` requests to `http://127.0.0.1:4100` with WebSocket support (`ws: true`).
   - Port Check Result: Port 5173 was confirmed active (`LISTENING`, PID 87336). Port 4100 is the default API port.

---

## 2. Logic Chain

1. **Authentication Token Mechanism**:
   - `safeLocalStorage.ts` defines `DENTE_CLINIC_TOKEN_KEY = "dente_clinic_token"` and `DENTE_STAFF_TOKEN_KEY = "dente_staff_token"`.
   - On initial page load, `AppBootState.tsx` and auth guards read `readDenteClinicToken()` and `readDenteStaffToken()`.
   - If present, the SPA skips the login screen and sends request to `/api/auth/user/me` or mounts `WorkspaceShell`.
   - Therefore, E2E scripts MUST inject these two localStorage keys BEFORE React mounts (via Playwright `page.addInitScript` or CDP `Runtime.evaluate`).

2. **Onboarding Dismissal Requirement**:
   - In addition to auth tokens, the SPA checks onboarding status in `localStorage` under `dental-crm:web-ui-preferences:v1`, `dente_ui_preferences_v1`, and `dental-crm:onboarding:v1`.
   - If onboarding keys are missing or `onboardingDismissed` is false, the app opens the onboarding overlay, blocking access to main workspace views.
   - Inlining `{ version: 1, selectedWorkspaceRole: "owner", onboardingDismissed: true, onboardingStep: "finish" }` into `localStorage` bypasses the modal.

3. **4-State Rendering Mechanics**:
   - The 4 required states are:
     1. `Mobile_Light`: Viewport `390x844` (Pixel 5), `colorScheme: 'light'`, `data-theme: 'light'`, `window.__useThemeStore.getState().setThemeMode('light')`
     2. `Mobile_Dark`: Viewport `390x844` (Pixel 5), `colorScheme: 'dark'`, `data-theme: 'dark'`, `window.__useThemeStore.getState().setThemeMode('dark')`
     3. `PC_Light`: Viewport `1440x900` (or `1280x800`), `colorScheme: 'light'`, `data-theme: 'light'`, `window.__useThemeStore.getState().setThemeMode('light')`
     4. `PC_Dark`: Viewport `1440x900` (or `1280x800`), `colorScheme: 'dark'`, `data-theme: 'dark'`, `window.__useThemeStore.getState().setThemeMode('dark')`
   - Switching theme at runtime must call `window.__useThemeStore.getState().setThemeMode(theme)` and verify that `document.documentElement` reflects `data-theme="light|dark"`.

4. **Screenshot Artifact Storage Compliance**:
   - According to project rule `[SCREENSHOTS & MEDIA EMBEDDING]` in `AGENTS.md` and user session context:
     - Files must be saved/copied into session artifact directory: `C:\Users\Admin\.gemini\antigravity\brain\dc8ea3d1-a9c7-4ccd-8e06-90b13ea3d0a1\`.
     - File size must be $\ge$ 20,000 bytes (`MIN_PLAUSIBLE_SHOT_BYTES`).
     - Image Markdown format: `![description](C:/Users/Admin/.gemini/antigravity/brain/dc8ea3d1-a9c7-4ccd-8e06-90b13ea3d0a1/filename.png)`.

---

## 3. Caveats

- **Live Backend Dependency for Real Shots**: Running `scripts/dente-redesign-shots.mjs` against a live API server requires PostgreSQL 18 (`.data/pg18`) and `npm run dev` active. If API server is stopped, `fetch('/api/auth/login')` or `/api/dashboard` will fail.
- **Mocked Route Alternative**: Running `e2e_4state_audit.cjs` or `npx playwright test apps/web/tests/e2e/smoke.spec.ts` operates purely against mocked routes, eliminating backend/database dependencies while verifying UI component rendering and layout.
- **No Uncovered Routes**: Hash routing uses `#shift`, `#schedule`, `#patients`, `#imaging`, `#visit`, `#documents`, `#finance`, `#analytics`, `#communications`, `#settings`, `#marketing`.

---

## 4. Conclusion & Recommended Execution Strategy

### Recommended Dual-Tier Execution Strategy

1. **Tier 1: Mocked Playwright E2E Smoke & Component Integrity** (`apps/web/tests/e2e/smoke.spec.ts`)
   - **Purpose**: Fast programmatic validation of UI boot, component instantiation, hash navigation, and Error Boundary absence.
   - **Command**: `npx playwright test apps/web/tests/e2e/smoke.spec.ts --project=chromium`
   - **Pre-requisite**: Vite server running on `http://127.0.0.1:5173` (or auto-started via `playwright.config.ts`).

2. **Tier 2: 4-State Visual Audit Matrix** (`e2e_4state_audit.cjs` / `scripts/dente-redesign-shots.mjs`)
   - **Purpose**: Comprehensive 4-state screenshot generation (Mobile Light, Mobile Dark, PC Light, PC Dark) across all 10 views for visual inspection, contrast checking, and layout verification.
   - **Command**: `node e2e_4state_audit.cjs` or `node scripts/dente-redesign-shots.mjs`
   - **Output Location**: `C:\Users\Admin\.gemini\antigravity\brain\dc8ea3d1-a9c7-4ccd-8e06-90b13ea3d0a1\`

---

## 5. Verification Method

To independently verify this Playwright E2E infrastructure analysis and execution:

1. **Verify Playwright Test Configuration**:
   ```bash
   npx playwright test apps/web/tests/e2e/smoke.spec.ts --project=chromium
   ```
   *Expected Result*: All 5 tests pass with 0 errors.

2. **Verify 4-State Visual Audit Script Execution**:
   ```bash
   node e2e_4state_audit.cjs
   ```
   *Expected Result*: Generates 36 screenshots (9 views x 4 states) with non-empty buffers (> 20 KB) in the artifact directory.

3. **Verify Screenshot Integrity & Anti-Fabrication**:
   - Check output PNG file sizes ($\ge$ 20 KB).
   - Compute MD5 hashes to confirm zero cloned images across views.
   - Inspect visual rendering using `view_file`.
