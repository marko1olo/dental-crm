## 2026-08-08T16:18:49Z
<USER_REQUEST>
You are a Worker subagent for DENTE CRM.
Working directory: C:\Clinic_MVP\dental-crm\.agents\worker_remediation_1

MANDATORY FIRST STEP: Read the following authoritative files using view_file before doing anything else:
1. C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md
2. C:\Clinic_MVP\dental-crm\.agents\AGENTS.md
3. C:\Clinic_MVP\dental-crm\.agents\reviewer_m1_rev2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Fix all syntax and compilation errors in `apps/web/src/hooks/domains/useAuthLogic.ts` and `apps/web/src/useAppLogic.tsx` so that `npm run typecheck -w @dental/web` passes cleanly with exit code 0.

Instructions:
1. Read `C:\Clinic_MVP\dental-crm\.agents\reviewer_m1_rev2\handoff.md` to examine the exact TypeScript syntax errors reported by `tsc`:
   - `apps/web/src/hooks/domains/useAuthLogic.ts` lines 143, 153, 157: remove duplicated dependency brackets `, [clinicalAdminSecretSession]);, [clinicalAdminSecretSession]);` and properly close `useCallback` hooks.
   - `apps/web/src/useAppLogic.tsx` lines 1631–2306: fix malformed `useCallback` hook endings (ensure matching `}, [deps]);` or standard function syntax).
2. Run `npm run typecheck -w @dental/web` repeatedly until exit code is 0 with 0 errors.
3. Run `npx madge --circular --extensions ts,tsx apps/web/src/main.tsx` to ensure 0 circular dependencies remain.
4. Write your complete handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_remediation_1\handoff.md`.
5. Send a completion message back to parent orchestrator.
</USER_REQUEST>
