# DENTE CRM Dead Code Reassessment Plan

## Overview
Perform a paranoid, objective reassessment of all "dead code" removals and flagged variables in `apps/web/src`. Identify false positives, restore valid code, verify zero typecheck errors (`npm run typecheck -w @dental/web`), and generate a comprehensive incident report.

## Stages & Milestones

### Stage 1: Survey & Root Cause Analysis
- **Goal**: Investigate `useDocumentWorkflowModule.ts` and recent git commits / AST scans across `apps/web/src`.
- **Subagents**: 3 Parallel Explorers (`teamwork_preview_explorer`).
  - Explorer 1 (`survey_explorer_1`): Deep dive into `useDocumentWorkflowModule.ts`. Analyze why `_selectedTaxDocumentPayerInn`, `_eligibleTaxPaymentIdsKey`, and `_eligiblePaymentReceiptIdsKey` were falsely flagged as dead code. Trace their exact usages (state keys, react query keys, callbacks, returns, or effects). Document the exact logical fallacy or tool failure.
  - Explorer 2 (`survey_explorer_2`): Audit recent git history (`git diff`, `git log`, recent commits) across `apps/web/src` for any deleted or flagged "dead" code. Identify all functions/variables removed or marked as unused in recent sessions.
  - Explorer 3 (`survey_explorer_3`): Conduct a codebase-wide AST / reference audit across `apps/web/src` using `ast-grep`, `ripgrep`, or `tsc` to find any other false positive dead code flags or broken reference chains.
- **Output**: Detailed analysis reports in `.agents/explorer_1/analysis.md`, `.agents/explorer_2/analysis.md`, `.agents/explorer_3/analysis.md`.

### Stage 2: Restoration & Fix
- **Goal**: Restore falsely identified/deleted code and fix any broken call stacks.
- **Subagent**: Worker (`teamwork_preview_worker`).
  - Task: Implement restorations in `useDocumentWorkflowModule.ts` and any other affected files based on Explorer findings. Ensure mathematical proof (AST references > 0). Run `npm run typecheck -w @dental/web` to verify 0 errors.

### Stage 3: Verification & Gate Audit
- **Goal**: Multi-agent review and forensic audit.
- **Subagents**: 2 Reviewers (`teamwork_preview_reviewer`), 2 Challengers (`teamwork_preview_challenger`), 1 Forensic Auditor (`teamwork_preview_auditor`).
  - Reviewers: Verify code correctness, AST reference validity, type safety.
  - Challengers: Execute typecheck and verify runtime reference chains / dynamic key generation.
  - Forensic Auditor: Perform integrity check (verify genuine fix, no facade/hardcode/cheating).

### Stage 4: Incident Report & Handoff
- **Goal**: Generate detailed incident report, update progress.md, and send final completion report to Sentinel / Parent.
