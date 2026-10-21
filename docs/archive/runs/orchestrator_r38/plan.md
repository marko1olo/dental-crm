# Orchestration Plan — orchestrator_r38

## Objective
Execute complete implementation, layout polish, remediation resolution, and 4-state visual verification for DENTE Dental CRM:

1. **Remediation Resolution Backlog**:
   - Fix unguarded fetch calls in `SanpinRegisters.tsx` & `kktLanPrinter.ts` (`check:guarded-route-headers`).
   - Cleanly apply and verify database migrations `0178`–`0181` (`db:migrate:check`).
   - Rebuild all packages for distribution freshness (`smoke:dist-freshness`).
   - Fix declared script guards in `EgiszAuditService.ts`.
   - Clean up and commit working tree per Mandate 8b.

2. **UI & Layout Polish**:
   - Eliminate header clutter, mixed creation-in-search layouts, and UI voids across all DENTE views.
   - Touch-first targets >= 44px on mobile, responsive layout wrapping.

3. **5 Core Clinical & Operational Domains**:
   - Domain 1: Clinical EMR 043/u & AAP/EFP Perio Chart
   - Domain 2: Fiscal 54-FZ & Cash Desk Refund Settlement
   - Domain 3: Inventory & Order 804n BOM Clinical Writeoffs
   - Domain 4: SanPiN 3.3686-21 Sterilization & Autoclave Log
   - Domain 5: Multi-Platform Topology & LAN UDP / LWW CRDT Sync

4. **Quality Gates & 4-State Visual Proof**:
   - `npm run check:encoding` == 0
   - `node scripts/check-css-tokens.mjs` == 0
   - `npm run typecheck` == 0
   - `node scripts/check-guarded-route-headers.mjs` == 0
   - `node scripts/smoke-dist-freshness.mjs` == 0
   - All unit & integration tests exit 0
   - 4-state visual confirmation (Mobile Light, Mobile Dark, PC Light, PC Dark)
