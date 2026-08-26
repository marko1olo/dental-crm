# E2E Test Infra: DENTE Dental CRM (Round 43)

## Test Philosophy
- Opaque-box & requirement-driven verification across the 3 strictly isolated tiers.
- Complete coverage across all 21 inventoried features in `PROJECT.md § Feature Inventory`.
- Multi-tier testing hierarchy: Category-Partition (Tier 1), Boundary & Corner Cases (Tier 2), Cross-Feature Interactions (Tier 3), Real-World Clinical Workloads (Tier 4), and Adversarial Coverage Hardening (Tier 5).

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|---------|-------------|:----------------:|:-----------------:|:-----------------:|:-----------------:|
| 1 | Large Anatomical Dental Arch | FDI 11..48 & 51..85, 140-160px height | 5 | 5 | ✓ | ✓ |
| 2 | 1-Click Diagnosis & Status Stamp | Caries, Pulpitis, Filling, Crown, Extracted | 5 | 5 | ✓ | ✓ |
| 3 | Order 804n Live Invoice & Tenders | Cash, Card, SBP, Balance, Cash Change HUD | 5 | 5 | ✓ | ✓ |
| 4 | Non-Intrusive SOAP Diary & Alerts | Form 043/u, chip suggestions, smart_append | 5 | 5 | ✓ | ✓ |
| 5 | Zero Blocking Popups on Hot Path | Direct cockpit mount, 0 modal barriers | 5 | 5 | ✓ | ✓ |
| 6 | 5-Surface Cavity & Canal Drawer | MOD surfaces, IROPZ > 0.6, ISO canal logs | 5 | 5 | ✓ | ✓ |
| 7 | Express Weight/Age Anesthesia Calc | Dosage limits, pediatric <=40kg, aspiration | 5 | 5 | ✓ | ✓ |
| 8 | SanPiN Kraft-Package Attachment | 2D scan, ISO 11607 shelf life, BOM deduction | 5 | 5 | ✓ | ✓ |
| 9 | Family Deposit & Loyalty Deductions | 54-FZ Tag 1215, family balance, cashback | 5 | 5 | ✓ | ✓ |
| 10 | 200x200 Viziograph Thumbnail Preview | IndexedDB media query, 200x200 WebP card | 5 | 5 | ✓ | ✓ |
| 11 | 3D DICOM / PACS MPR Viewer | Nerve <2.0mm alert, sinus metric, HU density | 5 | 5 | ✓ | ✓ |
| 12 | EGISZ CDA R3 Export & CryptoPro | SEMD 108/111 HL7 XML, SNILS/OID, UKEP sign | 5 | 5 | ✓ | ✓ |
| 13 | Doctor Payroll Form T-51 & T-13 | Piece-rate payroll, lab deduction, CSV export | 5 | 5 | ✓ | ✓ |
| 14 | FNS Tax Payment Certificate (1151156) | Order ED-7-11/824@, Code 01/02, NO_MEDOPL | 5 | 5 | ✓ | ✓ |
| 15 | Warehouse Audits & MDLP 10560 | Schema 10560 disposal, FEFO queue, TORG acts | 5 | 5 | ✓ | ✓ |
| 16 | Multi-Currency CBR Tourism Calc | 10 currencies, CBR rates, bank spread | 5 | 5 | ✓ | ✓ |
| 17 | 10 Cohesive Design Themes | 10 themes token compliance, 0 light leaks | 5 | 5 | ✓ | ✓ |
| 18 | WCAG 2.1 AA Contrast & Viewports | >=4.5:1 contrast, 390px / 1024px / 1440px | 5 | 5 | ✓ | ✓ |
| 19 | Medical Touch Ergonomics | >=44px base, 48-52px primary action buttons | 5 | 5 | ✓ | ✓ |
| 20 | 54-FZ Idempotency & Remediation | Idempotency keys, Banker's rounding, ACID | 5 | 5 | ✓ | ✓ |
| 21 | Dual Track Acceptance & Gating | 100% test pass across shared, api, and web | 5 | 5 | ✓ | ✓ |

## Test Runner Commands
- Shared Business Logic & Statutory Tests:
  `npm test -w @dental/shared`
- Web UI, Odontogram, & Clinical Tests:
  `node --import tsx --import ./testCssStub.mjs --test "src/components/odontogram/**/*.test.ts" "src/components/visit/**/*.test.ts" "src/tests/nurseProofUx.test.ts" "src/tests/perspectiveOdontogram.test.ts" "src/tests/challenger10ThemesWcagAudit.test.ts"`
- Typecheck Gate:
  `npm run typecheck`
- Encoding Gate:
  `node scripts/check-encoding.mjs`
- CSS Token Gate:
  `node scripts/check-css-tokens.mjs`
