# Execution Plan — Dental CRM Autonomous Deep Audit & Polish

## Phase 0: Parallel Codebase Survey & Gap Analysis
1. Spawn 3 specialized Explorers / Spec Miners:
   - **Survey Explorer 1 (Finance & Concurrency)**: Investigate `apps/api/src/routes/sberbank.ts`, `apps/api/src/routes/sbpQr.ts`, `apps/api/src/routes/payments/`, `apps/api/src/routes/appointments/`, `apps/api/src/db/appointmentsQuery.ts`, `apps/api/src/routes/publicBooking.ts`, database schemas in `apps/api/src/db/schema.ts`, and fiscal 54-FZ / KND 1151156 logic.
   - **Survey Explorer 2 (Clinical Form 043/u & DICOM/CT MPR)**: Investigate `apps/web/src/lib/clinicalProtocols043.ts`, `apps/web/src/VisitView.tsx`, `apps/web/src/components/ct/`, `apps/web/src/components/dicom/`, `apps/web/src/utils/dicom/`, FDI numbering to Russian nomenclature, SOAP generator, UKEP/PEP signatures, 3D implant-to-nerve distance, and MPR crosshair synchronization.
   - **Survey Explorer 3 (UI Standards & Test Infrastructure)**: Investigate existing test suites (`@dental/web`, `@dental/api`, `@dental/shared`), check scripts (`check:encoding`, `check:stub-overrides`, etc.), 4-state theming tokens, touch target sizing in mobile views, and Biome/TypeScript setup.

2. Synthesize findings into master `PROJECT.md` and `TEST_INFRA.md`.

## Phase 1: Implementation Track (Milestones M1–M5) + E2E Testing Track
- **M1**: 54-FZ FFD 1.2, Sberbank/SBP idempotency & status transitions, KND 1151156 Tax Certificate.
- **M2**: Schedule Concurrency, Chair & Doctor overlap prevention, deadlock-free row locking (`SELECT FOR UPDATE`).
- **M3**: Form 043/u clinical diary auto-generation, Russian anatomical FDI nomenclature, non-destructive smart append, PEP/UKEP.
- **M4**: DICOM/CT MPR 3D nerve clearance calculation, safety badges, multi-planar crosshair synchronization.
- **M5**: 4-State visual matrix compliance, token purity, 44x44px touch ergonomics.

## Phase 2: Multi-Pass Verification & Adversarial Stress Testing
- 2x Reviewers: Full code review, lint/typecheck verification, architecture conformance.
- 2x Challengers: Adversarial stress testing, edge-case generation, deadlock & race condition testing, mathematical verification.
- 1x Forensic Auditor: Zero-cheating verification, no dummy/facade implementations, static & dynamic check.

## Phase 3: Final Quality Gate & Report
- Run all test suites and iron gate checks.
- Compile comprehensive evidence and report to caller.
