# Visual Proofs: Flagship Anatomical Odontogram (Roots & Canals)

## Overview
Flagship interactive 3D anatomical odontogram with visible roots, pulp chambers, and root canals enabled by default (`showPulpAndCanals = true`).

## Live CRM 4-State Proofs (Current Verification)
- **PC Light (1440x900):** `odontogram_live_pc_light.png` (304.1 KB) — Flagship anatomical dental arch with restored titanium shaders and roots.
- **PC Dark (1440x900):** `odontogram_live_pc_dark.png` (305.0 KB) — High-contrast dark theme verification with enamel/pulp gradients.
- **Mobile Light (390x844):** `odontogram_live_mobile_light.png` (211.9 KB) — Mobile chairside workspace, 1-tap norm, FDI quadrant selector, Natural Thumb Zone.
- **Mobile Dark (390x844):** `odontogram_live_mobile_dark.png` (209.8 KB) — Mobile chairside dark theme, zero horizontal drift, touch targets $\ge 44\times 44$px.

## Artifact Proofs (4-State Screenshots)
- **PC Light (1440x900):** `odontogram_roots_and_canals_pc_light.png`
- **PC Dark (1440x900):** `odontogram_roots_and_canals_pc_dark.png`
- **Mobile Light (390x844):** `odontogram_roots_and_canals_mobile_light.png`
- **Mobile Dark (390x844):** `odontogram_roots_and_canals_mobile_dark.png`

## Invariants & Compliance
- **Zero Mocks / Real DOM:** Captured live from Chromium session on `http://127.0.0.1:5173/`.
- **Mandate 8b Compliance:** All modules $\le 120$ lines.
- **Mandate 8e Autonomy:** 1-click clinical presets ("Все здоровы (Норма)", "Санирован", "Без 8-ок").
