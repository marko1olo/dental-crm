## 2026-10-19T09:46:50Z
You are the Parametric Infrastructure & Reusable Shaders Explorer for Gate 1 and the 32-tooth odontogram architecture. Subagents MUST read `C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md` before starting work. Your task is to investigate the 35 benchmark files of Gate 0 in `apps/web/src/components/odontogram/gate0/` and design the extraction and generalization of reusable SVG shaders, gradients, and pathological/restorative overlays into `apps/web/src/components/odontogram/shared/`. You are an architectural explorer and planner; you do NOT write or modify production code files.

Per `ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md` §6.2, we must prevent SVG DOM bloat when scaling from 1 tooth to 32 teeth. Currently, Gate 0 defines gradients inside `Tooth46ShaderDefs.tsx`. You must design a single, unified global shader palette `<defs id="dente-global-odontogram-defs">` that mounts once in the root odontogram container. Audit and catalog all gradient definitions: porcelain-enamel multi-stop gradient (`#ffffff` -> `#f8fafc` -> `#f1f5f9` -> `#e2e8f0` -> `#ded5c4`), dentin warm gradients, root shading, pulp chamber ruby-wine gel, gutta-percha radiant core, and all 6 crown materials (ZrO2, PFM with metal collar, E-Max high-translucency glass, Full Cast Gold, Co-Cr alloy, and PMMA temporary acrylic). Ensure every gradient ID has a collision-free namespace (e.g. `dente-shader-*`).

Analyze how clinical layers can be extracted into modular, parametric components that take tooth geometry inputs (e.g. crown outline, CEJ curve, root coordinates, apices, canal paths):
1) `CrownMaterialOverlay.tsx` & `CrownMaterialShaderDefs.tsx`: 6 materials, both Intact and Defective (chipping, dark cervical margin, wear perforation);
2) `CanalPostOverlay.tsx`: fiberglass translucent post and cast metal post-and-core along canal trajectories;
3) `CalculusBandOverlay.tsx`: supra- and sub-gingival calculus deposits mapped along the CEJ curve;
4) `AbfractionWedgeOverlay.tsx`: V-shaped cervical wedge defect with polished dentin floor;
5) `ImplantSlaOverlay.tsx`: Grade-5 SLA titanium implant with spiral threads, cervical collar, and abutment;
6) `ApicalHaloOverlay.tsx`: periapical lesions (flame-shaped periodontitis, circumscribed granuloma, cortical-bordered cyst) centered on arbitrary apex coordinates $[(x_1, y_1), (x_2, y_2), (x_3, y_3)]$;
7) `MissingToothCrossOverlay.tsx`: red surgical extraction cross with ghost root outline.

Tooth 46 is currently 100% approved in `apps/web/src/components/odontogram/gate0/` (35 files, 8 passing tests, 10 Playwright screenshots). Any extraction of shared components must follow a non-destructive migration pattern:
1) Define the shared layer in `apps/web/src/components/odontogram/shared/`;
2) Verify whether Gate 0 can import from `shared/` without altering visual output by even 1 pixel;
3) Alternatively, keep `gate0/` as an immutable frozen benchmark and consume `shared/` for `gate1/` and future teeth, with a backward-compatibility facade;
4) Propose the exact, safest strategy that guarantees zero broken tests and zero compilation regressions (`npx tsc --noEmit` Exit Code 0, `exactOptionalPropertyTypes: true`).

Detail the file breakdown for `apps/web/src/components/odontogram/shared/` ensuring strict adherence to Mandate 8b (every single file <= 120 lines). Include TypeScript interfaces, prop types, and export structures. Document your findings and migration blueprint in `C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_gate1_parametrization\handoff.md`. When finished, message the orchestrator with your summary.
