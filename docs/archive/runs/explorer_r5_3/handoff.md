# Explorer 3 (R5) — Handoff Report: ScheduleView PC Dark Button Alignment Defect

## 1. Observation

### Context & Defect Description
Visual audit screenshot `PC_Dark_panel_schedule.png` (`C:\Users\Admin\.gemini\antigravity\brain\575b83b2-72f2-4da3-9f2c-18eae458f688\PC_Dark_panel_schedule.png`) showed that the `Все записи` button in the schedule control bar (`ScheduleFilterStrip`) was vertically misaligned (shifted downward) relative to the date picker group (`[ < | dd.mm.yyyy | > ]`).

### File Locations & Relevant Lines
- **Schedule Component Container**: `apps/web/src/ScheduleView.tsx:1045` renders `<ScheduleFilterStrip ... />`.
- **Toolbar Component**: `apps/web/src/components/schedule/ScheduleFilterStrip.tsx:51-220`:
  - `Line 65-136`: `<div className="schedule-date-picker-group">` containing `.schedule-day-step-prev` (`<button>`), `input[type="date"]`, and `.schedule-day-step-next` (`<button>`).
  - `Line 139-156`: `<button type="button" className={`quick-chip ${activeScheduleFilterCount === 0 ? "active" : ""}`} ...>Все записи</button>`.
- **Global Stylesheets**:
  - `apps/web/src/styles/main.css:17814-17865`: `.schedule-filter-strip`, `.schedule-filter-strip input[type="date"]`, `.schedule-filter-strip .quick-chip`, `.schedule-date-picker-group`, `.schedule-date-picker-group .secondary-button`.
  - `apps/web/src/styles/dente-redesign.css:1104`: `.quick-chip` padding rule (`padding: 5px 12px;`).
  - `apps/web/src/styles/main.css:1489`: `.secondary-button` global rule (`min-height: 42px;`).
  - `apps/web/src/styles/touch-targets.css:51,81,107`: `@media (pointer: coarse), (max-width: 700px)` overrides: `min-height: 44px` on `.secondary-button`, `min-height: 40px` on `input[type="date"]`, `min-height: 36px` on `.quick-chip`.

### Playwright Measurement Data
Measurements executed via Chromium Playwright on the control strip (`scratch/measure_alignment.cjs` & `scratch/test_exact_fixes.cjs`):
- **Before Fix**:
  - Date group top: 52px, bottom: 84px, height: 32px
  - Date input top: 52px, bottom: 84px, height: 32px (padding: 4px 8px)
  - `Все записи` button (`.quick-chip`): padding inherited from `dente-redesign.css` (`padding: 5px 12px`), browser default `line-height: normal` causing text baseline shift relative to `<input type="date">`. On coarse pointer / responsive viewports, `touch-targets.css` forced `min-height: 36px` vs `min-height: 40px` vs `min-height: 44px`.
- **After Proposed Fix (`scratch/test_exact_fixes.cjs`)**:
  - Date group: `top: 28px`, `bottom: 60px`, `height: 32px`
  - Prev chevron button: `top: 28px`, `bottom: 60px`, `height: 32px`
  - Date input: `top: 28px`, `bottom: 60px`, `height: 32px`
  - Next chevron button: `top: 28px`, `bottom: 60px`, `height: 32px`
  - `Все записи` button (`.quick-chip active`): `top: 28px`, `bottom: 60px`, `height: 32px`
  - Doctor chip button: `top: 28px`, `bottom: 60px`, `height: 32px`
  - **Result**: 100% mathematical zero-offset vertical alignment across all controls.

---

## 2. Logic Chain

1. **Hierarchy Inspection**:
   In `ScheduleView.tsx:1045`, `ScheduleFilterStrip` is mounted directly below the summary strip.
   Inside `ScheduleFilterStrip.tsx`, `.schedule-filter-strip` is a `<section>` flex container with `display: flex; gap: 8px; flex-wrap: wrap; alignItems: center;`.
   Its children are:
   - Child 1: `<div className="schedule-date-picker-group">` (flex container wrapping 2 buttons and 1 date input)
   - Child 2: `<button className="quick-chip active">Все записи</button>`
   - Child 3..N: Doctor and chair filter chips (`<button className="quick-chip">`).

2. **Root Cause Analysis**:
   - **Padding & Line-Height Mismatch**: `<button className="quick-chip">` did not specify inline `padding: "0 14px"` or `lineHeight: "1"`, allowing `dente-redesign.css:1104` (`padding: 5px 12px`) and browser user-agent `line-height: normal` to alter the box model of `<button>` vs `<input type="date">`.
   - **Height Constraints**: `.secondary-button` inside `.schedule-date-picker-group` lacked inline `maxHeight: "32px"` and explicit `lineHeight: "1"`, exposing it to `main.css:1489` (`min-height: 42px`).
   - **Touch Target Rule Leakage**: `touch-targets.css` overrides `min-height` on coarse/touch pointers (`min-height: 44px` on `.secondary-button`, `40px` on `input[type="date"]`, `36px` on `.quick-chip`). Without explicit `height: 32px !important; min-height: 32px !important; max-height: 32px !important;` in `.schedule-filter-strip`, the controls scale unequally.

3. **Formulation of Solution**:
   Enforce unified 32px height, box-sizing, flex centering, line-height, and padding across all elements inside `.schedule-filter-strip` in both `ScheduleFilterStrip.tsx` (React component inline styles) and `main.css` (CSS stylesheet rules).

---

## 3. Caveats

- **Read-Only Scope**: Explorer 3 did not modify any source code files under `apps/web/src/`. Proposed code diffs below are ready for the Implementer agent.
- **Stylesheet Synchronization**: Both `ScheduleFilterStrip.tsx` and `apps/web/src/styles/main.css` should be updated together to ensure full consistency regardless of whether inline styles or CSS rules take precedence in various rendering environments.

---

## 4. Conclusion & Proposed Code Diffs

To achieve perfect vertical alignment between the `Все записи` button and the date picker, apply the following minimal changes:

### Proposed Diff 1: `apps/web/src/components/schedule/ScheduleFilterStrip.tsx`

```tsx
<<<<
// ScheduleFilterStrip.tsx lines 77-156
				<button
					type="button"
					className="secondary-button schedule-day-step-prev"
					onClick={() => stepScheduleDay(-1)}
					aria-label="Показать предыдущий день"
					title="День назад"
					style={{
						height: "32px",
						minHeight: "32px",
						padding: "0 8px",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						boxSizing: "border-box",
					}}
				>
					<ChevronLeft size={16} aria-hidden="true" />
				</button>
				<input
					type="date"
					aria-label="Фильтр расписания по дате"
					value={scheduleDateFilter}
					onChange={(event) => setScheduleDateFilter(event.target.value)}
					style={{
						height: "32px",
						minHeight: "32px",
						maxHeight: "32px",
						boxSizing: "border-box",
						border: "1px solid var(--line)",
						borderRadius: "8px",
						background: "var(--paper-soft)",
						padding: "4px 8px",
						fontSize: "13px",
						fontWeight: 600,
						color: "var(--ink)",
						outline: "none",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
					}}
				/>
				<button
					type="button"
					className="secondary-button schedule-day-step-next"
					onClick={() => stepScheduleDay(1)}
					aria-label="Показать следующий день"
					title="День вперёд"
					style={{
						height: "32px",
						minHeight: "32px",
						padding: "0 8px",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						boxSizing: "border-box",
					}}
				>
					<ChevronRight size={16} aria-hidden="true" />
				</button>
			</div>

			{/* "Все записи" filter chip button */}
			<button
				type="button"
				className={`quick-chip ${activeScheduleFilterCount === 0 ? "active" : ""}`}
				onClick={resetScheduleFilters}
				style={{
					height: "32px",
					minHeight: "32px",
					maxHeight: "32px",
					boxSizing: "border-box",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					margin: 0,
					alignSelf: "center",
				}}
			>
====
				<button
					type="button"
					className="secondary-button schedule-day-step-prev"
					onClick={() => stepScheduleDay(-1)}
					aria-label="Показать предыдущий день"
					title="День назад"
					style={{
						height: "32px",
						minHeight: "32px",
						maxHeight: "32px",
						padding: "0 8px",
						lineHeight: "1",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						boxSizing: "border-box",
					}}
				>
					<ChevronLeft size={16} aria-hidden="true" />
				</button>
				<input
					type="date"
					aria-label="Фильтр расписания по дате"
					value={scheduleDateFilter}
					onChange={(event) => setScheduleDateFilter(event.target.value)}
					style={{
						height: "32px",
						minHeight: "32px",
						maxHeight: "32px",
						lineHeight: "1",
						boxSizing: "border-box",
						border: "1px solid var(--line)",
						borderRadius: "8px",
						background: "var(--paper-soft)",
						padding: "4px 8px",
						fontSize: "13px",
						fontWeight: 600,
						color: "var(--ink)",
						outline: "none",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
					}}
				/>
				<button
					type="button"
					className="secondary-button schedule-day-step-next"
					onClick={() => stepScheduleDay(1)}
					aria-label="Показать следующий день"
					title="День вперёд"
					style={{
						height: "32px",
						minHeight: "32px",
						maxHeight: "32px",
						padding: "0 8px",
						lineHeight: "1",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						boxSizing: "border-box",
					}}
				>
					<ChevronRight size={16} aria-hidden="true" />
				</button>
			</div>

			{/* "Все записи" filter chip button */}
			<button
				type="button"
				className={`quick-chip ${activeScheduleFilterCount === 0 ? "active" : ""}`}
				onClick={resetScheduleFilters}
				style={{
					height: "32px",
					minHeight: "32px",
					maxHeight: "32px",
					lineHeight: "1",
					padding: "0 14px",
					boxSizing: "border-box",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					margin: 0,
					alignSelf: "center",
				}}
			>
>>>>
```

### Proposed Diff 2: `apps/web/src/styles/main.css`

```css
<<<<
/* main.css lines 17814-17865 */
.schedule-filter-strip {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	align-items: center;
	padding: 12px 16px;
	border-bottom: 1px solid var(--line);
}
.schedule-filter-strip input[type="date"],
.schedule-filter-strip input.schedule-date-input {
	height: 32px;
	min-height: 32px;
	max-height: 32px;
	box-sizing: border-box;
	padding: 4px 8px;
	font-size: 13px;
	font-weight: 600;
	border-radius: 8px;
	border: 1px solid var(--line);
	background: var(--paper-soft);
	color: var(--ink);
	margin: 0;
	display: inline-flex;
	align-items: center;
}
.schedule-filter-strip .quick-chip {
	height: 32px;
	min-height: 32px;
	max-height: 32px;
	box-sizing: border-box;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0 14px;
	margin: 0;
	align-self: center;
}
.schedule-date-picker-group {
	display: flex;
	align-items: center;
	gap: 6px;
	border-right: 1px solid var(--line);
	padding-right: 12px;
	margin-right: 4px;
	height: 32px;
}
.schedule-date-picker-group .secondary-button {
	height: 32px;
	min-height: 32px;
	max-height: 32px;
	box-sizing: border-box;
	padding: 0 8px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin: 0;
}
====
.schedule-filter-strip {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	align-items: center;
	padding: 12px 16px;
	border-bottom: 1px solid var(--line);
}
.schedule-filter-strip input[type="date"],
.schedule-filter-strip input.schedule-date-input {
	height: 32px !important;
	min-height: 32px !important;
	max-height: 32px !important;
	line-height: 1 !important;
	box-sizing: border-box !important;
	padding: 4px 8px;
	font-size: 13px;
	font-weight: 600;
	border-radius: 8px;
	border: 1px solid var(--line);
	background: var(--paper-soft);
	color: var(--ink);
	margin: 0 !important;
	display: inline-flex !important;
	align-items: center !important;
}
.schedule-filter-strip .quick-chip {
	height: 32px !important;
	min-height: 32px !important;
	max-height: 32px !important;
	line-height: 1 !important;
	box-sizing: border-box !important;
	display: inline-flex !important;
	align-items: center !important;
	justify-content: center !important;
	padding: 0 14px !important;
	margin: 0 !important;
	align-self: center !important;
}
.schedule-date-picker-group {
	display: flex !important;
	align-items: center !important;
	gap: 6px;
	border-right: 1px solid var(--line);
	padding-right: 12px;
	margin-right: 4px;
	height: 32px !important;
	min-height: 32px !important;
	max-height: 32px !important;
}
.schedule-date-picker-group .secondary-button {
	height: 32px !important;
	min-height: 32px !important;
	max-height: 32px !important;
	line-height: 1 !important;
	box-sizing: border-box !important;
	padding: 0 8px !important;
	display: inline-flex !important;
	align-items: center !important;
	justify-content: center !important;
	margin: 0 !important;
}
>>>>
```

---

## 5. Verification Method

1. **TypeScript Typecheck**:
   `npm run typecheck -w @dental/web`
   Confirm 0 errors.

2. **Unit Tests**:
   `node --test apps/web/src/components/schedule/ScheduleFilterStrip.test.tsx`
   Confirm all test cases pass.

3. **Playwright Alignment Metric Verification**:
   `node scratch/test_exact_fixes.cjs`
   Confirm bounding rect output matches:
   - `group.top == prevBtn.top == dateInput.top == nextBtn.top == allBtn.top == 28px`
   - `group.bottom == prevBtn.bottom == dateInput.bottom == nextBtn.bottom == allBtn.bottom == 60px`
   - `group.height == prevBtn.height == dateInput.height == nextBtn.height == allBtn.height == 32px`

4. **Visual Audit Re-run**:
   Run `node e2e_4state_audit.cjs` and inspect `PC_Dark_panel_schedule.png` to visually confirm perfect vertical alignment.
