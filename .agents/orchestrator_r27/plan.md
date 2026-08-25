# Execution Plan — Round 27

## Mission
Execute Round 27: Odontogram Surface-Specific Morphology, Multi-Canal Order 804n Billing & Clinical Ergonomics Polish.

## Breakdown

### Phase 1: Deep Codebase & Anatomical Reconnaissance
- Examine `AnatomicalSvgOdontogram.tsx`, `anatomicalToothGeometries.ts`, `toothGeometry.ts`.
- Examine `OdontogramLiveInvoice.tsx` and `packages/shared/src/`.
- Audit existing tests in `apps/web/src/components/odontogram/__tests__/`.

### Phase 2: R1 - Anatomical Crown Multi-Surface Caries Mapping
- Model distinct geometric contours / sub-surfaces for each tooth type (incisors/canines: V, L, M, D, Cervical, Incisal; premolars/molars: V, L, M, D, O, Cervical).
- Support MOD / MO / DO / Class V specific surface pathology rendering.
- Bounded surface fills for composite (tooth-colored photopolymer) vs amalgam (metallic) vs caries (cavity/amber/brown) rather than whole-crown flood when surfaces are designated.
- Verify full-coverage crown still appropriately covers the entire crown.

### Phase 3: R2 - Multi-Canal Root Order 804n Invoice Generation
- Define anatomical canal count mapping per FDI tooth number (11-48, 51-85):
  * Upper Incisors/Canines (11, 12, 13, 21, 22, 23): 1 canal
  * Upper 1st Premolar (14, 24): 2 canals (bifurcated/buccal+palatal)
  * Upper 2nd Premolar (15, 25): 1-2 canals (typically 1-2)
  * Upper Molars (16, 17, 26, 27): 3 canals (MB, DB, P) or 4 (MB2)
  * Lower Incisors/Canines (31, 32, 33, 41, 42, 43): 1 canal
  * Lower Premolars (34, 35, 44, 45): 1 canal
  * Lower Molars (36, 37, 46, 47): 3 canals (Mesial 2 + Distal 1) or 4 canals
  * 3rd Molars (18, 28, 38, 48): variable (typically 3)
- Connect canal count to Minzdrav Order 804n codes:
  * Pulp extirpation / canal instrumentation (A16.07.030.001 - A16.07.030.004)
  * Root canal obturation / filling (A16.07.008.001 - A16.07.008.004)
  * Ultrasonic canal processing / medication if applicable
- Wire into `OdontogramLiveInvoice.tsx` and ensure exportable billing line items reflect true anatomical canal count.

### Phase 4: Unit Testing & Verification Gates
- Write thorough unit tests for multi-surface rendering and canal count derivation.
- Run `npm run typecheck -w @dental/web`.
- Run `npm test -w @dental/web`.
- Run `node scripts/check-css-tokens.mjs`.
- Run `node scripts/check-encoding.mjs`.

### Phase 5: Multi-Theme Visual Validation & Victory Audit
- Capture screenshots across themes (Dark, Light, Cyber X-Ray, etc.).
- Inspect screenshots autonomously.
- Dispatch Victory Auditor before claiming completion.
