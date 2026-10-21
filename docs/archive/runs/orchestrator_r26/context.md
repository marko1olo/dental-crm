# Context for Project Orchestrator (Round 26)

## Mission
Execute Teamwork Project: DENTE Dental CRM Odontogram, Clinical Suite & Visual Integrity Overhaul.

## Repository Root
`C:\Clinic_MVP\dental-crm`

## Working Directory
`C:\Clinic_MVP\dental-crm\.agents\orchestrator_r26`

## Authoritative User Request
Read verbatim request at `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`.

## Key Invariants & Requirements

### R1. Authentic Anatomical Pulp & Root Canal Engine
- Pulp & Root Canal Visibility Invariants:
  * By default on healthy/restored teeth with standard view, internal pulp cavities and root canals are hidden (`showCanals === false`).
  * Only when the doctor explicitly toggles the «Каналы» / X-Ray button or when endodontic pathology is assigned (`state === "Pulpitis"` or `isEndoTreated`), the pulp chamber and canal lumens are rendered.
  * Color Harmony: Pulp must never be purple (`#c084fc`). Healthy pulp uses vascular living soft-tissue pink/red gradient (`#fda4af` -> `#f43f5e`), while Pulpitis uses hyperemic inflamed ruby/crimson (`#ef4444` -> `#991b1b`).
  * Single-Rooted Anatomical Continuity: For incisors (11, 12, 21, 22, 31, 32, 41, 42), canines (13, 23, 33, 43), and premolars (34, 35, 44, 45), the coronal pulp chamber with pulp horns connects continuously into the root canal lumen extending smoothly down to the root apex.

### R2. 1-Click Clinical Form 043/u Protocol & Periodontal Charting
- Integrated periodontal 6-point probing depth logging (MB, B, DB, ML, L, DL) per tooth.
- Automatic generation of Form 043/u clinical diary entries with ICD-10 codes (K02.1, K04.0, K05.3) directly from marked odontogram findings.
- 1-Click Anesthesia Logger with standard clinical carpule presets (Ultracain D-S 1:100000, Septanest, Scandonest 3%).

### R3. Flawless 10-Theme Harmony & 4-State Visual Proof
- Zero hardcoded hex colors that break themes; 100% resolution of CSS design tokens (`var(--paper)`, `var(--ink)`, `var(--canvas)`, `var(--border)`).
- Minimum touch target area >= 44x44px across all buttons and clickable teeth.
- 4-State visual screenshots captured and verified autonomously: Mobile Light, Mobile Dark, PC Light, PC Dark.

## Acceptance Criteria
- [ ] `node scripts/check-encoding.mjs` passes with 0 encoding defects.
- [ ] `node scripts/check-css-tokens.mjs` passes with 0 token defects.
- [ ] `npm run typecheck -w @dental/web` passes with 0 errors.
- [ ] `npm test -w @dental/web` passes 100% of unit tests.
- [ ] 4-State visual screenshots captured and verified.
