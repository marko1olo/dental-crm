# Handoff Report — Explorer 1: Schedule View & Booking Flow Hierarchy Audit (R1)

## 1. Observation
1. **ScheduleView.tsx Redundant Nested Wrapper Divs (Lines 868–890)**:
   - `ScheduleView.tsx:869` wraps `<DayConfirmationsPanel />` in `<div className="my-4 p-4 bg-[var(--paper)] text-[var(--ink)] rounded-xl border border-[var(--line)] shadow-xl transition-colors">`.
   - `ScheduleView.tsx:874` wraps `<FreedSlotsPanel />` in `<div className="my-4 p-4 bg-[var(--paper)] text-[var(--ink)] rounded-xl border border-[var(--line)] shadow-xl transition-colors">`.
   - `ScheduleView.tsx:879` wraps `<ScheduleClipboardPanel />` in `<div className="my-4 p-4 bg-[var(--paper)] text-[var(--ink)] rounded-xl border border-[var(--line)] shadow-xl transition-colors">`.
   - `ScheduleClipboardPanel.tsx:280-292` defines `style={{ position: "fixed", bottom: "min(24px, 16px)", right: "min(24px, 16px)", width: "min(380px, calc(100vw - 32px))", ... }}`.
   - Result: In normal document flow, `ScheduleView.tsx:879` renders a **phantom ghost box** of 80px+ height with borders, shadows, and padding containing no visual elements.
   - Both `DayConfirmationsPanel` (`DayConfirmationsPanel.tsx:261`) and `FreedSlotsPanel` (`FreedSlotsPanel.tsx:193`) internally declare `<section className="panel ops-panel">` which already applies `.panel` (`styles/main.css:14416: border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-premium); background: var(--paper)`), producing 2 layers of duplicate card borders.

2. **WaitlistMatchesBlock & FreedSlotsPanel 5-Layer Nesting**:
   - `ScheduleView.tsx:846` -> `<div className="panel schedule-panel">` (Layer 1).
   - `ScheduleView.tsx:874` -> `<div className="... border ...">` (Layer 2).
   - `FreedSlotsPanel.tsx:193` -> `<section className="panel ops-panel">` (Layer 3).
   - `FreedSlotsPanel.tsx:366` -> `<div style={{ marginTop: 8 }} data-testid="freed-slot-full-matches">` (Layer 4).
   - `WaitlistMatchesBlock.tsx:310-321` -> `<li key={match.entryId} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px", background: "var(--paper-soft)" }}>` (Layer 5).

3. **UrgentScheduleRequestsWidget Empty Dashed Bounding Box (Lines 101–107)**:
   - `UrgentScheduleRequestsWidget.tsx:103`:
     ```tsx
     <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 text-xs text-slate-500 dark:text-slate-400 text-center">
         Срочных обращений нет. Окна резерва готовы к записи.
     </div>
     ```
   - Renders a permanent dashed bounding box at the bottom of the schedule grid during normal resting state (0 requests).

4. **Phantom Elements & Hardcoded Slate Classes in AppointmentCard.tsx**:
   - `AppointmentCard.tsx:168`: Dead hidden `<p style={{ display: "none" }}>{appointment.reason}</p>`.
   - `AppointmentCard.tsx:290-300`: Unnecessary card border wrapper around `WaitlistMatchesBlock compact`: `<div style={{ marginTop: 4, padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--paper-soft)" }} data-testid="appointment-card-waitlist-matches">`.
   - `AppointmentCard.tsx:182, 303`: Hardcoded `border-slate-200 dark:border-slate-800` instead of semantic `var(--line)`.

5. **Voice Intake & Manual Booking Dual-Card Stacking in NewAppointmentForm.tsx**:
   - `NewAppointmentForm.tsx:247`: `<div className="smart-ai-booking" style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px", ... }}>`.
   - `NewAppointmentForm.tsx:620`: `{showCreateForm && <div className="appointment-editor appointment-manual-form mb-6 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">}`.
   - When opened, two heavy card boxes with independent borders are stacked vertically.
   - Hardcoded `slate` colors on input elements (line 293: `border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800`).

---

## 2. Logic Chain
1. From Observation 1: `ScheduleClipboardPanel` renders with `position: fixed`. Wrapping it inside an inline `div` with margin, padding, border, and shadow in `ScheduleView` places a static empty container in the document flow. Removing this wrapper restores correct flow with zero layout artifacts.
2. From Observations 1 & 2: `DayConfirmationsPanel` and `FreedSlotsPanel` already have root `.panel ops-panel` containers. Removing the redundant wrapper divs in `ScheduleView` flattens the hierarchy by 1 level immediately.
3. From Observation 2: In `WaitlistMatchesBlock`, individual candidate rows inside `compact` mode render as full cards with borders inside a table cell that is already inside a panel. Converting them to subtle divider rows (`borderBottom: 1px solid var(--line-soft)`) or borderless list items on `var(--paper-soft)` eliminates the 5th layer of nesting.
4. From Observation 3: An empty widget returning a dashed box creates visual clutter on every clean schedule day. Returning `null` when `requests.length === 0` cleans the bottom of the schedule grid.
5. From Observation 4: The hidden `<p style={{ display: "none" }}>` in `AppointmentCard.tsx:168` is dead code. The border wrapper at line 290 is redundant because `WaitlistMatchesBlock compact` provides its own structured layout.
6. From Observation 5: In `NewAppointmentForm`, integrating the smart voice input bar and the manual form under a unified surface container with CSS tokens (`var(--line)`, `var(--paper-soft)`, `var(--ink)`) eliminates dual-card stacking.

---

## 3. Caveats
- `DayConfirmationsPanel.tsx` is tested by `apps/web/src/tests/operationsPanelsStyling.test.ts` line 204 (`assert.ok(source.includes('className="panel ops-panel"'))`). Therefore, the class `className="panel ops-panel"` on `DayConfirmationsPanel`'s root `<section>` MUST be preserved to satisfy tests, while removing the outer wrapper in `ScheduleView.tsx` safely flattens the DOM.
- `WaitlistDrawer.tsx` uses `createPortal(..., document.body)` which isolates it from parent CSS transforms. Drawer contents must remain responsive with >= 44px mobile touch targets.

---

## 4. Conclusion
The schedule view and booking flow can be completely flattened from 3–5 layers down to clean 1–2 layer surfaces by executing 5 targeted refactoring steps:
1. **`ScheduleView.tsx:868-890`**: Remove the 3 redundant wrapper divs around `DayConfirmationsPanel`, `FreedSlotsPanel`, and `ScheduleClipboardPanel`.
2. **`UrgentScheduleRequestsWidget.tsx:101-107`**: Return `null` when `requests.length === 0` to eliminate the phantom dashed bounding box.
3. **`NewAppointmentForm.tsx:247-620`**: Unify voice intake strip and manual form onto single-surface styling with CSS tokens (`var(--line)`, `var(--paper-soft)`).
4. **`AppointmentCard.tsx:168 & 290`**: Delete the phantom hidden `<p>` element and remove the extra border wrapper around `WaitlistMatchesBlock`.
5. **`WaitlistMatchesBlock.tsx:310-321`**: Convert candidate card items in compact mode to lightweight list rows.

---

## 5. Verification Method
1. **Unit Test Verification**:
   ```powershell
   node --import tsx --import ./testCssStub.mjs --test "src/components/schedule/**/*.test.ts" "src/components/schedule/**/*.test.tsx" "src/tests/*schedule*.test.ts" "src/tests/*confirmations*.test.ts" "src/tests/operationsPanelsStyling.test.ts"
   ```
   *Expected*: All 43+ schedule tests pass cleanly with 0 failures.
2. **TypeScript Gate**:
   ```powershell
   npm run typecheck
   ```
   *Expected*: 0 TypeScript diagnostics across `@dental/web`.
3. **CSS Token & Encoding Gate**:
   ```powershell
   node scripts/check-css-tokens.mjs
   node scripts/check-encoding.mjs
   ```
   *Expected*: 0 unresolved tokens and 0 encoding defects.
