# Plan: Dental CRM Full Multi-Agent Swarm Orchestration (Round 12)

## Objectives
1. **M1: UI Design System & 4-State Visual Self-Healing**
   - Fix `--violet-50/200/700` variable tokens in `apps/web/src/styles/token-aliases.css`
   - Complete `[data-theme="night"]` styling parity in `apps/web/src/styles/main.css`
   - Clean up remaining pulsing animations and neon glow clichés in CSS files
   - Hardening of touch targets (>= 44x44px) across mobile views
   - Fix hardcoded theme colors in `LabOrdersPanel.tsx` and translucent overlays

2. **M2: 54-FZ Cashier, Sberbank Acquiring & NDFL Precision**
   - Verify FFD 1.2 tags (1054, 1212, 1214, 1199, 2108, 1055)
   - Ensure HMAC-SHA256 checksum handling across all 3 Sberbank callback formats with `SELECT FOR UPDATE` locking
   - Verify KND 1151156 XML 5.01 NDFL certificate generation with kopeck-exact math and Code 1/2 separation
   - Verify Doctor payroll single-query CTE aggregation and negative payout explainability

3. **M3: Schedule Concurrency & 043/u EMR Hardening**
   - Verify Chair L1 -> Doctor L2 -> Patient L3 lock acquisition hierarchy and GiST exclusion constraints
   - Verify 043/u draft auto-save, SOAP clinical protocol generator, and SHA-256 integrity digest signing
   - Verify atomic sorted inventory deductions on diary finalization

4. **M4: Guarded Headers & Monorepo Gates Verification**
   - Fix `UrgentScheduleRequestsWidget.tsx` header for `check-guarded-route-headers.mjs`
   - Run and pass all gate scripts:
     * `node scripts/check-css-tokens.mjs` (0 errors)
     * `node scripts/check-encoding.mjs` (0 errors)
     * `node scripts/check-dynamic-imports.mjs` (0 errors)
     * `node scripts/check-env-contract.mjs` (0 errors)
     * `npm run typecheck` (0 errors across @dental/shared, @dental/api, @dental/web)
     * `npm run test` across workspaces

5. **M_E2E: E2E Testing Suite (Tiers 1-4)**
   - Run and complete test suites across all 4 tiers, publishing `TEST_READY.md`

6. **Adversarial Verification & Forensic Integrity Audit**
   - Reviewers and Challengers empirical verification
   - Forensic Auditor ZERO TOLERANCE check

7. **Git Finalization & Reporting**
   - Git add individual files, commit per Mandate 8b, push origin/main
   - Send comprehensive completion message to parent
