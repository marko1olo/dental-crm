# Handoff Report — Explorer M1 (Codebase Reconnaissance & Navigation Script Analysis)

## 1. Observation

### 1.1 Authority Files & Guidelines
- **Constitution**: `C:\Clinic_MVP\dental-crm\AGENTS.md` (lines 1-52). Strictly enforces Live Server HTTP 200 checks, non-duplicate unique screenshots, pixel self-audits (>40KB data screens), and real DOM navigation.
- **Original Request**: `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md` (R1-R3). Requires visual redesign across 11 modules, responsive desktop/mobile integrity, and fixing `dente-redesign-shots.mjs` to navigate via DOM clicks/React Router.
- **Project Plan**: `C:\Clinic_MVP\dental-crm\.agents\orchestrator\plan.md`. Defines M1 (Navigation Script Fix), M2 (11-Module UI Alignment), M3 (Responsive Layout Integrity), and M4 (Verification & 4-State Proof Matrix).

### 1.2 Codebase Structure & Navigation Mechanics
- **Monorepo Structure**:
  - `apps/web/src/App.tsx` (Main workspace shell & provider tree)
  - `apps/web/src/AppRouter.tsx` (View router rendering 11 module views)
  - `apps/web/src/workspaceShell.tsx` (`WorkspaceSidebar`, `WorkspaceTopbar`, `viewLabels`, `appViews`)
  - `apps/web/src/store/appStore.ts` (Zustand state managing `currentView` initialized with `viewFromHash()`)
  - `apps/web/src/store/themeStore.ts` (`useThemeStore` managing `themeMode`: `light`, `dark`, `night`)
  - `apps/web/src/AppHelpers.tsx` (`viewFromHash()`, `uiPreferencesStorageKey = "dental-crm:web-ui-preferences:v1"`)
  - `apps/web/src/useAppLogic.tsx` (God context logic, role-based view filtering, `hashchange` listener)

- **The 11 Application View Modules**:
  1. `ShiftView` (Смена): `apps/web/src/ShiftView.tsx` — Panel selector `#shift` / `.shift-hero`
  2. `ScheduleView` (Расписание): `apps/web/src/ScheduleView.tsx` — Panel selector `#schedule` / `.schedule-panel`
  3. `PatientsView` (Пациенты): `apps/web/src/PatientsView.tsx` — Panel selector `#patients` / `.patients-panel`
  4. `ImagingView` (Визиограф): `apps/web/src/ImagingView.tsx` — Panel selector `#imaging` / `.imaging-panel`
  5. `VisitView` (Визит): `apps/web/src/VisitView.tsx` — Panel selector `#visit` / `.visit-panel`
  6. `DocumentsView` (Документы): `apps/web/src/DocumentsView.tsx` — Panel selector `#documents` / `.documents-panel`
  7. `FinanceView` (Финансы): `apps/web/src/FinanceView.tsx` — Panel selector `#finance` / `.finance-panel`
  8. `AnalyticsView` (Аналитика): `apps/web/src/pages/AnalyticsDashboardView.tsx` — Panel selector `#analytics` / `.analytics-panel`
  9. `CommunicationsView` (Коммуникации): `apps/web/src/CommunicationsView.tsx` — Panel selector `#communications` / `.communications-panel`
  10. `SettingsView` (Настройки): `apps/web/src/SettingsView.tsx` — Panel selector `#settings` / `.settings-zone`
  11. `MarketingView` (Маркетинг): `apps/web/src/MarketingView.tsx` — Panel selector `#marketing` / `.marketing-panel`

### 1.3 Analysis of `scripts/dente-redesign-shots.mjs` Failures

1. **Incorrect LocalStorage Preferences Key**:
   - `scripts/dente-redesign-shots.mjs` line 87 writes to `dente_ui_preferences_v1`.
   - `apps/web/src/AppHelpers.tsx` line 687 specifies `uiPreferencesStorageKey = "dental-crm:web-ui-preferences:v1"`.
   - Consequence: The app defaults `selectedWorkspaceRole` to `"doctor"`.

2. **Role-Based View Access Control Gating**:
   - `apps/web/src/useAppLogic.tsx` lines 4293-4298:
     ```tsx
     useEffect(() => {
       const allowedViews = getFilteredAppViews(selectedWorkspaceRole);
       if (!allowedViews.includes(currentView)) {
         setCurrentView("shift");
         window.location.hash = "shift";
       }
     }, [selectedWorkspaceRole, currentView]);
     ```
   - For `role = "doctor"`, `getFilteredAppViews("doctor")` returns only `["shift", "schedule", "patients", "imaging", "visit", "documents", "analytics", "communications"]`.
   - Views `finance`, `settings`, and `marketing` are FORBIDDEN for doctor role.
   - Consequence: Any navigation to `#finance`, `#settings`, or `#marketing` while in doctor role is forcibly overridden and reset back to `#shift`.

3. **DOM Link Hiding for Restricted Roles**:
   - `apps/web/src/workspaceShell.tsx` line 127:
     ```tsx
     {appViews.map((view) => allowedViews.includes(view) ? (<a className={`nav-item ...`} href={`#${view}`}>...</a>) : null)}
     ```
   - For doctor role, `<a href="#finance">`, `<a href="#settings">`, and `<a href="#marketing">` do NOT exist in the DOM.

4. **Fragile `window.location.hash` Navigation**:
   - `scripts/dente-redesign-shots.mjs` line 64: `async function nav(hash) { await evaluate("window.location.hash = \"" + hash + "\""); await sleep(2200); }`
   - Setting hash raw bypasses DOM click events (`onPointerEnter` preloading handlers) and does not verify DOM link existence.

5. **Lack of Dynamic DOM Readiness Gating**:
   - The script used fixed `sleep(2200)` without checking for React `Suspense` fallbacks (`[aria-busy="true"]`) or view-specific panel selectors.

---

## 2. Logic Chain

1. **Observation**: `scripts/dente-redesign-shots.mjs` sets `dente_ui_preferences_v1` instead of `dental-crm:web-ui-preferences:v1`.
2. **Step 1 Reasoning**: `loadUiPreferences()` reads `dental-crm:web-ui-preferences:v1`. When missing, it returns default preferences where `selectedWorkspaceRole` is `"doctor"`.
3. **Step 2 Reasoning**: `getFilteredAppViews("doctor")` excludes `"finance"`, `"settings"`, `"marketing"`.
4. **Step 3 Reasoning**: `WorkspaceSidebar` omits `<a>` elements for non-allowed views, making DOM clicks on `a[href="#finance"]`, `a[href="#settings"]`, `a[href="#marketing"]` fail because the elements do not exist.
5. **Step 4 Reasoning**: `useAppLogic.tsx` lines 4293-4298 listen to `currentView` changes; if `currentView` is not allowed by role, it resets `currentView` and `window.location.hash` to `"shift"`.
6. **Conclusion**: Setting `selectedWorkspaceRole: "owner"` inside `dental-crm:web-ui-preferences:v1` in `localStorage` enables all 11 navigation links in the DOM and allows unobstructed navigation across all 11 modules.
7. **DOM Selector Fix**: Clicking `aside.sidebar nav a[href="#<view>"]` (or `.dnt-bottom-nav a[href="#<view>"]` in mobile mode) provides reliable, native DOM navigation.

---

## 3. Caveats

- **Server Operational State**: Both the Web server (`http://127.0.0.1:5173`) and API server (`http://127.0.0.1:3000`) were checked and found offline during this read-only phase (`curl.exe` returned `000`). Implementers will need to ensure the dev servers are running prior to executing screenshot capture.
- **Onboarding Dismissal State**: In addition to setting `selectedWorkspaceRole: "owner"`, `localStorage` must contain `onboardingDismissed: true` in `dental-crm:web-ui-preferences:v1` and `dente_onboarding_completed: "true"` to prevent onboarding modals from blocking views.

---

## 4. Conclusion

The root cause of `dente-redesign-shots.mjs` navigation failures and blank/cloned screenshots is role access control gating due to incorrect `localStorage` key seeding, combined with direct hash manipulation without DOM element verification or readiness checks.

### Concrete Recommendations for Fixing `dente-redesign-shots.mjs`:

1. **Update LocalStorage Bootstrapping**:
   Seed the correct preference key in `evaluate()` before page reload:
   ```javascript
   localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
     version: 1,
     selectedWorkspaceRole: "owner",
     onboardingDismissed: true,
     onboardingDismissedAt: new Date().toISOString(),
     onboardingDraftMode: false,
     savedAt: new Date().toISOString()
   }));
   ```

2. **Implement Native DOM Click Navigation**:
   Replace raw `window.location.hash` setting with a robust click helper:
   ```javascript
   async function nav(viewName) {
     const selector = `aside.sidebar nav a[href="#${viewName}"], .dnt-bottom-nav a[href="#${viewName}"]`;
     const success = await evaluate(`(() => {
       const link = document.querySelector('${selector}');
       if (link) { link.click(); return true; }
       window.location.hash = "#${viewName}";
       window.dispatchEvent(new HashChangeEvent("hashchange"));
       return false;
     })()`);
     await waitForViewReady(viewName);
   }
   ```

3. **Implement View Readiness Waiting**:
   Wait explicitly for the panel container and ensure `[aria-busy="true"]` is gone:
   ```javascript
   async function waitForViewReady(viewName) {
     const panelMap = {
       shift: '.shift-hero, #shift',
       schedule: '#schedule, .schedule-panel',
       patients: '#patients, .patients-panel',
       imaging: '#imaging, .imaging-panel',
       visit: '#visit, .visit-panel',
       documents: '#documents, .documents-panel',
       finance: '#finance, .finance-panel',
       analytics: '#analytics, .analytics-panel',
       communications: '#communications, .communications-panel',
       settings: '#settings, .settings-zone',
       marketing: '#marketing, .marketing-panel'
     };
     const sel = panelMap[viewName] || '.panel';
     for (let i = 0; i < 40; i++) {
       const ready = await evaluate(`Boolean(document.querySelector('${sel}') && !document.querySelector('${sel}[aria-busy="true"]'))`);
       if (ready) { await sleep(600); return; }
       await sleep(300);
     }
   }
   ```

4. **Live Server Health Pre-check**:
   Add an explicit server check at the start of `dente-redesign-shots.mjs` per Constitution Rule 1:
   ```javascript
   try {
     const res = await fetch(webBaseUrl);
     if (!res.ok) throw new Error(`Server returned ${res.status}`);
   } catch (e) {
     throw new Error(`LIVE SERVER REQUIRED: Web server at ${webBaseUrl} is offline (${e.message}). Start server with npm run dev before running screenshots.`);
   }
   ```

5. **Theme Switching Reliability**:
   Toggle themes using `window.__useThemeStore`:
   ```javascript
   async function setTheme(theme) {
     await evaluate(`(() => {
       if (window.__useThemeStore) window.__useThemeStore.getState().setThemeMode('${theme}');
       document.documentElement.dataset.theme = '${theme}';
     })()`);
     await sleep(500);
   }
   ```

---

## 5. Verification Method

To verify these findings and recommendations independently:

1. **Inspect Role Access Code**:
   - `view_file` on `apps/web/src/useAppLogic.tsx` lines 4293-4298 (role filtering effect).
   - `view_file` on `apps/web/src/workspaceShell.tsx` lines 85-102 (`getFilteredAppViews`) and lines 126-146 (`WorkspaceSidebar`).
2. **Inspect Storage Key**:
   - `view_file` on `apps/web/src/AppHelpers.tsx` line 687 (`uiPreferencesStorageKey`).
3. **Run TypeScript Gate** (when ready):
   - Command: `npm run typecheck` in `C:\Clinic_MVP\dental-crm`.
4. **Execute Screenshot Script** (after starting dev server):
   - Command: `node scripts/dente-redesign-shots.mjs`.
