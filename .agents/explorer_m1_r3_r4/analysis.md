# Reconnaissance Audit Report: Requirements R3 & R4

**Milestone**: Milestone 1 - Reconnaissance (Requirements R3 & R4)  
**Agent**: Explorer Subagent (`explorer_m1_r3_r4`)  
**Target Workspace**: `C:\Clinic_MVP\dental-crm`  
**Date**: 2026-07-31  

---

## Executive Summary

This reconnaissance audit investigates the state and implementation details for Requirements **R3** (Session Token Re-hydration & Quality Gates) and **R4** (4-State Visual Proof & Automated Gating).

Key Discoveries:
1. **Session Token Loss & Shift Lock Fallbacks**: Session token loss during theme toggling/automated testing is driven by static initial auth state evaluation in `App.tsx`, combined with an un-reset 5-minute inactivity auto-lock timer during CDP script runs, and 401 error handling that strips `dente_staff_token` from `localStorage`.
2. **`_ПУСТО.png` Placeholder Mechanism**: When `App.tsx` falls back to `StaffPinPad` (the shift lock screen) or fails to load a panel, `scripts/ops-panels-shots.mjs` marker check (`assertSectionOnScreen`) fails, marking the screenshot as `wrongSection` and renaming the output image to `..._ПУСТО.png`.
3. **4-State Visual Proof Capture**: `scripts/ops-panels-shots.mjs` uses headless Edge/Chrome over CDP (port 9341), injecting tokens from `.ops-shot-tokens.json` into `localStorage`, toggling theme modes via `window.__useThemeStore.getState().setThemeMode(theme)`, verifying palette SHA256 fingerprints, and simulating desktop (`1600x1000`) and mobile (`375x812`) viewports.
4. **Monorepo Quality Gates**: Both `npm run check:encoding` (2,840 files checked) and `npm run typecheck` across `@dental/shared`, `@dental/api`, and `@dental/web` pass cleanly with zero errors.

---

## 1. Task 1 Audit: Theme Toggle & Session Token Re-hydration (`apps/web/src/`)

### 1.1 Relevant Codebase Locations
- `apps/web/src/App.tsx`: Manages top-level auth gate rendering (`AuthHub` for clinic login, `StaffPinPad` for staff unlock), inactivity lock timer, and global layout.
- `apps/web/src/store/themeStore.ts`: Zustand store holding `themeMode` (`"auto" | "light" | "dark" | "night"`) and persisting to `localStorage` under key `"dente_theme_mode"`.
- `apps/web/src/lib/themeClasses.ts`: Converts `themeMode` into root dataset (`document.documentElement.dataset.theme`) and legacy CSS classes (`dark`, `light`).
- `apps/web/src/workspaceShell.tsx`: Renders sidebar & header theme toggle buttons using `useThemeStore.getState().setThemeMode(mode)`.
- `apps/web/src/lib/safeLocalStorage.ts`: Read/write functions for `dente_clinic_token` and `dente_staff_token`.
- `apps/web/src/lib/apiAuthFetch.ts`: Wrapper for `window.fetch` attaching `x-dente-clinic-token` and `x-dente-staff-token` headers.

### 1.2 Root Cause Analysis of Session Loss & Shift Lock Screen Fallbacks

#### Root Cause 1: Static Initial Auth State Initialization
In `App.tsx` (lines 1943-1950):
```tsx
const [clinicAuthed, setClinicAuthed] = useState<boolean>(() => !!readDenteClinicToken());
const [staffAuthed, setStaffAuthed] = useState<boolean>(() => !!readDenteStaffToken());
```
`clinicAuthed` and `staffAuthed` are initialized once at component mount. When `localStorage` tokens change or are re-hydrated dynamically, React state in `App.tsx` does not re-sync automatically unless triggered by external events or forced state updates.

#### Root Cause 2: 5-Minute Inactivity Auto-Lock Timer in Automated Testing
In `App.tsx` (lines 1986-2004):
```tsx
useEffect(() => {
  if (!clinicAuthed) return;
  let timer: ReturnType<typeof setTimeout>;
  const resetTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      setStaffAuthed(false);
      setShowStaffPinPad(true);
      safeLocalStorageRemoveItem(DENTE_STAFF_TOKEN_KEY);
    }, 5 * 60 * 1000);
  };
  const events = ["mousemove", "keydown", "pointerdown", "touchstart"];
  events.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }));
  resetTimer();
  return () => {
    clearTimeout(timer);
    events.forEach((e) => document.removeEventListener(e, resetTimer));
  };
}, [clinicAuthed]);
```
During automated script execution (such as `scripts/ops-panels-shots.mjs`), CDP invokes JavaScript methods programmatically without dispatching physical DOM mouse or keyboard events. After 300 seconds (5 minutes), the inactivity timer fires, clears `dente_staff_token` from `localStorage`, sets `staffAuthed = false`, and sets `showStaffPinPad = true`.

#### Root Cause 3: Shift Lock Screen Fallback and `_ПУСТО.png` Output
In `App.tsx` (line 2051):
```tsx
if (!staffAuthed || showStaffPinPad) {
  return <StaffPinPad ... />;
}
```
When `staffAuthed` becomes `false` or `showStaffPinPad` becomes `true`, `App.tsx` renders `<StaffPinPad />`.
In `scripts/ops-panels-shots.mjs`, when `assertSectionOnScreen(marker, fileName)` tries to verify that the workspace panel is rendered, it fails to find the panel element (because `StaffPinPad` covers the screen). The script marks the capture as `wrongSection` and appends `_ПУСТО.png` to the filename, saving a diagnostic placeholder image instead of the expected panel proof.

#### Root Cause 4: Dashboard 401 Error Force Logout
In `App.tsx` (lines 1957-1964), if `loadDashboard()` encounters a 401 Unauthorized status (e.g. if tokens expired or seed DB was cleaned), `App.tsx` strips `dente_clinic_token` and `dente_staff_token` from `localStorage` and resets auth states to `false`.

---

## 2. Task 2 Audit: 4-State Visual Proof Infrastructure (`scripts/ops-panels-shots.mjs`)

### 2.1 File Map & Responsibilities
- `scripts/ops-panels-shots.mjs`: Core CDP screenshot runner.
- `scripts/lib/shot-audit.mjs`: Audit utility for verifying screenshot uniqueness and detecting `_ПУСТО.png` misses.
- `apps/api/src/scripts/seedOpsScreenshotDemo.ts`: Database seeder generating mock organization (`ORG_ID = d0000000-0000-4000-8000-00000000d001`) and outputting signed JWT tokens into `.ops-shot-tokens.json`.
- `.ops-shot-tokens.json`: JSON payload containing `{ clinicToken, staffToken }`.
- `.dente-ops-shots/`: Output directory where captured PNG screenshots and `theme-audit.json` log are stored.

### 2.2 Auth/Session Token Injection Flow
1. **Seeding**: Running `npx tsx apps/api/src/scripts/seedOpsScreenshotDemo.ts > .ops-shot-tokens.json` inserts mock data and prints JWT tokens signed with `authTokenSecret()`.
2. **CDP Injection**: `scripts/ops-panels-shots.mjs` reads `.ops-shot-tokens.json` and evaluates `applySessionTokens()`:
   ```javascript
   window.localStorage.setItem("dente_clinic_token", clinicToken);
   window.localStorage.setItem("dente_staff_token", staffToken);
   window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
   ```
3. **Session Recovery**: On page reload or Vite HMR, `restoreSession()` re-executes `applySessionTokens()`, calls `waitForWorkspace()`, sets device metrics, and re-applies `session.theme`.

### 2.3 4-State Proof Generation Matrix
The 4-state visual proof matrix captures each panel under 4 primary configurations:
- **PC Light**: Viewport `1600x1000`, `themeMode = "light"`, `data-theme="light"`
- **PC Dark**: Viewport `1600x1000`, `themeMode = "dark"`, `data-theme="dark"`
- **Mobile Light**: Viewport `375x812` (mobile mode), `themeMode = "light"`, `data-theme="light"`
- **Mobile Dark**: Viewport `375x812` (mobile mode), `themeMode = "dark"`, `data-theme="dark"`
*(Additional variant: PC Night / Warm `data-theme="night"`).*

### 2.4 Theme Assertion & Quality Guarding
`assertThemeBeforeShot(theme, fileName)` enforces 4 validation checks before writing any PNG:
1. Theme tag in filename matches requested theme.
2. Root `document.documentElement.dataset.theme === theme`.
3. Store `window.__useThemeStore.getState().themeMode === theme`.
4. Computed CSS variable palette SHA256 fingerprint differs from other themes for the same viewport.
5. All non-diagnostic screenshots must have unique MD5 hashes.

---

## 3. Task 3 Audit: Monorepo Quality Gates (`package.json`)

### 3.1 Script Inventory
- `npm run check:encoding`: Calls `node scripts/check-encoding.mjs`. Checks UTF-8 encoding across all text files.
- `npm run typecheck`: Calls `tsc` across `@dental/shared`, `@dental/api`, and `@dental/web`:
  - `@dental/shared`: `tsc -p tsconfig.json --noEmit` & `tsc -p tsconfig.tests.json --noEmit`
  - `@dental/api`: `tsc -p tsconfig.json --noEmit` & `tsc -p tsconfig.tests.json --noEmit`
  - `@dental/web`: `tsc -b --noEmit`

### 3.2 Audit Results
1. **`check:encoding`**:
   - Status: **PASSED**
   - Result: 2,840 files checked, 0 encoding issues / 0 Mojibake detected.
2. **`typecheck`**:
   - Status: **PASSED**
   - Result: All target packages (`@dental/shared`, `@dental/api`, `@dental/web`) typecheck with 0 errors.
3. **Database Test Environment Observation**:
   - Running full integration unit tests (`npm run test`) interacts with local PostgreSQL (`127.0.0.1:5432`). PostgreSQL error `unexpected data beyond EOF in block 0 of relation` indicates local test database table corruption in `treatment_plans` requiring `npm run db:reset-seed` (`npx tsx apps/api/src/scripts/migrateStateToDb.ts`) to re-initialize clean relation blocks.

---

## 4. Summary of Recommended Recommendations for Implementers

1. **Keep Session Tokens Alive During CDP Testing**:
   Extend or bypass the 5-minute inactivity timer when running automated CDP / Playwright visual proof scripts, or dispatch synthetic user input events to keep `staffAuthed` active.
2. **Re-sync Auth State on Storage Updates**:
   Add a listener in `App.tsx` for `localStorage` changes to ensure `staffAuthed` and `clinicAuthed` immediately update if tokens are written externally during screenshot capture.
3. **Maintain Pre-shot Gating**:
   Ensure `assertSectionOnScreen` and `assertThemeBeforeShot` remain active in `ops-panels-shots.mjs` to prevent invalid or misleading screenshot artifacts from being classified as passing visual proof.
4. **Test Database Preflight**:
   Execute `npm run db:reset-seed` prior to running full API integration tests if PostgreSQL relation corruption (`unexpected data beyond EOF`) is encountered.

