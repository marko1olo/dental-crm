# BRIEFING — 2026-08-08T14:02:30Z

## Mission
Analyze Part 1 (first 66 of 198 properties) from `dead_props.txt`, locate their golden implementations in commit `da92ab9507:apps/web/src/useAppLogic.tsx`, survey modern `useAppLogic.tsx` and `apps/web/src/hooks/domains/`, and map out surgical restoration strategy into `handoff.md`.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Read-only codebase investigator & analyzer (Part 1: props 1-66)
- Working directory: C:\Clinic_MVP\dental-crm\.agents\explorer_1
- Original parent: 97680c8e-d12a-4f18-a4a3-2582b645c6ac
- Milestone: Part 1 Dead Properties Analysis & Restoration Strategy (Completed)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement code changes in `apps/web`
- Do not overwrite modern bugfixes or UI improvements
- Strict UTF-8 compliance, no mojibake
- Communicate all findings to parent via `send_message` and handoff report

## Current Parent
- Conversation ID: 97680c8e-d12a-4f18-a4a3-2582b645c6ac
- Updated: 2026-08-08T14:02:30Z

## Investigation State
- **Explored paths**: `C:\Clinic_MVP\dental-crm\dead_props.txt`, Golden commit `da92ab9507:apps/web/src/useAppLogic.tsx`, `apps/web/src/useAppLogic.tsx`, `apps/web/src/hooks/domains/*.ts`
- **Key findings**:
  - Out of 66 Part 1 properties, 22 properties exist in modern code / domain hooks but are missing from `useAppLogic.tsx` return object (pass-through).
  - 44 properties were completely stripped during refactoring and require surgical restoration into `useDicomWorkbenchModule.ts`, `useMigrationQueries.ts`, `useStaffSettingsLogic.ts`, `useVisitLogic.ts`, or `useAppLogic.tsx`.
- **Unexplored areas**: Parts 2 & 3 (props 67-198), owned by Explorer 2 and Explorer 3.

## Key Decisions Made
- Categorized all 66 properties into 7 domain groups and mapped each property to its exact golden reference lines and modern target file destination in `handoff.md`.

## Artifact Index
- `C:\Clinic_MVP\dental-crm\.agents\explorer_1\DISPATCH.md` — Log of incoming dispatch messages
- `C:\Clinic_MVP\dental-crm\.agents\explorer_1\BRIEFING.md` — Context & state index
- `C:\Clinic_MVP\dental-crm\.agents\explorer_1\handoff.md` — Final structured report for Part 1 (Props 1-66)
