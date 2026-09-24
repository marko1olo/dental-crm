# R2 CRM Core & Patient Retention Revitalization: Exhaustive Audit & Survey Report

**Author**: Survey Explorer 2 (teamwork_preview_explorer_survey_2)  
**Date**: 2026-09-24  
**Target Milestone**: R2 — Recalls, Patient Retention & Leads Conversion Funnel  
**Scope**: `apps/web/src/components/recalls/`, `apps/web/src/components/leads/`, `apps/web/src/components/patients/RecallListPanel.tsx`, `apps/api/src/routes/patientRecall.ts`, `apps/api/src/services/patients/recallCandidates.ts`, `apps/api/src/routes/leads.ts`, related views (`CommunicationsView.tsx`, `MarketingView.tsx`, `ScheduleView.tsx`).

---

## Executive Summary

This report delivers an exhaustive, read-only architectural and UI/UX audit for **R2: CRM Core & Patient Retention Revitalization**.

### Core Discoveries:
1. **Recalls Backend is 100% Authentic, but Disconnected from Primary Hub**:
   - `apps/api/src/services/patients/recallCandidates.ts` executes authentic Drizzle SQL queries over PostgreSQL tables `appointments` and `patients`. It categorizes recall candidates into clinical overdue bands (`due` >=6m, `overdue` >=12m, `probably_lost` >=24m, `never_arrived`). Zero hardcoded mock patients exist in the backend.
   - **Critical Disconnect**: The primary full-featured frontend retention modal `PatientRecallsHubModal.tsx` accepts `initialCandidates?: PatientRecallRecord[]`, but **never calls `GET /api/patients/recall-candidates`**! When mounted in `CommunicationsView.tsx:1083`, it passes nothing, rendering an empty blank table to doctors and administrators.
   - Meanwhile, secondary component `RecallListPanel.tsx` (mounted in `MarketingView.tsx`) does fetch `/api/patients/recall-candidates`, but contains an archaic **synthetic mock generator in `catch (_loadError)`** (lines 128–174) violating the Zero-Mocks invariant.
2. **Leads Conversion Funnel Contains a 4-Click Obstacle & UX Dead-End**:
   - Backend `POST /api/leads/:id/convert` is lightweight and 100% compliant with Solo Doctor Autonomy (Mandates 8e/8n): it requires zero mandatory INN, zero mandatory assistant, and defaults cleanly to the solo doctor and main chair.
   - However, frontend `LeadsKanbanView.tsx` conditionally hides the booking button `"Записать в сетку расписания"` behind `lead.status === "consult_booked"`. New leads ("Новые") require 3–4 clicks through dropdowns and modals to reach scheduling.
   - After booking, the user is stranded in the Kanban board with a generic alert; there is no 1-click link to navigate into `ScheduleView` at the target date.
3. **Severe Ergonomic & 7 Deadly Sins Violations**:
   - **Viewport Theft (Hick's Law)**: `PatientRecallsHubModal` steals ~260px of vertical space before the table begins (Header 60px + 3 metric cards 110px + Filter toolbar 90px). On 1440x900 screens, only 2–3 rows of patients fit on screen.
   - **Button Landfill (Miller's Law)**: Every table row in `PatientRecallsHubModal` renders 5 separate action buttons (`WhatsApp`, `Telegram`, `Позвонить`, `Записать`, `SMS`) with `minHeight: 44px`, ballooning row height to 85px.
   - **Language Leaks & Emojis**: English technical status parens `(PENDING)`, `(CONTACTED)`, `(BOOKED)` leak in Russian clinical tables. Raw emojis (📊, 🎯, 🦷, ⚡) exist in `leadsFunnelEngine.ts` and recall templates.

---

## Section 1: Recalls Components & Architecture Audit

### 1.1 File Structure & Locations
- **Backend Route**: `apps/api/src/routes/patientRecall.ts` (144 lines)
- **Backend Service**: `apps/api/src/services/patients/recallCandidates.ts` (260 lines)
- **Primary Web Modal**: `apps/web/src/components/recalls/PatientRecallsHubModal.tsx` (1,234 lines)
- **Clinical Engine & Calculators**: `apps/web/src/components/recalls/patientRecallEngine.ts` (1,510 lines)
- **Recall Styles**: `apps/web/src/components/recalls/recalls.css` (457 lines)
- **Secondary Web Panel**: `apps/web/src/components/patients/RecallListPanel.tsx` (366 lines)
- **Call Sites**:
  - `apps/web/src/CommunicationsView.tsx` (line 1083: mounts `PatientRecallsHubModal`)
  - `apps/web/src/MarketingView.tsx` (mounts `RecallListPanel`)
  - `apps/web/src/AnalyticsDashboardView.tsx` (mounts `RecallListPanel`)

### 1.2 Overdue Recall Identification Logic
The business and clinical logic for identifying overdue recalls is implemented in `apps/api/src/services/patients/recallCandidates.ts`:
- **Query Structure** (`getRecallCandidates`):
  ```sql
  SELECT p.id, p.first_name, p.last_name, p.patronymic, p.phone, p.email,
         p.preferred_contact_method, p.tags,
         COUNT(f.id) FILTER (WHERE f.start_time > now()) AS future_count,
         MAX(c.start_time) FILTER (WHERE c.status = 'completed') AS last_completed,
         COUNT(c.id) FILTER (WHERE c.status = 'completed') AS total_completed
  FROM patients p
  LEFT JOIN appointments f ON f.patient_id = p.id AND f.start_time > now()
  LEFT JOIN appointments c ON c.patient_id = p.id AND c.status = 'completed'
  WHERE p.is_active = true
  GROUP BY p.id
  HAVING COUNT(f.id) FILTER (WHERE f.start_time > now()) = 0
     AND (MAX(c.start_time) FILTER (WHERE c.status = 'completed') IS NULL
          OR MAX(c.start_time) FILTER (WHERE c.status = 'completed') <= now() - (${minMonths} || ' months')::interval)
  ```
- **Bands & Urgency**:
  1. `due`: $\ge 6$ months since last completed appointment (Score: 60 + $10 \times \text{priorityMultiplier}$).
  2. `overdue`: $\ge 12$ months since last completed appointment (Score: 80).
  3. `probably_lost`: $\ge 24$ months (Score: 95).
  4. `never_arrived`: active patient with 0 completed appointments (Score: 40).
- **Clinical Interval Engines** (`patientRecallEngine.ts`):
  - `calculateHygieneRecallDate`: 3–6 months based on periodontal risk (Gingivitis: 4m, Periodontitis: 3m, Low risk: 6m).
  - `calculateImplantRecallMilestones`: 1m, 3m, 6m, 12m, then annually.
  - `calculateOrthoRecallDate`: 4–6 weeks activation interval.

### 1.3 Detection of Mocks vs. Authentic Calculations
| Location | Mechanism | Audit Verdict |
|---|---|---|
| `apps/api/src/services/patients/recallCandidates.ts` | Drizzle ORM SQL aggregation on real DB | **AUTHENTIC**. Zero mocks found. |
| `apps/web/src/components/recalls/PatientRecallsHubModal.tsx` | Prop `initialCandidates?: PatientRecallRecord[]` | **DISCONNECTED**. Does not fetch backend API. |
| `apps/web/src/CommunicationsView.tsx:1083` | `<PatientRecallsHubModal isOpen={...} onClose={...} />` | **DEFECT**. Mounts without candidates; renders empty screen. |
| `apps/web/src/components/patients/RecallListPanel.tsx:128-174` | `catch (_loadError) { setCandidates([ ...mockPatients ]) }` | **MOCK VIOLATION**. Generates 4 synthetic patients (`Иванов`, `Смирнова`, etc.) on network error. |
| `apps/web/src/components/recalls/patientRecallEngine.ts:1458` | `export const DEFAULT_RECALL_CANDIDATES: PatientRecallRecord[] = [];` | **EMPTY STUB**. Stripped in Wave 116, leaving caller without fallback or data. |

### 1.4 Omnichannel 1-Click Contact Generation
In `PatientRecallsHubModal.tsx` and `RecallListPanel.tsx`:
- **WhatsApp**:
  - `https://wa.me/{cleanPhone}?text={encodedMessage}`
  - Opens in new tab, pre-fills personalized clinical message with patient name, clinic name, and recommended procedure.
- **Telegram**:
  - `https://t.me/{usernameOrPhone}?text={encodedMessage}`
- **SMS**:
  - `sms:{cleanPhone}?body={encodedMessage}`
- **Phone Call**:
  - `tel:{cleanPhone}` initiates native dialer.
- **Objection Handling & Scripts**:
  - `PatientRecallsHubModal.tsx` includes an objection-handling drawer with structured scripts for:
    * "Дорого" (Explain prevention is 5x cheaper than implants).
    * "Ничего не болит" (Early caries & periodontal loss are asymptomatic).
    * "Нет времени" (Offer 30-min express hygiene slots).
    * "Лечусь в другой клинике" (Offer independent second opinion / diagnostic CT review).

---

## Section 2: Leads Components & Conversion Funnel Audit

### 2.1 File Structure & Locations
- **Backend Route**: `apps/api/src/routes/leads.ts` (338 lines)
- **Primary Web Kanban**: `apps/web/src/components/leads/LeadsKanbanView.tsx` (1,296 lines)
- **Analytics Modal**: `apps/web/src/components/leads/LeadsFunnelAnalyticsModal.tsx` (567 lines)
- **Funnel Calculation Engine**: `apps/web/src/components/leads/leadsFunnelEngine.ts` (945 lines)
- **Schedule Call Site**: `apps/web/src/ScheduleView.tsx`

### 2.2 Conversion Pathway & Backend Invariants
Backend `POST /api/leads/:id/convert` in `apps/api/src/routes/leads.ts` (lines 148–246):
- **Input Payload**:
  ```ts
  {
    doctorId?: string;
    chairId?: string;
    startTime: string; // ISO DateTime
    durationMinutes?: number; // default 30
    serviceType?: string;
    notes?: string;
  }
  ```
- **Execution Flow**:
  1. Locates lead by `id`.
  2. Creates or links `patient` record (copies `firstName`, `lastName`, `phone`, `email`, tags).
  3. Creates `appointment` in status `planned`.
  4. Updates lead status to `consult_booked`.
  5. Emits real-time WebSocket events: `LEAD_UPDATED`, `APPOINTMENT_CREATED`.
- **Compliance with Mandates 8e & 8n (Solo Doctor Autonomy)**:
  - **Zero Bureaucracy**: Does NOT require patient INN, SNILS, insurance policy, passport details, or secondary questionnaires.
  - **No Mandatory Assistant**: Can be scheduled with solo doctor and chair.
  - **Zero Dead-Ends**: Missing doctor or chair falls back gracefully to clinic defaults.

### 2.3 Frontend Conversion Defect (The 4-Click Obstacle)
In `apps/web/src/components/leads/LeadsKanbanView.tsx`:
- Line 1251:
  ```tsx
  {lead.status === "consult_booked" && (
    <button
      className="leads-card__btn leads-card__btn--schedule"
      onClick={() => handleOpenConvertModal(lead)}
      data-testid={`schedule-lead-btn-${lead.id}`}
    >
      Записать в сетку расписания
    </button>
  )}
  ```
- **The Problem**: A newly captured lead ("Новые" or "В работе") **does not have this button**!
- To convert a lead:
  1. Doctor/Admin must click the status selector dropdown on the card.
  2. Select "Записан на консультацию" (`consult_booked`).
  3. Card jumps to another column.
  4. Now the button appears; user clicks "Записать в сетку расписания".
  5. Modal opens, user picks date/time, and clicks confirm.
- **Total clicks: 4–5 clicks**. This directly violates Mandate 8n (1–2 click rapid booking).

### 2.4 Post-Conversion Navigation Dead-End
In `LeadsKanbanView.tsx:505` (`handleConvertSubmit`):
```tsx
const result = await leadsApi.convertLead(selectedLead.id, convertPayload);
// Closes modal, updates local state, shows alert:
alert("Пациент создан и записан на приём!");
```
- **Defect**: The user is left sitting in the Kanban board. There is no link or action to navigate to `ScheduleView` at the scheduled appointment time.
- **Required**: A non-blocking toast banner with action: `[Перейти в расписание]` triggering navigation to `calendar` with the appointed date pre-selected.

---

## Section 3: UI Ergonomics, 7 Deadly Sins & Visual Proof

### 3.1 The 7 Deadly Sins UI Checklist Applied to R2

| # | UI Sin / Heuristic | Current Implementation in Recalls / Leads | Severity | Remediation Plan |
|---|---|---|---|---|
| **1** | **Hick's Law / Viewport Theft** (Toolbar + filters $\le 160\text{--}180\text{px}$) | `PatientRecallsHubModal`: Header (60px) + 3 Metric cards (110px) + Filter Toolbar (90px) = **260px** stolen space. Only 2.5 patient rows fit on 1440x900 screen. | **CRITICAL** | Collapse 3 metric cards into a 32px horizontal KPI ribbon (`На контроле: 42 \| Просрочено: 18 \| Дозвон: 65%`). Merge search and tabs into a single 36px toolbar row. Total header $\le 120\text{px}$. |
| **2** | **Miller's Law / Button Landfill** (Max 2 primary actions per card/row) | Table rows in `PatientRecallsHubModal` contain **5 action buttons** (`WhatsApp`, `Telegram`, `Позвонить`, `Записать`, `SMS`), each with `minHeight: 44px`. Total row height: 85px! | **CRITICAL** | Consolidate to **1 primary button** ("Записать") and **1 dropdown button** ("Связаться ▾" with WhatsApp, Telegram, SMS, Звонок). Reduces row height from 85px to 40px, doubling visible records. |
| **3** | **Anti-Matryoshka Law** (Card/Modal depth $\le 1$) | Kanban board has cards inside column containers inside scroll views; analytics modal opens atop Kanban. | **MEDIUM** | Remove nested card wrappers inside Kanban column headers; ensure modals are flat single-surface panels. |
| **4** | **Cartoon Emojis Ban** (Mandate 8d) | `leadsFunnelEngine.ts` lines 914–923 contain raw emojis: `📊`, `🎯`, `🦷`, `⚡`, `⚠️`. Also in recall templates. | **HIGH** | Purge all raw emojis. Replace with Lucide icons (`BarChart3`, `Target`, `Zap`, `AlertTriangle`) or clean text. |
| **5** | **Technical Jargon & Language Leaks** | Status column in `PatientRecallsHubModal` renders English technical parens: `Ожидает (PENDING)`, `Связались (CONTACTED)`, `Записан (BOOKED)`. | **MEDIUM** | Remove English uppercase constants from UI labels. Display pure Russian medical statuses: `Ожидает`, `Связались`, `Записан`. |
| **6** | **Desktop Density vs. Mobile Adaptability** | Desktop table uses `min-height: 44px` on buttons, destroying clinical density. | **HIGH** | Use 28–32px buttons on desktop; use media query / touch detection (`pointer: coarse`) for 44px on mobile touch devices. |
| **7** | **Doctor Autonomy & Zero Dead-Ends** (Mandates 8e/8n) | Lead conversion requires manual pre-transition to `consult_booked` before booking button appears. | **CRITICAL** | Provide direct "Записать на приём" button on all active lead cards; auto-transition status on save. |

### 3.2 Visual Multimodal Inspection
Direct visual examination of existing UI screenshots was conducted:
1. `docs/screenshots/audit_modal_patient_retention_recalls_dark_pc_1440.png`:
   - Dark theme tokens are respected (`--paper`, `--paper-strong`), zero pure-white leaks.
   - However, the top third of the viewport is completely consumed by huge summary cards ("Всего на контроле", "Просрочено >6 мес", "Конверсия дозвона"). The patient list below is cut off at row 3.
2. `docs/screenshots/audit_modal_patient_retention_recalls_light_pc_1440.png`:
   - High contrast light theme works well, but button landfill in action columns is glaring: green WhatsApp, blue Telegram, grey phone, purple calendar, light blue SMS buttons create rainbow clutter.
3. `docs/screenshots/audit_modal_patient_retention_recalls_dark_mobile_390.png`:
   - On 390px viewport, the 5 action buttons wrap across multiple lines, causing row heights to exceed 140px per patient! A single patient card consumes half the screen.

---

## Section 4: Surgical Implementation Plan for Worker

### Phase 1: Connect `PatientRecallsHubModal` to Authentic Backend API
- **Target File**: `apps/web/src/components/recalls/PatientRecallsHubModal.tsx`
- **Actions**:
  1. Add data fetching hook/state:
     ```tsx
     const [candidates, setCandidates] = useState<PatientRecallRecord[]>(initialCandidates ?? []);
     const [isLoading, setIsLoading] = useState(!initialCandidates);
     const [error, setError] = useState<string | null>(null);

     useEffect(() => {
       if (initialCandidates && initialCandidates.length > 0) return;
       let isMounted = true;
       setIsLoading(true);
       fetch('/api/patients/recall-candidates?minMonths=6&limit=100', {
         headers: { 'Accept': 'application/json' }
       })
         .then(res => {
           if (!res.ok) throw new Error(`HTTP error ${res.status}`);
           return res.json();
         })
         .then(data => {
           if (!isMounted) return;
           const mapped: PatientRecallRecord[] = (data.candidates ?? []).map(mapBackendCandidateToRecallRecord);
           setCandidates(mapped);
           setIsLoading(false);
         })
         .catch(err => {
           if (!isMounted) return;
           setError(err.message);
           setIsLoading(false);
         });
       return () => { isMounted = false; };
     }, [initialCandidates]);
     ```
  2. Implement `mapBackendCandidateToRecallRecord` adapter to map backend DTO (`recallBand`, `lastCompletedAppointmentDate`, `totalCompletedAppointments`) to UI structure.
  3. Render honest loading skeleton and error banner with retry button.

### Phase 2: Eliminate Synthetic Mocks in `RecallListPanel.tsx`
- **Target File**: `apps/web/src/components/patients/RecallListPanel.tsx`
- **Line Range**: Lines 128–174
- **Action**:
  - Delete `const mockPatients = [...]` and `setCandidates(mockPatients)` inside `catch (_loadError)`.
  - Replace with:
    ```tsx
    setCandidates([]);
    setError("Не удалось загрузить список диспансерных пациентов. Проверьте соединение с сервером.");
    ```

### Phase 3: Recalls UI Ergonomic Compaction (Solving Sins 1 & 2)
- **Target Files**:
  - `apps/web/src/components/recalls/PatientRecallsHubModal.tsx`
  - `apps/web/src/components/recalls/recalls.css`
- **Actions**:
  1. **Compact KPI Ribbon**: Replace 3 large metric cards (`recalls-metric-card`) with a single horizontal strip:
     ```tsx
     <div className="recalls-kpi-ribbon">
       <div className="recalls-kpi-item">
         <span className="recalls-kpi-label">Всего на контроле:</span>
         <span className="recalls-kpi-value">{totalCount}</span>
       </div>
       <div className="recalls-kpi-item recalls-kpi-item--warning">
         <span className="recalls-kpi-label">Просрочено $\ge$6 мес:</span>
         <span className="recalls-kpi-value">{overdueCount}</span>
       </div>
       <div className="recalls-kpi-item">
         <span className="recalls-kpi-label">Конверсия дозвона:</span>
         <span className="recalls-kpi-value">{conversionRate}%</span>
       </div>
     </div>
     ```
  2. **Unified 1-Row Toolbar**: Merge search input, tab filters, and cohort selector into a single flex row (`height: 36px`).
  3. **Action Dropdown**: Replace 5 buttons per table row with:
     - Primary button: `Записать` (triggers appointment creation).
     - Split dropdown: `Связаться ▾` (opens menu with WhatsApp, Telegram, SMS, Звонок).
     - Row height reduced from 85px to 40px.
  4. **Clean Language**: Strip `(PENDING)`, `(CONTACTED)`, `(BOOKED)` from table cells.

### Phase 4: Streamline Lead Conversion in `LeadsKanbanView.tsx`
- **Target File**: `apps/web/src/components/leads/LeadsKanbanView.tsx`
- **Actions**:
  1. Make "Записать на приём" accessible in **1 click** on every active lead card, regardless of whether status is "Новые", "В работе", or "Записан":
     - Replace conditional check at line 1251 with direct action button.
  2. When conversion modal submits successfully:
     - Automatically update status to `consult_booked`.
     - In `handleConvertSubmit`, display a toast notification with navigation:
       ```tsx
       showToast({
         message: `Пациент ${lead.fullName} записан на приём`,
         actionLabel: "В расписание",
         onAction: () => navigateToSchedule(appointmentDate)
       });
       ```
  3. Tidy Kanban card controls: keep 2 visible actions (Schedule + Next Status); collapse Delete and Details into a 3-dots `...` context menu.

### Phase 5: Purge Emojis
- **Target Files**:
  - `apps/web/src/components/leads/leadsFunnelEngine.ts` (lines 914–923)
  - `apps/web/src/components/recalls/patientRecallEngine.ts`
- **Actions**:
  - Replace `📊 Конверсия`, `🎯 Цель`, `🦷 Зубы`, `⚡ Срочно` with pure text or Lucide vector icons (`BarChart2`, `Target`, `Zap`).

### Phase 6: Playwright Visual Proof & Verification
- **Test Spec**: `apps/web/e2e/recalls-and-leads-r2.spec.ts`
- **Scenarios**:
  1. Capture 4-state screenshots for `PatientRecallsHubModal`:
     - PC Light (1440x900)
     - PC Dark (1440x900)
     - Mobile Light (390x844)
     - Mobile Dark (390x844)
  2. Measure header + toolbar height $\le 160\text{px}$.
  3. Verify $\ge 8$ table rows visible without scrolling on PC 1440x900.
  4. Test lead conversion in $\le 2$ clicks from "Новые" column.

---

## Conclusion
The backend foundation for patient retention and lead conversion is solid, authentic, and scale-agnostic. The breakdown exists entirely in the frontend wiring (disconnected API in `PatientRecallsHubModal`, synthetic mock fallback in `RecallListPanel`) and severe UI friction (260px stolen viewport, 5 action buttons per row, 4-click lead conversion path). Following this surgical plan will revitalize the R2 domain with zero risk of architectural regressions.
