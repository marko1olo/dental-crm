# PLAN — Round 26: DENTE Dental CRM Odontogram, Clinical Suite & Visual Integrity Overhaul

## 1. Objectives & Scope
- **R1. Authentic Anatomical Pulp & Root Canal Engine**:
  * Pulp & Root Canal Visibility Invariants: Default hidden (`showCanals === false`); rendered when `showPulpAndCanals` is toggled OR when `state === "Pulpitis"` OR `isEndoTreated`.
  * Color Harmony: Soft-tissue vascular pink/red gradient (`#fda4af` -> `#f43f5e`) for vital pulp; hyperemic inflamed ruby/crimson (`#ef4444` -> `#991b1b`) for Pulpitis; NO purple `#c084fc`.
  * Single-Rooted Anatomical Continuity: Incisors (11, 12, 21, 22, 31, 32, 41, 42), canines (13, 23, 33, 43), premolars (34, 35, 44, 45) must have continuous coronal pulp chamber connecting into root canal lumen down to root apex.
- **R2. 1-Click Clinical Form 043/u Protocol & Periodontal Charting**:
  * Periodontal 6-point probing depth logging (MB, B, DB, ML, L, DL) per tooth.
  * Form 043/u clinical diary entries with ICD-10 codes (K02.1, K04.0, K05.3) auto-generated from marked findings.
  * 1-Click Anesthesia Logger with standard clinical carpule presets (Ultracain D-S 1:100000, Septanest, Scandonest 3%).
- **R3. Flawless 10-Theme Harmony & 4-State Visual Proof**:
  * 0 broken CSS tokens across all 10 themes.
  * Touch targets >= 44x44px.
  * 4-State screenshots (Mobile Light, Mobile Dark, PC Light, PC Dark) verified.

## 2. Verification Gates
1. `node scripts/check-encoding.mjs` (0 errors)
2. `node scripts/check-css-tokens.mjs` (0 errors)
3. `npm run typecheck -w @dental/web` (0 errors)
4. `npm test -w @dental/web` (100% pass)
5. Multi-theme visual screenshot capture & inspection.
