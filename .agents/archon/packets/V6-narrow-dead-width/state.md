# V6-narrow-dead-width — state

STATUS: DEFECT CONFIRMED
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
- NEXT: replace the inline grid with a class in patients-redesign.css; one column until two genuinely
  usable tracks fit. Then typecheck, then COMMIT.
