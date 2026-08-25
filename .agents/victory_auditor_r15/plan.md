# Victory Audit Plan — DENTE Dental CRM (r15)

## Phase A: Timeline & Provenance Audit
1. Inspect Git history, commit graph, HEAD hash, author signatures, and commit message compliance (Mandate 12 & 8b).
2. Check for suspicious modifications, pre-populated logs, or timestamp anomalies.
3. Cross-reference work claims in `orchestrator_r15` handoff against repository history.

## Phase B: Cheating Detection & Zero Mocks Forensic Audit
1. Scan production code (`apps/`, `packages/`) for `// TODO`, `// implement later`, `// FIXME`, `NotImplementedError`, mock facades, and stubbed returns.
2. Search for disabled tests (`test.skip`, `it.skip`, `describe.skip`, `xit`, `xdescribe`).
3. Audit test files for fake assertions (`expect(true).toBe(true)`, `expect(1).toBe(1)` without real test logic).
4. Verify whether core algorithmic functions delegate to unpermitted external blackboxes or hardcoded lookup tables.

## Phase C: Independent Test & Compiler Execution & Deep Code Audit
1. Run and record stdout for:
   - `npm run check:encoding`
   - `node scripts/check-css-tokens.mjs`
   - `npm run typecheck`
   - `npm test -w @dental/shared`
   - `npm test -w @dental/web`
2. Perform forensic code inspection and verification of:
   - **R1: Clinical EMR & Odontogram**:
     - `apps/web/src/components/clinical/ToothChart.tsx` (Adult 11–48 & Pediatric 51–85 FDI numbering, 11 SVG shaders).
     - `apps/web/src/lib/clinicalProtocols043.ts` (`getToothAnatomicalNameRu`, ICD-10 templates, non-destructive `smart_append`).
     - `apps/web/src/services/DiarySigningCeremonyService.ts` (63-FZ SHA-256 integrity digest).
   - **R2: DICOM 3D MPR & Nerve Collision Engine**:
     - `apps/web/src/components/ct/Cornerstone3DViewer.tsx` (Axial, Sagittal, Coronal viewports & crosshairs).
     - `apps/web/src/lib/boneQualityEngine.ts` (Misch D1–D4 HU bone density classification).
     - `apps/web/src/lib/clinicalImplants.ts` (`distanceSegmentToSegment3D`, safety alarm thresholds <2.0mm, <1.5mm, <=0mm).
   - **R3: FinTech 54-FZ & NDFL 13% Tax Deduction**:
     - `packages/shared/src/utils/money.ts` (kopeck-exact integer arithmetic, 0% installment sum conservation).
     - `apps/web/src/lib/casePresentationPricing.ts` (NDFL Code 01 vs Code 02).
     - `apps/api/src/documents/taxXml.ts` (KND 1151156 XML 5.01 generation).
     - `apps/api/src/routes/billing.ts` & `apps/api/src/routes/sbpQr.ts` (54-FZ FFD 1.2 tags, idempotency, offline queue).
   - **R4: Visual UI, 10 Themes & Mobile Compliance**:
     - 10 theme definitions in `apps/web/src/store/themeStore.ts` and `themeClasses.ts`.
     - Touch targets >= 44px in `touch-targets.css`.
     - 390px mobile viewport horizontal overflow prevention in `overflow-fixes.css`.
3. Synthesize findings, generate `audit_report.md` and `handoff.md`, and send final message to parent.
