# Handoff Report — UI/UX Architecture & 4-State Theme Survey

**Agent**: Survey Explorer 2  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork_preview_explorer_survey_2`  
**Date**: 2026-08-09  

---

## 1. Observation

### 1.1 Theme Toggle & State Management Architecture
- **State Store Location**: `apps/web/src/store/themeStore.ts`
  - Defines `ThemeMode`: `"auto" | "light" | "dark" | "night"`.
  - Persists selected mode to `localStorage.setItem("dente_theme_mode", mode)`.
  - Attaches store to window object at runtime: `window.__useThemeStore = useThemeStore;` (lines 40-44).
- **DOM Theme Application**: `apps/web/src/lib/themeClasses.ts`
  - Function `applyThemeToRoot(root, resolved)` updates the DOM (lines 62-69):
    ```ts
    root.dataset.theme = resolved.theme; // 'light' | 'dark' | 'night'
    root.classList.toggle("dark", resolved.darkClass);
    root.classList.toggle("light", resolved.lightClass);
    root.style.colorScheme = resolved.colorScheme;
    ```
- **Theme Lifecycle Controller**: `apps/web/src/AppShell.tsx`
  - `ThemeController` component subscribes to `useThemeStore` changes and `window.matchMedia("(prefers-color-scheme: dark)")` for auto mode, updating `document.documentElement` dynamically (lines 11-34).
- **Tailwind CSS Integration**: `apps/web/src/styles/tailwind.css` & `apps/web/src/styles/dente-redesign.css`
  - Tokens and color variables mapped to `:root`, `[data-theme="light"]`, `[data-theme="dark"]`, and `[data-theme="night"]` (lines 11-200 in `dente-redesign.css`).
  - Tailwind `dark:` variant is configured to match `data-theme="dark"` and `data-theme="night"`.

### 1.2 View & Navigation Registry
- **Route Registry**: `apps/web/src/workspaceShell.tsx` (lines 90-105)
  - Exported array `appViews`: `["shift", "schedule", "patients", "imaging", "visit", "documents", "finance", "analytics", "communications", "inventory", "scanner", "leads", "settings", "marketing"]`.
- **View Container Selectors**:
  - `#shift` — Shift Dashboard (`ShiftView.tsx`)
  - `#schedule` — Appointment Schedule (`ScheduleView.tsx`)
  - `#patients` — Patients Registry & Cockpit (`PatientsView.tsx`, `PatientCockpit`)
  - `#imaging` — Imaging & DICOM 2D/3D (`ImagingView.tsx`)
  - `#visit` — Active Visit Workspace (`VisitView.tsx`, `VisitNoteDraftPanel.tsx`)
  - `#documents` — Legal & Medical Documents (`DocumentsView.tsx`)
  - `#finance` — Billing & Financial Ledger (`FinanceView.tsx`)
  - `#analytics` — Analytics & KPIs (`AnalyticsDashboardView.tsx`)
  - `#communications` — Messengers & Call Console (`CommunicationsView.tsx`)
  - `#inventory` — Materials & Sterilization Journal (`InventoryView.tsx`)
  - `#scanner` — AI Document Ingestion (`ScannerView.tsx`)
  - `#leads` — Patient Acquisition Kanban (`LeadsKanbanView.tsx`)
  - `#settings` — Clinic Settings & Configuration (`SettingsView.tsx`)
  - `#marketing` — Marketing & Promotions (`MarketingView.tsx`)

### 1.3 Modal Dialogs & Overlay Windows Inventory
- **Appointment Editor Modal**: `apps/web/src/components/schedule/NewAppointmentForm.tsx` (Triggered from `#schedule`)
- **Sberbank Terminal Payment Modal**: `apps/web/src/components/finance/SberbankTerminalPaymentModal.tsx` (Triggered from `#finance` payment capture)
- **NDFL Tax Deduction Modal**: `apps/web/src/components/documents/NdflCalculatorModal.tsx` (Triggered from `#documents`)
- **Tooth Details & History Modal**: `apps/web/src/components/odontogram/ToothDetailsModal.tsx` (Triggered from `#visit` / odontogram)
- **Waitlist Drawer / Slide-Over**: `apps/web/src/components/schedule/WaitlistDrawer.tsx` (Triggered from `#schedule` top bar)
- **Command Palette (`Ctrl+K`)**: `apps/web/src/components/CommandPalette.tsx` (Global modal)
- **Omnibar Search**: `apps/web/src/components/Omnibar.tsx` (Global topbar search overlay)
- **Voice Dictation Overlay**: `apps/web/src/components/odontogram/VoiceDictationOverlay.tsx` & `VoiceAssistantUI.tsx` (Active during dictation)
- **Staff PIN Pad Lock Screen**: `apps/web/src/components/auth/StaffPinPad.tsx` (Lock session action)
- **Auth Hub Modal/Screen**: `apps/web/src/components/auth/AuthHub.tsx`, `ClinicLogin.tsx`
- **UKEP Digital Signature Dialog**: `apps/web/src/components/documents/DocumentUkepSignButton.tsx`, `CryptoProSigner.tsx`
- **Migration Wizard Dialog**: `apps/web/src/components/settings/MigrationWizard.tsx` (Settings -> Imports)
- **Patient Duplicate Merge Dialog**: `apps/web/src/components/crm/PatientDuplicateMergeQueuesWidget.tsx` (Patients -> CRM)
- **Lab Orders Drawer**: `apps/web/src/components/schedule/LabOrdersPanel.tsx`
- **3D DICOM Workbench Fullscreen Viewer**: `apps/web/src/components/dicom/Cornerstone3DViewer.tsx`

---

## 2. Logic Chain

1. **Routing & Navigation Mechanics**:  
   The application uses hash-based routing (`window.location.hash`). `AppHelpers.viewFromHash()` extracts the hash key (e.g. `#schedule`) and matches it against `appViews`. Changing the hash activates the target lazy-loaded React component inside `<Suspense>`.

2. **Deterministic Theme Switching in Tests**:  
   Because `themeStore` is exposed as `window.__useThemeStore`, Playwright E2E tests can programmatically trigger theme changes without relying on UI clicks:
   ```js
   await page.evaluate((mode) => window.__useThemeStore.getState().setThemeMode(mode), "dark");
   await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
   ```
   Alternatively, UI interaction can click `[role="toolbar"].theme-switcher button` with label "День" (`light`), "Ночь" (`dark`), or "Тепло" (`night`).

3. **4-State Visual Audit Requirements**:  
   To achieve 4-state visual proof (Mobile Light, Mobile Dark, PC Light, PC Dark), every target screen and dialog must be rendered under two viewports:
   - **PC Desktop Viewport**: `1440x900` (or `1920x1080`)
   - **Mobile Viewport**: `390x844` (or `375x812`)  
   Combined with two primary theme modes:
   - **Light Mode**: `data-theme="light"`
   - **Dark Mode**: `data-theme="dark"`

4. **Breakpoint Styling Behavior**:  
   - At `< 1140px`, `.sidebar` transforms into collapsed mode (`data-collapsed="true"`), hiding labels and showing short captions or bottom navigation bar (`WorkspaceActionsMount`).
   - At `< 768px`, grids collapse into single-column vertical stacks, table columns hide, and drawer dialogs occupy full width (`w-full`).

---

## 3. Caveats

- **Night Theme Variant**: `data-theme="night"` is available in `useThemeStore` (warm brown/amber tones). While the standard audit requests 4 states (Mobile/PC x Light/Dark), testing Night mode is recommended for complete coverage.
- **Data Pre-seeding**: Views like `#schedule` or `#visit` render empty fallback panels if no appointments or active patients exist in the state. Playwright test runs should run against seeded API state or invoke `seedOpsScreenshotDemo.ts`.

---

## 4. Conclusion

All 14 main panels and 15 major modal dialogs/drawers have been identified and mapped to their exact file locations, selectors, and routing targets. The theme toggling mechanism via `useThemeStore` (`window.__useThemeStore`) and `data-theme` attribute on `document.documentElement` is verified and ready for 4-state visual auditing (Mobile Light, Mobile Dark, PC Light, PC Dark).

---

## 5. Verification Method

To independently verify these findings:

1. **Type Check**:
   ```powershell
   npm run typecheck -w @dental/web
   ```
2. **Verify Theme Store Globals**:
   In Chrome DevTools or Playwright context:
   ```js
   window.__useThemeStore.getState().setThemeMode('dark');
   console.assert(document.documentElement.dataset.theme === 'dark');
   ```
3. **Verify Route Panel Containers**:
   Inspect mounted DOM when navigating to `#schedule`, `#patients`, `#finance` to confirm elements matching `#schedule`, `#patients`, `#finance` exist.
