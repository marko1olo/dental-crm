# Orchestration Plan — orchestrator_r39

## Objective
Implement, audit, and verify all 5 core clinical and operational domains for DENTE Dental CRM:

1. **Domain 1: Clinical EMR & SOAP Protocol 043/u**
   - Pediatric (51-85) & permanent (11-48) odontogram with mixed dentition stages (6-12 yrs)
   - 140-160px tooth height for glove touch operation
   - 11 standardized complaint presets
   - Automated ICD-10 tooth diagnosis binding
   - Order 1094n Form 107-1/u statutory prescriptions
   - Articaine 4% safety dosage engine
   - AAP/EFP Periodontal Chart

2. **Domain 2: Finance & 54-FZ Fiscalization**
   - 54-FZ FFD 1.2 QR code validation (t, s, fn, i, fp, n) with kopeck-exact arithmetic
   - Composite Idempotency-Key (`<uuidv7>#<payloadHash>`)
   - Fast cash register with quick bill buttons & instant change calculation
   - Document refund settlement pipeline syncing `generated_documents` refunds with `payments.status`
   - Form T-51 doctor payroll calculation

3. **Domain 3: Inventory & Order 804n Clinical Writeoff**
   - Automated BOM material write-off based on Ministry of Health Order 804n service codes (A16.07.002.001 Composite filling, A16.07.030.001 Anesthesia)
   - Statutory TORG-13 inter-cabinet and inter-branch transfer forms
   - TORG-2 discrepancy acts
   - FEFO expiration tracking

4. **Domain 4: SanPiN 3.3686-21 Sterilization & Autoclave Log**
   - Form 257/u digital autoclave cycle logger with 5-point chemical indicator validation (KT-1..KT-5, class 4/5 integrators) and spore tests
   - Form 366/u Pre-Sterilization Cleansing (PSO) quality control
   - Pure TypeScript vector DataMatrix 2D & Code128 1D thermal label printers for kraft packages

5. **Domain 5: Multi-Platform Topology & LAN Discovery**
   - Desktop Windows EXE (.exe) direct TCP socket communication with ATOL/Shtrikh-M KKT & silent thermal printing
   - Mobile Android APK (.apk) touch targets >= 48px & camera DataMatrix scanner
   - Cabinet Offline -> Clinic LAN -> Cloud PostgreSQL 3-tier synchronization with Field-Level LWW CRDT and IndexedDB mutation outbox

## Quality Gates
- `npm run check:encoding` == 0
- `node scripts/check-css-tokens.mjs` == 0
- `npm run typecheck` == 0
- `npm run verify:cross-platform` == 0
- All unit & integration tests exit 0
- 4-state visual confirmation (Mobile Light, Mobile Dark, PC Light, PC Dark)
