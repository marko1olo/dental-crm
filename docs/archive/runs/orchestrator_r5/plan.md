# Round 2 Victory Audit Remediation Plan — DENTE CRM

## Objective
Remediate all issues identified by the Victory Auditor to achieve `VERDICT: VICTORY CONFIRMED`:
1. Fix `biome.json` ignore pattern syntax (resolve `useBiomeIgnoreFolder` warnings).
2. Resolve all 123 Biome linter errors across the workspace to achieve **0 errors, 0 warnings** under `npx biome check --files-ignore-unknown=true`.
3. Resolve all assertion failures in `@dental/web` unit tests to achieve **100% test pass rate** under `npm test -w @dental/web`:
   - `paymentComposerReset.test.ts`
   - `priceEntryKeepsKopecks.test.ts`
   - `themeClasses.test.ts`
   - `visiographFindings.test.ts`

## Step-by-Step Execution Plan

### Step 1: Investigation (Explorers 5 & 6)
- **Explorer 5** (`teamwork_preview_explorer`): Investigate `biome.json` ignore pattern syntax and run `npx biome check --files-ignore-unknown=true` to catalog all 123 linter errors and 233 warnings. Produce exact fix strategy in `C:\Clinic_MVP\dental-crm\.agents\explorer_r5_5\handoff.md`.
- **Explorer 6** (`teamwork_preview_explorer`): Investigate the 4 failing unit test files in `apps/web/src/tests/` (`paymentComposerReset.test.ts`, `priceEntryKeepsKopecks.test.ts`, `themeClasses.test.ts`, `visiographFindings.test.ts`). Determine exact root causes and code/test assertion fixes in `C:\Clinic_MVP\dental-crm\.agents\explorer_r5_6\handoff.md`.

### Step 2: Implementation (Workers 5 & 6)
- **Worker 5** (`teamwork_preview_worker`): Update `biome.json` ignore syntax and run `npx biome check --write --files-ignore-unknown=true` / manually fix remaining linter errors until `npx biome check --files-ignore-unknown=true` outputs **0 errors, 0 warnings**.
- **Worker 6** (`teamwork_preview_worker`): Implement fixes for the 4 failing `@dental/web` unit tests until `npm test -w @dental/web` passes 100%.

### Step 3: Verification & Victory Audit Gate (Reviewer 4 & Auditor 3)
- **Reviewer 4** (`teamwork_preview_reviewer`): Execute `npm run typecheck`, `npx biome check --files-ignore-unknown=true`, `npm test -w @dental/web`, `node e2e_4state_audit.cjs`.
- **Auditor 3** (`teamwork_preview_auditor`): Perform full 3-phase victory re-audit and report results.
