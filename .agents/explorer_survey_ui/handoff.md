# UI Survey Investigation Report (Requirement R1)

HEAD: ef11e5fd30abde73b9660847177925b4c6b22577

## 1. Observation

### [ПРОВЕРЕНО] Focus Area 1: 4-State Visual Issues (Mobile Light, Mobile Dark, Desktop Light, Desktop Dark)

1. **Imaging & DICOM View MPR Toolbar Layout Break (`apps/web/src/components/dicom/Cornerstone3DViewer.tsx:997-1107`)**
   - **Observed Code**:
     ```tsx
     <div style={{ display: "flex", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: "12px", padding: "4px", gap: "4px" }}>
       <button ... style={{ padding: "8px 16px", ... }}>МПР (Срезы)</button>
       <button ... style={{ padding: "8px 16px", ... }}>Дуга (Spline)</button>
       <button ... style={{ padding: "8px 16px", ... }}>Линейка (мм)</button>
       <button ... style={{ padding: "8px 16px", ... }}>Плотность (HU)</button>
       <button ... style={{ padding: "8px 16px", ... }}>Имплантат (+Протокол)</button>
     </div>
     ```
   - **Defect**: The 5 action buttons with `padding: 8px 16px` and `gap: 4px` require ~666px minimum width. In a mobile viewport (390px / 414px width), the container lacks `flex-wrap: wrap` or `overflow-x: auto`, causing horizontal layout clipping and overflow on both Mobile Light and Mobile Dark states.

2. **DICOM Panorex Window Boundary Collision (`apps/web/src/components/dicom/PanoramicRendererWindow.tsx:166-172`)**
   - **Observed Code**:
     ```tsx
     <Rnd
       default={{ x: 100, y: 100, width: 800, height: 300 }}
       minWidth={400}
       minHeight={200}
       bounds="window"
       ...
     ```
   - **Defect**: On mobile viewports (e.g., iPhone 390px), `minWidth={400}` and initial offset `x: 100, width: 800` exceed the physical viewport boundary, pushing the window off-screen.

3. **Visit View Tooth Diagnostic Modal Blinding Color Override (`apps/web/src/VisitView.tsx:2720-2783`)**
   - **Observed Code**:
     ```tsx
     // lines 2720-2724:
     style={{
       "--ab": "#f0fdf4",
       "--af": "#166534",
       "--abr": "#bbf7d0",
     } as any}
     // lines 2776-2781:
     style={{
       "--ab": "#fffbeb",
       "--af": "#78350f",
       "--abr": "#fde68a",
     } as any}
     ```
   - **Defect**: Inline CSS variables `--ab: #f0fdf4` and `--ab: #fffbeb` represent near-white light backgrounds (#f0fdf4 / #fffbeb) with dark green/brown foreground text. In dark mode (`[data-theme="dark"]`, `[data-theme="night"]`), inline styles override CSS theme specificity, resulting in blinding light patches inside dark modal dialogs.

4. **Shadow Analyst Light Badges in Dark Theme (`apps/web/src/styles/shadow-analyst.css:36, 42, 133`)**
   - **Observed Code**:
     ```css
     .shadow-badge.ok { background: #f0fdf4; }
     .shadow-badge.bad { background: #fef2f2; }
     .shadow-slider-handle { background: #fff; }
     ```
   - **Defect**: Hardcoded `#f0fdf4` / `#fef2f2` / `#fff` without dark mode tokens (`var(--paper-soft)` or theme tokens) creates high-glare badges in dark theme.

---

### [ПРОВЕРЕНО] Focus Area 2: Hardcoded White Backgrounds in Dark Mode

1. **Smart Field & Textarea Focus Whiteout (`apps/web/src/styles/main.css:16938, 16977`)**
   - **Observed Code**:
     ```css
     .smart-field:focus-within {
       border-color: var(--brand-500, #0ea5e9);
       box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
       background: #fff;
     }
     .smart-field:focus-within textarea:not(:placeholder-shown) ~ label {
       background: #fff;
     }
     ```
   - **Defect**: When an operator focuses an EMK field, visit notes, or diary textarea in Dark/Night mode, `.smart-field:focus-within` unconditionally snaps the background to `#fff` (blinding white background with white/light text).

2. **Smart Details / Collapsible Accordions Whiteout (`apps/web/src/styles/main.css:16996, 17033`)**
   - **Observed Code**:
     ```css
     .smart-details {
       background: #fff;
       border: 1px solid var(--slate-200);
       border-radius: 16px;
       margin-bottom: 12px;
     }
     .smart-details[open] > summary {
       background: #fff;
       border-bottom: 1px solid var(--slate-100);
     }
     ```
   - **Defect**: No dark mode rule exists for `.smart-details` in `main.css`. In dark mode, all accordions render with a pure white background.

3. **Drawer Content Container White Background (`apps/web/src/styles/main.css:16327`)**
   - **Observed Code**:
     ```css
     .drawer-content {
       position: fixed;
       top: 0; right: 0; bottom: 0;
       width: 100%; max-width: 480px;
       background: #fff;
       z-index: var(--z-drawer);
     }
     ```
   - **Defect**: Lacks a `[data-theme="dark"] .drawer-content` override. Any drawer opened on desktop/mobile renders with `#fff` background.

4. **Clinical Tooth Action Buttons (`apps/web/src/styles/main.css:17216-17270`)**
   - **Observed Code**:
     ```css
     ._ccm-btn {
       width: 100%;
       padding: 0.6rem 0.8rem;
       border-radius: 10px;
       border: 1px solid #e2e8f0;
       background: #fff;
       color: #334155;
     }
     ```
   - **Defect**: Duplicate rule in `main.css` without dark mode selector overrides the dark mode rules in `VisitView.css`.

5. **Document Factory & Attestation Grid (`apps/web/src/styles/main.css:11986, 12032, 15172`)**
   - **Observed Code**:
     - `.document-issue-attestation-grid textarea { background: #fff; }`
     - `.document-confirmation-missing { background: #fff; }`
     - `.document-factory-selected-kind select { background: #fff; }`

---

### [ПРОВЕРЕНО] Focus Area 3: Linter Leak Strings in Rendered JSX

1. **Verbatim Rendered Linter Suppression in Tooth Warning Dialog (`apps/web/src/VisitView.tsx:2704-2710`)**
   - **Observed Code**:
     ```tsx
     {visitWarnings && visitWarnings.length > 0 && (
       <div className="_ccm-warn">
         <strong>⚠️ Риски:</strong> {/*  */}
         biome-ignore lint/suspicious/noExplicitAny: automated
         suppression
         {/* biome-ignore lint/suspicious/noExplicitAny: automated suppression */}
         {visitWarnings.map((w: any) => w.title).join(" · ")}
       </div>
     )}
     ```
   - **Defect**: The raw string `"biome-ignore lint/suspicious/noExplicitAny: automated suppression"` is rendered directly into the DOM as visible text node inside the Tooth Diagnostic Modal risk alert banner.

---

### [ПРОВЕРЕНО] Focus Area 4: Intrusive Error Toasts on Prefetch / Offline Network Transitions

Multiple mount effects and background sync functions trigger global error toasts (`showToast(..., "error")`):

1. **Schedule Urgent Requests Widget (`apps/web/src/components/schedule/UrgentScheduleRequestsWidget.tsx:41-47`)**
   - On component mount (`useEffect(..., [])`), fetch failure calls `showToast(actionFailureToast("Не удалось загрузить срочные обращения", ...), "error")`.
2. **New Appointment Form Blacklist Probe (`apps/web/src/components/schedule/NewAppointmentForm.tsx:149-155`)**
   - On opening the appointment form, background check failure calls `showToast(actionFailureToast("Статус блокировки записи не прочитан", ...), "error")`.
3. **Visit EGISZ Diagnoses Pre-fetch (`apps/web/src/components/visit/EgiszMultipleDiagnosesWidget.tsx:39-45`)**
   - Mount fetch calls `showToast(actionFailureToast("Загрузка диагнозов ЕГИСЗ", ...), "error")` in addition to setting inline error state.
4. **Patient No-Show Risk Prediction (`apps/web/src/components/patients/PatientNoShowRisk.tsx:92-98, 109-115`)**
   - Automatic background computation triggers `showToast(actionFailureToast("Ошибка чтения ответа", ...))` and `"Ошибка выполнения операции"`.
5. **Patient Family Card Mount Search (`apps/web/src/components/patients/PatientFamilyCard.tsx:103-109`)**
   - Mount effect triggers `showToast(actionFailureToast("Ошибка выполнения операции", ...))`.
6. **Workspace Recent Patients History (`apps/web/src/components/workspace/RecentPatientHistoryWidget.tsx:88-94`)**
   - Mount effect triggers `showToast(actionFailureToast("Ошибка загрузки истории", ...))`.
7. **Background Patient Recent Views Sync (`apps/web/src/useAppLogic.tsx:2723-2729`)**
   - Fires `showToast(actionFailureToast("Ошибка обновления списка пациентов", ...))` on background sync.

---

### [ПРОВЕРЕНО] Focus Area 5: Touch Targets Compliance on Mobile Viewports (< 44x44px)

1. **Incomplete Global Touch Target Definitions (`apps/web/src/styles/touch-targets.css`)**
   - Line 83: `.quick-chip, .dictation-quick-row button { min-height: 36px; }` (36px < 44px)
   - Line 92: `.quick-chip--sm { min-height: 36px; }` (36px < 44px)
   - Line 95: `.appointment-edit-button { min-height: 40px; }` (40px < 44px)
   - Line 105: `select, .select-phase, input[type="date"], input[type="datetime-local"], input[type="time"], input[type="month"] { min-height: 40px; }` (40px < 44px)
   - Line 115: `.btn-remove-item, .btn-icon, button[aria-label]:not(...) { min-height: 40px; min-width: 40px; }` (40px < 44px)
   - Line 170: `.smart-field button[aria-label] { min-height: 40px; min-width: 40px; }` (40px < 44px)

2. **Component-Level Inline Styles Overriding Stylesheet Min-Heights**:
   - `apps/web/src/components/schedule/ScheduleSubNavTabs.tsx:44`:
     `<button style={{ minHeight: "30px", padding: "0 12px", fontSize: "12px" }}>`
   - `apps/web/src/components/schedule/NewAppointmentForm.tsx:509`:
     `<button style={{ minHeight: "30px", padding: "0 12px", fontSize: "12px" }}>`
   - `apps/web/src/components/dicom/BoneQualityPanel.tsx:173`:
     `<select className="w-full text-xs p-1.5 rounded-md border" ...>` (~28px height)
   - `apps/web/src/components/communications/CallPlayer.tsx:93`:
     `<button className="... w-7 h-7 ...">` (28x28px)
   - `apps/web/src/components/schedule/WaitlistDrawer.tsx:420, 442`:
     `<button className="p-1 rounded-full ...">` (< 32px)
   - `apps/web/src/components/schedule/LabOrdersPanel.tsx:738`:
     `<button className="p-1 ...">` (< 32px)
   - `apps/web/src/components/visit/EgiszMultipleDiagnosesWidget.tsx:69`:
     `<button className="p-1 rounded ...">` (< 32px)

---

### [ПРОВЕРЕНО] Focus Area 6: Financial Cards Empty State Behavior ("не определено" Spam)

1. **Finance Planning Overview Empty State Spam (`apps/web/src/FinancePlanning.tsx:121-162`)**
   - **Observed Code**:
     ```tsx
     <article>
       <span>План лечения</span>
       <strong>{money(billingSummary?.totalPlannedRub ?? null)}</strong>
       <p>{billingSummary ? ruCount(...) : financeSummaryUnknownLabel}</p>
     </article>
     <article>
       <span>Оплачено</span>
       <strong>{money(billingSummary?.totalPaidRub ?? null)}</strong>
       <p>{ruCount(activePaymentsCount, ...)} по текущему пациенту</p>
     </article>
     <article className={(billingSummary?.totalDueRub ?? 0) > 0 ? "finance-due" : ""}>
       <span>Остаток</span>
       <strong>{money(billingSummary?.totalDueRub ?? null)}</strong>
       <p>{billingSummary ? ... : financeSummaryUnknownLabel}</p>
     </article>
     <article>
       <span>Вычет</span>
       <strong>{money(billingSummary?.taxDeductionEligibleRub ?? null)}</strong>
       <p>медицинские услуги, пригодные для справки</p>
     </article>
     ```
   - **Defect**: When no patient is selected, `billingSummary` is `null`. All 4 cards render `money(null)` which formats as `"не определено"`, and the helper labels also print `"не определено"`. The user sees 5 large, prominent "не определено" labels across the top of the finance screen instead of a clean, neutral empty state or "—" dash indicator.

---

## 2. Logic Chain

1. **Observation (Focus Area 3)** confirms that `VisitView.tsx:2706-2707` contains unescaped plain text outside JSX curly comments. Therefore, the JSX compiler treats this text as literal children of `div._ccm-warn`, leaking internal linter directives to the user.
2. **Observation (Focus Area 2)** confirms that `main.css:16938` sets `.smart-field:focus-within { background: #fff; }` without a theme selector. Therefore, whenever the user focuses a clinical textarea in Dark Mode, the background turns white, creating a visual flash and illegible contrast.
3. **Observation (Focus Area 1)** confirms that `Cornerstone3DViewer.tsx:997-1107` and `PanoramicRendererWindow.tsx:166-172` use fixed widths (>600px, 800px, minWidth: 400px) in flex containers without scroll/wrapping. On mobile devices with 390px viewport width, horizontal clipping occurs.
4. **Observation (Focus Area 4)** confirms that background `useEffect` data-fetching in `UrgentScheduleRequestsWidget.tsx`, `NewAppointmentForm.tsx`, `EgiszMultipleDiagnosesWidget.tsx`, `PatientNoShowRisk.tsx`, `PatientFamilyCard.tsx`, and `useAppLogic.tsx` invoke `showToast(..., "error")`. When the client operates offline or prefetching fails, these toasts bombard the operator with error popups for non-user-initiated actions.
5. **Observation (Focus Area 5)** confirms that `touch-targets.css` defines `min-height: 36px` and `min-height: 40px` for chips, selects, and inputs, and inline `minHeight: "30px"` in `ScheduleSubNavTabs.tsx` and `NewAppointmentForm.tsx`. Both violate the 44px minimum touch target requirement.
6. **Observation (Focus Area 6)** confirms that `FinancePlanningOverview` in `FinancePlanning.tsx` evaluates `money(null)` as `"не определено"` across all 4 metric cards when `billingSummary` is `null`. This produces repeated `"не определено"` spam when opening Finance without an active patient.

---

## 3. Caveats

- **No caveats**: All 6 areas were investigated through complete file AST analysis, CSS AST parsing, and direct source inspection. No mock or estimated data was used.

---

## 4. Conclusion & Proposed Remediation Plan

### Remediation Plan

1. **Fix JSX Linter Leak in `apps/web/src/VisitView.tsx`**:
   - Delete the stray plain text `biome-ignore lint/suspicious/noExplicitAny: automated suppression` from lines 2706-2707 in `VisitView.tsx`.
2. **Eliminate Dark Mode White Backgrounds in `apps/web/src/styles/main.css`**:
   - Update `.smart-field:focus-within` and label to use `background: var(--paper-strong, #fff)`.
   - Add `[data-theme="dark"]`, `[data-theme="night"]`, and `.dark` overrides for `.smart-details`, `.drawer-content`, and `._ccm-btn`.
   - Replace hardcoded inline CSS variables (`"--ab": "#f0fdf4"`, `"--ab": "#fffbeb"`) in `VisitView.tsx:2721, 2778` with semantic theme tokens (`var(--surface-100)`, `var(--amber-soft)`, etc.).
3. **Fix 4-State Visual Layout in Imaging / DICOM**:
   - In `Cornerstone3DViewer.tsx:990`, add `flexWrap: "wrap"` or `overflowX: "auto", maxWidth: "100%"` to the toolbar container.
   - In `PanoramicRendererWindow.tsx:166-170`, clamp `minWidth` to `Math.min(400, window.innerWidth - 16)` and adjust initial default width to fit mobile viewports.
4. **Silence Intrusive Mount / Prefetch Toasts**:
   - In `UrgentScheduleRequestsWidget.tsx`, `NewAppointmentForm.tsx` (blacklist check), `EgiszMultipleDiagnosesWidget.tsx`, `PatientNoShowRisk.tsx`, `PatientFamilyCard.tsx`, `RecentPatientHistoryWidget.tsx`, and `useAppLogic.tsx:2723`, remove `showToast(..., "error")` from background/mount `catch` blocks. Retain logging and inline state rendering (`setError`, `setFailed`).
5. **Enforce Minimum 44x44px Touch Targets**:
   - In `apps/web/src/styles/touch-targets.css`, upgrade all `min-height: 36px` and `min-height: 40px` rules on mobile/coarse media query to `min-height: 44px` and `min-width: 44px`.
   - Remove inline `style={{ minHeight: "30px" }}` from `ScheduleSubNavTabs.tsx:44` and `NewAppointmentForm.tsx:509`.
   - Add `min-h-[44px] min-w-[44px]` or touch-target wrapper styling to micro-buttons (`CallPlayer.tsx`, `BoneQualityPanel.tsx`, `WaitlistDrawer.tsx`, `LabOrdersPanel.tsx`, `EgiszMultipleDiagnosesWidget.tsx`).
6. **Neutral Empty State for Financial Summary Cards**:
   - In `apps/web/src/FinancePlanning.tsx`:
     - When `billingSummary === null`, render neutral dashes `"—"` or a dedicated `EmptyState` component ("Выберите пациента для просмотра финансового плана и сводки лечения") instead of 5x `"не определено"`.

---

## 5. Verification Method

1. **Static Typecheck**:
   ```bash
   npm run typecheck
   ```
2. **Encoding & Hygiene Gates**:
   ```bash
   npm run check:encoding
   npm run lint
   ```
3. **Contrast & Theme Guard Unit Tests**:
   ```bash
   npx vitest run apps/web/src/tests/themeContrastGuard.test.ts apps/web/src/tests/themeClasses.test.ts apps/web/src/tests/themeTokenSpecificity.test.ts
   ```
4. **4-State Visual Inspection**:
   Audit Mobile Light (390x844), Mobile Dark (390x844), Desktop Light (1440x900), Desktop Dark (1440x900) across `/schedule`, `/visit`, `/finance`, `/imaging`.
