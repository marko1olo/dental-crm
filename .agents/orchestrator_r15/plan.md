# Orchestrator Plan — DENTE Dental CRM (r15)

## Objective
Execute autonomous verification, bug-fixing/hardening, quality gates enforcement, unit test suites execution, and visual 4-state screenshot proof for Dental CRM against requirements R1, R2, R3, R4 and all acceptance criteria.

## Execution Sequence

### Phase 0: Survey & Codebase Census (Current)
- Dispatch 3 parallel Explorers:
  1. `explorer_clinical_dicom`: Audit R1 (Odontogram adult/pediatric, Form 043/u SOAP, 63-FZ e-sign, ICD-10 protocols) & R2 (DICOM 3D MPR CT, HU bone density Misch D1-D4, nerve canal safety alarm < 2.0mm).
  2. `explorer_fintech`: Audit R3 (Kopeck-exact integer arithmetic, 0% installment plans sum(parts)==T, 1-click NDFL KND 1151156 Code 01 vs 02, 54-FZ cashier receipts, clientMutationId idempotency, offline queue).
  3. `explorer_ui_gates`: Audit R4 (10 themes, touch targets >= 44px, 390px mobile viewport, CSS token purity) + Acceptance Gates (`check:encoding`, `typecheck`, `@dental/shared` unit tests 185/185, `@dental/web` unit tests 1349/1349, screenshots).

### Phase 1: Synthesis & Decomposition
- Synthesize findings from Explorers into `PROJECT.md § Feature Inventory` and `GATE_STATUS.md`.
- Formulate precise work packages for any detected deficiencies or test gaps.

### Phase 2: Implementation & Verification Cycles (Worker -> Reviewers -> Challengers -> Auditor)
- For any code changes needed: dispatch Workers, verify with Reviewers, stress-test with Challengers, audit with Forensic Auditor.

### Phase 3: Acceptance Gate Execution & Proof Verification
- Execute full test suite:
  - `npm run check:encoding`
  - `npm run typecheck`
  - `npm test -w @dental/shared` (185/185)
  - `npm test -w @dental/web` (1349/1349)
  - Capture & Multimodal Visual Inspection of 4-State Screenshots
- Verify zero mocks, zero mojibake, kopeck-exact math.

### Phase 4: Final Synthesis & Reporting
- Generate comprehensive report with HEAD commit hash, PRVORENO vs NE PROVERENO split, and artifact links.
