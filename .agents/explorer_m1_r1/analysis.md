# Analysis Report: UI Feature Mounting & Workflow Integration (Milestone 1 - R1)

**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\explorer_m1_r1`  
**Date**: 2026-07-31  
**Scope**: Requirement R1 — UI Feature Mounting ("Потерянные пациенты", No-Show Risk Badges, and Views/Routes Navigation Audit).

---

## Executive Summary
This reconnaissance audit investigated three core areas:
1. **Lost Patients Filter ("Потерянные пациенты")**:
   - Backend endpoint `/api/analytics/lost-patients-filters` (`apps/api/src/routes/clinical.ts:507`) uses `getLostPatientsFiltersFromDb` (`apps/api/src/db/lostPatientsFiltersQuery.ts`).
   - `PatientsView.tsx` contains unrendered filter state (`showLostPatientsOnly`, `toggleLostPatients()`), maps over the wrong array (`filteredPatients` instead of `displayPatients`), and lacks a UI toggle button.
   - `AnalyticsDashboardView.tsx` lacks a mounted Lost Patients Widget / panel connecting to `/api/analytics/lost-patients-filters`.
2. **No-Show Risk Indicator Badges**:
   - Backend query `computePatientNoShowRisk` (`apps/api/src/db/patientNoShowRiskQuery.ts`) and endpoint `POST /api/ai/predict-no-show` (`apps/api/src/routes/ai.ts:313`) compute no-show risks (`high`, `medium`, `low`).
   - Currently, risk analysis is only shown in `PatientOverviewTab.tsx`. `AppointmentCard.tsx` (`apps/web/src/components/schedule/AppointmentCard.tsx`) rendered inside `ScheduleView.tsx` lacks No-Show Risk badges.
3. **Application Views & Routes Audit**:
   - All 14 routes in `appViews` (`workspaceShell.tsx`) are registered and guarded by `WorkspaceRouteErrorBoundary` in `App.tsx`.
   - Navigation links are functional, but feature mounting gaps exist in `PatientsView`, `AnalyticsDashboardView`, and `ScheduleView`.

---

## 1. Audit: Lost Patients Filter ("Потерянные пациенты")

### A. Backend Architecture & Data Contract
- **File**: `apps/api/src/db/lostPatientsFiltersQuery.ts` (lines 40-79)
- **Function**: `getLostPatientsFiltersFromDb(orgId: string)`
- **Logic**: Performs a SQL `LEFT JOIN` between `patients` and future `appointments` (`gt(appointments.startsAt, now)`), filtering where `appointments.id IS NULL`. This selects all active patients who have no upcoming appointments.
- **Route**: `GET /api/analytics/lost-patients-filters` in `apps/api/src/routes/clinical.ts:507-515`.
- **Response Schema (`LostPatientRow[]`)**:
  ```ts
  export type LostPatientRow = {
    id: string;
    organizationId: string;
    patientName: string;
    phone: string;
    daysSinceLastVisit: number;
    hasFutureAppointment: boolean;
    hasActiveCrmTask: boolean;
    createdAt: string;
  };
  ```

### B. Findings in `PatientsView.tsx` (`apps/web/src/PatientsView.tsx`)
1. **Unmounted UI Control**:
   - State and fetch logic exist at lines 182–206:
     ```tsx
     const [showLostPatientsOnly, setShowLostPatientsOnly] = useState(false);
     const [lostPatientIds, setLostPatientIds] = useState<Set<string> | null>(null);
     const [isLoadingLost, setIsLoadingLost] = useState(false);

     const toggleLostPatients = () => { ... fetch("/api/analytics/lost-patients-filters") ... };
     ```
   - **Defect**: `toggleLostPatients` is **never referenced in the JSX**. There is no filter button or badge in the toolbar for users to toggle this state.
2. **Incorrect Map Execution**:
   - Lines 208-211 define `displayPatients`:
     ```tsx
     const displayPatients = useMemo(() => {
       if (!showLostPatientsOnly || !lostPatientIds) return filteredPatients;
       return filteredPatients.filter((p) => lostPatientIds.has(p.id));
     }, [filteredPatients, showLostPatientsOnly, lostPatientIds]);
     ```
   - **Defect**: Line 451 iterates over `filteredPatients.map(...)` instead of `displayPatients.map(...)`.
   - **Defect**: Line 545 checks `filteredPatients.length === 0` instead of `displayPatients.length === 0`.

### C. Findings in `AnalyticsDashboardView.tsx` (`apps/web/src/pages/AnalyticsDashboardView.tsx`)
- Lines 582–586 show that `LostPatientsFiltersWidget` was previously removed because it depended on a legacy snapshot table.
- However, the live endpoint `GET /api/analytics/lost-patients-filters` is available and returns dynamically computed lost patient records.
- **Defect**: `AnalyticsDashboardView.tsx` currently has no widget displaying lost patients count or offering a direct filter/link to lost patients.

### D. Proposed Code Changes for Requirement 1

#### 1. Fix `PatientsView.tsx`
- **Mount Filter Button in Toolbar** (around line 430-445):
  ```tsx
  <button
    type="button"
    onClick={toggleLostPatients}
    disabled={isLoadingLost}
    className={`secondary-button ${showLostPatientsOnly ? "active" : ""}`}
    title="Показать пациентов без будущих записей"
  >
    {isLoadingLost ? "Загрузка..." : showLostPatientsOnly ? "Показать всех пациентов" : "Потерянные пациенты"}
  </button>
  ```
- **Fix Map Target & Empty State Check** (lines 451 & 545):
  - Replace `filteredPatients.map(...)` with `displayPatients.map(...)`.
  - Replace `filteredPatients.length === 0` with `displayPatients.length === 0`.

#### 2. Mount Lost Patients Widget in `AnalyticsDashboardView.tsx`
- Add a lost patients summary card or widget calling `GET /api/analytics/lost-patients-filters`.
- Provide an action button linking directly to `#patients` with lost patients filter activated.

---

## 2. Audit: No-Show Risk Indicator Badges ("Риск неявки")

### A. Backend Architecture & Data Contract
- **File**: `apps/api/src/db/patientNoShowRiskQuery.ts` (lines 67-160)
- **Function**: `computePatientNoShowRisk(orgId: string, patientId: string)`
- **Logic**: Analyzes past appointments (`lt(startsAt, now)`), calculating no-show count, cancellation count, and total attended visits. Assigns risk level:
  - `high`: `noShows >= 2` or probability `>= 0.34`
  - `medium`: `noShows === 1` or `cancellations >= 2`
  - `low`: otherwise
- **Route**: `POST /api/ai/predict-no-show` in `apps/api/src/routes/ai.ts:313-380`.
- **Response Schema (`PatientNoShowRisk`)**:
  ```ts
  {
    riskLevel: "low" | "medium" | "high",
    noShowProbability: number,
    factors: string[],
    recommendedAction: string,
    history: { consideredAppointments: number, noShows: number, cancellations: number, attended: number }
  }
  ```

### B. Findings in `ScheduleView.tsx` & `AppointmentCard.tsx`
- **UI Component**: `PatientNoShowRisk.tsx` (`apps/web/src/components/patients/PatientNoShowRisk.tsx`) is currently only mounted inside `PatientOverviewTab.tsx`.
- **`AppointmentCard.tsx` (`apps/web/src/components/schedule/AppointmentCard.tsx`)**:
  - Renders appointment status, time, patient name, doctor, assistant, chair, suggestions, and readiness score (lines 118-153).
  - **Defect**: Does **not** display No-Show Risk Indicator badges. Administrators looking at the schedule grid cannot spot high risk patients at a glance.

### C. Proposed Code Changes for Requirement 2

#### 1. Update `AppointmentCard.tsx` (`apps/web/src/components/schedule/AppointmentCard.tsx`)
- Derive or pass `patientInsight` or `noShowRisk` for `appointment.patientId`.
- Add a No-Show Risk badge to `.chip-group` (around line 133):
  ```tsx
  {patientInsight && (
    <span
      className={`chip chip-no-show-risk risk-${patientInsight.riskLevel} px-2 py-0.5 rounded border text-xs font-semibold ${
        patientInsight.riskLevel === "high"
          ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
          : patientInsight.riskLevel === "watch" || patientInsight.riskLevel === "medium"
            ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
            : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
      }`}
      title={`Риск неявки: ${patientInsight.riskLevel}`}
    >
      {patientInsight.riskLevel === "high"
        ? "⚠️ Высокий риск неявки"
        : patientInsight.riskLevel === "watch" || patientInsight.riskLevel === "medium"
          ? "⚡ Риск отмены"
          : "✓ Надежный"}
    </span>
  )}
  ```

#### 2. Pass `patientInsightById` into `AppointmentCard` from `ScheduleView.tsx`
- In `ScheduleView.tsx`, pass `patientInsightById` or `dashboard.patientInsights` down into `AppointmentCard` props.

---

## 3. Audit: Application Views, Routes, Links & Buttons

### A. Route Registry & Routing Mechanism
- **File**: `apps/web/src/workspaceShell.tsx:54`
- **Registered Views** (`appViews`):
  `shift`, `schedule`, `patients`, `imaging`, `visit`, `documents`, `finance`, `analytics`, `communications`, `inventory`, `scanner`, `leads`, `settings`, `marketing`.
- **Mounting in `App.tsx`**:
  All 14 views are rendered conditionally on `currentView` in `App.tsx` (lines 3725–5058) inside `WorkspaceRouteErrorBoundary` with `Suspense` fallback loading components.

### B. Summary of UI Mounting & Link Defects
| View / Component | Element / Feature | Description of Finding / Defect | Recommended Remediation |
|---|---|---|---|
| `PatientsView.tsx` | "Потерянные пациенты" Filter Button | `toggleLostPatients()` handler & state exist (l. 182-206) but are unmounted in JSX. | Render button in toolbar. Change list mapping from `filteredPatients` to `displayPatients`. |
| `AnalyticsDashboardView.tsx` | Lost Patients Dashboard Widget | Legacy widget removed; live `/api/analytics/lost-patients-filters` endpoint not mounted. | Mount a Lost Patients Summary widget linking to `#patients`. |
| `ScheduleView.tsx` / `AppointmentCard.tsx` | No-Show Risk Badges | Risk query & API exist, but appointment cards do not display risk badges. | Mount risk badge chip inside `.chip-group` in `AppointmentCard.tsx`. |
| `MarketingView.tsx` | SEO & Review Generator | Functional, uses `safeLocalStorage` to avoid boot crashes. | No structural issues. |
| `WorkspaceSidebar.tsx` / Topbar | Hash Navigation Links (`href="#<view>"`) | All 14 routes resolve properly via hash navigation. | Verified working. |

---

## 4. Verification Plan
1. **Lost Patients Filter Verification**:
   - Execute `npm run test` or relevant test suite (`npm run typecheck`).
   - Open `#patients` view, click "Потерянные пациенты", verify that only patients with `hasFutureAppointment === false` are rendered.
   - Verify empty state triggers when no lost patients exist.
2. **No-Show Risk Badge Verification**:
   - Open `#schedule` view, inspect appointment cards.
   - Confirm that risk badges (`high`, `medium`/`watch`, `low`) render correctly on appointment cards.
3. **Route & Layout Verification**:
   - Click each sidebar link (`#shift` through `#marketing`).
   - Confirm no blank screens, broken error boundaries, or dead hashes occur.
