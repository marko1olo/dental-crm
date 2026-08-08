# DISPATCH LOG

## 2026-08-08T14:00:03Z

Deep architectural restoration of the DENTE CRM codebase (`apps/web`). Over the last 7-10 days, 198 critical properties and their underlying logic were deleted from `useAppLogic`.

Key Requirements:
1. Read `dead_props.txt` in the root workspace to identify all 198 missing properties.
2. Extract the original implementations from the Golden Reference Commit `da92ab9507` using `git show da92ab9507:apps/web/src/useAppLogic.tsx`.
3. Surgically merge and integrate this restored logic into modern domain hooks (`apps/web/src/hooks/domains/`) and modern `useAppLogic.tsx` WITHOUT overwriting or destroying any modern changes, bugfixes, or UI updates made over the last week.
4. Ensure global execution chain integrity — wire functions properly to state/backend without leaving empty dummy fallbacks.
5. Ensure `npm run typecheck -w @dental/web` passes cleanly with exit code 0.
6. Verify no UI buttons or views were deleted.

## 2026-08-08T14:24:00Z

Resume work from where the team left off. Read `C:\Clinic_MVP\dental-crm\.agents\orchestrator\BRIEFING.md`, `C:\Clinic_MVP\dental-crm\.agents\orchestrator\plan.md`, and `C:\Clinic_MVP\dental-crm\.agents\orchestrator\progress.md`. Continue executing the 5 milestones to restore the missing 198 properties into `apps/web/src/hooks/domains/` and `useAppLogic.tsx` without overwriting modern bugfixes/tests/UI changes.
When all milestones pass and `npm run typecheck -w @dental/web` exits with 0, write your final handoff.md report and notify Sentinel.
