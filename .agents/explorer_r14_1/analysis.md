# Comprehensive Hierarchy & Container Audit: Schedule View & Booking Flow (R1)

## Executive Summary
This audit inspects `ScheduleView.tsx` and its 10 related booking and schedule components (`DayConfirmationsPanel.tsx`, `FreedSlotsPanel.tsx`, `WaitlistMatchesBlock.tsx`, `NewAppointmentForm.tsx`, `ScheduleClipboardPanel.tsx`, `UrgentScheduleRequestsWidget.tsx`, `ScheduleFilterStrip.tsx`, `ScheduleSubNavTabs.tsx`, `AppointmentCard.tsx`, `WaitlistDrawer.tsx`) to identify all occurrences of 3+ layer nested bordered cards ("matryoshka" boxes), phantom empty containers, redundant dashed outlines, and CSS token inconsistencies.

A precise, actionable refactoring plan with exact line numbers and proposed JSX/CSS structures is established to flatten the schedule hierarchy into clean, purposeful single-level surfaces on the base canvas.

---

## 1. Inventory of Over-Nested Card Containers (3–5 Layers)

### Nesting Case 1: Morning Confirmations Panel (4 Layers)
- **Layer 1 (Outer Workspace Canvas)**: `apps/web/src/ScheduleView.tsx:846`:
  ```tsx
  <div className="panel schedule-panel" id="schedule" data-testid="schedule-view">
  ```
  Applies `.panel` styles (`styles/main.css:14416`): `background: var(--paper); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-premium);`.
- **Layer 2 (Redundant Outer Card Wrapper)**: `apps/web/src/ScheduleView.tsx:869`:
  ```tsx
  <div className="my-4 p-4 bg-[var(--paper)] text-[var(--ink)] rounded-xl border border-[var(--line)] shadow-xl transition-colors">
      <DayConfirmationsPanel />
  </div>
  ```
- **Layer 3 (Inner Panel Element)**: `apps/web/src/components/schedule/DayConfirmationsPanel.tsx:261`:
  ```tsx
  <section className="panel ops-panel" data-testid="day-confirmations-panel">
  ```
  Applies `.panel` styles a second time (second border, second background, second shadow).
- **Layer 4 (Component Child Cards & Metrics)**: `DayConfirmationsPanel.tsx:320-355` & `387-488`:
  - `<ul className="ops-metrics">` -> `<li className="ops-metric">` (has `border: 1px solid var(--line); border-radius: 8px; background: var(--paper-soft)`).
  - Responsive table rows (`@media (max-width: 720px)` in `styles/dente-operations.css`): each `<tr>` is rendered as an independent card with `border: 1px solid var(--line); border-radius: 10px; background: var(--paper-soft)`.
- **Total Depth**: **4 nested border/shadow card levels**.

---

### Nesting Case 2: Freed Slots Panel & Waitlist Matches (5 Layers)
- **Layer 1**: `ScheduleView.tsx:846`: `<div className="panel schedule-panel">` (border, rounded-16, shadow).
- **Layer 2**: `ScheduleView.tsx:874`:
  ```tsx
  <div className="my-4 p-4 bg-[var(--paper)] text-[var(--ink)] rounded-xl border border-[var(--line)] shadow-xl transition-colors">
      <FreedSlotsPanel />
  </div>
  ```
- **Layer 3**: `FreedSlotsPanel.tsx:193`: `<section className="panel ops-panel" data-testid="freed-slots-panel">` (nested `.panel` border/shadow).
- **Layer 4**: `FreedSlotsPanel.tsx:304` & `369`:
  ```tsx
  <div style={{ marginTop: 8 }} data-testid="freed-slot-full-matches">
      <WaitlistMatchesBlock appointmentId={slot.appointmentId} compact />
  </div>
  ```
- **Layer 5**: `WaitlistMatchesBlock.tsx:310-321`:
  ```tsx
  <li key={match.entryId} data-testid={`waitlist-match-row-${match.entryId}`}
      style={{
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "8px 10px",
          background: "var(--paper-soft)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
      }}>
  ```
  *(Note: If `WaitlistMatchesBlock` is rendered with `compact={false}`, line 187 adds another `className="panel ops-panel"`!)*
- **Total Depth**: **5 nested border/card levels**.

---

### Nesting Case 3: Appointment Card with Freed Slot Matches (4–5 Layers)
- **Layer 1**: `ScheduleView.tsx:846`: `<div className="panel schedule-panel">`
- **Layer 2**: `AppointmentCard.tsx:172`:
  ```tsx
  <article className="appointment-card mode-fit-card glass-panel rounded-xl p-4 mb-3 shadow-sm"
      style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)" }}>
  ```
- **Layer 3 (Redundant Wrapper Box)**: `AppointmentCard.tsx:290-300`:
  ```tsx
  <div style={{
      marginTop: 4,
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid var(--line)",
      background: "var(--paper-soft)",
  }} data-testid="appointment-card-waitlist-matches">
      <WaitlistMatchesBlock appointmentId={appointment.id} compact />
  </div>
  ```
- **Layer 4**: `WaitlistMatchesBlock.tsx:310`: `<li style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px", background: "var(--paper-soft)" }}>`
- **Total Depth**: **4–5 nested border boxes inside a single timeline slot**.

---

### Nesting Case 4: Appointment Card Editor (4 Layers)
- **Layer 1**: `ScheduleView.tsx:846`: `<div className="panel schedule-panel">`
- **Layer 2**: `AppointmentCard.tsx:172`: `<article className="appointment-card ... rounded-xl p-4 ... border border-[var(--line)]">`
- **Layer 3**: `AppointmentCard.tsx:350`: `<section className="appointment-editor form-span-2" id={appointmentEditorId}>` (applies `.appointment-editor` border/background/radius).
- **Layer 4**: Inside `appointment-editor`:
  - `AppointmentCard.tsx:620`: Status blocker notice (`bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900/60`).
  - `AppointmentCard.tsx:733`: Collision notice (`schedule-create-missing schedule-save-missing` with border/background).
  - `AppointmentCard.tsx:744`: Missing steps notice (`schedule-create-missing schedule-save-missing` with border/background).
- **Total Depth**: **4 nested bordered boxes**.

---

## 2. Inventory of Phantom Containers, Empty Wrappers & Dashed Boxes

| Component | Location | Issue Description | Visual / DOM Defect |
|---|---|---|---|
| `ScheduleView.tsx` | Lines 878–889 | `<div className="my-4 p-4 bg-[var(--paper)] ... rounded-xl border border-[var(--line)] shadow-xl">` wraps `<ScheduleClipboardPanel />`. | `ScheduleClipboardPanel` has internal `style={{ position: "fixed", bottom: ..., right: ... }}`. The wrapper `div` renders in normal document flow as a **completely empty ghost container** (80px+ height, borders, shadow, padding) while its child is fixed at screen bottom. |
| `ScheduleView.tsx` | Lines 868–876 | `<div className="my-4 p-4 bg-[var(--paper)] ... rounded-xl border border-[var(--line)] shadow-xl">` wraps `<DayConfirmationsPanel />` and `<FreedSlotsPanel />`. | Redundant outer bounding box with duplicate margin (`my-4`), duplicate padding (`p-4` around `p-6`), and duplicate border/shadow. |
| `UrgentScheduleRequestsWidget.tsx` | Lines 101–107 | `if (requests.length === 0)` returns `<div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 text-xs text-slate-500 text-center">Срочных обращений нет...</div>` | Permanent empty dashed box at the bottom of the schedule grid during normal resting state (0 requests). Generates visual clutter. |
| `AppointmentCard.tsx` | Line 168 | `<p style={{ display: "none" }}>{appointment.reason}</p>` | Dead phantom hidden `<p>` element rendered into the DOM. |
| `AppointmentCard.tsx` | Lines 290–300 | `<div style={{ marginTop: 4, padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--paper-soft)" }} data-testid="appointment-card-waitlist-matches">` | Unnecessary border wrapper around `WaitlistMatchesBlock compact`. |
| `NewAppointmentForm.tsx` | Lines 247 & 620 | `<div className="smart-ai-booking">` (card 1) + `<div className="appointment-editor appointment-manual-form">` (card 2) | When manual form is expanded, two full bordered cards are stacked on top of each other instead of expanding on a single unified surface. |
| `ScheduleFilterStrip.tsx` | Lines 61 & 71 | `borderBottom: "1px solid var(--paper-soft)"` + `borderRight: "1px solid var(--line)"` | Creates disjointed vertical divider lines that fragment when filter chips wrap on narrower screens. |

---

## 3. CSS Classes & Token Inconsistencies Audit

1. **Non-Token Tailwind Slate Colors in Schedule Components**:
   - `NewAppointmentForm.tsx:293`: `border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white` -> Hardcoded Tailwind slate.
   - `NewAppointmentForm.tsx:620`: `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800` -> Hardcoded slate.
   - `NewAppointmentForm.tsx:675, 739`: `border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800` -> Hardcoded slate.
   - `AppointmentCard.tsx:182, 303`: `border-slate-200 dark:border-slate-800` -> Hardcoded slate.
   - `AppointmentCard.tsx:425, 483`: `border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white` -> Hardcoded slate.
   - `UrgentScheduleRequestsWidget.tsx:80, 88, 103, 117`: `border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900` -> Hardcoded slate.

2. **Semantic Token Purity Target**:
   - Backgrounds: `var(--paper)` (base cards), `var(--paper-soft)` / `var(--surface-muted)` (nested elements/inputs), `var(--surface)` (floating modals/panels).
   - Borders: `var(--line)` (1px solid standard border), `var(--line-strong)` (active/contrast line).
   - Text: `var(--ink)` (primary text), `var(--muted)` (secondary labels/hints).
   - Accents: `var(--teal-dark)`, `var(--teal)`, `var(--on-teal)`.

---

## 4. Concrete Flattening Refactoring Plan

### Step 1: `apps/web/src/ScheduleView.tsx` (Lines 868–890)
**Before**:
```tsx
{showConfirmationsPanel && (
	<div className="my-4 p-4 bg-[var(--paper)] text-[var(--ink)] rounded-xl border border-[var(--line)] shadow-xl transition-colors">
		<DayConfirmationsPanel />
	</div>
)}
{showFreedSlotsPanel && (
	<div className="my-4 p-4 bg-[var(--paper)] text-[var(--ink)] rounded-xl border border-[var(--line)] shadow-xl transition-colors">
		<FreedSlotsPanel />
	</div>
)}
{showClipboardPanel && (
	<div className="my-4 p-4 bg-[var(--paper)] text-[var(--ink)] rounded-xl border border-[var(--line)] shadow-xl transition-colors">
		<ScheduleClipboardPanel
			reloadToken={clipboardReloadToken}
			onPasted={() => {
				if (typeof props.loadDashboard === "function") {
					void props.loadDashboard();
				}
			}}
		/>
	</div>
)}
```

**Proposed Replacement**:
```tsx
{showConfirmationsPanel && <DayConfirmationsPanel />}
{showFreedSlotsPanel && <FreedSlotsPanel />}
{showClipboardPanel && (
	<ScheduleClipboardPanel
		reloadToken={clipboardReloadToken}
		onPasted={() => {
			if (typeof props.loadDashboard === "function") {
				void props.loadDashboard();
			}
		}}
	/>
)}
```
*Rationale*:
- Eliminates the 80px phantom ghost box when `showClipboardPanel` is active (since `ScheduleClipboardPanel` has `position: fixed`).
- Eliminates the duplicate outer border, margin, padding, and shadow around `DayConfirmationsPanel` and `FreedSlotsPanel`.

---

### Step 2: `apps/web/src/components/schedule/UrgentScheduleRequestsWidget.tsx` (Lines 101–107)
**Before**:
```tsx
if (requests.length === 0) {
	return (
		<div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 text-xs text-slate-500 dark:text-slate-400 text-center">
			Срочных обращений нет. Окна резерва готовы к записи.
		</div>
	);
}
```

**Proposed Replacement**:
```tsx
if (requests.length === 0) {
	return null;
}
```
*Rationale*:
- Eliminates the unnecessary dashed bounding box when there are 0 urgent requests.
- Matches `FreedSlotsPanel.tsx:189` philosophy: empty state is silent, zero screen pollution.

---

### Step 3: `apps/web/src/components/schedule/NewAppointmentForm.tsx` (Lines 247–260 & 620)
**Before**:
```tsx
<div className="smart-ai-booking" style={{
	background: "var(--paper)",
	border: "1px solid var(--line)",
	borderRadius: "14px",
	padding: "16px",
	marginBottom: "12px",
	display: "flex",
	flexDirection: "column",
	gap: "12px",
	boxShadow: "var(--shadow-1)",
	color: "var(--ink)",
}}>
	...
</div>
{showCreateForm && (
	<div className="appointment-editor appointment-manual-form mb-6 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
		...
	</div>
)}
```

**Proposed Replacement**:
Integrate into a single surface container (`<div className="appointment-create-card ...">` or keep `smart-ai-booking` clean and let `appointment-manual-form` expand seamlessly inside/alongside with unified theme classes `bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] rounded-xl`):
- Replace `border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white` with `border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]`.
- Eliminate double-bordered stacking by removing extraneous border/margins when both are shown.

---

### Step 4: `apps/web/src/components/schedule/AppointmentCard.tsx` (Lines 168 & 290–301)
**Before**:
```tsx
<p style={{ display: "none" }}>{appointment.reason}</p>
...
{(appointment?.status === "cancelled" ||
	appointment?.status === "no_show") &&
appointment?.startsAt &&
new Date(appointment.startsAt).getTime() > Date.now() ? (
	<div
		style={{
			marginTop: 4,
			padding: "8px 10px",
			borderRadius: 10,
			border: "1px solid var(--line)",
			background: "var(--paper-soft)",
		}}
		data-testid="appointment-card-waitlist-matches"
	>
		<WaitlistMatchesBlock appointmentId={appointment.id} compact />
	</div>
) : null}
```

**Proposed Replacement**:
- Remove `<p style={{ display: "none" }}>{appointment.reason}</p>`.
- Remove the outer `<div style={{ border: "1px solid var(--line)", ... }}>` wrapper and render `<div className="mt-1" data-testid="appointment-card-waitlist-matches"><WaitlistMatchesBlock appointmentId={appointment.id} compact /></div>`.
- Replace `border-slate-200 dark:border-slate-800` in header/footer dividers with `border-[var(--line)]`.

---

### Step 5: `apps/web/src/components/schedule/WaitlistMatchesBlock.tsx` (Lines 310–321)
**Proposed Replacement**:
- For `compact` mode, flatten each candidate row from a heavy `border: 1px solid var(--line)` card into a lightweight list row (`padding: "6px 0", borderBottom: "1px solid var(--line-soft)"` or borderless row on `var(--paper-soft)`), keeping touch targets >= 44px on buttons.
