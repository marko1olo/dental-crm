# Handoff Report: UI & CSS Design System Survey (Requirement R1)

## Executive Summary
Survey of Requirement R1 (Autonomous UI Design System, 4-State Visual Self-Healing, WCAG 2.1 AA Contrast, Token Resolution, Layout Shifts, Forbidden Clichés, and Mobile Touch Targets >= 44x44px) across `@dental/web` and associated stylesheets.

---

## 1. Observation

### 1.1 Token Resolution & CSS Token Debt (`check-css-tokens.mjs`)
- **Tool Command**: `node scripts/check-css-tokens.mjs`
- **Output**:
  ```text
  css-файлов проверено:            47
  объявлено переменных в css:      188
  имён выставляется из js:         9
  использований var():             3480 (из них с запасом: 744)
  имён использовано через var():   169
  НЕ РАЗРЕШАЕТСЯ НИ В ОДНОЙ ТЕМЕ:  0 имён, 0 вхождений
    из них затрагивают apps/web/src/styles/: 0 имён
  СВЕТЛЫЙ ЗАПАС ВО ВСЕХ ТЕМАХ:     0 имён, 0 вхождений
    известный долг (лестницы оттенков): 2 имён, 2 вхождений
  тёмный запас во всех темах:      0 имён, 0 вхождений (не валит гейт)

  Все var() разрешаются: каждое имя объявлено, либо его запас не светлый литерал.
  ```
- **Known Debt**:
  - `apps/web/src/styles/main.css:17664-17666`:
    ```css
    .chip-assistant {
        background: var(--violet-50, #f5f3ff);
        color: var(--violet-700, #6d28d9);
        border-color: var(--violet-200, #ddd6fe);
    }
    ```
  - While `--violet-700` is aliased in `token-aliases.css:202` to `var(--teal-dark, #0f766e)`, `--violet-50` and `--violet-200` are undeclared. In Dark (`[data-theme="dark"]`) and Night (`[data-theme="night"]`) themes, `.chip-assistant` falls back to the light hex literals `#f5f3ff` and `#ddd6fe`.

---

### 1.2 Forbidden Design Clichés (Pulsing Animations, Neon Glowing Borders, Purple-on-Dark)
Empirical scan of `apps/web/src/` revealed the following active clichés:

#### A. Pulsing Keyframe Animations (15 instances)
1. `apps/web/src/styles/auth.css:28, 43`:
   ```css
   .auth-glow { animation: pulse-glow 4s ease-in-out infinite alternate; }
   @keyframes pulse-glow { 0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; } }
   ```
2. `apps/web/src/styles/dente-redesign.css:302, 1122, 2000`:
   ```css
   @keyframes dntPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
   .recording-icon-pulse { animation: dntPulse 1.2s ease infinite; }
   .pulse-dot { animation: dntPulse 1.8s ease infinite; }
   ```
3. `apps/web/src/styles/main.css:10862, 10875`:
   ```css
   @keyframes ai-pulse { ... }
   .ai-pulse { animation: ai-pulse 2s infinite; }
   ```
4. `apps/web/src/styles/main.css:14536, 14757`:
   ```css
   @keyframes pulse-soft { ... }
   .status-pill.pulse { animation: pulse-soft 1.6s ease-in-out infinite; }
   ```
5. `apps/web/src/styles/shadow-analyst.css:273, 276`:
   ```css
   .sa-icon-btn--active { animation: sa-pulse-border 1.5s infinite; }
   @keyframes sa-pulse-border { 0%, 100% { border-color: rgba(16, 185, 129, 0.25); } 50% { border-color: rgba(16, 185, 129, 0.55); } }
   ```
6. `apps/web/src/styles/VisitView.css:238, 254`:
   ```css
   @keyframes pulse-record { ... }
   .recording-icon-pulse { animation: pulse-record 1.5s infinite; }
   ```
7. `apps/web/src/components/visit/VisitFlowProgress.css:145, 161`:
   ```css
   @keyframes pulse { ... }
   .visit-step-node--active { animation: pulse 2s infinite; }
   ```

#### B. Neon Glowing Borders & Text Glows (7 instances)
1. `apps/web/src/styles/visit-diary-043.css:945`:
   ```css
   .vde-043-scanner__laser {
       background: #ef4444;
       box-shadow: 0 0 20px 10px rgba(239, 68, 68, 0.55); /* Neon laser glow */
   }
   ```
2. `apps/web/src/styles/shadow-analyst.css:486`:
   ```css
   .sa-slider-handle { box-shadow: 0 0 10px rgba(56, 189, 248, 0.5); }
   ```
3. `apps/web/src/styles/auth.css:247, 358, 506`:
   ```css
   .auth-staff-card.active { box-shadow: 0 0 15px rgba(13, 148, 136, 0.2); }
   .auth-pin-dot.filled { box-shadow: 0 0 8px rgba(13, 148, 136, 0.5); }
   .auth-submit-btn { box-shadow: 0 0 20px rgba(13, 148, 136, 0.3); }
   ```
4. `apps/web/src/components/PublicBooking.css:50`:
   ```css
   .public-booking-step-dot.active { box-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
   ```
5. `apps/web/src/ScannerView.css:52`:
   ```css
   .scanner-laser { box-shadow: 0 0 12px 2px var(--teal-soft, rgba(13, 148, 136, 0.5)); }
   ```
6. `apps/web/src/styles/premium.css:245`:
   ```css
   .nav-item.active { text-shadow: 0 0 10px rgba(255, 255, 255, 0.3); }
   ```

#### C. Purple-on-Dark Clichés (6 instances)
1. `apps/web/src/SmartParsePreview.tsx:202, 302, 358, 416, 493, 494, 612`:
   - `bg-purple-100 text-purple-800`
   - `text-purple-700 dark:text-purple-300`
   - `dark:bg-purple-950/80 dark:text-purple-300 text-purple-700`
2. `apps/web/src/pages/AnalyticsDashboardView.tsx:612`:
   - `<Users className="w-5 h-5 text-purple-500" />`
3. `apps/web/src/lib/icd10.ts:79`:
   - `Пародонт: "bg-purple-500/10 text-purple-400 border-purple-500/25"`
4. `apps/web/src/components/odontogram/PeriodontalChartModule.tsx:637, 790`:
   - `bg-purple-600 text-white`
5. `apps/web/src/components/VisitDiaryEditor.tsx:771`:
   - `<Search className="w-3 h-3" style={{ color: "#7c3aed" }} />`

---

### 1.3 Theme Asymmetry & Night Theme Omissions (`[data-theme="night"]`)
In `apps/web/src/styles/main.css`, multiple dark theme override sections define `[data-theme="dark"]`, `.dark`, and `body.dark-mode` but omit `[data-theme="night"]` (the warm dark theme):
- `main.css:17987-18025`: Schedule widgets: `.schedule-shift-summary`, `.schedule-shift-summary-grid article`, `.schedule-filter-strip`, `.schedule-secret-collapsible`, `.schedule-admin-unlock`.
- `main.css:18027-18048`: Communications widgets: `.communications-summary-grid article`, `.communication-note-row`, `.communication-task`, `.communication-side section`, `.template-list article`, `.communication-empty-state`.
- `main.css:18051-18081`: Finance widgets: `.finance-summary-grid article`, `.payment-capture`, `.plan-scenarios`, `.plan-scenario`, `.clinical-rule-panel`, `.clinical-rule-card`, `.finance-list`, `.service-catalog-strip article`, `.payment-capture-detail-section`.
- `main.css:16738-16752`: Settings grids: `.settings-grid label`, `.clinic-profile-form-grid label`, `.rule-form-grid label`, `.weekday-toggle-row`.

---

### 1.4 Mobile Interactive Touch Targets (< 44x44px)
Inline styles and high-specificity rules constrain touch targets below 44px on mobile viewports:

| File | Line | Element / Description | Current Dimension | Target |
|---|---|---|---|---|
| `components/schedule/ScheduleFilterStrip.tsx` | 90-145 | Date step buttons (`.schedule-day-step-prev`, `.schedule-day-step-next`) & date input | `height: 32px, minHeight: 32px` | `44px` |
| `components/schedule/ScheduleFilterStrip.tsx` | 154, 187, 214 | Filter chip buttons ("Все записи", Doctors, Chairs) | `minHeight: 36px` | `44px` |
| `components/schedule/AppointmentCard.tsx` | 312, 327, 344 | Action buttons ("Повторить", "В буфер", "Настроить") | `minHeight: 36px` | `44px` |
| `components/schedule/WaitlistMatchesBlock.tsx` | 368, 392 | Waitlist action buttons ("Позвонить", "Позвонил") | `minHeight: 28px` | `44px` |
| `ShiftView.tsx` | 656 | Analytics toggle button ("Показать аналитику") | `minHeight: 30px` | `44px` |
| `PatientsView.tsx` | 132 | `quickCreateInputStyle` for quick patient creation inputs | `minHeight: 2.5rem` (40px) | `44px` |
| `ImagingView.tsx` | 1248 | Description template button ("Шаблон описания") | `minHeight: 32px` | `44px` |
| `components/SmartMicrophoneButton.tsx` | 125-126 | Speech recognition trigger button | `minWidth: 36px, minHeight: 36px` | `44px` |
| `components/settings/InsuranceContractsPanel.tsx` | 361-381 | Edit & Delete icon buttons (`<Edit2 />`, `<Trash2 />`) | `width: 34px, height: 34px` | `44px` |
| `styles/main.css` | 17822-17865 | `.schedule-filter-strip input[type="date"]` & `.schedule-date-picker-group .secondary-button` | `height: 32px, min-height: 32px, max-height: 32px` | `min-height: 44px` on mobile |
| `components/workspaceActions/workspaceActions.css` | 115 | `.dnt-actions[data-placement="header"] .dnt-actions__control` | `min-height: 2.5rem` (40px) | `44px` |

---

### 1.5 Hardcoded Colors & Dark Mode Translucent White Overlays
1. `apps/web/src/components/LabOrdersPanel.tsx:231-616`:
   - Hardcoded dark theme inline styles (`color: "#f4f4f5"`, `color: "#71717a"`, `background: "#18181b"`) bypass `LabOrdersPanel.css`, creating unreadable contrast in Light theme.
2. `apps/web/src/styles/main.css:17014`:
   - `.smart-ai-hints-popup` uses `background: rgba(255, 255, 255, 0.95);` without dark mode overrides.
3. `apps/web/src/styles/main.css:17744`:
   - `.appointment-card` uses `background: rgba(255, 255, 255, 0.85);` creating a milky white haze in dark themes.
4. `apps/web/src/styles/main.css:17680, 17686`:
   - `.chip-suggestion.priority-urgent` (`background: #fee2e2; color: #991b1b;`) and `.chip-suggestion.priority-important` (`background: #fef3c7; color: #92400e;`) use hardcoded light hex colors.

---

## 2. Logic Chain

1. **Tokens & Theming**:
   - `check-css-tokens.mjs` verifies that every CSS variable in `var(--x)` has a declaration. However, `--violet-50` and `--violet-200` are undeclared, and `.chip-assistant` falls back to light hex colors (`#f5f3ff`, `#ddd6fe`), violating theme integrity. Declaring `--violet-50`, `--violet-200`, `--violet-700` in `token-aliases.css` across all 3 themes resolves this debt.
2. **Design Clichés**:
   - Unnecessary pulsing keyframe animations (`@keyframes dntPulse`, `ai-pulse`, `pulse-soft`, `sa-pulse-border`, `pulse-record`) cause CPU wakeups and visual noise in clinical workflows. Replacing infinite pulsing with static status indicators or CSS transitions (`transition: var(--transition-fast)`) eliminates fatigue and aligns with DENTE clean ergonomics.
   - Heavy glow effects (`box-shadow: 0 0 20px`, `text-shadow: 0 0 10px`) create neon blur that lowers text legibility and contradicts medical software standards. Replacing with tokenized elevation shadows (`var(--shadow-1)`, `var(--shadow-2)`) ensures crisp contrast.
3. **Theme Consistency**:
   - Omitting `[data-theme="night"]` in `main.css:17986-18081` causes night theme to inherit light theme styles, producing broken background/text color combinations. Adding `[data-theme="night"]` to each block restores 100% theme parity.
4. **Touch Targets (A11y & Mobile Ergonomics)**:
   - Specificity rules in CSS dictate that inline styles (`style={{ minHeight: "32px" }}`) and higher-specificity CSS rules (e.g. `.schedule-filter-strip input[type="date"]`) override `touch-targets.css`.
   - Removing inline height caps or scoping them with CSS classes/variables ensures that on mobile screens (`max-width: 700px`) and touch devices (`pointer: coarse`), all interactive targets expand fluidly to >= 44x44px.
5. **Container & Component Standardization**:
   - Standardizing container border-radii to `14px` (from disparate 12px, 16px, 22px values) establishes visual cohesion across all 11 views.

---

## 3. Caveats
- **DICOM Viewport Specifics**: `Cornerstone3DViewer.tsx` and `PanoramicRendererWindow.tsx` contain canvas rendering contexts where black background (`#000`) is clinically required for radiologic inspection. Only surrounding toolbars and control buttons should be themed.
- **Microphone and Recording State**: Microphone buttons need clear active/recording cues, but these should rely on solid color transitions (e.g., emerald -> ruby) rather than infinite pulsating scale animations.

---

## 4. Conclusion & Concrete Remediation Plan

### File Modification Inventory

| Category | Target File | Line / Scope | Proposed Action |
|---|---|---|---|
| **Tokens** | `apps/web/src/styles/token-aliases.css` | 190–290 | Declare `--violet-50`, `--violet-200`, `--violet-700` across `:root`, `[data-theme="dark"]`, and `[data-theme="night"]`. |
| **Theme Parity** | `apps/web/src/styles/main.css` | 17986–18081 | Add `[data-theme="night"]` to all schedule, communications, finance, and settings dark theme blocks. |
| **Clichés** | `apps/web/src/styles/main.css` | 17680–17689 | Replace hardcoded `#fee2e2` / `#fef3c7` with `var(--bad-bg)` / `var(--bad-fg)` and `var(--warn-bg)` / `var(--warn-fg)`. |
| **Clichés** | `apps/web/src/styles/main.css` | 17744, 17014 | Replace `rgba(255, 255, 255, 0.85-0.95)` with `var(--paper)` / `var(--glass-panel)` and `var(--elev)`. |
| **Clichés** | `apps/web/src/styles/visit-diary-043.css` | 945 | Replace `box-shadow: 0 0 20px 10px rgba(239, 68, 68, 0.55)` with clean border indicator. |
| **Clichés** | `apps/web/src/styles/auth.css` | 28, 43, 247, 358, 506 | Remove `pulse-glow` animation and `box-shadow: 0 0 ...` neon glows; use `var(--shadow-2)` and `var(--teal-soft)`. |
| **Clichés** | `apps/web/src/styles/premium.css` | 243–247 | Remove `text-shadow: 0 0 10px` and `box-shadow: var(--teal-glow)`; standardize `.nav-item.active`. |
| **Clichés** | `apps/web/src/styles/shadow-analyst.css` | 273–284, 486 | Remove `sa-pulse-border` keyframes; remove `box-shadow: 0 0 10px`. |
| **Touch Targets** | `apps/web/src/components/schedule/ScheduleFilterStrip.tsx` | 90–220 | Remove inline `height: "32px"` / `minHeight: "36px"`; let CSS classes control sizing with 44px mobile minimum. |
| **Touch Targets** | `apps/web/src/components/schedule/AppointmentCard.tsx` | 312, 327, 344 | Remove inline `minHeight: "36px"` from action buttons. |
| **Touch Targets** | `apps/web/src/components/schedule/WaitlistMatchesBlock.tsx` | 368, 392 | Remove inline `minHeight: 28`. |
| **Touch Targets** | `apps/web/src/ShiftView.tsx` | 656 | Remove inline `minHeight: "30px"` from analytics toggle button. |
| **Touch Targets** | `apps/web/src/PatientsView.tsx` | 132 | Update `quickCreateInputStyle.minHeight` from `"2.5rem"` (40px) to `"44px"`. |
| **Touch Targets** | `apps/web/src/ImagingView.tsx` | 1248 | Remove inline `minHeight: "32px"` from template button. |
| **Touch Targets** | `apps/web/src/components/SmartMicrophoneButton.tsx` | 125–126 | Update `minWidth`/`minHeight` from `36px` to `44px` on mobile media/coarse pointer. |
| **Touch Targets** | `apps/web/src/components/settings/InsuranceContractsPanel.tsx` | 361, 381 | Update button `width`/`height` from 34px to 44px. |
| **Touch Targets** | `apps/web/src/styles/touch-targets.css` | 80–125 | Add `.dnt-actions__control`, `.schedule-day-step-prev`, `.schedule-day-step-next`, `.schedule-filter-strip input[type="date"]`. |
| **Hardcoded UI** | `apps/web/src/components/LabOrdersPanel.tsx` | 231–616 | Remove inline dark hex styles (`#f4f4f5`, `#18181b`, `#a1a1aa`, `#71717a`) and rely on `LabOrdersPanel.css` classes. |

---

## 5. Verification Method

### Automated Programmatic Gates
1. **CSS Token & Fallback Debt Verification**:
   ```bash
   node scripts/check-css-tokens.mjs
   ```
   *Expected Output*: Exit code `0`, `0 unresolved variables`, `0 light fallback violations`.
2. **Theme Contrast Guard Test**:
   ```bash
   node --test apps/web/src/tests/themeContrastGuard.test.ts
   ```
   *Expected Output*: Exit code `0`, all 14 tests passing.
3. **Theme Token Specificity Test**:
   ```bash
   node --test apps/web/src/tests/themeTokenSpecificity.test.ts
   ```
   *Expected Output*: Exit code `0`, all tests passing.
4. **Encoding Integrity Gate**:
   ```bash
   node scripts/check-encoding.mjs
   ```
   *Expected Output*: Exit code `0`, 0 mojibake errors.
5. **TypeScript Compilation Gate**:
   ```bash
   npm run typecheck -w @dental/web
   ```
   *Expected Output*: Exit code `0`, 0 compiler errors.

### Invalidation Conditions
- Any CSS variable in `var()` resolves to undefined in any theme.
- Any mobile interactive element renders with height or width < 44px on `max-width: 700px` or `(pointer: coarse)`.
- Any component renders a bright white background (`#ffffff` or un-themed `bg-white`) when `data-theme="dark"` or `data-theme="night"` is active.
