# Project: DENTE CRM Architectural Restoration (`apps/web`)

## Architecture
- Monorepo: `apps/web` (React client), `apps/api` (Fastify backend).
- Primary State Monolithic API: `apps/web/src/useAppLogic.tsx`
- Domain Hooks Directory: `apps/web/src/hooks/domains/`
  - `useDocumentWorkflowModule.ts`
  - `useDicomWorkbenchModule.ts`
  - `useMigrationQueries.ts`
  - `useStaffSettingsLogic.ts`
  - `useClinicalVisitLogic.ts` / `useVisitLogic.ts`
  - `useScheduleLogic.ts`
  - `usePatientLogic.ts` / `usePatientIntakeLogic.ts`
  - `useVoiceAssistant.ts`
  - `useMprLogic.ts`
  - `useCommunicationsQueries.ts`

## Feature Inventory (198 Dead Properties Restoration Map)

| Category | Description | Property Count | Strategy | Assigned Milestone |
|---|---|---|---|---|
| **Category A** | Present in modern domain hooks or `useAppLogic.tsx` body, but omitted from `useAppLogic.tsx` return object | 81 | Wire pass-through destructuring in `useAppLogic.tsx` return | M1 |
| **Category B (DICOM/MPR & Browser I/O)** | Missing DICOM, MPR Workbench, and Browser Storage/Picker logic | 38 | Surgically restore from `da92ab9507` into `useDicomWorkbenchModule.ts` and `useAppLogic.tsx` | M2 |
| **Category B (Migration & Voice)** | Missing Migration Autopilot, Smart Import, Recognition & Speech logic | 35 | Surgically restore from `da92ab9507` into `useMigrationQueries.ts` and `useVoiceAssistant.ts` | M3 |
| **Category B (Clinical, Finance & Admin)** | Missing Clinical Visit, Documents, Pricelist & Staff Settings logic | 40 | Surgically restore from `da92ab9507` into `useDocumentWorkflowModule.ts`, `useStaffSettingsLogic.ts`, `useVisitLogic.ts` | M4 |
| **Category C** | Already present & returned in modern codebase | 4 | Verification only | M1 |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Pass-Through Return Object Wiring | Destructure and export 81 Category A properties in `useAppLogic.tsx` return object | None | PLANNED |
| M2 | Surgical Restoration: DICOM / MPR / Browser I/O | Restore 38 Category B properties for DICOM/MPR and Local Storage/Browser file access | M1 | PLANNED |
| M3 | Surgical Restoration: Migration & Voice Assistant | Restore 35 Category B properties for Migration Autopilot, Smart Import, and Dictation | M1 | PLANNED |
| M4 | Surgical Restoration: Clinical, Documents & Admin | Restore 40 Category B properties for Clinical Visit, Payments, Documents, and Staff Settings | M1 | PLANNED |
| M5 | Verification Gate & Typecheck Audit | Verify `npm run typecheck -w @dental/web` passes with exit code 0, zero UI/button regressions, clean audit | M1, M2, M3, M4 | PLANNED |

## Code Layout & Guidelines
- All modifications must preserve modern bugfixes, tests, UI updates, and accessibility features added between July 30 and August 8.
- No hardcoded test fallbacks or empty dummy functions `() => {}` allowed.
- Zero token shortcuts, zero mocks.
