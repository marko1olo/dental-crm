# Project Orchestrator Plan — Round 18

## Mission Scope
Comprehensive Full-Stack Architecture Refinement, Regulatory Integration & Quality Hardening: DENTE Dental CRM.

## Milestones & Work Breakdown

### Milestone 1: Automated Verification of Static Gates & Infrastructure
- [x] Run `npm run check:encoding` across 2750+ files (0 errors required).
- [x] Run `node scripts/check-css-tokens.mjs` (0 unresolved tokens, 0 light fallbacks in dark themes).
- [ ] Run `npm run typecheck` across all packages (`@dental/shared`, `@dental/api`, `@dental/web`).
- [ ] Run `npm test -w @dental/shared` (210+ unit tests).
- [ ] Run `npm test -w @dental/web` (1475+ unit tests).

### Milestone 2: R1 Regulatory Integrations Audit & Verification
- [ ] EGISZ REMD SEMD 108 CDA R2 Generator & Validator:
  - 5 mandatory clinical sections (Anamnesis, FDI tooth formula ISO 3950: M, D, V, L, O, ICD-10 diagnostics, Order 804n nomenclature services with UET calculation, Treatment plan & recommendations).
  - Strict validator for OID roots (FRMO, FRMR, FRNSI) and 192-P SNILS checksum algorithm.
- [ ] Double CAdES-BES Cryptographic Signatures (GOST R 34.10-2012 / CryptoPro).
- [ ] EGISZ REMD Outbox Queue & Gateway (`egisz_outbox`, `egisz_audit_logs`).
- [ ] FNS 13% NDFL Tax Deduction XML Exporter (KND 1151156 Format 5.01 / Order EA-7-11/824@).
- [ ] MDLP / Chestny Znak Scheme 10560 with GS1-128 DataMatrix parser.

### Milestone 3: R2 Clinical, Diagnostic & Front-Desk Modules
- [ ] Anatomical FDI Odontogram & Periodontal / Endodontic Protocols (Adult 11–48, Pediatric 51–85, Florida Probe CAL/PSR/BOP, MB1/MB2/DB/P apex locator & ISO file size).
- [ ] DICOM 3D MPR CT Viewer & Mandibular Nerve Safety (Axial, Sagittal, Coronal MPR, HU bone density Misch D1–D4, 3D Euclidean distance warning d < 2.0 mm).
- [ ] Dental Lab CAD/CAM Work Orders & Schedule Waitlist Auto-Fill (VITA shade map A1–D4 / ND1–ND9, 7-stage kanban, waitlist scoring & dispatch).

### Milestone 4: R3 10-Theme Design System & UI Ergonomics
- [ ] Verify 10 visual themes: `light`, `dark`, `night`, `calm_teal`, `contrast`, `sakura`, `ocean`, `emerald`, `cyber_xray`, `warm_sand`.
- [ ] Touch target ergonomics: all interactive buttons >= 44px for sterile glove use.
- [ ] 0 layout shifts (CLS), 0 horizontal overflow on 390px mobile viewports.

### Milestone 5: R4 Codebase Hygiene, Zero Mocks & Git Discipline
- [ ] Scan codebase for any `// TODO`, `// implement later`, or mock interfaces in production paths.
- [ ] Stage and verify atomic per-file Git commits per Mandate 8b.
- [ ] Push to `origin/main`.
