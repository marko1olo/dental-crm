# V6-narrow-dead-width — state

STATUS: DONE
TIME: cycle 6
HEAD at start: 56bc2ef6d5492b7d2dabed228ebe8d63113c676e

## Packet
At 720x1100 roughly 45% of the width renders nothing (one empty white panel).
Claim: the layout/CSS owning the narrow breakpoint. NOT App.tsx (dirty). NOT the corner component (V1).
Gate: npm run typecheck -w @dental/web

## Log
- STARTED: packet dir created, state.md written before any reading.
- AUTHORITY READ: .agents/AGENTS.md, .agents/INDEX.md, .agents/UI_STANDARDS.md (all complete),
  VISUAL_VERDICT.md addendum B (B1/B2/B3) and addendum C (C1-C3) complete.
- Index clean (`git diff --cached --name-only` empty). Dirty tree: apps/api/.data/*, db/schema.ts,
  components/InventoryView.tsx, tsconfig.tsbuildinfo, packages/shared/dist, scratch/ — none of mine.
  apps/web/src/PatientsView.tsx and apps/web/src/styles/patients-redesign.css are CLEAN.
- PLATE OPENED: .dente-ops-shots/narrow_full.png (re-captured 10:28 today). What is actually there:
  outer bordered rounded container (.patients-panel) x~12..708; inside it TWO boxes side by side,
  left ~313px holding the «Дубли карточек пациентов» card stack (ПЕРВАЯ/ВТОРАЯ КАРТОЧКА, 35 %
  совпадения, three buttons, footnote), right ~315px a bordered rounded box with NOTHING in it,
  ending at the same y as the left box. Below the panel: whitespace, then the three FABs in a row,
  then the labelled bottom nav. The two boxes end at the same y => same grid row, stretched.
- DEFECT CONFIRMED at apps/web/src/PatientsView.tsx:674 — inline
  `gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))"` on the six-widget group.
  At 720px the group gets ~639px, which fits exactly two 280px tracks -> 2 columns of ~311px.
  311/705 = 44.2% == the lead's "roughly 45 %". Row 3 = PatientDuplicateMergeQueuesWidget (huge,
  card-mode reflow) + PatientServiceLineagesWidget (heading + one empty-state card). Grid default
  align-items:stretch inflates the short card to the tall card's height => the empty white panel.
- CORRECTION to the line above, written before the arithmetic was executed: the 639px/311px figures
  assumed a 15px classic scrollbar. Executed numbers with the published paddings and no scrollbar:
  group width 654px, two tracks of 319px, 319/720 = 44.3%. With a 15px scrollbar it is 639px/311.5px
  = 44.2%. Column count and the ~45% conclusion are identical either way; the intermediate numbers
  above and in commit a7861bcb8 were stated with false precision. The test now asserts 2 columns,
  track < 320px and dead share 0.4..0.5 instead of a single fabricated figure.
- EDIT WRITTEN: patients-redesign.css gained .patients-widgets-grid
  (repeat(auto-fit, minmax(min(30rem, 100%), 1fr)), gap 1rem, margin-top 1.5rem);
  PatientsView.tsx:672 now uses className="patients-widgets-grid" and no inline grid.
- GATE: first run exit 1 with 3 errors, ALL in foreign dirty files (pages/AnalyticsDashboardView.tsx,
  then components/inventory/useInventoryLogic.ts) — other agents mid-edit; zero errors in my files.
  Final run after their fixes: npm run typecheck -w @dental/web exit 0.
- COMMITTED a7861bcb8109724665d9973bec77bac1fb45856c (fix, 4 files, only mine).
- PROVEN: node --import tsx --test apps/web/src/tests/patientsWidgetsGridColumns.test.ts -> exit 0,
  6/6 pass. npm test -w @dental/web -> exit 0, 551/551 pass. npm run typecheck -w @dental/web exit 0.
  GET 127.0.0.1:5173/src/styles/patients-redesign.css -> 200 with the new rule in the body.
  Two of my own first-draft assertions were arithmetically WRONG (track 319 not 311; full-section
  columns 2 not 3) and were corrected before the test was committed.
- COMMITTED 9c2e609f60ecf55c572ed3e8c15fe4eb7c4f86ac (test, 2 files, only mine).
- DONE: handoff.md written. Rendering at 720x1100 is NOT verified by me — the lead owns the shot.
