## 2026-08-08T16:16:22Z
You are a Worker subagent for DENTE CRM.
Working directory: C:\Clinic_MVP\dental-crm\.agents\worker_m3_1

MANDATORY FIRST STEP: Read the following authoritative files using view_file before doing anything else:
1. C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md
2. C:\Clinic_MVP\dental-crm\.agents\AGENTS.md
3. C:\Clinic_MVP\dental-crm\.agents\explorer_m2_m3_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Execute Milestone 3: `console.log` Migration across `apps/web/src`.

Instructions:
1. Create `apps/web/src/utils/logger.ts` implementing a unified DenteLogger class:
   ```typescript
   type LogLevel = "debug" | "info" | "warn" | "error";

   class DenteLogger {
     private prefix: string;
     constructor(prefix = "[Dente]") {
       this.prefix = prefix;
     }
     debug(...args: unknown[]): void {
       if (import.meta.env.DEV) {
         console.debug(this.prefix, ...args);
       }
     }
     info(...args: unknown[]): void {
       if (import.meta.env.DEV) {
         console.info(this.prefix, ...args);
       }
     }
     warn(...args: unknown[]): void {
       console.warn(this.prefix, ...args);
     }
     error(...args: unknown[]): void {
       console.error(this.prefix, ...args);
     }
   }

   export const logger = new DenteLogger();
   export default logger;
   ```
2. Replace all raw `console.error`, `console.warn`, and `console.log` calls across `apps/web/src` source files with `logger` methods (`logger.error`, `logger.warn`, `logger.debug` / `logger.info`). Exclude comments/JSDoc and `apps/web/src/utils/logger.ts` itself.
3. Run `rg "console\.(log|error|warn)" apps/web/src` to confirm 0 raw console calls remain in production source code (excluding logger.ts).
4. Run `npm run typecheck -w @dental/web` to confirm exit code 0.
5. Write your complete handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_m3_1\handoff.md`.
6. Send a completion message back to parent orchestrator.
