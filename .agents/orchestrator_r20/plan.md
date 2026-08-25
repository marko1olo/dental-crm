# Execution Plan — Orchestrator R20

## Mission
Executive Russian Statutory Medical Documents Overhaul & Typography Redesign.

## Decomposed Epics & Workstreams

### Workstream 1: Statutory Legal & Clinical Conformity (Minzdrav RF & GOST R 7.0.97-2016)
- **Official GOST R 7.0.97-2016 Requisites Header**:
  * Left: Clinic Legal Name, OGRN, INN/KPP, Legal Address, Phone, Email, Website, Medical License details (No., Date, Issuing Authority).
  * Right: Ministry of Health statutory requisites block («Министерство здравоохранения РФ», «Медицинская документация», «Учетная форма №...», «Код формы по ОКУД»).
- **All 12 Clinical & Statutory Forms**:
  1. Форма № 043/у: Full passport table, anamnesis, allergies, 5-surface FDI formula, DMFT/КПУ calculation, CPITN, bite, and SOAP clinical diaries.
  2. Форма № 043-1/у: Facial anthropometry, TRG cephalometry (SNA, SNB, ANB, Wits), biometric indices (Tonn, Pont, Bolton), and Damon Q2 mechanics plan.
  3. Форма № 037/у-88: Daily patient work ledger, Black classes I–V, endodontics, and UET aggregation per Minzdrav Order 804n.
  4. Форма № 039/у-88: Monthly summary statement with total UET aggregation and workload metrics.
  5. Форма № 003-В/у: Outpatient card extract with treatment chronology and ICD-10 diagnoses.
  6. Лист дозовых нагрузок: SanPiN 2.6.1.1192-03 compliance, device registry (Vatech EzRay / PaX-i 3D), individual effective dose calculation (mSv), and green safety zone limit.
  7. Договор платных медицинских услуг (ПП РФ № 736 от 11.05.2023): Mandatory contractor license data, consumer ID / passport details, payment schedule, guarantee conditions, dispute resolution.
  8. Информированные добровольные согласия (ИДС per 323-FZ & Order 1051n): General admission, Therapy, Anesthesia, Surgery, Implantation, Orthopedics, Orthodontics, Hygiene, Pediatrics.
  9. Отказ от медицинского вмешательства (323-ФЗ ст. 20).
  10. Согласие на обработку персональных данных (152-ФЗ).
  11. Акт сдачи-приемки оказанных медицинских услуг.
  12. Гарантийный талон, Памятка пациента и Смета лечения.

### Workstream 2: Executive Typography, Micro-Styling & Authentic Seals
- **Typography & Geometry**:
  * Clean typography stack with high legibility (`"PT Sans", "Segoe UI", Arial, "Times New Roman", serif`), baseline grid, 1.25–1.35 line height, 1.25 cm paragraph indent.
  * Official margins: 20mm left, 10mm right, 15mm top, 15mm bottom.
  * Accent section headers: clean slate background (`#f1f5f9` in light, `#1e293b` in dark) with 3px solid cyan/blue left border and bold uppercase titles.
- **Table Design**:
  * Subtle clean borders (`border: 1px solid #cbd5e1;`), alternating row background (`#f8fafc`), right-aligned numeric data, and bold header cells (`#e2e8f0` / `#1e293b`).
- **Security & Stamp Elements**:
  * Dedicated QR Code / DataMatrix zone for document integrity verification and fiscal receipt links.
  * Authentic Signature & Stamp Zone: Left: Patient/Consumer with signature line; Right: Attending Doctor / Clinic Representative with seal zone («М.П.») or blue electronic signature box (УКЭП по 63-ФЗ).

### Workstream 3: Multi-Viewport & Print Rendering (A4 Print + 4-State Proof)
- Pixel-perfect `@media print` rules: explicit A4 page setup, zero orphan headings (`break-after: avoid;`), and strict table pagination (`break-inside: avoid;`).
- Complete 4-state visual compatibility: PC Light (1200×1600 @2x), PC Dark (`#0f172a`), Mobile Light (390×844 @2x), Mobile Dark (`#0f172a`).

### Workstream 4: Machine Verification Gates & Comprehensive Testing
- `npm run check:encoding`
- `node scripts/check-css-tokens.mjs`
- `npm run typecheck`
- `npm test -w @dental/shared`
- `npm test -w @dental/web`
- Document and compliance test suites (`renderDocument.test.ts`, `clinicalHtmlRenderers.test.ts`, `taxXml.test.ts`, `egiszOiisGateway.test.ts`, `fnsKnd1151156.test.ts`, `mdlpSchema10560.test.ts`, `fiscalReceiptFactory.test.ts`).
