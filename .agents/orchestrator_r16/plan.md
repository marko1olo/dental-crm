# Orchestration Plan — orchestrator_r16

## Objective
Autonomous multi-theme visual inspection, UI/UX audit, and bug eradication across all perspectives, clinical modules, and 10 color palettes in DENTE Dental CRM.

## Plan Steps
1. **Survey (Phase 0)**:
   - Explorer 1: Inspect 10 themes, CSS variables/tokens, modal portals, and SSR compatibility.
   - Explorer 2: Inspect clinical views, patient resource hydration, error toast triggers, and navigation transitions.
   - Explorer 3 / Spec Miner: Inspect quality gates, scripts (`check:encoding`, `typecheck`, `test`), Mandate 8b rules, and test suites.
2. **Decomposition (Phase 1)**:
   - Create comprehensive `PROJECT.md` with Feature Inventory, Architecture, Milestones, and Interface Contracts.
3. **Execution & Dual-Track Iteration (Phase 2-4)**:
   - Visual capture and inspection across 10 themes and views.
   - Worker remediation for any detected layout shifts, contrast bugs, portal leaks, toast race conditions.
   - Independent Reviewer, Challenger, and Forensic Auditor verification.
4. **Final Gate Verification & Push (Phase 5-7)**:
   - Typecheck, 100% tests passing (@dental/shared 211/211, @dental/web 1451/1451), encoding, gitleaks.
   - Per-file git commits and origin/main push.
