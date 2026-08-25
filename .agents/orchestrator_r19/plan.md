# Execution Plan — Orchestrator R19

## Task Objective
Autonomous multi-agent verification and visual inspection of HTML preview, PDF generation, and A4 print rendering across all statutory, clinical, fiscal, and regulatory documents in DENTE Dental CRM.

## Work Breakdown Structure

### Phase 1: Machine Verification Gates Baseline
- Run `npm run check:encoding`
- Run `node scripts/check-css-tokens.mjs`
- Run `npm run typecheck` across all 5 stages (shared -> shared:tests -> api -> api:tests -> web)
- Run unit/integration tests: `npm test -w @dental/shared`, `npm test -w @dental/web`, `npm test -w @dental/api`

### Phase 2: R1 Clinical EMR Forms & Diagnostic Reports Rendering
- Deep inspection of:
  - Form 043/u (`packages/shared/src/documents/forms043u.ts`, FDI 11-48/51-85, DMFT/КПУ index, CPITN, SOAP notes)
  - Form 043-1/u (`packages/shared/src/documents/forms043_1u.ts`, orthodontics, Tonn/Pont/Bolton indices, TRG cephalometrics)
  - Form 037/u-88 (`packages/shared/src/documents/forms037u.ts`, daily dentist sheet)
  - Form 039/u-88 (`packages/shared/src/documents/forms039u.ts`, summary journal, UET Order 804n)
  - Form 003-В/у (`packages/shared/src/documents/forms003vu.ts`, medical expertise/temporary disability)
  - Radiation Dose Sheet SanPiN (`packages/shared/src/documents/radiationDoseSheet.ts`)
- Verify HTML rendering logic in `clinicalHtmlRenderers.ts` and backend `renderDocument.ts`

### Phase 3: R2 Legal Contracts, Informed Consents & Consumer Rights Package
- Deep inspection of:
  - Paid Medical Services Contract (736-PP)
  - 10 Specialized Informed Medical Consents (323-FZ, Order 1051n):
    1. Primary examination & diagnostic
    2. Therapeutic treatment (caries/endodontics)
    3. Surgical intervention & extraction
    4. Dental implantation
    5. Orthopedic rehabilitation & prosthetics
    6. Orthodontic treatment
    7. Periodontal therapy
    8. Professional hygiene & teeth whitening
    9. Pediatric dentistry
    10. Local anesthesia
  - Refusal of medical intervention (323-FZ Art. 20)
  - Personal Data Processing Consent (152-FZ)
  - Act of completed medical works
  - Warranty certificates & treatment plans

### Phase 4: R3 Tax Certificates, Fiscal Receipts & SanPiN Registers
- Deep inspection of:
  - FNS 13% NDFL Tax Certificate (KND 1151156, Format 5.01) with Medical Service Code 01 (standard) / Code 02 (expensive treatment) split, exact kopeck arithmetic
  - SanPiN 3.3686-21 Registers:
    - Pre-sterilization cleaning journal (PSO Form 366/u)
    - Autoclave / Steam sterilizer control journal (Form 257/u, Azopiram/Phenolphthalein tests)
    - Bactericidal irradiator / UV recirculator operating hours journal
    - Medical waste disposal journal (Classes A, B, V, G)
    - Emergency situation / Anti-HIV injury prevention journal

### Phase 5: R4 Multi-Theme Visual Quality, A4 Print CSS & Responsive Layouts
- Multi-Theme verification across 10 themes: `light`, `dark`, `night`, `calm_teal`, `contrast`, `sakura`, `ocean`, `emerald`, `cyber_xray`, `warm_sand`
- Check all CSS custom variables resolution (`scripts/check-css-tokens.mjs`)
- Touch target sizing (min 44x44px for buttons, tabs, interactive elements)
- Cumulative Layout Shift verification (CLS = 0)
- A4 Print CSS rules (`@media print`, `@page { size: A4; margin: ... }`, page-break-inside, table layout) in `clinicalHtmlRenderers.ts` and `apps/web/src/styles/`

### Phase 6: Autonomous Multi-Agent Verification & End-to-End Execution
- Run automated rendering tests across all document templates
- Execute PDF generation test harness simulating headless print pipeline
- Generate detailed empirical verification proof with zero mocks
