# Project: Dental CRM Card Hierarchy & Single-Surface Architecture

## Architecture
- React 18 + Vite frontend with Tailwind CSS and CSS semantic variables.
- Eliminate 3-layer card-in-card-in-box nesting patterns and empty phantom containers.
- Standardize on single-surface cards (`var(--surface)` / `var(--paper)`), subtle dividers, clean whitespace, and typography.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Schedule View & Morning Confirmations Flattening | Eliminate nested cards/dashed boxes in morning confirmations, freed slots, and waitlist matches | M1 | ORIGINAL_REQUEST R1 |
| 2 | Schedule Navigation & Filter Bar Integration | Sit date nav, filters, voice intake naturally on canvas without bounding box clutter | M1 | ORIGINAL_REQUEST R1 |
| 3 | Patient Workspace & Visit View Flattening | Remove redundant borders, empty debug divs, and nested cards in patient records and clinical visits | M2 | ORIGINAL_REQUEST R2 |
| 4 | Settings View & Sub-tab Card Cleanup | Clean single-surface cards for settings tabs, tariffs, integrations, and permissions | M2 | ORIGINAL_REQUEST R2 |
| 5 | Finance & Billing Card Cleanup | Flatten invoice lists, cash desk panels, payment dialogs, and fiscal buffers | M3 | ORIGINAL_REQUEST R2 |
| 6 | DICOM/CT & Warehouse Card Cleanup | Streamline DICOM toolbars, MPR controls, and warehouse inventory item boxes | M3 | ORIGINAL_REQUEST R2 |
| 7 | 4-State Visual Capture & Image Inspection | Capture all 20 views across 4 states, inspect with multimodal vision, verify 0 layout defects | M4 | ORIGINAL_REQUEST R3 |
| 8 | Quality Gates & Mandate 8b Individual Commits | Typecheck (0 errors), 100% tests passing, clean atomic git commits without tool trailers | M4 | ORIGINAL_REQUEST R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 0 | Survey | Full codebase exploration of nested containers & phantom divs | None | IN_PROGRESS |
| 1 | Schedule & Booking Cleanup | `ScheduleView.tsx`, `ScheduleConfirmationsPanel.tsx`, `WaitlistMatchesBlock.tsx`, `NewAppointmentForm.tsx` | M0 | PLANNED |
| 2 | Workspace, Visit & Settings Cleanup | `PatientWorkspace.tsx`, `VisitView.tsx`, `SettingsView.tsx`, `components/settings/*` | M0 | PLANNED |
| 3 | Finance, DICOM & Warehouse Cleanup | `components/finance/*`, `components/dicom/*`, `components/ct/*`, `components/warehouse/*` | M0 | PLANNED |
| 4 | 4-State Inspection & Gates | All 20 views captured, multimodal image review, unit/e2e tests, git commits | M1, M2, M3 | PLANNED |

## Code Layout
- `apps/web/src/ScheduleView.tsx`
- `apps/web/src/components/schedule/*` (`ScheduleConfirmationsPanel.tsx`, `WaitlistMatchesBlock.tsx`, `NewAppointmentForm.tsx`, etc.)
- `apps/web/src/PatientWorkspace.tsx`, `apps/web/src/VisitView.tsx`, `apps/web/src/SettingsView.tsx`
- `apps/web/src/components/finance/*`, `apps/web/src/components/dicom/*`, `apps/web/src/components/settings/*`
