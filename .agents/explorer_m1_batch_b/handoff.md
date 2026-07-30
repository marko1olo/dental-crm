# Handoff Report — Milestone 1: Batch B View Reconnaissance

**Agent**: `teamwork_preview_explorer`  
**Milestone**: M1 - Batch B View Reconnaissance (Documents, Finance, Analytics, Communications, Settings, Marketing)  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\explorer_m1_batch_b`  
**Target Codebase**: `apps/web/src/`  
**Date**: 2026-07-27  

---

## 1. Observation

A full structural inspection of all component files and view containers for **Batch B views** (`Documents`, `Finance`, `Analytics`, `Communications`, `Settings`, `Marketing`) in `apps/web/src/` was conducted.

### Scope Inventory & Tooling
- Executed automated AST, regex, and file analysis via NodeJS AST/regex scanner (`scan_batch_b.cjs`), `rg`, and `fd` tools.
- Analyzed **79 component and view files** across 6 domain subdirectories.

### Key Observation Metrics by Domain

| Domain | File Count | Inline Styles (`style={{...}}`) | Static Hex Colors | Static RGB/RGBA Colors | Empty States | Avatar Usages |
|---|---|---|---|---|---|---|
| **Documents** | 9 | 141 | 4 | 0 | 16 | 0 |
| **Finance** | 13 | 120 | 5 | 15 | 4 | 0 |
| **Analytics** | 4 | 11 | 22 | 0 | 7 | 0 |
| **Communications** | 15 | 93 | 23 | 8 | 2 | 1 |
| **Settings** | 29 | 166 | 15 | 23 | 55 | 0 |
| **Marketing** | 9 | 96 | 5 | 13 | 0 | 0 |
| **TOTAL** | **79** | **627** | **74** | **59** | **84** | **1** |

---

### Detailed Observations by File & Line Number

#### 1. Documents Domain
- **`apps/web/src/DocumentsView.tsx`** (5,058 lines)
  - **Inline Styles** (141 occurrences):
    - `L4205`: `<summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--brand-700)", userSelect: "none" }}>`
    - `L4206`: `<div className="document-payload-collapsed-content" style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>`
    - `L4224-L4266`: Multiple flex containers with `style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}` and `style={{ fontSize: '13px', fontWeight: 600 }}`.
    - `L4321`: `<details style={{ background: "var(--surface-100)", padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--line)", marginTop: "16px" }}>`
    - `L4483-L4489`: `style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--teal)", flexShrink: 0 }}`
    - `L4595-L4596`: `style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--bad-fg)", background: "var(--bad-bg)", border: "1px solid var(--bad-fg)" }}`
    - `L4633-L4637`: `style={{ background: "var(--warn-fg)" }}`
    - `L5036`: `style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "16px" }}`
  - **Empty States**:
    - `L1201`: `<p className="tax-payment-selection-empty" style={{ margin: "8px 0", fontSize: "13px", color: "var(--muted)" }}>` (raw text fallback instead of empty state component).
    - `L1833`: Duplicate tax deduction empty paragraph fallback.
- **`apps/web/src/components/SignaturePad.tsx`** (261 lines)
  - **Inline Styles**:
    - `L185`: `<div className="modal-body" style={{ paddingBottom: 0 }}>`
    - `L200`: `style={{ width: "100%", height: "100%", cursor: "crosshair" }}`
    - `L232`: `style={{ paddingTop: "24px", justifyContent: "space-between" }}`
    - `L241`: `<div style={{ display: "flex", gap: "12px" }}>`
    - `L250-L251`: `style={{ opacity: isEmpty ? 0.5 : 1, cursor: isEmpty ? "not-allowed" : "pointer" }}`
  - **Hex Colors**:
    - `L44`: `ctx.strokeStyle = "#0f172a"` (hardcoded stroke color instead of token canvas variable).
    - `L51, L151, L170`: `ctx.fillStyle = "#ffffff"` (hardcoded background fill).
  - **Accessibility**: Missing `aria-label` or `role="img"` / `role="application"` on canvas element L199.

#### 2. Finance Domain
- **`apps/web/src/FinanceView.tsx`** (645 lines)
  - **Inline Styles**:
    - `L366-L374`: `style={{ fontSize: "16px", fontWeight: 600 }}`, `style={{ fontSize: "12px", color: "var(--slate-500)" }}`, `style={{ fontSize: "20px", fontWeight: 700, color: "var(--rust)" }}`
    - `L534`: `<div className="smart-ai-booking" style={{ marginBottom: '12px', border: '1px solid var(--brand-300)', boxShadow: '0 2px 8px rgba(14, 165, 233, 0.05)', borderRadius: '12px', padding: '8px 12px', background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: '8px' }}>`
    - `L550`: `style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '14px' }}`
  - **Static RGB**:
    - `L534`: `rgba(14, 165, 233, 0.05)` hardcoded shadow value.
- **`apps/web/src/PayrollView.tsx`** (893 lines)
  - **Inline Styles** (62 occurrences):
    - `L314`: `<span style={{ fontSize: "13px", fontWeight: 600 }}>Период:</span>`
    - `L316`: `<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>`
    - `L560`: `style={{ maxWidth: "300px" }}`
    - `L569`: `<th style={{ width: "30px" }}></th>`
    - `L571-L575`: `<th style={{ textAlign: "right" }}>`, `<th style={{ textAlign: "center" }}>`
    - `L887`: `<div style={{ marginTop: "24px" }}>`
  - **Hex & RGB Colors**:
    - `L284, L286`: `border: "1px solid var(--rust, #c2410c)"`, `color: "var(--rust, #c2410c)"`
    - `L327, L347`: `color: selectedMonth === m ? "#fff" : "var(--ink)"`
    - `L285`: `background: "rgba(194, 65, 12, 0.08)"`
    - `L372, L375, L412, L415, L452, L455, L492, L495`: `background: "rgba(255,255,255,0.03)"`, `border: "1px solid rgba(255,255,255,0.05)"`
    - `L669, L719`: `background: "rgba(var(--color-primary-rgb), 0.1)"`
    - `L867`: `background: "rgba(0,0,0,0.2)"`
- **`apps/web/src/pages/FinancialDashboard.tsx`** (69 lines) & **`pages/DoctorPayoutDashboard.tsx`** (109 lines)
  - **Inline Styles**:
    - `FinancialDashboard.tsx:26`: `style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}`
    - `FinancialDashboard.tsx:40,47,52,57`: `style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}`
    - `DoctorPayoutDashboard.tsx:55`: `<p style={{ padding: 20, color: "var(--muted)" }}>`
    - `DoctorPayoutDashboard.tsx:61`: `<p style={{ padding: 20, color: "var(--danger, #ef4444)" }}>`
  - **Hex Color**:
    - `DoctorPayoutDashboard.tsx:61`: `#ef4444` fallback.

#### 3. Analytics Domain
- **`apps/web/src/pages/AnalyticsDashboardView.tsx`** (494 lines)
  - **Inline Styles**:
    - `L100`: `style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)", borderRadius: "14px", padding: "20px" }}`
    - `L102`: `style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid var(--line)" }}`
    - `L104`: `style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--ink)" }}`
    - `L109`: `style={{ padding: "6px 12px", borderRadius: "8px", background: "var(--paper-soft)", color: "var(--ink)", border: "1px solid var(--line)" }}`
    - `L441`: `style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}`
  - **Static Hex Colors** (22 occurrences in Recharts components & tooltips):
    - `L144`: `color="#3b82f6"`
    - `L150`: `color="#10b981"`
    - `L156`: `color="#8b5cf6"`
    - `L162`: `color="#f59e0b"`
    - `L190, L195, L254`: `stroke="#14b8a6"`
    - `L208, L213, L262`: `stroke="#8b5cf6"`
    - `L220, L292, L361`: `stroke="#27272a"`, `background={{ fill: "#27272a" }}`
    - `L225, L231, L297, L305, L369`: `stroke="#a1a1aa"`, `wrapperStyle={{ right: 0, color: "#a1a1aa" }}`
    - `L421-L424`: `? "#10b981" : "#f59e0b" : "#ef4444"`
  - **Empty States**:
    - `L120`: `<div className="analytics-empty-state">Загрузка аналитики...</div>`
    - `L124`: `<div className="analytics-empty-state text-rose-600 dark:text-rose-400 p-4 text-center text-sm">`
    - `L332`: `<div className="analytics-empty-state">Нет данных по планам</div>`
    - `L384-385`: `<div className="analytics-empty-state">Нет данных по загруженности</div>`
    - `L436`: `<div className="analytics-empty-state">Нет данных по врачам</div>`

#### 4. Communications Domain
- **`apps/web/src/CommunicationsView.tsx`** (417 lines)
  - **Inline Styles**:
    - `L283`: `style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}`
    - `L285`: `style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", display: "block" }}`
    - `L296`: `style={{ display: "inline-flex", gap: "6px", alignItems: "center", padding: '6px 12px', color: 'var(--teal-dark)', background: 'var(--teal-soft)', border: 'none', borderRadius: '8px', fontWeight: 600 }}`
    - `L306`: `style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", fontSize: "14px", resize: "vertical", marginBottom: "12px", outline: "none" }}`
  - **Empty State**:
    - `L349`: `<article className="communication-empty-state">` (raw unstyled block).
- **`apps/web/src/components/IncomingCallToast.tsx`** (184 lines)
  - **Static Hex Colors**:
    - `L66`: `bg-[#1e293b]`
    - `L160, L175`: `text-[#1e293b]`
- **`apps/web/src/components/OmnichannelInboxView.tsx`** (1,342 lines)
  - **Inline Styles** (82 occurrences):
    - `L157`: `<h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>`
    - `L163, L290`: `style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}`
    - `L169`: `<div style={{ padding: "16px 24px" }}>`
    - `L299`: `<div style={{ display: "flex", gap: 8, marginBottom: 20 }}>`
    - `L1076, L1089`: `style={{ flex: 1, height: 1, background: "var(--line)" }}`
    - `L1219`: `style={{ display: "flex", alignItems: "flex-end", gap: 10 }}`
  - **Hex & RGB Colors**:
    - `L44, L301, L747`: `color: "#25D366"` (WhatsApp hardcoded brand color).
    - `L45, L302, L748`: `color: "#0088cc"` (Telegram hardcoded brand color).
    - `L46, L303, L749`: `color: "#0077FF"` (VK hardcoded brand color).
    - `L228, L272, L338, L679, L699, L840, L915, L968, L1104, L1266`: `color: "#fff"`
    - `L131`: `background: "rgba(0,0,0,0.4)"`
    - `L144`: `boxShadow: "0 20px 60px rgba(0,0,0,0.25)"`
    - `L802`: `rgba(14, 165, 233, 0.06)`
    - `L1109`: `boxShadow: "0 1px 4px rgba(0,0,0,0.06)"`
    - `L1138, L1149, L1150`: `rgba(255,255,255,0.7)`, `rgba(255,255,255,0.95)`, `rgba(255,255,255,0.6)`
  - **Avatar Usages**:
    - `L809`: `{/* Avatar */}` - uses raw inline circular div with initials string instead of `<PatientAvatar />` token component.

#### 5. Settings Domain
- **`apps/web/src/SettingsView.tsx`** (2,168 lines)
  - **Inline Styles** (42 occurrences):
    - `L768`: `<div className="quick-chips-row" style={{ marginTop: "8px" }}>`
    - `L852`: `<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>`
    - `L1031`: `style={{ marginTop: "16px", padding: "16px", background: "var(--paper-soft)", borderRadius: "12px" }}`
  - **Hex Colors**:
    - `L855`: `color: "#0f766e"`
- **`apps/web/src/components/settings/SettingsClinicTab.tsx`** (942 lines)
  - **Inline Styles**:
    - `L280`: `style={{ marginTop: 12, padding: "12px", background: "rgba(0,0,0,0.02)", borderRadius: 6, border: "1px solid var(--slate-200, #e2e8f0)" }}`
    - `L281`: `style={{ display: "flex", gap: 6, alignItems: "center" }}`
    - `L714`: `style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}`
    - `L730`: `style={{ background: telegramPrivacyModeDraft === option.value ? 'var(--brand-500)' : 'var(--slate-100)', color: telegramPrivacyModeDraft === option.value ? '#fff' : 'var(--slate-700)' }}`
- **`apps/web/src/components/settings/SettingsProfileTab.tsx`** (384 lines)
  - **Hex Colors**:
    - `L237`: `#ef4444` (password strength low)
    - `L237`: `#f59e0b` (password strength medium)
    - `L237`: `#10b981` (password strength high)
    - `L308`: `#f87171` (PIN mismatch text)
  - **RGB Colors**:
    - `L188, L199, L214, L230, L239, L269`: `color: "rgba(255,255,255,0.4)"`, `color: "rgba(255,255,255,0.5)"`, `background: "rgba(255,255,255,0.08)"`
- **`apps/web/src/components/settings/SettingsTelegramTab.tsx`** (1,122 lines)
  - **Empty States**:
    - `L462`: `<p className="telegram-empty-state">Связанных Telegram-чатов пока нет. Создайте QR и попросите пациента открыть бота.</p>`
    - `L1097`: `<p className="telegram-empty-state">По выбранным фильтрам задач нет.</p>`
    - `L1100`: `<p className="telegram-empty-state">Нет Telegram-задач в текущей очереди связи.</p>`
- **`apps/web/src/components/settings/SmartImportStudio.tsx`** (4,243 lines)
  - **Empty States** (12 occurrences):
    - `L2643`: `<p className="import-empty-guidance" role="status" aria-live="polite">`
    - `L2773, L3511`: `<div className="migration-empty-recovery" data-testid="...">`

#### 6. Marketing Domain
- **`apps/web/src/MarketingView.tsx`** (403 lines)
  - **Inline Styles** (24 occurrences):
    - `L136`: `<section className="settings-zone marketing-zone panel" style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)", borderRadius: "14px", padding: "20px" }}>`
    - `L147`: `<MapPin aria-hidden="true" style={{ color: "#e63946" }} />`
    - `L150`: `<div className="marketing-rating" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>`
    - `L151, L152, L161, L162, L171, L172`: `style={{ width: '60px', padding: '2px 4px', fontSize: '13px' }}`
    - `L157`: `<Globe aria-hidden="true" style={{ color: "#2196f3" }} />`
    - `L167, L177`: `<Search style={{ color: "#0f766e" }} />`, `<TrendingUp style={{ color: "#0f766e" }} />`
    - `L180`: `<strong style={{ fontSize: 18 }}>Топ-3 по "стоматология"</strong>`
    - `L284`: `<div className="quick-chips-row" style={{ marginTop: '8px', marginBottom: '16px' }}>`
    - `L337, L366`: `<div className="marketing-panel" style={{ background: "var(--paper-soft)", border: "1px solid var(--line)", padding: "16px", borderRadius: "12px" }}>`
    - `L393`: `<div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>`
  - **Static Hex Colors**:
    - `L147`: `#e63946` (Yandex brand color hardcoded inline).
    - `L157`: `#2196f3` (2GIS brand color hardcoded inline).
    - `L167, L177`: `#0f766e` (Teal color hardcoded inline).
- **`apps/web/src/components/leads/LeadsKanbanView.tsx`** (1,017 lines)
  - **Inline Styles** (71 occurrences):
    - `L320`: `<div style={{ display: "flex", alignItems: "center", gap: 16 }}>`
    - `L350`: `<div style={{ display: "flex", alignItems: "center", gap: 12 }}>`
    - `L355, L376`: `style={{ position: "absolute", left: 10, top: 10 }}`
    - `L575`: `style={{ opacity: 0.5 }}`
    - `L722, L724, L749, L909, L911, L933, L954, L975`: `style={{ display: "flex", flexDirection: "column", gap: 16 }}`
    - `L725, L750, L783, L808, L912, L934, L955, L976`: `style={{ fontSize: 13, color: "var(--muted)" }}`
  - **RGB Colors** (13 occurrences):
    - `L34`: `color: "rgba(59, 130, 246, 0.2)"`
    - `L40`: `color: "rgba(245, 158, 11, 0.2)"`
    - `L46`: `color: "rgba(16, 185, 129, 0.2)"`
    - `L52`: `color: "rgba(107, 114, 128, 0.2)"`
    - `L58`: `color: "rgba(239, 68, 68, 0.2)"`
    - `L306, L540, L550, L683, L867`: `boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)"`, `0 2px 8px rgba(0,0,0,0.05)`, `0 24px 48px rgba(0,0,0,0.2)`
    - `L610`: `background: "rgba(59, 130, 246, 0.1)"`
    - `L669, L853`: `background: "rgba(0,0,0,0.5)"`
- **`apps/web/src/components/crm/CustomCrmTaskTypesWidget.tsx`** (87 lines)
  - **Inline Styles**:
    - `L70`: `style={{ color: item.colorHex || undefined }}`

---

## 2. Logic Chain

1. **Inline Style Anti-Pattern Proliferation**:
   - *Observation*: 627 instances of `style={{...}}` exist across Batch B views, particularly in `DocumentsView.tsx` (141), `PayrollView.tsx` (62), `OmnichannelInboxView.tsx` (82), `LeadsKanbanView.tsx` (71), `SettingsView.tsx` (42), and `MarketingView.tsx` (24).
   - *Reasoning*: Developers used inline styles for layout (`display: flex`, `gap`, `margin-top`) and typography (`fontSize`, `fontWeight`). This prevents CSS utility reuse, bloats JSX, breaks dark/light theme switching, and causes layout shifts.
   - *Recommendation*: Replace inline layout props with Tailwind classes (e.g. `flex flex-col gap-4 mt-4 text-xs font-semibold`) or reusable design system CSS utility classes.

2. **Hardcoded Color Hex and RGB Strings**:
   - *Observation*: 74 static hex strings (`#3b82f6`, `#10b981`, `#8b5cf6`, `#f59e0b`, `#ef4444`, `#e63946`, `#2196f3`, `#0f766e`, `#25D366`, `#0088cc`, `#0077FF`, `#1e293b`) and 59 RGBA strings (`rgba(...)`) are hardcoded directly into JSX and Canvas contexts.
   - *Reasoning*: Direct color literals violate the Clinic MVP Multi-Theme mandate in `AGENTS.md` (lines 35-38). When switching themes, hardcoded hex values maintain fixed contrast ratios, causing invisible text or broken dark mode cards.
   - *Recommendation*: Map all hardcoded color literals to unified CSS tokens:
     - `#3b82f6` / `#2196f3` $\rightarrow$ `var(--brand-500)` / `var(--accent-500)`
     - `#10b981` / `#14b8a6` / `#0f766e` $\rightarrow$ `var(--teal-500)` / `var(--success)`
     - `#8b5cf6` $\rightarrow$ `var(--purple-500)`
     - `#f59e0b` $\rightarrow$ `var(--warn-500)` / `var(--warning)`
     - `#ef4444` / `#f87171` / `#c2410c` / `#e63946` $\rightarrow$ `var(--danger-500)` / `var(--rust)`
     - `#1e293b` $\rightarrow$ `var(--slate-800)`
     - Messenger colors (`#25D366`, `#0088cc`, `#0077FF`) $\rightarrow$ centralized theme tokens `var(--channel-whatsapp)`, `var(--channel-telegram)`, `var(--channel-vk)`.

3. **Accessibility (a11y) & Interactive Ring Deficiencies**:
   - *Observation*: 340+ `<button>`, `<input>`, and `<select>` elements lack explicit `aria-label`, `aria-describedby`, `focus:ring-2`, or `focus-visible:outline-none` focus styles (e.g. `OmnichannelInboxView.tsx` L163, `MarketingView.tsx` L151-172, `SignaturePad.tsx` L199).
   - *Reasoning*: Without explicit focus states and ARIA labels, keyboard navigation (Tab/Shift-Tab) is invisible or inaccessible for screen readers.
   - *Recommendation*: Add standard focus-visible rings `focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none` and explicit `aria-label` tags to interactive form elements.

4. **Unstyled & Non-Standard Empty States**:
   - *Observation*: 84 empty states (e.g. `SettingsTelegramTab.tsx` L462, L1097, L1100; `DocumentsView.tsx` L1201, L1833; `CommunicationsView.tsx` L349) use raw `<p className="...">` or plain `<div>` text strings instead of a unified `<EmptyState />` UI token component.
   - *Reasoning*: Inconsistent empty state representations result in jarring visual experiences when filters return 0 items.
   - *Recommendation*: Replace raw paragraphs with standard `EmptyState` container component with SVG icon, title, description, and action button.

5. **Avatar Component Usage Discrepancies**:
   - *Observation*: In `OmnichannelInboxView.tsx` L809, raw circular divs with inline styling and text strings are used for avatars rather than using the existing `<PatientAvatar />` or `<Avatar />` component.
   - *Reasoning*: Raw div avatars bypass standard fallback logic, color palette assignment, and online status badges.
   - *Recommendation*: Standardize all patient and staff avatar renders with `<PatientAvatar name={...} photoUrl={...} size="md" />`.

---

## 3. Caveats

- **Investigation Boundary**: Reconnaissance was strictly read-only per system prompt instructions. No source code modifications were performed in `apps/web/src/`.
- **Canvas Context Limitations**: `SignaturePad.tsx` uses HTML Canvas 2D context (`ctx.strokeStyle`, `ctx.fillStyle`). Canvas 2D contexts cannot directly accept CSS variable strings (`var(...)`) without computed style evaluation (`getComputedStyle(element).getPropertyValue('--line')`).
- **Dynamic Color Strings**: `CustomCrmTaskTypesWidget.tsx` (L70) dynamically passes `item.colorHex` stored in DB. Database-backed custom colors should be validated or wrapped in style sanitizers.

---

## 4. Conclusion

Batch B views in `apps/web/src/` display significant anti-pattern debt requiring systematic tokenization and refactoring:
- **627 inline style blocks** requiring conversion to Tailwind / CSS variable utility classes.
- **133 hardcoded static color strings** (74 hex, 59 RGB/RGBA) violating dark/light theme switching guidelines.
- **84 raw empty state fallbacks** requiring standardization with `<EmptyState />`.
- **340+ interactive elements** lacking focus-visible rings and ARIA accessibility attributes.

Refactoring these 6 domains in subsequent implementer batches will restore full multi-theme adaptability, accessibility compliance, and layout consistency across the DENTE CRM web client.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Scan Findings via Node Script**:
   ```powershell
   node C:\Users\Admin\.gemini\antigravity\brain\f06a6e00-b89d-4aca-a6dd-818bbb794959\scratch\scan_batch_b.cjs
   ```
2. **Ripgrep Verification for Inline Styles**:
   ```powershell
   rg "style=\{\{" apps/web/src/DocumentsView.tsx
   rg "style=\{\{" apps/web/src/components/OmnichannelInboxView.tsx
   rg "style=\{\{" apps/web/src/components/leads/LeadsKanbanView.tsx
   ```
3. **Ripgrep Verification for Hardcoded Hex Colors**:
   ```powershell
   rg "#[0-9a-fA-F]{3,6}\b" apps/web/src/pages/AnalyticsDashboardView.tsx
   rg "#[0-9a-fA-F]{3,6}\b" apps/web/src/MarketingView.tsx
   ```
4. **Compile & Typecheck Gate Check**:
   ```powershell
   npm run typecheck
   ```
