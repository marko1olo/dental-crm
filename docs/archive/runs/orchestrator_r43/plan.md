# Operational Plan — orchestrator_r43

## Objective
Execute complete 3-Tier Clinical UX & System Audit/Refactoring for DENTE Dental CRM, covering Tier 1 (Hot Path In-Chair Cockpit), Tier 2 (Warm Context Tooth Drawer), Tier 3 (Cold Backoffice Workspaces), and Multi-Theme Token / WCAG 2.1 AA Gating.

## Step-by-Step Execution Plan

### Phase 0: Parallel Survey & Reconnaissance
- Dispatch `survey_explorer_1`: Tier 1 (Dental Arch 140-160px, 1-click status, 043/u diary, allergy safety alerts, total due in RUB + 1-click tender, zero blocking popups).
- Dispatch `survey_explorer_2`: Tier 2 (5-surface MOD drawer, root canals, anesthesia calculator, SanPiN Kraft attachment, family deposit/loyalty, 200x200 viziograph preview) & Tier 3 (3D DICOM MPR, EGISZ CDA R3 + CryptoPro, Payroll T-51/T-13, FNS 1151156, Warehouse MDLP, Multi-currency CBR).
- Dispatch `survey_explorer_3`: Multi-Theme tokens (10 themes), WCAG 2.1 AA contrast, 44px+ touch targets, UTF-8 encoding, and test suites.

### Phase 1: Synthesis & PROJECT.md Formulation
- Synthesize survey findings from all 3 explorers.
- Update `PROJECT.md` with full feature inventory and milestone definitions.
- Formulate `TEST_INFRA.md` with 4-tier testing hierarchy.

### Phase 2: Implementation & Iteration Loops
- Execute Milestone M1 (Tier 1 Hot Path)
- Execute Milestone M2 (Tier 2 Warm Context)
- Execute Milestone M3 (Tier 3 Cold Backoffice)
- Execute Milestone M4 (10 Themes & Visual WCAG)
- Execute Milestone M5 (54-FZ, EGISZ, MDLP & Statutory Compliance)

### Phase 3: E2E Dual Track Acceptance & Adversarial Hardening (M6)
- Run Reviewers, Challengers, and Forensic Victory Auditor (`teamwork_preview_reviewer`, `teamwork_preview_challenger`).
- Verify all machine gates: `npm run typecheck`, `node scripts/check-encoding.mjs`, `node scripts/check-css-tokens.mjs`, unit/integration/E2E test suites.

### Phase 4: Final Synthesis & Sentinel Report
- Generate comprehensive handoff report (`handoff.md`).
- Communicate verified results to Sentinel.
