# Orchestration Plan — EGISZ, SEMD 108, FNS Tax, Legal Compliance

## 1. Survey Phase (Step 0)
Launch 3 parallel Survey subagents:
1. `survey_backend_explorer`: Survey backend architecture (`apps/api`), database schema (`apps/api/src/db/schema.ts`), documents/EMR endpoints, and existing CDA/export services.
2. `survey_regulatory_spec_miner`: Survey requirements for SEMD 108 (HL7 CDA R2, 5 sections, FDI ISO 3950 5-surface tooth table, OIDs, Order 804n, ICD-10), CAdES-BES detached signatures, FNS KND 1151156 format 5.01 (Decree 458 Code 1/2), and MIAC 039/u UET calculations.
3. `survey_frontend_ui_explorer`: Survey frontend structure (`apps/web`), `DocumentsView.tsx`, tooth chart/EMR interfaces, CryptoPro browser plugin bridge requirements, and IDS/speech scripts UI integration points.

## 2. Project Specification & Decomposition (Step 1)
- Author comprehensive `PROJECT.md` at root defining architecture, feature inventory, module interfaces, code layout, and milestones.
- Author `TEST_INFRA.md` for requirement-driven E2E testing track.

## 3. Execution Pipeline (Step 2)
- **Track A (Implementation)**:
  - **M1**: DB Migrations & Cryptographic Hash-Chained Audit Trail (`egisz_audit_logs`, `egisz_outbox`, UET nomenclature fields) (R5, R6)
  - **M2**: Dental SEMD 108 CDA R2 Generator & Validator (R1)
  - **M3**: Dual CAdES-BES Detached Signatures & CryptoPro Bridge (Doctor UKEP + Clinic UKEP + GOST verification) (R2)
  - **M4**: OIIS Gateway REST Client (MedFlex / N3.Health) + Outbox Queue & WebSocket updates (R3)
  - **M5**: FNS Tax Deduction Generator (KND 1151156 5.01, Code 1/2 Decree 458 auto-classifier, XSD validator) (R4)
  - **M6**: MIAC Form 039/u & Order 804n UET Aggregations & Reports (R5)
  - **M7**: Legal Consent Package (4 specialty IDS templates) & Staff Speech Scripts in UI (R7)
  - **M8**: Final Integration, E2E Test Suite (Tiers 1-4) & Adversarial Hardening (Tier 5)
- **Track B (E2E Testing)**:
  - Parallel test creation for all 7 requirements with 4-tier methodology.

## 4. Multi-Agent Verification & Auditing
- Each milestone passes through:
  - 1 Worker (implementation + unit tests + build)
  - 2 Reviewers (independent code review + verification)
  - 2 Challengers (edge cases & adversarial checks)
  - 1 Forensic Auditor (Mandate 8b & Zero-Mock verification)
- Pass criteria: Strict AND on all gates.

## 5. Final Acceptance & Release
- Verify:
  - `npm run check:encoding` passes 100% (zero mojibake/BOM/corruptions).
  - `npm run typecheck` passes 100% across `@dental/shared`, `@dental/api`, `@dental/web`.
  - All unit, integration, and E2E test suites pass 100%.
  - Zero secrets in staged files.
  - Per-file git commits following Conventional Commits without tool attributions.
