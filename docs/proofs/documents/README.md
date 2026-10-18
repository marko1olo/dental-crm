# Visual Proofs: Form 043/u Medical Card Flagship Odontogram

## Overview
Decomposed `DentalMedicalCardOdontogramTab` replacing legacy flat div grid boxes with the flagship anatomical `ToothChart` (with roots, pulp chambers, and root canals) inside Form 043/u (Медицинская карта приёма).

## Artifact Proofs (4-State Screenshots)
- **PC Light (1440x900):** `form043_odontogram_flagship_pc_light.png`
- **PC Dark (1440x900):** `form043_odontogram_flagship_pc_dark.png`
- **Mobile Light (390x844):** `form043_odontogram_flagship_mobile_light.png`
- **Mobile Dark (390x844):** `form043_odontogram_flagship_mobile_dark.png`

## Invariants & Compliance
- **Mandate 8b Compliance:** All decomposed files strictly $\le 120$ lines:
  - `DentalMedicalCardOdontogramTab.tsx` (106 lines)
  - `medicalCardOdontogram/fdiToothAdapter.ts` (99 lines)
  - `medicalCardOdontogram/OdontogramDmftBanner.tsx` (83 lines)
  - `medicalCardOdontogram/OdontogramStatusChipsBar.tsx` (49 lines)
  - `medicalCardOdontogram/OdontogramToothSurfaceEditor.tsx` (99 lines)
  - `medicalCardOdontogram/types.ts` (61 lines)
- **Zero Div Boxes:** Replaced with SVG/Canvas 3D anatomical mesh rendering.
- **Mandate 8e Autonomy:** 1-click global norm and DMFT (КПУ) index calculation.
