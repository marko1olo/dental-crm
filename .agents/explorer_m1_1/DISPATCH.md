## 2026-08-08T20:12:44Z

Investigate Requirement R1: Circular Dependency Eradication.
The user request requires:
"Resolve remaining 4 circular dependencies in apps/web/src reported by madge involving useAppLogic.tsx, workspaceShell.tsx, AppLogicContext.tsx, hooks/useWorkspaceProfile.ts."
Acceptance criterion: `npx madge --circular apps/web/src/main.tsx` outputs exactly 0 circular dependencies.
