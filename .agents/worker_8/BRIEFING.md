# BRIEFING — 2026-08-08T14:30:00Z

## Mission
Milestone 1 Category A Pass-Through Return Object Wiring for `apps/web/src/useAppLogic.tsx` and eradication of dummy empty fallbacks.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: C:\Clinic_MVP\dental-crm\.agents\worker_8
- Original parent: e2222b6a-c3fb-4759-b77f-6a94ac68d989
- Milestone: Milestone 1 - Category A Wiring

## 🔒 Key Constraints
- Owned files: `apps/web/src/useAppLogic.tsx`, `apps/web/src/hooks/domains/*`
- No hardcoded test results or dummy facade implementations.
- Clean typecheck `npm run typecheck -w @dental/web` with exit code 0.

## Current Parent
- Conversation ID: e2222b6a-c3fb-4759-b77f-6a94ac68d989
- Updated: 2026-08-08T14:30:00Z

## Task Summary
- **What to build**:
  1. Instantiate & spread 5 domain hooks in `useAppLogic.tsx`: `useStaffSettingsLogic`, `usePatientIntakeLogic`, `useMigrationQueries`, `useImagingQueries`, `useCommunicationsQueries`.
  2. Remove `: any` return type on `useAppLogic()`.
  3. Eradicate dummy `() => {}` empty functions in component prop defaults across `apps/web/src/`.
  4. Verify `npm run typecheck -w @dental/web` passes with code 0.
- **Success criteria**: All 198 properties authentically exported from `useAppLogic.tsx`, no `: any` return type on `useAppLogic`, no dummy `() => {}` fallbacks in props defaults, clean build.

## Change Tracker
- **Files modified**: TBD
- **Build status**: TBD
- **Pending issues**: None yet
