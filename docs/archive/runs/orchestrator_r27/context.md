# Context for Project Orchestrator (Round 27)

## Mission
Execute Round 27: Odontogram Surface-Specific Morphology, Multi-Canal Order 804n Billing & Clinical Ergonomics Polish.

## Repository Root
`C:\Clinic_MVP\dental-crm`

## Working Directory
`C:\Clinic_MVP\dental-crm\.agents\orchestrator_r27`

## Authoritative User Request
Read verbatim request at `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`.

## Key Invariants & Requirements

### R1. Anatomical Crown Multi-Surface Caries Mapping (MOD / MO / DO / Class V)
- In `apps/web/src/components/odontogram/AnatomicalSvgOdontogram.tsx` and `anatomicalToothGeometries.ts`:
  * Ensure crown sub-surfaces (Mesial, Occlusal, Distal, Vestibular, Lingual, Cervical) render distinct pathology fills when specific surfaces are marked.
  * Tooth-colored photopolymer composite vs amalgam fills should be bounded within the selected surface contours rather than flooding the entire crown unless full-coverage crown is assigned.

### R2. Root-Canal Count Accurate Minzdrav Order 804n Invoice Generation
- In `apps/web/src/components/odontogram/OdontogramLiveInvoice.tsx` and `packages/shared/src/`:
  * Auto-derive anatomical canal counts from tooth FDI number (e.g. Tooth 16/26: 3 canals; Tooth 46/36: 3 canals; Tooth 11/21: 1 canal; Tooth 14/24: 2 canals).
  * Generate accurate multi-canal Order 804n line items:
    - 1-канальный зуб (A16.07.008.001, A16.07.030.001)
    - 2-канальный зуб (A16.07.008.002, A16.07.030.002)
    - 3-канальный зуб (A16.07.008.003, A16.07.030.003)
    - 4-канальный зуб (A16.07.008.004, A16.07.030.004)

### R3. Quality & Verification Gates
- 0 TypeScript errors (`npm run typecheck -w @dental/web`).
- 100% unit test pass rate (`npm test -w @dental/web`).
- 0 broken CSS tokens across all 10 themes (`node scripts/check-css-tokens.mjs`).
- 0 encoding errors (`node scripts/check-encoding.mjs`).
- Capture fresh multi-theme screenshots and run independent Victory Audit before handoff.
