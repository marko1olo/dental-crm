# Handoff Report: Agentic Recalls & Staff Task Tools

## 1. Observation
- Implemented 3 new clinical tools in `apps/api/src/services/agent/tools/clinicalTools.ts`:
  1. `create_staff_task`: Creates an internal clinic task for admin/nurse/doctor (`communicationTasks`) attached to a patient with priority, assignedRole, and due date. Category: `"write"` (suspends for confirmation in supervised mode).
  2. `get_patient_recalls`: Retrieves active recall tasks for a patient and calculates medical recall intervals (hygiene 6m, implant review 6m) based on completed visits and `@dental/shared` domain logic. Category: `"read"`.
  3. `schedule_recall`: Creates a preventive recall reminder in `communicationTasks` with intent `"recall"`, supporting multiple channels (`whatsapp`, `sms`, `phone`, `telegram`, `email`). Category: `"write"` (suspends for confirmation in supervised mode).
- Total tools registered in `ToolRegistry` via `registerClinicalTools`: 14 tools.
- Fixed TS2538 indexing in `clinicalTools.ts` and `exactOptionalPropertyTypes` across `@dental/api`.

## 2. Logic Chain
- All database queries strictly filter by `organizationId = ctx.organizationId`.
- RBAC permissions:
  * `create_staff_task`: `["clinical.write", "tasks.write"]`
  * `get_patient_recalls`: `["clinical.read", "communications.read"]`
  * `schedule_recall`: `["clinical.write", "communications.write"]`
- In supervised mode, `create_staff_task` and `schedule_recall` yield `confirmation_required` events to enforce human-in-the-loop safety before executing write mutations.

## 3. Caveats & Assumptions
- Medical recall intervals use `RECALL_INTERVAL_MONTHS` from `@dental/shared` and calculate normalized due months via `calculateNextRecallDueMonth`.
- Default channels and roles: channel default is `"whatsapp"`, role default is `"admin"`.

## 4. Conclusion
- All 14 agent tools are fully implemented, typed, tested, and passing all compiler gates.

## 5. Verification Method
- `npm run check:encoding` -> 4065 files checked, 0 errors.
- `node --import tsx --test apps/api/src/services/agent/agent.test.ts` -> 27 passed, 0 failed.
- `npm run typecheck -w @dental/api` -> exit code 0.
- `npm run typecheck:tests -w @dental/api` -> exit code 0.
