# Plan: Eliminate Over-Nested Cards & Restore Single-Surface Hierarchy

## Objective
Remove all 3+ level nested bordered containers ("matryoshka" cards), phantom empty elements, redundant dashed outlines, and broken card hierarchy across Dental CRM views. Replace with clean single-surface layouts, subtle token-driven surface contrasts (`var(--surface)`, `var(--surface-muted)`), crisp typography, and 100% verified 4-state visual polish.

## Phases
1. **Phase 0: Parallel Exploratory Survey**
   - Explorer 1: Audit Schedule components (`ScheduleView.tsx`, `ScheduleConfirmationsPanel.tsx`, `WaitlistMatchesBlock.tsx`, `NewAppointmentForm.tsx`, etc.).
   - Explorer 2: Audit Patient Workspace, Visit (`VisitView.tsx`, 043-u), and Settings views.
   - Explorer 3: Audit Finance, DICOM/CT, and Warehouse views and components.
2. **Phase 1: Milestone 1 (M1) — Schedule & Booking Flow Clean Surface Hierarchy**
   - Implement single-level card structure for morning confirmations, freed slots, waitlists.
   - Ensure date navigation, filter bar, voice intake strip sit naturally on base canvas without bounding box clutter.
   - Run typecheck, unit tests, and review.
3. **Phase 2: Milestone 2 (M2) — Patient Workspace, Visit, & Settings Clean Surfaces**
   - Strip out redundant `<article>`/`<section>` bordered wrappers and phantom empty spacer containers.
   - Standardize surface tokens and typography.
4. **Phase 3: Milestone 3 (M3) — Finance, DICOM, & Warehouse Card Flattening**
   - Remove nested dashed/solid bordered cards in invoice/payment panels, DICOM toolbars, and warehouse inventory lists.
5. **Phase 4: Milestone 4 (M4) — Comprehensive 4-State Visual Verification & Quality Gate**
   - Run `node scripts/capture-all-views-live.mjs` across all 20 views and states.
   - Perform multimodal image inspection on all generated screenshots.
   - Run full test suite and typecheck.
   - Commit files individually per Mandate 8b.
