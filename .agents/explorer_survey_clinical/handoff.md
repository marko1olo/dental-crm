# Handoff Report: Clinical Views, Perspectives, Hydration & Toast Notification Architecture

**Author**: Clinical Views & Hydration Explorer  
**Target Workspace**: `C:/Clinic_MVP/dental-crm`  
**Date**: 2026-08-18  

---

## 1. Observation

Direct empirical observations across `apps/web/src/` components, stores, hooks, and utility modules.

### 1.1 Complete Inventory of Clinical Perspectives & Views

| Module / View | Primary Source Files | Routing / Mount Points | State Store / Hooks | Key Responsibilities & Sub-Panels |
| :--- | :--- | :--- | :--- | :--- |
| **Shift** | `apps/web/src/ShiftView.tsx` | `App.tsx:2271`, `currentView === "shift"` | `useAppLogic.tsx`, `useDashboardLoaderLogic.ts` | Shift summary, queue management, recommended clinical actions, active chair/doctor metrics, `PatientCockpit` hero card. |
| **Schedule Calendar** | `apps/web/src/ScheduleView.tsx`, `apps/web/src/components/schedule/*` | `App.tsx:2565`, `currentView === "schedule"` | `apps/web/src/store/scheduleStore.ts`, `useScheduleLogic.ts` | Multi-chair/doctor calendar grid, day grouping (`scheduleDayGrouping.ts`), `DayConfirmationsPanel`, `FreedSlotsPanel`, `WaitlistDrawer`, `WaitlistQuickFillModal`, `NewAppointmentForm`, `ScheduleClipboardPanel`. |
| **Patient EMR & Form 043/u** | `apps/web/src/PatientsView.tsx`, `apps/web/src/components/patients/*`, `apps/web/src/components/odontogram/*` | `App.tsx:2662`, `currentView === "patients"` | `apps/web/src/store/patientStore.ts`, `usePatientLogic.ts`, `usePatientResource.ts` | Patient registry search, administrative profile, adult (11–48) & pediatric (51–85) FDI odontogram (`ToothChart.tsx`, `OdontogramModule.tsx`), periodontogram (`PeriodontalChartModule.tsx`), endodontic canal log (`EndoCanalLogModal.tsx`), treatment cost estimation (`TreatmentEstimator.tsx`), CRM timeline & complaints. |
| **Active Visit SOAP Diary** | `apps/web/src/VisitView.tsx`, `apps/web/src/components/visit/*` | `App.tsx:2714`, `currentView === "visit"` | `apps/web/src/store/visitStore.ts`, `useClinicalVisitLogic.ts`, `useVisitLogic.ts` | Active visit workflow, Form 043/u SOAP fields (`VisitEmkTab.tsx`), odontogram reactive sync (`VisitOdontogramTab.tsx`), diagnostic attachments & SanPiN barcode scanning (`VisitDiagnosticsTab.tsx`), speech-to-text dictation chunks (`SpeechChunksInspector.tsx`), AI ICD-10 protocols & non-destructive smart append (`clinicalProtocols043.ts`), CryptoPro 63-FZ electronic signatures (`CryptoProSigner.tsx`). |
| **Dental Lab Orders** | `apps/web/src/components/lab/DentalLabOrderModal.tsx`, `apps/web/src/pages/LabOrdersPage.tsx`, `apps/web/src/components/LabOrdersPanel.tsx`, `apps/web/src/GuestLabPortal.tsx` | `SettingsView.tsx`, `ScheduleView.tsx`, `GuestLabPortal.tsx` | `apps/web/src/store/appStore.ts`, `useAppLogic.tsx` | Lab order workflow, VITA 3D-Master / Classical color matching, stump/cervical/incisal shade selection, translucency/mamelons/calcifications, delivery tracking, guest token portal (`GuestLabPortal.tsx`), doctor fee deduction calculations. |
| **EGISZ CDA R2 Integration** | `apps/web/src/components/egisz/EgiszCdaExportModal.tsx`, `apps/web/src/components/egisz/egiszCdaValidator.ts`, `apps/web/src/components/EgiszMonitor.tsx` | `VisitView.tsx`, `DocumentsView.tsx`, `SettingsView.tsx` | `useClinicalDocumentLogic.ts`, `cryptopro.ts` | Ministry of Health EGISZ SEMD XML generation (CDA R2 Release 2.0), electronic document validation, doctor SNILS / clinic OID verification, dual digital signature attachment, SOAP clinical diary payload packaging. |
| **Inventory & Deficit** | `apps/web/src/components/InventoryView.tsx`, `apps/web/src/components/inventory/*` | `App.tsx:4065`, `currentView === "inventory"` | `apps/web/src/components/inventory/useInventoryLogic.ts` | Stock inventory table, warehouse batch expiration alerts (`expirationState`), automated service deduction rules (`quantity_to_deduct`), SanPiN autoclave sterilization cycle logs, goods receipt & invoice reconciliation. |
| **Finance & 54-FZ Cashier** | `apps/web/src/FinanceView.tsx`, `apps/web/src/FinanceLedger.tsx`, `apps/web/src/PaymentCapture.tsx`, `apps/web/src/components/finance/*` | `App.tsx:3141`, `currentView === "finance"` | `apps/web/src/hooks/domains/useFinanceLogic.ts`, `slices/financialSlice.ts` | 54-FZ FFD 1.2 fiscal receipt generation (tags 1054, 1212, 1214, 1199, 2108), Sberbank acquiring terminal modal (`SberbankTerminalPaymentModal.tsx`), SBP QR dynamic payments, shared family balance wallets (`FamilyWalletPanel.tsx`), Art. 219 NK RF 13% tax deduction certificate (KND 1151156 XML 5.01), 0% installment plan calculators. |
| **Analytics (BI)** | `apps/web/src/pages/AnalyticsDashboardView.tsx`, `apps/web/src/components/analytics/LostPatientsPanel.tsx` | `App.tsx:3304`, `currentView === "analytics"` | `useAppLogic.tsx`, `analyticsDoctorMetrics.ts` | Clinic revenue & marginality BI dashboards, doctor productivity & hourly chair yield, treatment plan acceptance rates, patient retention & lost patient recall queues (`LostPatientsPanel.tsx`, `RecallListPanel.tsx`). |
| **Leads Kanban** | `apps/web/src/components/leads/LeadsKanbanView.tsx` | `App.tsx:4105`, `currentView === "leads"` | `apps/web/src/store/leadsStore.ts`, `useWebsocket.ts` | CRM marketing funnel pipeline, drag-and-drop lead stages (`new` -> `contacted` -> `consult_booked` -> `no_answer` -> `trash`), 1-click schedule appointment conversion (`convertLeadToAppointment`), SLA timer alerts. |
| **DICOM 3D MPR CT Viewer** | `apps/web/src/ImagingView.tsx`, `apps/web/src/components/dicom/*`, `apps/web/src/components/ct/*` | `App.tsx:2373`, `currentView === "imaging"` | `apps/web/src/store/imagingStore.ts`, `useImagingLogic.ts` | Volumetric CT rendering (`Cornerstone3DViewer.tsx`), synchronized Orthogonal MPR slices (Axial, Sagittal, Coronal), panoramic synthetic reconstruction (`PanoramicRendererWindow.tsx`), mandibular nerve canal spline tracing & 3D implant clearance alarm (`< 2.0mm CAUTION`, `< 1.5mm DANGER`), Misch D1–D4 bone density HU sampling (`BoneQualityPanel.tsx`). |

#### Specialized Workspace Perspectives (`usePerspectiveStore.ts`)
- **Chairsider (`components/perspectives/ChairsiderPerspectiveView.tsx`)**: High-contrast touch interface optimized for sterile touchscreen operation ($\ge 64\text{px}$ touch targets), hands-free voice dictation, fast CT slice navigation, and chairside odontogram charting.
- **Frontdesk (`components/perspectives/FrontdeskPerspectiveView.tsx`)**: Streamlined reception interface with 54-FZ express checkout, 1-click NDFL tax certificate generation, and morning appointment confirmation call queues.
- **Case Presentation (`components/perspectives/CasePresentationView.tsx`)**: Patient-facing second-monitor display stripped of internal costs, margins, and clinical notes; presents comparative 3-tier treatment plans (Economy, Optimal, Premium) with 0% installment and NDFL refund calculations.
- **Orthodontic (`components/perspectives/OrthodonticPerspectiveView.tsx`)**: Orthodontic timeline tracking bracket/aligner activation stages, photo protocol comparisons, and cephalometric angular analysis (`CephalometricAnalysisModal.tsx`).
- **Pediatric (`components/perspectives/PediatricPerspectiveView.tsx`)**: FDI 51–85 primary/deciduous teeth odontogram, parent/guardian legal relationship bindings, and pediatric clinical protocols.

---

### 1.2 Patient Hydration, Store Lifecycles & Race Condition Findings

#### 1.2.1 `usePatientResource.ts` Dependency Array Bug (Reload No-Op)
- **File**: `apps/web/src/hooks/usePatientResource.ts`
- **Lines**: 66, 132, 134
- **Verbatim Code**:
  ```typescript
  66:  const [_reloadToken, setReloadToken] = useState(0);
  ...
  132: }, [patientId]);
  134: const reload = useCallback(() => setReloadToken((token) => token + 1), []);
  ```
- **Observed Behavior**: `_reloadToken` is updated whenever `reload()` is invoked (e.g. upon ticket creation or reclamation submission in `PatientTaskTicketsWidget.tsx` line 139), but because `_reloadToken` is omitted from the `useEffect` dependency list `[patientId]`, the fetch effect **never re-runs**. The component silently remains stale until the active patient changes or the entire page is reloaded.

#### 1.2.2 Sequence Ordering & In-Flight Race Guards
- **Dashboard Loader** (`apps/web/src/hooks/domains/useDashboardLoaderLogic.ts:39-57`): Utilizes an incremental request sequence reference (`dashboardRequestSeqRef.current`) to discard responses from earlier, slower in-flight fetches when a newer load occurs.
- **Patient Resource** (`apps/web/src/hooks/usePatientResource.ts:91-131`): Utilizes `AbortController` and a boolean `cancelled` flag to abort HTTP requests and discard JSON parsing upon unmount or patient switch.
- **Analytics View** (`apps/web/src/pages/AnalyticsDashboardView.tsx:118-140`): Correctly aborts in-flight controller when date range filters change.

#### 1.2.3 Store Initialization & Module Evaluation Preloading
- **Store Inventory**: 12 active Zustand stores (`appStore`, `documentStore`, `imagingStore`, `leadsStore`, `patientStore`, `perspectiveStore`, `scheduleStore`, `settingsStore`, `telephonyStore`, `themeStore`, `uiStore`, `visitStore`).
- **Initialization Precedence**: All stores read `loadUiPreferences() ?? defaultUiPreferences` from `preferencesUtils.ts` without throwing temporal dead zone `ReferenceError`s.

---

### 1.3 Toast Notification Systems & Spurious Toast Sources

#### 1.3.1 Spurious 401 Error Toast on Initial Page Load
- **File**: `apps/web/src/hooks/domains/useDashboardLoaderLogic.ts`
- **Lines**: 47-86
- **Verbatim Code**:
  ```typescript
  61: } catch (err) {
  62:     showToast(
  63:         actionFailureToast(
  64:             "Не удалось загрузить данные клиники. Проверьте связь с сервером и повторите — введённые данные не потеряны.",
  65:             (err as { status?: number })?.status ?? null,
  66:         ),
  67:         "error",
  68:     );
  ...
  78:     const isAuthError =
  79:         err instanceof Error &&
  80:         /401|403|Требуется авторизация|Сессия истекла/i.test(err.message);
  81:     if (isAuthError) {
  82:         setAccessUnlockRequired(true);
  ```
- **Observed Behavior**: On cold start or when a user's session token is missing or expired, `fetch("/api/dashboard")` returns `401 Unauthorized`. `showToast(...)` fires an immediate, visible red error toast to the user *before* checking `isAuthError` and triggering the unlock modal/login prompt. Unauthenticated users are confronted with an error message rather than a clean login prompt.

#### 1.3.2 Spurious Error Toast on Background Visibility & Storage Checks
- **File**: `apps/web/src/browserContinuity.ts` & `apps/web/src/hooks/domains/useGlobalAppCoordinator.ts`
- **Lines**: `browserContinuity.ts:91-115`, `useGlobalAppCoordinator.ts:31-38`
- **Verbatim Code (`browserContinuity.ts`)**:
  ```typescript
  91: export async function browserIndexedDbWritable(): Promise<boolean> {
  ...
  104:    } catch (_e) {
  105:        showToast(
  106:            actionFailureToast(
  107:                "Ошибка выполнения операции",
  108:                (_e as { status?: number })?.status ?? null,
  109:            ),
  110:            "error",
  111:        );
  112:        idbWorks = false;
  113:    }
  ```
- **Observed Behavior**: `inspectBrowserContinuity()` is invoked automatically in `useGlobalAppCoordinator.ts` on every `visibilitychange` event (e.g. when the user switches browser tabs and switches back). If IndexedDB is restricted (e.g. Firefox/Chrome private browsing, security extensions, or sandboxed iframe), `browserIndexedDbWritable()` catches the error and executes `showToast("Ошибка выполнения операции", "error")`. This produces a completely spurious, context-free error popup when navigating or returning to the tab.

#### 1.3.3 SSR & Portal Mount Leaks (Missing Document Guard)
- **Observations**:
  - `apps/web/src/components/odontogram/EndoCanalLogModal.tsx:563, 901`: Directly invokes `createPortal(..., document.body)` without `if (typeof document === "undefined") return null;`.
  - `apps/web/src/components/schedule/WaitlistDrawer.tsx:377, 394`: Invokes `createPortal(..., document.body)` without SSR safety check.
  - `apps/web/src/components/VisitDiaryEditor.tsx:1318`: `showScanner && createPortal(..., document.body)` lacks `typeof document !== "undefined"` check.
  - `apps/web/src/components/odontogram/OdontogramModule.tsx:975`: Radial menu portal lacks SSR check.
  - `apps/web/src/components/Omnibar.tsx:237`: Portal lacks `typeof document === "undefined"` check.
  - `apps/web/src/components/schedule/WaitlistQuickFillModal.tsx:24, 1440` and `apps/web/src/components/orthodontics/CephalometricAnalysisModal.tsx:31, 731`: Both import `createPortal` but return modal JSX directly in-tree without portalling to `document.body`.

### 1.4 Compiler Diagnostics
- **File**: `apps/web/src/hooks/domains/useOnboardingLogic.ts:301`
- **Error**: `src/hooks/domains/useOnboardingLogic.ts(301,5): error TS2304: Cannot find name 'logger'`
- **Cause**: Missing `import { logger } from "../../utils/logger";` at top of file.

---

## 2. Logic Chain

1. **Hydration Integrity**:
   - `usePatientResource.ts` was designed to eliminate race conditions by resetting state synchronously on `patientId` change and discarding stale responses via `AbortController` (Observation 1.2).
   - However, by omitting `_reloadToken` from the `useEffect` dependency array, the mutation feedback loop was severed: child widgets (e.g. `PatientTaskTicketsWidget`, `PatientReclamationsWidget`) call `reload()` to refresh their lists after creating tickets or logging reclamations, but the component fails to re-query the backend.
   - *Conclusion*: Adding `_reloadToken` to `[patientId, _reloadToken]` restores instantaneous local synchronization without breaking abort safety.

2. **Toast Noise Suppression**:
   - Error toasts should notify the operator of unexpected *action failures* initiated by the user (Observation 1.3).
   - When `loadDashboard()` receives a `401 Unauthorized` during app boot, this is an expected authentication boundary state, handled by `setAccessUnlockRequired(true)`. Displaying a red toast before prompting for authentication creates user anxiety and false alarms.
   - Diagnostic probes in `browserContinuity.ts` run autonomously on background hooks (`visibilitychange`, `controllerchange`). They are internal health meters; throwing user-facing toasts from inside `browserIndexedDbWritable()` misinterprets background telemetry as an interactive operation failure.
   - *Conclusion*: Suppressing `showToast` for expected 401s in `loadDashboard` and removing `showToast` from `browserIndexedDbWritable()` completely cures spurious background toasts.

3. **Portal & Modal DOM Mounting**:
   - In single-page applications with multi-level CSS stacking contexts, modals that portal directly to `document.body` prevent clipping and z-index collisions (Observation 1.3.3).
   - In environments where SSR or headless unit test runners evaluate JSX without a full DOM window, accessing `document.body` without guarding for `typeof document !== "undefined"` throws fatal `ReferenceError`s.
   - *Conclusion*: Unifying all modal components with `if (typeof document === "undefined") return null;` and standardizing `createPortal(modalContent, document.body)` guarantees both DOM stacking isolation and SSR test resilience.

---

## 3. Caveats

- **Network-Restricted Environments**: Testing WebRTC telephony softphone and WebSocket real-time feeds requires a live WebSocket server or mock event triggers in headless tests.
- **Hardware Acceleration for DICOM 3D MPR**: WebGL / Cornerstone3D volumetric rendering performance depends on client GPU capabilities; CPU fallbacks are supported via 2D canvas slicing.
- **Scope Boundary**: As a read-only investigation, no production source code files or database tables were modified during this exploration.

---

## 4. Conclusion

The DENTE Dental CRM client features a comprehensive clinical architecture spanning 11 core domains and 5 specialized operational perspectives. The state management and hydration foundation is solid, but targeted remediation of 5 specific architectural defects will eliminate all identified glitches:

1. **Fix `useOnboardingLogic.ts` Import**: Add `import { logger } from "../../utils/logger";` to resolve `TS2304`.
2. **Fix `usePatientResource.ts` Dependency Array**: Include `_reloadToken` in `useEffect` dependencies (`[patientId, _reloadToken]`).
3. **Eliminate 401 Spurious Startup Toast**: Filter out `401`/auth errors from `showToast` in `useDashboardLoaderLogic.ts` when transitioning to the unlock screen.
4. **Mute Diagnostic Toasts in `browserContinuity.ts`**: Remove the `showToast` call inside `browserIndexedDbWritable()`, allowing background continuity checks to log warnings silently.
5. **Standardize SSR-Safe Modal Portals**: Add `if (typeof document === "undefined") return null;` and ensure full `createPortal(..., document.body)` usage across `EndoCanalLogModal`, `WaitlistDrawer`, `WaitlistQuickFillModal`, `VisitDiaryEditor`, `OdontogramModule`, `Omnibar`, and `CephalometricAnalysisModal`.

---

## 5. Verification Method

To independently reproduce and verify the findings and proposed fixes:

1. **TypeScript Compiler Check**:
   ```bash
   npm run typecheck
   ```
2. **Frontend Unit & Component Test Suite**:
   ```bash
   npm test -w @dental/web
   ```
3. **Repository Encoding & Quality Gates**:
   ```bash
   npm run check:encoding
   node scripts/check-css-tokens.mjs
   ```
4. **Hydration Reload Verification**:
   Inspect `apps/web/src/hooks/usePatientResource.ts` lines 66–134 and run `npx vitest run apps/web/src/tests/patientCommunicationLogPanel.test.ts`.
5. **Toast Inspection Verification**:
   Inspect `apps/web/src/browserContinuity.ts:105` and `apps/web/src/hooks/domains/useDashboardLoaderLogic.ts:62`.
