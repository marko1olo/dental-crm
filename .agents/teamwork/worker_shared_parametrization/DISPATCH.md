## 2026-10-19T09:58:47Z
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You are the Shared Parametric Infrastructure Worker for the DENTE Dental CRM Odontogram. Subagents MUST read `C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md` before starting work. Your working directory is `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_shared_parametrization`. You EXCLUSIVELY own all files under `apps/web/src/components/odontogram/shared/**`. You MUST NOT write to or modify files in `gate0/` or `gate1/` or `apps/web/src/main.tsx`.

Your mission is to implement the reusable parametric infrastructure and clinical overlays in `apps/web/src/components/odontogram/shared/` according to the architectural blueprints in `C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_gate1_parametrization\handoff.md` and `C:\Clinic_MVP\dental-crm\.agents\ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md`. This layer provides the scalable vector foundation for all 32 adult and deciduous teeth, eliminating SVG DOM bloat and avoiding code duplication.

Implement the modular structure across the following subdirectories:
1) `defs/`:
- `DenteGlobalShaderDefs.tsx`: Root `<defs id="dente-global-odontogram-defs">` mounting all base gradients with canonical `dente-shader-*` namespace, plus SVG `href` aliasing (`dente-*` -> `dente-shader-*`) for 100% backward compatibility.
- `CrownMaterialShaderDefs.tsx`: 6 clinical crown materials (Zirconia ZrO2 multi-layer pearl, PFM with dark cervical metal collar, E-Max high-translucency lithium disilicate glass, Full Cast Gold, Co-Cr alloy, PMMA temporary acrylic) for both sound/adequate and defective states.
- `ToothShaderDefs.tsx`: Multi-stop porcelain enamel monolith, root dentin, root sulcus shadow, and furcation shadow.
- `ToothEndoShaders.tsx`: Coronal pulp chamber ruby-wine gel and radiant gutta-percha core/sheath gradients.
- `ToothPathologyShaders.tsx`: Demineralization halo, softened dentin lesion, necrotic crater, and periapical flame gradients.
- `ToothRestorationShaders.tsx`: Composite resin, adhesive seam, and secondary caries margin gradients.
2) `overlays/`:
- `CrownMaterialOverlay.tsx`: 6 crown materials with sound vs defective states (porcelain chipping, dark cervical margin gap, occlusal perforation).
- `CanalPostOverlay.tsx`: Fiberglass translucent post and cast post-and-core along canal trajectories.
- `CalculusBandOverlay.tsx`: Supra- and sub-gingival calculus deposits along the CEJ curve.
- `AbfractionWedgeOverlay.tsx`: V-shaped cervical wedge defect with sclerotic dentin floor.
- `ImplantSlaOverlay.tsx`: Grade-5 SLA titanium implant with spiral threads, collar, and abutment.
- `ApicalHaloOverlay.tsx`: Periapical lesions (flame-shaped periodontitis, granuloma, cyst) mapped to arbitrary apex coordinates.
- `MissingToothCrossOverlay.tsx`: Surgical red extraction cross with ghost root outline.
3) `types/`: Comprehensive TypeScript interfaces for overlays, shaders, and geometry constants.
4) `index.ts`: Barrel export of all shared components and defs.

MANDATE 8B INVARIANT: Every single file you create or edit MUST be strictly <= 120 lines (zero exceptions). Verify line lengths using a script. Ensure TypeScript `exactOptionalPropertyTypes: true` compliance (never pass raw `undefined` to optional booleans; use explicit booleans or fallbacks).

Verification requirements:
1) Run `npx tsc --noEmit -p apps/web/tsconfig.json` and ensure 0 compilation errors.
2) Run `npx vitest run apps/web/src/components/odontogram/gate0/` and verify all 8 Gate 0 tests pass 100% with zero regressions.
3) Document your work, file inventory with line counts, and test results in `C:\Clinic_MVP\dental-crm\.agents\teamwork\worker_shared_parametrization\handoff.md`. When complete, notify the orchestrator via `send_message`.

## 2026-10-19T10:13:56Z
**Context**: Revival after server restart & quota replenishment
**Content**: Квота восполнена, сервер перезапущен! Возобновляй работу по реализации `apps/web/src/components/odontogram/shared/`!
Напоминание ключевых требований:
1. Строго Mandate 8b: КАЖДЫЙ файл <= 120 строк (ноль исключений).
2. Реализуй `DenteGlobalShaderDefs.tsx`, `CrownMaterialShaderDefs.tsx`, 6 материалов коронок (ZrO2, PFM, E-Max, Gold, Co-Cr, PMMA в состоятельном и несостоятельном статусе), 7 параметрических оверлеев (Crown, CanalPost, CalculusBand, AbfractionWedge, ImplantSla, ApicalHalo, MissingToothCross).
3. Проверь TypeScript (`npx tsc --noEmit -p apps/web/tsconfig.json`) и нулевую регрессию Gate 0 (`npx vitest run apps/web/src/components/odontogram/gate0/`).
4. Зафиксируй отчет в `handoff.md` и сообщи оркестратору.
**Action**: Продолжай выполнение с прерванного места!
