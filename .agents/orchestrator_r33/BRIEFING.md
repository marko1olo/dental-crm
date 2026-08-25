# BRIEFING — 2026-08-23T00:08:00Z

## Mission
Lead the multi-domain autonomous engineering and verification for DENTE Dental CRM across all 5 core clinical and operational domains (EMR/043/u, 54-FZ Finance, Order 804n Inventory, SanPiN Sterilization, Telephony/Offline Resilience).

## 🔒 My Identity
- Archetype: orchestrator
- Working directory: C:\Clinic_MVP\dental-crm\.agents\orchestrator_r33
- Sentinel Conversation ID: eabed84d-7d4e-4354-beca-41df6e4a644d
- Head Commit: 830518b73b657956aeb7474bb0a1ed19e866be00

## 🔒 Key Constraints
- Multi-domain DENTE CRM constitution at C:\Clinic_MVP\dental-crm\.agents\AGENTS.md
- Zero Mocks / Absolute completeness on every interface, function, and calculation
- Multi-theme & UTF-8 encoding integrity strictly maintained
- Mandatory machine gates: typecheck, check:encoding, check-css-tokens, domain test suites

## Domain Decomposition & Target Capabilities
- **R1. Clinical EMR, Odontogram & SOAP Protocol 043/u**: Touch-first responsive tooth formula, 1-click pathology selection, ICD-10 bindings (K02, K04, K05, K08), Order 1094n statutory prescription generation, Articaine max safe dosage calculator (mg/kg).
- **R2. Finance, 54-FZ Fiscalization & Doctor Payroll**: Multi-tender split payment (Cash, Card, SBP QR, Advance offset, Family wallet), FFD 1.2 tags (1214, 1212, 1030) and dynamic FNS QR verification string, T-51 doctor payroll calculation deducting lab costs and materials.
- **R3. Inventory, Order 804n Clinical Writeoff & Inter-Branch Transfers**: Procedure BOM auto-writeoff for dental services (A16.07.002.001), FEFO expiration sorting and бракераж of expired batches, Statutory acts generation: Form 0504230, M-11, TORG-2 discrepancy acts, and TORG-13 transfer notes.
- **R4. SanPiN 3.3686-21 Sterilization & Autoclave Log**: Form 257/u digital autoclave log with 5-point chamber chemical indicator audit (KT-1..KT-5), Form 366/u pre-sterilization cleansing (ПСО) quality control tests (Azopyram, Phenolphthalein, Sudan III), Pure TypeScript vector DataMatrix & Code128 kraft package label generation.
- **R5. Telephony, Schedule & Multi-Platform Offline Resilience**: WebRTC SIP integration with incoming call HUD, patient debt/last visit preview, and 1-click booking, Chair and doctor collision prevention with Postgres 18 exclusion constraints and 0–100 waitlist matching, Offline-first IndexedDB CRDT mutation queue with automatic background sync upon reconnection.

## Project Status
- **Phase**: in progress
- **Verification Gates**:
  - `npm run check:encoding`: PASSED (3433 files clean)
  - `node scripts/check-css-tokens.mjs`: PASSED (6941 var() clean, 0 unresolved)
  - `npm run typecheck`: running (task-17)

## Artifact Index
- `C:\Clinic_MVP\dental-crm\.agents\orchestrator_r33\BRIEFING.md` — Active briefing and domain state index
- `C:\Clinic_MVP\dental-crm\.agents\orchestrator_r33\progress.md` — Granular execution milestone progress log
