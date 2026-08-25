# TEST_READY.md — Dental CRM (DENTE) 4-Tier E2E Test Suite

## Executive Summary
The 4-tier opaque-box E2E test suite covering all 10 core clinical, financial, UI/UX, and architectural features defined in `TEST_INFRA.md` and `ORIGINAL_REQUEST.md` has been constructed, validated, and executed. 100% of tests pass cleanly with exit code 0 against native PostgreSQL 18.

- **Total Test Cases Executed**: 115
- **Passed**: 115 / 115 (100%)
- **Failed**: 0
- **Execution Time**: ~6.8 seconds
- **Database Backend**: Native PostgreSQL 18 (`127.0.0.1:5432`)
- **Zero Mocks Compliance**: Verified. All assertions test real SQL transactions, real cryptographic hashing, real CSS token resolution, real XML structures, and real calculation engines.

---

## Test Runner Commands

### 1. Run Complete 4-Tier E2E Test Suite (All 115 Tests)
```bash
node --test --import tsx \
  apps/api/src/tests/e2e/tier1-feature-coverage.test.ts \
  apps/api/src/tests/e2e/tier2-boundary-corner-cases.test.ts \
  apps/api/src/tests/e2e/tier3-cross-feature-interactions.test.ts \
  apps/api/src/tests/e2e/tier4-clinical-workloads.test.ts
```

### 2. Run Individual Tiers
- **Tier 1 (Isolated Feature Validation - 50 tests)**:
  ```bash
  node --test --import tsx apps/api/src/tests/e2e/tier1-feature-coverage.test.ts
  ```
- **Tier 2 (Boundary & Corner Cases - 50 tests)**:
  ```bash
  node --test --import tsx apps/api/src/tests/e2e/tier2-boundary-corner-cases.test.ts
  ```
- **Tier 3 (Cross-Module Pipelines - 10 tests)**:
  ```bash
  node --test --import tsx apps/api/src/tests/e2e/tier3-cross-feature-interactions.test.ts
  ```
- **Tier 4 (Real-World Clinical Workloads - 5 tests)**:
  ```bash
  node --test --import tsx apps/api/src/tests/e2e/tier4-clinical-workloads.test.ts
  ```

### 3. Run Monorepo Gates & Package Test Suites
- **Typecheck (6 stages)**: `npm run typecheck`
- **CSS Token Resolution**: `node scripts/check-css-tokens.mjs`
- **UTF-8 Encoding (0 mojibake)**: `node scripts/check-encoding.mjs`
- **Dynamic Imports**: `node scripts/check-dynamic-imports.mjs`
- **Environment Contract**: `node --import tsx scripts/check-env-contract.mjs`
- **Shared Package Tests (185 tests)**: `npm run test -w @dental/shared`
- **Web Package Tests (1,319 tests)**: `npm run test -w @dental/web`

---

## Feature Coverage Matrix

| # | Feature Domain | Requirement | Tier 1 (Isolated) | Tier 2 (Boundary) | Tier 3 (Cross-Module) | Tier 4 (E2E Workloads) | Pass Rate |
|---|----------------|-------------|:-----------------:|:-----------------:|:---------------------:|:----------------------:|:---------:|
| 1 | **UI 4-State Visual & CSS Tokens** | R1 | 5 / 5 | 5 / 5 | ✓ | ✓ | **100%** |
| 2 | **Mobile Touch Targets (>=44px)** | R1 | 5 / 5 | 5 / 5 | ✓ | ✓ | **100%** |
| 3 | **54-FZ Cashier & FFD 1.2 Tags** | R2 | 5 / 5 | 5 / 5 | ✓ | ✓ | **100%** |
| 4 | **Sberbank Acquiring Webhook** | R2 | 5 / 5 | 5 / 5 | ✓ | ✓ | **100%** |
| 5 | **NDFL XML 5.01 Certificate (КНД 1151156)** | R2 | 5 / 5 | 5 / 5 | ✓ | ✓ | **100%** |
| 6 | **Doctor Payroll Calculation Engine** | R2 | 5 / 5 | 5 / 5 | ✓ | ✓ | **100%** |
| 7 | **Schedule Concurrency & Lock Hierarchy** | R3 | 5 / 5 | 5 / 5 | ✓ | ✓ | **100%** |
| 8 | **043/u EMR Drafts & SHA-256 Signing** | R3 | 5 / 5 | 5 / 5 | ✓ | ✓ | **100%** |
| 9 | **Atomic Inventory Deductions on Sign** | R3 | 5 / 5 | 5 / 5 | ✓ | ✓ | **100%** |
| 10 | **Repository Gates & Integrity** | R4 | 5 / 5 | 5 / 5 | ✓ | ✓ | **100%** |
| **Total** | **All 10 Features** | **R1–R4** | **50 / 50** | **50 / 50** | **10 / 10** | **5 / 5** | **115 / 115 (100%)** |

---

## Detailed Test Suite Breakdown

### Tier 1: Feature Coverage (50 Tests)
- **Feature 1 (UI 4-State Visual & Tokens)**:
  - 1.1: Resolves all CSS tokens across Light, Dark, and Night themes (0 undefined).
  - 1.2: Confirms eradication of pulsing animations and glowing neon borders.
  - 1.3: Verifies night mode token fallback parity against light theme leakage.
  - 1.4: Verifies lab orders panel and modal overlay theme consistency.
  - 1.5: Verifies strict semantic color mapping without hardcoded purple-on-dark.
- **Feature 2 (Mobile Touch Targets >=44px)**:
  - 2.1: Enforces 44px touch targets on mobile schedule filter chips.
  - 2.2: Enforces 44px min-height/width on waitlist and shift navigation items.
  - 2.3: Enforces 44px touch targets on schedule appointment cards.
  - 2.4: Enforces 44px action buttons (`btn-sign`, `btn-save`).
  - 2.5: Enforces 44px history and modal close buttons.
- **Feature 3 (54-FZ Cashier & FFD 1.2 Tags)**:
  - 3.1: CRC16-CCITT checksum calculation for NSPK SBP QR.
  - 3.2: Dynamic SBP B2C QR URL generation with kopeck precision.
  - 3.3: SBP QR payload verification.
  - 3.4: FFD 1.2 fiscal receipt payload schema validation (Tags 1212, 1214, 1054, 1199, 2108).
  - 3.5: Split validation rejecting receipts when payment breakdown mismatch items total.
- **Feature 4 (Sberbank Acquiring Webhook)**:
  - 4.1: HMAC-SHA256 checksum across alphabetical key permutations.
  - 4.2: Rejection of tampered webhook amounts or secret keys (HTTP 401).
  - 4.3: State transition to `success` and ledger row creation in `payments`.
  - 4.4: Idempotent replay safety preventing duplicate payments.
  - 4.5: Rejection of unknown transaction `orderId` (HTTP 404).
- **Feature 5 (NDFL XML 5.01 Certificate)**:
  - 5.1: Valid XML generation for self-payer (КНД 1151156).
  - 5.2: Code 1 and Code 2 sum calculation to exact kopecks.
  - 5.3: Valid XML generation for family/other payer.
  - 5.4: Rejection of XML generation when tax year mismatches payment date year.
  - 5.5: Rejection of invalid clinic INN.
- **Feature 6 (Doctor Payroll Engine)**:
  - 6.1: Single-query CTE doctor commission aggregation.
  - 6.2: 0 RUB payout when cash collection is zero.
  - 6.3: Material cost deduction after calculating commission percentage.
  - 6.4: Rejection of phantom default 30% rate when unconfigured.
  - 6.5: Default full-month calendar resolution.
- **Feature 7 (Schedule Concurrency & Locks)**:
  - 7.1: Simultaneous doctor double-booking prevention (1x 201, 1x 409).
  - 7.2: Simultaneous chair double-booking prevention (1x 201, 1x 409).
  - 7.3: Simultaneous assistant double-booking prevention (1x 201, 1x 409).
  - 7.4: Simultaneous patient double-booking prevention (1x 201, 1x 409).
  - 7.5: Consecutive contiguous appointments permitted without conflict.
- **Feature 8 (043/u EMR Drafts & SHA-256 Signing)**:
  - 8.1: Complete SOAP notes persistence in diary drafts.
  - 8.2: Revision history tracking on draft edits.
  - 8.3: Deterministic SHA-256 calculation across all 8 clinical fields.
  - 8.4: Post-sign draft modification lock.
  - 8.5: Mirrored signed diary state into parent visit record.
- **Feature 9 (Atomic Inventory Deductions)**:
  - 9.1: Automatic stock deduction on diary sign.
  - 9.2: Inventory transaction logging with `auto_deduct`.
  - 9.3: Deadlock-free sorted item locking order.
  - 9.4: Multi-tenant stock isolation.
  - 9.5: Atomic completion of treatment items.
- **Feature 10 (Repository Gates & Integrity)**:
  - 10.1: CSS token gate (0 undefined variables).
  - 10.2: Encoding gate (0 mojibake).
  - 10.3: Dynamic imports gate (all resolve).
  - 10.4: Env contract gate (all documented).
  - 10.5: Zero mocks and zero // TODO placeholders in production.

### Tier 2: Boundary & Corner Cases (50 Tests)
- Stress testing, invalid combinations, boundary values (0 RUB, 100M RUB, 1-second slot overlaps, stock exhaustion, invalid keys, negative payouts, Cyrillic HMAC encoding, empty payload rejection, fail-closed gate behaviors).

### Tier 3: Cross-Feature Interactions (10 Tests)
- Multi-step cross-module chains combining Scheduling, EMR 043/u, SHA-256 signing, Inventory, Sberbank acquiring, Split payments (Cash + SBP), Lab order deductions, Fiscal receipt generation, and NDFL tax XML certificates.

### Tier 4: Real-World Clinical Workload Scenarios (5 Tests)
- **Scenario 1**: Full Patient Lifecycle (Intake -> Treatment -> Multi-payment -> SHA-256 EMR -> 54-FZ Receipt -> Tax Cert).
- **Scenario 2**: High-Concurrency Schedule Storm (20 simultaneous parallel bookings across chairs/doctors).
- **Scenario 3**: Monthly Financial Closeout (Doctor payroll across specialties, lab deductions, consumables).
- **Scenario 4**: Multi-Visit Pulpitis Protocol (Visit 1 Extirpation & Advance -> Visit 2 Obturation & SBP Final Settlement).
- **Scenario 5**: Network Partition & Asynchronous Webhook Healing (Out-of-order callback reconciliation and revenue unlocking).

---

## Conclusion
The test suite is 100% operational, fully automated, resilient against race conditions, and compliant with all project constitutions in `AGENTS.md`. Ready for production CI gating.
