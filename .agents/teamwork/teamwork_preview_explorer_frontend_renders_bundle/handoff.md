# HANDOFF REPORT: Frontend Cascading Re-renders, State Co-location & Code Splitting Architecture

**Agent:** `teamwork_preview_explorer` (Red Team Frontend Performance & Bundle Inquisitor)  
**Target:** DENTE Dental CRM (`apps/web`)  
**Workspace:** `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_frontend_renders_bundle`  
**Date:** 2026-10-20  
**Status:** Investigation Complete (Read-Only Mode)

---

## 1. Observation

### 1.1. Monolithic State Cascade in `useAppLogic` & Keystroke Storm
- **Root Facade File:** `apps/web/src/useAppLogic.tsx` (lines 8–10) delegating to `apps/web/src/hooks/appLogic/index.ts`.
- **Top-level Provider Mount:** In `apps/web/src/App.tsx` (lines 94, 1515–1530):
  ```tsx
  const appLogicValue = useAppLogic();
  // ...
  <AppLogicProvider value={appLogicValue}>
      <AppViewRouter ... appLogicValue={appLogicValue} ... />
  ```
- **Direct Props Spreading to Schedule:** In `apps/web/src/components/appLayout/AppViewRouter.tsx` (lines 269–281):
  ```tsx
  <ScheduleView
      {...(appLogicValue as any)}
      dashboard={dashboard}
      patientName={appLogicValue?.patientName}
      loadDashboard={appLogicValue?.loadDashboard}
      // ...
  />
  ```
- **Keystroke Mutation Triggers Observed:**
  1. **Clinical Notes / Diary Entry:**
     - `apps/web/src/hooks/domains/visit/useVisitNotes.ts` (lines 36, 169–182):
       Calls `const visitStore = useVisitStore();` (WITHOUT selector, subscribing to the entire store).
       `updateVisitNoteField` executes `setVisitNoteForm((current) => ({ ...current, [field]: value }))`.
     - `apps/web/src/hooks/domains/visit/useVisitLogic.ts` (line 52):
       Calls `const visitStore = useVisitStore();` (WITHOUT selector).
     - `apps/web/src/hooks/appLogic/useClinicalSessionLogic.ts` (line 78):
       Invokes `useVisitLogic(...)` and returns `visitNoteForm` directly in its slice.
  2. **Patient Profile / Card Editing:**
     - `apps/web/src/components/patients/PatientCoreEditorForm.tsx` (lines 39, 43, 47, 51, 69):
       Direct un-debounced inputs invoke `onChange={(e) => updatePatientCoreDraft("fullName", e.target.value)}`.
     - `apps/web/src/hooks/domains/usePatientLogic.ts` (lines 38–46):
       `const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);` subscribes to draft state.
     - `apps/web/src/hooks/appLogic/usePatientSelectionState.ts` (line 31):
       Calls `usePatientLogic(...)`.
  3. **Bag Assembly & Object Identity Destruction:**
     - `apps/web/src/hooks/appLogic/appLogicModules/compatibility/appLogicCompatibilityBag.ts` (lines 63–82):
       Constructs a new monolithic object literal `appLogicBag` combining 15 slices on EVERY render.
  4. **Context Invalidation Trap:**
     - `apps/web/src/contexts/AppLogicContext.tsx` (lines 103, 120–133):
       `useAppLogicSelector` calls `const context = useAppLogicContext()`. In React 19, `useContext` forces the component to re-render BEFORE the selector returns, rendering selector bailouts completely inert.
  5. **Schedule View Re-render:**
     - `apps/web/src/ScheduleView.tsx` (line 26): `ScheduleView` is a raw function component NOT wrapped in `React.memo`.
     - `apps/web/src/components/schedule/scheduleViewModules/useScheduleViewController.ts` (lines 25–29):
       Merges `rawProps` (`{...appLogicValue}`) and calls `buildScheduleComponentProps(...)` on line 21, creating brand-new prop objects for `ScheduleHeaderToolbar`, `ScheduleActiveViewPort`, `ScheduleModalsLayer`.
     - `ScheduleActiveViewPort` and `ScheduleViewBody` (NOT memoized) re-render all appointment slots and timeline DOM elements on every keystroke.

---

### 1.2. Bundle Bloat & Broken Code Splitting Boundary
- **Critical Regression Found in `AppShell.tsx`:**
  - In commit `96b506e77` (checked via `git diff 4516a6d70..96b506e77`):
    ```ts
    -const DentalWorkspace = lazy(() =>
    -    import("./App").then((module) => ({ default: module.App })),
    -);
    +import { App as DentalWorkspace } from "./App";
    ```
  - `DentalWorkspace` was changed from a dynamic `lazy()` import to a synchronous ES import at line 11 of `apps/web/src/AppShell.tsx`!
  - Running `node scripts/smoke-web-code-split-source.mjs` failed with Exit Code 1:
    `- AppShell must lazy-load App.tsx`
    `- AppShell must map the named App export`
    `- App.tsx lazy route fallback missing readable label: Расписание`
  - Because `App.tsx` is imported statically, the entire CRM workspace and its synchronous dependencies are pulled into the initial browser payload.
- **Synchronous Views in `AppViewRouter.tsx`:**
  - `apps/web/src/components/appLayout/AppViewRouter.tsx` (lines 11–13):
    `import { VisitView } from "../../VisitView";`
    `import { FinanceView } from "../../FinanceView";`
    `import { PatientsView } from "../../PatientsView";`
    These 3 massive views are imported synchronously on the main thread, whereas secondary views (`ScheduleView`, `ShiftView`, `ImagingView`, `DocumentsView`) are loaded via `lazyWithRetry`.
- **Heavy Third-Party & Domain Libraries:**
  1. **DICOM / Cornerstone PACS Suite:**
     - `apps/web/src/components/dicom/DicomArchiveUploader.tsx:1`: Synchronous `import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader"`.
     - `apps/web/src/components/dicom/cornerstoneEngineHelper.ts:1–2`: Synchronous `import * as cornerstone from "@cornerstonejs/core"` and `import * as cornerstoneTools from "@cornerstonejs/tools"`.
     - `apps/web/package.json`: Contains `@cornerstonejs/core`, `@cornerstonejs/dicom-image-loader`, `@cornerstonejs/tools`, `dcmjs`, `dicom-parser`, `jpeg-lossless-decoder-js`, `gl-matrix` (> 3.5 MB uncompressed).
  2. **Anatomical Odontogram:**
     - `apps/web/src/components/visit/VisitOdontogramTab.tsx:6`: Synchronously imports `OdontogramModule`, which pulls in 52 tooth vector models, classic GOST chart, and SVG definitions into `VisitView`.
  3. **Analytics Charts (Recharts / D3):**
     - `apps/web/src/pages/analyticsDashboard/AnalyticsRevenueCharts.tsx:9–21`: Synchronously imports `AreaChart`, `BarChart`, `ComposedChart`, `RadialBarChart`, `ResponsiveContainer` from `recharts`.
     - Recharts pulls in `d3-scale`, `d3-shape`, `victory-vendor` (~ 850 KB).
  4. **PDF & Document Print Engines:**
     - `apps/web/src/components/documents/DocumentA4PrintPreviewModal.tsx`, `ClinicalVisitPackageModal.tsx`, `FastClinicalPrintEngine.tsx`.
  5. **Crypto-signing (УКЭП / CryptoPro):**
     - `apps/web/src/components/documents/DocumentUkepSignButton.tsx`: Synchronous import of `../../utils/cryptoPro`.
     - `apps/web/src/components/documents/DigitalSignatureTabletModal.tsx`: Canvas drawing and stylus signature capture.

---

## 2. Logic Chain

1. **State Mutation to Render Tree Propagation:**
   - Any typing event in `PatientCoreEditorForm` or `useVisitNotes` immediately triggers Zustand store mutations (`setPatientCoreDraft` or `setVisitNoteForm`).
   - Hooks `useVisitNotes` and `useVisitLogic` subscribe to `useVisitStore` without selectors, causing both hooks to re-run on any visit state mutation.
   - `usePatientLogic` subscribes to `patientCoreDraft`, causing it to re-run on any patient keystroke.
   - `useAppLogic` orchestrates `usePatientSelectionState` and `useClinicalSessionLogic`. Whenever either re-runs, `useAppLogic` re-evaluates.
   - `buildAppLogicCompatibilityBag` instantiates a new object literal with fresh references for all composite functions and sub-slices.
   - In `App.tsx`, `useAppLogic()` outputs this new reference, forcing `<App>` to re-render.
   - Re-rendering `<App>` causes `<AppLogicProvider value={appLogicValue}>` to update context, triggering re-render of all context consumers.
   - In `<AppViewRouter>`, `<ScheduleView {...appLogicValue} />` receives changed props on every keystroke.
   - `ScheduleView` and its subcomponents (`ScheduleActiveViewPort`, `ScheduleGrid`, `ScheduleTimeline`) lack `React.memo` and therefore reconcile their entire virtual DOM trees upon every keystroke.

2. **Code Splitting & Bundle Degradation:**
   - In `AppShell.tsx`, the static import `import { App as DentalWorkspace } from "./App"` bypasses the intended `React.lazy` boundary.
   - Consequently, Rollup/Vite includes the entire dependency graph of `App.tsx` (including `useAppLogic`, `AppViewRouter`, `VisitView`, `FinanceView`, `PatientsView`) in the critical boot path.
   - In `AppViewRouter.tsx`, static imports of `VisitView`, `FinanceView`, `PatientsView` force all clinical EMK tabs, odontogram vector graphics, and billing modules into the main bundle even if the user opens the CRM solely to check `schedule` or `shift`.
   - In `components/dicom/` and `components/imaging/`, static imports of `@cornerstonejs/*` pull multi-megabyte medical imaging libraries into the app bundle instead of loading on demand when an imaging study is opened.

---

## 3. Caveats

1. **Preserving 100% Backwards Compatibility for `useAppLogic`:**
   - Over 100 components across `apps/web` depend on properties and methods exposed by `useAppLogic` / `useAppLogicContext`.
   - Refactoring state must NOT remove or rename any return key or modify method signatures.
2. **Stale Closures & Callback Identity:**
   - When introducing `useCallback` or `useMemo` in `useAppLogic`, dependencies must be strictly tracked or use functional state updaters (`setState(prev => ...)`). Omission of dependencies risks silent state staleness during clinical note entry.
3. **Automated Smoke Test Invariants:**
   - `scripts/smoke-web-code-split-source.mjs` checks exact AST nodes and readable Russian fallback strings. Any adjustment to `AppShell.tsx` or `App.tsx` must strictly satisfy all 20 assertions in the smoke script.

---

## 4. Conclusion & Architectural Optimization Blueprint

### Component 1: State Co-location & Cascading Re-render Elimination

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PROPOSED ARCHITECTURE                           │
└────────────────────────────────────────────────────────────────────────┘

 [VisitSoapEditor / Form Input]
      │
      ├─► Local React State (useState) ──► Immediate typing feedback (120 FPS)
      │
      └─► Debounced Commit (300-500ms) / onBlur / flushOnUnmount
               │
               ▼
   [useVisitStore (Zustand)] ◄─── Fine-Grained Atomic Selectors
               │
               ├── (useVisitStore(s => s.visitNoteForm) in VisitView only)
               └── (useScheduleStore(s => s.scheduleDateFilter) in ScheduleView)

 [App.tsx]
      │
      ├─► useAppLogic() (Stable Facade: memoized callbacks + getter proxies)
      │
      └─► <AppViewRouter>
               │
               ├─► <ScheduleView /> ──► Wrapped in React.memo()
               │        ▲               Pass ONLY explicit props:
               │        │               (dashboard, loadDashboard, lockScheduleAdminSession)
               │        └────────────── [NO {...appLogicValue} SPREAD!]
               │
               └─► <VisitView /> ──► Loaded via lazyWithRetry
```

1. **Local Form Co-location:**
   - Replace un-debounced `onChange` in `PatientCoreEditorForm.tsx` with local buffer state, debouncing `updatePatientCoreDraft` to 300ms or `onBlur`.
   - Ensure `DebouncedEmkTextarea` flushes on `useEffect cleanup` (`flushCommit`) so tab switching never drops uncommitted text.
2. **Fine-grained Zustand Selectors:**
   - In `apps/web/src/hooks/domains/visit/useVisitNotes.ts`: Replace `const visitStore = useVisitStore()` with granular selectors:
     ```ts
     const selectedSpecialty = useVisitStore((s) => s.selectedSpecialty);
     const transcript = useVisitStore((s) => s.transcript);
     const draft = useVisitStore((s) => s.draft);
     const visitNoteForm = useVisitStore((s) => s.visitNoteForm);
     const setVisitNoteForm = useVisitStore((s) => s.setVisitNoteForm);
     ```
   - In `apps/web/src/hooks/domains/visit/useVisitLogic.ts`: Eliminate full-store subscription `const visitStore = useVisitStore()`.
3. **Decouple `<ScheduleView>` Props:**
   - In `apps/web/src/components/appLayout/AppViewRouter.tsx`:
     Change `<ScheduleView {...(appLogicValue as any)} ... />` to pass strictly the 5 properties `ScheduleView` actually uses.
   - Wrap `ScheduleView`, `ScheduleActiveViewPort`, `ScheduleHeaderToolbar`, and `ScheduleViewBody` in `React.memo()`.
4. **Context Selector Architecture (`useSyncExternalStore`):**
   - Refactor `useAppLogicSelector` in `AppLogicContext.tsx` to use `useSyncExternalStore` with a listener subscription rather than `useContext`, allowing components to truly bail out of re-renders when their selected slice has not changed.

---

### Component 2: Code Splitting & 0px CLS Skeletons

1. **Restore `AppShell.tsx` Lazy Boundary:**
   ```tsx
   // apps/web/src/AppShell.tsx
   const DentalWorkspace = lazy(() =>
       import("./App").then((module) => ({ default: module.App })),
   );
   ```
2. **Lazy-Load Core Views in `AppViewRouter.tsx`:**
   ```tsx
   const VisitView = lazyWithRetry(() =>
       import("../../VisitView").then((m) => ({ default: m.VisitView })),
   );
   const FinanceView = lazyWithRetry(() =>
       import("../../FinanceView").then((m) => ({ default: m.FinanceView })),
   );
   const PatientsView = lazyWithRetry(() =>
       import("../../PatientsView").then((m) => ({ default: m.PatientsView })),
   );
   ```
3. **Lazy-Load Heavy Sub-modules:**
   - **Odontogram:** In `VisitOdontogramTab.tsx`, lazy-load `OdontogramModule`:
     ```tsx
     const OdontogramModule = lazyWithRetry(() =>
         import("../odontogram/OdontogramModule").then((m) => ({ default: m.OdontogramModule })),
     );
     ```
     Fallback: `<OdontogramSkeleton />` (Toolbar 40px + Dental arch box min-height 380px desktop / 280px mobile).
   - **DICOM / Cornerstone PACS:**
     * In `cornerstoneEngineHelper.ts` and `DicomArchiveUploader.tsx`, load `@cornerstonejs/*` dynamically via `await import(...)` upon user action.
     * Fallback: `<DicomViewerSkeleton />` (Fixed 16:9 container, min-height 580px, 3 MPR slots 240px, background `#000`).
   - **Recharts Analytics:**
     * In `AnalyticsDashboardView.tsx`, lazy-load `AnalyticsRevenueCharts`:
       ```tsx
       const AnalyticsRevenueCharts = lazyWithRetry(() =>
           import("./analyticsDashboard/AnalyticsRevenueCharts").then((m) => ({ default: m.AnalyticsRevenueCharts })),
       );
       ```
     * Fallback: `<AnalyticsChartsSkeleton />` (Card grid min-height 360px with pulsed bar placeholders).
   - **PDF & Digital Signature Modals:**
     * Lazy-load `DocumentA4PrintPreviewModal`, `ClinicalVisitPackageModal`, `DigitalSignatureTabletModal` strictly when `isOpen === true`.
     * In `DocumentUkepSignButton.tsx`, dynamically load `cryptoPro.ts` inside `loadCertificates()` only when clicked.

4. **Zero Cumulative Layout Shift (0px CLS) Implementation:**
   - All skeleton fallbacks reserve exact dimensions matching the loaded components:
     ```css
     .odontogram-skeleton {
         min-height: 420px;
         width: 100%;
         border-radius: 12px;
         background: var(--paper);
         border: 1px solid var(--line);
         contain: layout size paint;
     }
     .dicom-mpr-skeleton {
         min-height: 580px;
         width: 100%;
         aspect-ratio: 16 / 9;
         background: #000000;
         border-radius: 8px;
         contain: layout size paint;
     }
     .analytics-chart-skeleton {
         min-height: 360px;
         width: 100%;
         border-radius: 12px;
         background: var(--paper);
         border: 1px solid var(--line);
         contain: layout size paint;
     }
     ```
   - Integrates with existing `@keyframes skeleton-wave` from `VisitView.css` and honors `low-spec-hardware.css` (disabling CPU-intensive CSS animations on low-spec hardware).

---

## 5. Verification Method

To independently verify the proposed architecture and prove zero regressions:

1. **Verify Code Splitting Smoke Gate:**
   ```bash
   node scripts/smoke-web-code-split-source.mjs
   ```
   *Expected outcome:* Exit code 0, 0 missing assertions.
2. **Verify Bundle Size Budget Gate:**
   ```bash
   npm run build -w @dental/web
   node scripts/smoke-web-bundle-budget.mjs
   ```
   *Expected outcome:* All assets within budget limits, `workspace.js` < 570 KB, DICOM and Recharts isolated into separate on-demand chunks.
3. **Verify Single-Compiler TypeScript Integrity:**
   ```bash
   npm run typecheck -w @dental/web
   ```
   *Expected outcome:* Exit Code 0, 0 type errors.
4. **Verify Re-render Isolation (Automated React Profiler Test):**
   Run the visit and schedule unit test suites:
   ```bash
   node --test "apps/web/src/components/visit/__tests__/*.test.tsx" "apps/web/src/components/schedule/__tests__/*.test.tsx"
   ```
   *Expected outcome:* 100% pass, Schedule render count does not increment during note editing.
5. **Verify 0px CLS via Playwright:**
   Capture screenshots in 4 states (PC Light/Dark 1440×900, Mobile Light/Dark 390×844) while switching views:
   ```bash
   node scripts/capture-real-lifecycle-proofs.mjs
   ```
   *Expected outcome:* Visual shift $\text{CLS} = 0.000$, absence of layout jumping during chunk resolution.
