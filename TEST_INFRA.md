# E2E Test Infra: EGISZ, SEMD 108, FNS Tax, and Legal Compliance

## Test Philosophy
- Opaque-box, requirement-driven.
- Derived strictly from `ORIGINAL_REQUEST.md`, federal regulations (Minzdrav 947n/804n, FNS EA-7-11/824@, Decree 458, 323-FZ, 152-FZ, KoAP 14.1), and Russian cryptographic standards (GOST R 34.10-2012 / 34.11-2012).
- Zero tolerance for mocks in production verification.

## Feature Inventory & Test Coverage Goals
| # | Feature | Requirement Source | Tier 1 (Target) | Tier 2 (Target) | Tier 3 (Target) |
|---|---------|-------------------|:---------------:|:---------------:|:---------------:|
| 1 | DB Schema & Hash-Chained Audit Trail | R6 (323-FZ/152-FZ) | 5 | 5 | ✓ |
| 2 | SEMD 108 CDA R2 Generator & 5-Surface Odontogram | R1 (Minzdrav 108/804n) | 5 | 5 | ✓ |
| 3 | Dual CAdES-BES & CryptoPro Verifier | R2 (GOST 34.10/34.11) | 5 | 5 | ✓ |
| 4 | OIIS Gateway REST Outbox & WebSockets | R3 (EGISZ REMD/EPGU) | 5 | 5 | ✓ |
| 5 | FNS Tax Deduction (KND 1151156 5.01) | R4 (Decree 458/XSD 5.01) | 5 | 5 | ✓ |
| 6 | MIAC Form 039/u & Order 804n UET | R5 (Form 039/u-02) | 5 | 5 | ✓ |
| 7 | 4 Specialty IDS Consents & Refusal Scripts | R7 (323-FZ Art. 20) | 5 | 5 | ✓ |

## Test Architecture
- Test Runner: Vitest / Node native test runner (`apps/api/src/services/**/*.test.ts`, `apps/web/src/tests/**/*.test.ts`) + E2E integration runner.
- Test Suite Location: `apps/api/src/services/` (unit & integration), `apps/web/src/tests/` (frontend component & store tests), and dedicated regulatory compliance suites.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | **Complex Dental Consultation & EGISZ Registration**: Doctor completes visit for patient with multiple carious lesions, records 5-surface odontogram (FDI 46 O/D, 36 O), attaches ICD-10 K02.1 and Order 804n restorative procedures, signs with Doctor UKEP, triggers Clinic MO UKEP, and transmits to OIIS Outbox with live WebSocket status updates to REMD. | R1, R2, R3, R6 | High |
| 2 | **Full Family Tax Deduction Package**: Patient requests NDFL tax deduction certificate for calendar year 2026 covering personal therapy (Code 1) and child implant surgery (Code 2, Decree 458), verifying integer kopeck math and XSD 5.01 schema validation. | R4, R6 | High |
| 3 | **Monthly Chief Medical Officer Regulatory Audit**: CMO generates Form 039/u monthly report across 5 clinic doctors, validating adult vs child UET calculations, primary/repeat ratios, and caries/pulpitis/extraction pathology breakdowns against rendered services. | R5, R6 | Medium |
| 4 | **Surgical Implant Intervention with Specialty IDS & Refusal Handling**: Patient scheduled for bilateral sinus-lift and 4 dental implants signs specialty Surgery/Implant IDS with acknowledged clinical risks; on refusing preoperative dental CT scan, receptionist triggers 323-FZ refusal speech script and executes formal refusal document. | R7, R6 | High |
| 5 | **Cryptographic Audit Tamper Detection**: Concurrent multi-user actions write to hash-chained `egisz_audit_logs`; a simulated malicious DB update modifying historical payload is detected by validation routine which flags broken SHA-256 link. | R6 | High |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥ 35 test cases (≥5 per feature)
- **Tier 2 (Boundary & Corner Cases)**: ≥ 35 test cases (≥5 per feature)
- **Tier 3 (Cross-Feature Interaction)**: ≥ 10 test cases (pairwise coverage)
- **Tier 4 (Real-World Workloads)**: ≥ 5 end-to-end application scenarios
- **Total Minimum Test Count**: ≥ 85 test cases
