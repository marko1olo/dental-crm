# BRIEFING — 2026-10-18T22:23:30Z

## Mission
Исследование мобильной эргономики и стандартов Apple HIG для стенда Зуба 46 (Gate 0) на мобильном вьюпорте 390×844: ликвидация обрезания слов пресетов («Пу.») и вертикального клиппинга корней/апексов зуба.

## 🔒 My Identity
- Archetype: explorer
- Roles: Mobile Ergonomics & Apple HIG Inspector, Forensic UI Analyst
- Working directory: C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_remediation_5_2
- Original parent: 987018df-6f5f-4542-ab02-ae4ce2a9f05f (Orchestrator Gate 0)
- Milestone: Gate 0 Tooth 46 Remediation Iteration 5

## 🔒 Key Constraints
- Read-only investigation — do NOT implement in production source files.
- Deliver findings and concrete actionable proposals to `C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_remediation_5_2\handoff.md`.
- Ensure strict adherence to Apple HIG, Mandate 8ze/8al (touch target >= 44x44px, natural thumb zone, 0px horizontal scroll drift, zero word truncation).
- Tooth46StandToggles.tsx must remain <= 120 lines.
- Complete evidence chain with exact line numbers, measurements, and calculations.

## Current Parent
- Conversation ID: 987018df-6f5f-4542-ab02-ae4ce2a9f05f
- Updated: 2026-10-18T22:23:30Z

## Investigation State
- **Explored paths**:
  - `apps/web/src/components/odontogram/gate0/Tooth46InspectionStand.tsx`
  - `apps/web/src/components/odontogram/gate0/Tooth46StandToggles.tsx`
  - `apps/web/src/components/odontogram/gate0/Tooth46StandHeader.tsx`
  - `apps/web/src/components/odontogram/gate0/Tooth46Container.tsx`
  - `apps/web/src/components/odontogram/gate0/Tooth46ClinicalPresets.ts`
  - `apps/web/src/components/odontogram/gate0/Tooth46ProstheticBar.tsx`
  - `docs/proofs/odontogram/gate0_tooth46_mobile_light.png`
  - `docs/proofs/odontogram/gate0_tooth46_mobile_dark.png`
  - `scripts/capture-odontogram-gate0-4state.mjs`
- **Key findings**:
  1. Truncation of "Пульпит" to "Пу.": caused by wide label "СОСТОЯНИЕ:" (80.8px) + "Интактный" (78.1px) + "Кариес Class I" (104.5px) pushing "Пульпит" to 347px against 358px boundary. Switching to "ПРЕСЕТ:" leaves 39.9px clearance, rendering "Пульпит" 100% visible. Adding `[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent_100%)]` provides canonical iOS smooth fade cue.
  2. Root and Apex vertical clipping: caused by 6 rows of toggle buttons taking 204-260px vertical height, pushing `<main>` card down so apexes are cut off at 844px. Collapsing layer toggles to a horizontal swipe carousel on mobile (`overflow-x-auto scrollbar-none md:flex-wrap`) saves 182px, expanding card height to ~638px and yielding ~150-300px clearance below apexes (requirement >= 24-32px).
  3. Mandate 8b line ceiling: Moving `LAYER_ITEMS` (21 lines) to `tooth46LayerConstants.ts` keeps `Tooth46StandToggles.tsx` at ~78-82 lines (<= 120 lines).
- **Unexplored areas**: None. Full evidence chain complete.

## Key Decisions Made
- Recommend horizontal chip carousel for both Presets and Layer Toggles on mobile with Apple HIG edge fade mask.
- Recommend responsive desktop wrap (`md:flex-wrap md:overflow-visible`) to maintain zero breaking changes for existing desktop/macro screenshot tests.
- Recommend extracting `LAYER_ITEMS` to `tooth46LayerConstants.ts` to guarantee strict compliance with Mandate 8b (<= 120 lines).

## Artifact Index
- `C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_remediation_5_2\DISPATCH.md`
- `C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_remediation_5_2\progress.md`
- `C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_remediation_5_2\BRIEFING.md`
- `C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_remediation_5_2\handoff.md` (to be written)
