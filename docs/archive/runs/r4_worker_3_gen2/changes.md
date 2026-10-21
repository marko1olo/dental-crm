# Changes Summary — Defect 3 Fix (Schedule "Все записи" Button Vertical Misalignment)

## 1. Overview
Root cause identified: In `apps/web/src/styles/main.css`, line 9388 set `.schedule-filter-strip input` to `min-height: 38px`, whereas `.quick-chip` ("Все записи" button) was computed at ~31px height. In addition, step buttons and input controls lacked explicit matching heights and flex-centering rules.

## 2. Files Modified & Created

### Created Files
1. `apps/web/src/components/schedule/ScheduleFilterStrip.tsx`
   - Modular React component encapsulating the schedule toolbar filter strip.
   - Enforces `align-items: center`, explicit 32px matching heights (`height: 32px`, `min-height: 32px`, `max-height: 32px`, `box-sizing: border-box`) on the date picker step buttons, date filter input, "Все записи" quick chip, doctor chips, and chair chips.
   - Uses `display: inline-flex`, `align-items: center`, `justify-content: center`, and proper flex spacing (`gap: 6px` inside date picker group, `gap: 8px` between chips).

2. `apps/web/src/components/schedule/ScheduleFilterStrip.test.tsx`
   - Node test runner unit tests verifying component rendering, active filter chip state, button label "Все записи", date step controls, and matching 32px layout attributes.

### Modified Files
1. `apps/web/src/ScheduleView.tsx`
   - Replaced inline filter strip markup with `<ScheduleFilterStrip>` component.
   - Cleanly passes date filter state, step callbacks, filter reset handler, staff members, and chair data.

2. `apps/web/src/styles/main.css`
   - Added explicit CSS rules under `.schedule-filter-strip` to force 32px height, `box-sizing: border-box`, `display: inline-flex`, and `align-items: center` for `.schedule-filter-strip input[type="date"]`, `.schedule-filter-strip .quick-chip`, `.schedule-date-picker-group`, and `.schedule-date-picker-group .secondary-button`.
   - Overrides the legacy `.schedule-filter-strip input` `min-height: 38px` rule so date inputs and chip buttons have identical height and perfect vertical centering.

## 3. Verification
- `npm run typecheck -w @dental/web`: Passed with exit code 0 (zero TypeScript errors).
- `node --import tsx --import ./testCssStub.mjs --test src/components/schedule/ScheduleFilterStrip.test.tsx`: Passed 2/2 tests.
