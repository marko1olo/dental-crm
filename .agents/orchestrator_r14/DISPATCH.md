## 2026-08-17T02:03:56+04:00

You are the Project Orchestrator for Dental CRM (`C:/Clinic_MVP/dental-crm`).
Your working directory is `C:/Clinic_MVP/dental-crm/.agents/orchestrator_r14`. Create this directory and maintain your BRIEFING.md, plan.md, and progress.md in it.

The canonical authority is `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md`. Read it before acting.
The authoritative user request is recorded at `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md` under `## Follow-up — 2026-08-17T02:03:06+04:00`.

## Task: Eliminate Over-Nested Cards, Phantom Containers, & Restore Clean Single-Surface Hierarchy

### Requirements:
1. **R1. Schedule View Container & Card Hierarchy Refactoring**
   - Remove phantom empty wrapper divs and redundant outline containers in `ScheduleView.tsx`, `ScheduleConfirmationsPanel.tsx`, `WaitlistMatchesBlock.tsx`, and `NewAppointmentForm.tsx`.
   - Eliminate the 3-layer nesting ("card inside card inside dashed box") in the morning confirmations and freed slots panels. Flatten them into clean, purposeful single-level cards.
   - Ensure the date navigation, filter bar, and voice intake strip sit naturally on the base page canvas without redundant bounding boxes.

2. **R2. Global Project Audit & Cleanup for Over-Nested Cards**
   - Scan all view components (`apps/web/src/ScheduleView.tsx`, `apps/web/src/PatientWorkspace.tsx`, `apps/web/src/SettingsView.tsx`, `apps/web/src/components/finance/*`, `apps/web/src/components/dicom/*`, `apps/web/src/components/settings/*`, etc.).
   - Strip out empty debug containers, phantom `<div className="..."/>` elements with borders and zero content, redundant `<article>`/`<section>` border wrappers, and nested dashed boxes.
   - Replace layered border nests with clean whitespace, subtle surface contrasts (`var(--surface)`, `var(--surface-muted)`), and crisp typographic headings.

3. **R3. Comprehensive Visual 4-State Verification**
   - Re-run `node scripts/capture-all-views-live.mjs` to capture all 20 views and states (Desktop Light, Desktop Dark, Mobile Light, Mobile Dark for Schedule, Visit, Finance, Imaging, Settings).
   - Perform multimodal image inspection on all generated screenshots to confirm zero nested boxes, zero phantom borders, and 100% polished layout aesthetics.

### Acceptance Criteria:
- No screen contains 3 or more layers of nested bordered cards.
- Zero phantom empty elements with borders or heights (e.g. empty spacer boxes) rendered on screen.
- Schedule view displays confirmation panels, slot pickers, and day lists on clean, flat, readable surfaces.
- `npm run typecheck` passes with 0 TypeScript errors across all workspaces.
- `npm test` passes 100% of unit and integration tests.
- Live 4-state screenshots inspected and verified.
- Commit all modified files individually per Mandate 8b.
