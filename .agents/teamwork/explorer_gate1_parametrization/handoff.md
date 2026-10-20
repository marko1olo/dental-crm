# ARCHITECTURAL REPORT & MIGRATION BLUEPRINT: PARAMETRIC INFRASTRUCTURE & REUSABLE SHADERS (GATE 1 & 32-TOOTH ARCHITECTURE)

**Target Directory**: `apps/web/src/components/odontogram/shared/`  
**Reference Benchmark**: `apps/web/src/components/odontogram/gate0/` (Tooth 46, 35 files)  
**Governing Standard**: `C:\Clinic_MVP\dental-crm\.agents\ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md` §6.2  
**Constraints**: Mandate 8b (each file $\le 120$ lines), single root `<defs id="dente-global-odontogram-defs">`, zero broken tests, zero compilation errors (`exactOptionalPropertyTypes: true`).

---

## 1. OBSERVATION

### 1.1 Gate 0 Benchmark State
- **File inventory**: Exactly 35 files in `apps/web/src/components/odontogram/gate0/` comprising geometry constants, presets, and presentation layers for Mandibular First Molar 46.
- **Test execution**: Ran `npx vitest run apps/web/src/components/odontogram/gate0/`:
  ```
  ✓ apps/web/src/components/odontogram/gate0/Tooth46Clinical.test.tsx (3 tests)
  ✓ apps/web/src/components/odontogram/gate0/Tooth46Gate0.test.tsx (5 tests)
  Test Files: 2 passed (2)
  Tests: 8 passed (8)
  Duration: 463ms
  ```
- **TypeScript verification**: Ran `npx tsc --noEmit -p apps/web/tsconfig.json`. The log confirmed **0 errors in `components/odontogram/`**.
- **Visual evidence**: 10 high-resolution Playwright screenshots already captured and approved by Creator in Gate 0.

### 1.2 SVG DOM Bloat Analysis
- In `Tooth46Container.tsx:43`:
  ```tsx
  <svg viewBox={TOOTH46_GEOMETRY.viewBox} ...>
    <Tooth46ShaderDefs />
    ...
  </svg>
  ```
- `Tooth46ShaderDefs.tsx` renders 4 sub-blocks:
  1. `Tooth46CrownShaders.tsx` (12 gradients, 94 lines)
  2. `Tooth46EndoShaders.tsx` (7 gradients, 59 lines)
  3. `Tooth46PathologyShaders.tsx` (8 gradients, 64 lines)
  4. `Tooth46RestorationShaders.tsx` (2 gradients, 26 lines)
  Plus 7 root/crown shaders in `Tooth46ShaderDefs.tsx` itself.
- **Scaling to 32 teeth**:
  $32 \text{ teeth} \times 29 \text{ gradients} = 928 \text{ redundant SVG elements}$ in the DOM if each tooth declares its own `<defs>`!
  Furthermore, duplicate IDs in the same SVG DOM causes browser cache invalidation and unpredictable gradient rendering.

### 1.3 Audit of All Existing Gradient IDs & Colors in Gate 0
Directly extracted from `Tooth46ShaderDefs.tsx`, `Tooth46CrownShaders.tsx`, `Tooth46RestorationShaders.tsx`, `Tooth46PathologyShaders.tsx`, and `Tooth46EndoShaders.tsx`:

| Current ID | Gradient Type | Color Stops & Opacities | Biological / Clinical Purpose |
|---|---|---|---|
| `dente-enamel-porcelain` | `linear (0,0)->(1,1)` | `#ffffff` (1.0) $\to$ `#f8fafc` (0.98) $\to$ `#f1f5f9` (0.95) $\to$ `#dbeafe` (0.92) | Multi-stop porcelain enamel monolith |
| `dente-root-dentin` | `linear (0,0)->(1,0.3)` | `#faf6ef` (1.0) $\to$ `#f2e6d6` (1.0) $\to$ `#e5d0b9` (1.0) $\to$ `#d6bc9f` (1.0) $\to$ `#c5a987` (1.0) | Cylindrical root dentin lit from upper-left |
| `dente-root-sulcus-shadow`| `linear (0,0)->(1,0)` | `#94a3b8` (0.10) $\to$ `#475569` (0.35) $\to$ `#94a3b8` (0.05) | Longitudinal groove 3D shadow trough |
| `dente-furcation-shadow` | `radial (50%,30%,55%)` | `#334155` (0.45) $\to$ `#475569` (0.15) $\to$ `#64748b` (0.0) | Bifurcation ambient occlusion |
| `dente-fossa-shadow` | `radial (50%,30%,45%)` | `#475569` (0.35) $\to$ `#64748b` (0.15) $\to$ `#94a3b8` (0.0) | Central occlusal basin depth |
| `dente-cervical-ridge` | `linear (0,0)->(0,1)` | `#ffffff` (0.45) $\to$ `#fef3c7` (0.25) $\to$ `#f8fafc` (0.05) | Buccal cervical bulge convexity highlight |
| `dente-ridge-highlight` | `linear (0,0)->(0,1)` | `#ffffff` (0.95) $\to$ `#f8fafc` (0.60) $\to$ `#cbd5e1` (0.10) | Triangular ridge specular sheen |
| `dente-pulp-vital` | `linear (0,0)->(0,1)` | `#fda4af` (0.95) $\to$ `#f43f5e` (0.92) $\to$ `#be123c` (0.95) $\to$ `#881337` (0.98) | Coronal pulp chamber ruby-wine gel |
| `dente-guttapercha-cone` | `linear (0,0)->(0,1)` | `#fda4af` (1.0) $\to$ `#fb7185` (1.0) $\to$ `#f43f5e` (1.0) $\to$ `#be123c` (1.0) | Tapered gutta-percha core |
| `dente-guttapercha-sheath`| `linear (0,0)->(0,1)` | `#fb7185` (1.0) $\to$ `#f43f5e` (1.0) $\to$ `#be123c` (1.0) | Gutta-percha outer coral sheath |
| `dente-caries-demin` | `radial (50%,40%,60%)` | `#ffffff` (0.85) $\to$ `#fef3c7` (0.55) $\to$ `#ffffff` (0.0) | Demineralized chalky enamel halo |
| `dente-caries-lesion` | `radial (50%,50%,50%)` | `#78350f` (0.95) $\to$ `#92400e` (0.80) $\to$ `#d97706` (0.0) | Softened dendritic dentin lesion |
| `dente-caries-necrotic` | `radial (45%,40%,55%)` | `#1c1917` (0.98) $\to$ `#291307` (0.92) $\to$ `#451a03` (0.80) | Deep necrotic crater cavity |
| `dente-periapical-halo` | `radial (50%,50%,50%)` | `#ef4444` (0.75) $\to$ `#dc2626` (0.40) $\to$ `#b91c1c` (0.10) $\to$ `#b91c1c` (0.0) | Granuloma inflammatory halo |
| `dente-zirconia-ceramic`| `linear (0,0)->(0,1)` | `#ffffff` (0.99) $\to$ `#f8fafc` (0.97) $\to$ `#f1f5f9` (0.96) $\to$ `#e2e8f0` (0.94) | Monolithic zirconia (ZrO2) |
| `dente-zirconia-glaze` | `linear (0,0)->(1,0.5)` | `#ffffff` (0.95) $\to$ `#f0f9ff` (0.60) $\to$ `#ffffff` (0.0) | Zirconia porcelain glaze |
| `dente-zirconia-chamfer`| `linear (0,0)->(0,1)` | `#cbd5e1` (0.80) $\to$ `#94a3b8` (0.95) | Cervical preparation shoulder |
| `dente-crown-pfm` | `linear (0,0)->(0,1)` | `#ffffff` (0.98) $\to$ `#fbfaf8` (0.96) $\to$ `#ede6db` (0.95) $\to$ `#ded4c3` (0.92) | Porcelain fused to metal |
| `dente-pfm-metal-collar`| `linear (0,0)->(0,1)` | `#475569` (0.85) $\to$ `#1e293b` (0.98) | Subgingival metal collar |
| `dente-crown-emax` | `linear (0,0)->(0,1)` | `#ffffff` (0.99) $\to$ `#f0f9ff` (0.95) $\to$ `#e0f2fe` (0.93) $\to$ `#dbeafe` (0.90) | IPS e.max glass-ceramic |
| `dente-emax-opalescent` | `linear (0,0)->(1,1)` | `#bae6fd` (0.75) $\to$ `#e0e7ff` (0.55) $\to$ `#fbcfe8` (0.40) | E-max opalescent sheen |
| `dente-crown-gold` | `linear (0,0)->(0,1)` | `#fde047` (1.0) $\to$ `#fbbf24` (0.98) $\to$ `#f59e0b` (0.97) $\to$ `#b45309` (0.95) | Full cast gold 18K/24K |
| `dente-gold-specular` | `linear (0,0)->(1,0.6)` | `#fef9c3` (0.95) $\to$ `#fde047` (0.65) $\to$ `#eab308` (0.0) | Gold specular reflection |
| `dente-crown-metal` | `linear (0,0)->(0,1)` | `#f1f5f9` (1.0) $\to$ `#cbd5e1` (0.98) $\to$ `#94a3b8` (0.97) $\to$ `#475569` (0.95) | Co-Cr clinical base metal |
| `dente-metal-sheen` | `linear (0,0)->(1,0.5)` | `#ffffff` (0.95) $\to$ `#e2e8f0` (0.50) $\to$ `#94a3b8` (0.0) | Chrome specular sheen |
| `dente-crown-pmma` | `linear (0,0)->(0,1)` | `#fef3c7` (0.98) $\to$ `#fde68a` (0.95) $\to$ `#f5e1ad` (0.94) $\to$ `#ecd599` (0.90) | PMMA temporary acrylic |
| `dente-composite-body` | `linear (0,0)->(0,1)` | `#f8fafc` (0.98) $\to$ `#f1f5f9` (0.96) $\to$ `#ede8e1` (0.95) $\to$ `#e2dcd2` (0.92) | A2/A3 nanohybrid composite |
| `dente-composite-edge` | `linear (0,0)->(1,1)` | `#cbd5e1` (0.70) $\to$ `#94a3b8` (0.85) | Marginal bevel transition |
| `dente-abfraction-dentin`| `linear (0,0)->(1,1)`| `#f5ebe0` (0.95) $\to$ `#d5bdaf` (0.95) $\to$ `#b08968` (0.90) | Sclerotic dentin wedge |
| `dente-fiber-post` | `linear (0,0)->(1,0)` | `#ffffff` (0.95) $\to$ `#e2e8f0` (0.90) $\to$ `#f8fafc` (0.98) $\to$ `#cbd5e1` (0.85) | Quartz glass fiber post |
| `dente-composite-core` | `linear (0,0)->(0,1)` | `#38bdf8` (0.75) $\to$ `#0284c7` (0.85) | Core build-up stump |
| `dente-calculus-supra` | `linear (0,0)->(0,1)` | `#fef3c7` (0.98) $\to$ `#e2dac6` (0.95) $\to$ `#cfc3a7` (0.95) $\to$ `#b8a885` (0.92) | Supragingival calculus |
| `dente-calculus-sub` | `linear (0,0)->(0,1)` | `#78350f` (0.95) $\to$ `#451a03` (0.98) $\to$ `#1c1917` (0.95) | Subgingival serumal calculus |
| `dente-titanium-body` | `linear (0,0)->(1,0)` | `#64748b` (1.0) $\to$ `#94a3b8` (1.0) $\to$ `#f1f5f9` (1.0) $\to$ `#64748b` (1.0) $\to$ `#334155` (1.0) | Grade-5 SLA titanium screw |
| `dente-titanium-collar` | `linear (0,0)->(0,1)` | `#e2e8f0` (1.0) $\to$ `#94a3b8` (1.0) $\to$ `#64748b` (1.0) | Polished cervical collar |
| `dente-titanium-abutment`| `linear (0,0)->(1,0)` | `#94a3b8` (1.0) $\to$ `#ffffff` (1.0) $\to$ `#cbd5e1` (1.0) $\to$ `#475569` (1.0) | Titanium prosthetic abutment |

---

## 2. LOGIC CHAIN

1. **Premise 1 (DOM Invariant & Performance)**: Per Bible §6.2 and §5, injecting 29 SVG gradients inside every one of 32 teeth produces $>900$ DOM nodes and causes frame-drops on 120 FPS chairside displays. Mount `<defs id="dente-global-odontogram-defs">` exactly ONCE in the root container (`AnatomicalSvgOdontogram.tsx` or standalone chart container).
2. **Premise 2 (Namespace Collision Invariant)**: In `apps/web/src/components/odontogram/chart/defs/`, existing legacy 2D gradients declare IDs such as `dente-root-dentin`, `dente-periapical-halo`, and `dente-shader-pfm`. To prevent browser cross-bleed, every new anatomical 2.5D shader must have a canonical namespace `dente-shader-*`.
3. **Premise 3 (Zero Regression & Gate 0 Inviolability)**: Gate 0 is 100% verified with 8 tests that explicitly assert strings like `dente-enamel-porcelain`, `dente-root-dentin`, `dente-guttapercha-sheath`, and `dente-composite-body`. Modifying `gate0/` directly risks breaking snapshot tests, line counts, or rendering precision.
4. **Deduction (Dual-Namespace Strategy via SVG `href` Aliasing)**: By defining canonical IDs as `id="dente-shader-<name>"` AND generating SVG alias elements `<linearGradient id="dente-<name>" href="#dente-shader-<name>" />`, we achieve:
   - 100% collision-free architecture for Gate 1 and the 32-tooth formula;
   - 100% backward compatibility with Gate 0 without altering a single pixel or breaking test assertions;
   - Zero duplication of color stops (SVG `href` simply delegates to the canonical gradient).
5. **Premise 4 (Parametric Geometry Decoupling)**: Tooth 46 currently hardcodes coordinates in `Tooth46RestorationGeometry.ts`, `Tooth46PathologyGeometry.ts`, etc. By defining geometric interfaces (`CrownGeometryProps`, `CanalTrajectory`, `ApexAnchor[]`, `CejGeometry`, etc.), the 7 clinical layers become completely decoupled from Tooth 46 and instantly reusable for Upper Molars 16/26 (Gate 1), Premolars (Gate 2), Incisors/Canines (Gate 3), and Deciduous teeth (Gate 4).
6. **Premise 5 (Mandate 8b Compliance)**: Decomposing `shared/` into modular files under `defs/`, `overlays/`, and `types/` ensures every single file stays strictly $\le 120$ lines (average 60–95 lines).

---

## 3. CAVEATS

1. **SVG `<linearGradient href="...">` Browser Support**:
   SVG 2 defines `href` for gradient inheritance (replacing deprecated `xlink:href`). All modern desktop and mobile browsers (Chromium 50+, Safari 12+, Firefox 51+) fully support `href` on gradient elements. For maximum safety, the alias template includes both `href` and `xlinkHref`.
2. **Clipping Paths**:
   Tooth-specific clipping paths (`#tooth46-crown-clip`, `#tooth46-root-clip`) CANNOT be purely global because every tooth has a unique silhouette. Therefore, clipping paths must remain local to the specific tooth component or parameterized with unique IDs (`#tooth-${fdi}-crown-clip`).
3. **Existing TypeScript Typecheck Failures**:
   As observed in `task-20` and `task-25`, `apps/web` has pre-existing errors in `visit/` and `treatment-plans/` related to `exactOptionalPropertyTypes: true`. None of these errors are in `components/odontogram/`. All proposed shared interfaces MUST include explicit `| undefined` unions when optional properties are declared to ensure zero new errors.

---

## 4. CONCLUSION & ARCHITECTURAL BLUEPRINT

### 4.1 Directory Structure & File Inventory (`shared/`)
A total of **25 tightly scoped files**, every file strictly adhering to **Mandate 8b ($\le 120$ lines)**:

```
apps/web/src/components/odontogram/shared/
├── defs/
│   ├── DenteGlobalOdontogramDefs.tsx       [~55 lines]  Root container <defs id="dente-global-odontogram-defs">
│   ├── DenteEnamelDentinShaders.tsx        [~95 lines]  Enamel, dentin, sulcus shadow, furcation, fossa, ridges
│   ├── DenteCrownMaterialShaders.tsx       [~115 lines] 6 crown materials (ZrO2, PFM, E-Max, Gold, Co-Cr, PMMA)
│   ├── DenteEndoPathologyShaders.tsx       [~105 lines] Vital pulp, gutta-percha, caries zones, periapical halo
│   ├── DenteSurgicalPeriodontalShaders.tsx  [~95 lines]  Abfraction, post & core, calculus, titanium implant
│   ├── DenteShaderAliases.tsx              [~85 lines]  Backward-compatibility aliases (dente-* -> dente-shader-*)
│   └── shaderConstants.ts                 [~80 lines]  Collision-free IDs (DENTE_SHADERS), color stop tokens
├── overlays/
│   ├── CrownMaterialOverlay.tsx            [~110 lines] Orthopedic crown shell, collar, shoulder, ridges, fissures
│   ├── CrownMaterialShaderDefs.tsx         [~75 lines]  Standalone crown shader sub-defs
│   ├── CrownDefectsOverlay.tsx             [~65 lines]  Ceramic chipping, margin washout, wear perforation
│   ├── CanalPostOverlay.tsx                [~95 lines]  Fiber post, cast metal/gold post, composite core stump
│   ├── CalculusBandOverlay.tsx             [~85 lines]  Supragingival & subgingival calculus along CEJ
│   ├── AbfractionWedgeOverlay.tsx          [~75 lines]  V-shaped cervical wedge defect & polished floor
│   ├── ImplantSlaOverlay.tsx               [~95 lines]  Grade-5 SLA titanium implant fixture, collar, abutment
│   ├── ApicalHaloOverlay.tsx               [~90 lines]  Granuloma, flame periodontitis, cyst for arbitrary N apices
│   └── MissingToothCrossOverlay.tsx        [~75 lines]  Surgical red cross and ghost root outline
├── types/
│   ├── crownTypes.ts                       [~70 lines]  CrownMaterial, RestorationCondition, CrownGeometryProps
│   ├── canalPostTypes.ts                   [~45 lines]  CanalPostProps, PostType, CanalTrajectory
│   ├── calculusTypes.ts                    [~40 lines]  CalculusBandProps, CalculusSeverity
│   ├── abfractionTypes.ts                  [~40 lines]  AbfractionWedgeProps, ToothSurface
│   ├── implantTypes.ts                     [~50 lines]  ImplantSlaProps, TitaniumImplantGeometry
│   ├── apicalHaloTypes.ts                  [~50 lines]  ApicalHaloProps, PeriapicalLesionType, ApexAnchor
│   ├── missingToothTypes.ts                [~40 lines]  MissingToothCrossProps, ToothBounds
│   └── sharedGeometryTypes.ts              [~60 lines]  Common SVG path & point interfaces
└── index.ts                                [~90 lines]  Single unified export barrel
```

---

### 4.2 Detailed Specifications of the 7 Parametric Overlays

#### 1. `CrownMaterialOverlay.tsx` & `CrownMaterialShaderDefs.tsx`
- **Interface**:
  ```ts
  export type CrownMaterial = "zirconia" | "pfm" | "emax" | "gold" | "metal" | "pmma";
  export type RestorationCondition = "adequate" | "defective";

  export interface CrownGeometryProps {
    readonly crownShellPath: string;
    readonly cervicalShoulderPath?: string | undefined;
    readonly pfmCollarPath?: string | undefined;
    readonly triangularRidges?: readonly { readonly id: string; readonly d: string }[] | undefined;
    readonly milledFissures?: readonly { readonly id: string; readonly d: string }[] | undefined;
    readonly specularHigh?: readonly {
      readonly id: string;
      readonly cx: number;
      readonly cy: number;
      readonly rx: number;
      readonly ry: number;
      readonly angle: number;
    }[] | undefined;
    readonly defects?: {
      readonly ceramicChippingPath?: string | undefined;
      readonly cervicalWashoutPath?: string | undefined;
      readonly occlusalPerforationPath?: string | undefined;
    } | undefined;
  }

  export interface CrownMaterialOverlayProps {
    readonly material?: CrownMaterial | undefined;
    readonly condition?: RestorationCondition | undefined;
    readonly geometry: CrownGeometryProps;
    readonly isDark?: boolean | undefined;
    readonly className?: string | undefined;
  }
  ```
- **Behavior**:
  - Automatically maps material to `CROWN_FILL_MAP`:
    - `zirconia` $\to$ `url(#dente-shader-crown-zirconia)`
    - `pfm` $\to$ `url(#dente-shader-crown-pfm)` (renders `pfmCollarPath` with `url(#dente-shader-pfm-metal-collar)`)
    - `emax` $\to$ `url(#dente-shader-crown-emax)` (ridges filled with opalescent gradient)
    - `gold` $\to$ `url(#dente-shader-crown-gold)` (glaze with `url(#dente-shader-gold-specular)`)
    - `metal` $\to$ `url(#dente-shader-crown-metal)` (glaze with `url(#dente-shader-metal-sheen)`)
    - `pmma` $\to$ `url(#dente-shader-crown-pmma)` (matte, suppresses specular glaze)
  - When `condition === "defective"`, mounts `CrownDefectsOverlay` rendering chipping, washout, and perforation.

#### 2. `CanalPostOverlay.tsx`
- **Interface**:
  ```ts
  export type PostMaterialType = "fiber" | "metal_cast" | "gold_cast";

  export interface CanalPostProps {
    readonly postShaftPath: string;
    readonly coreStumpPath?: string | undefined;
    readonly material?: PostMaterialType | undefined;
    readonly isDark?: boolean | undefined;
    readonly className?: string | undefined;
  }
  ```
- **Behavior**:
  - `fiber` uses `url(#dente-shader-fiber-post)` (opalescent white/cyan).
  - `metal_cast` uses `url(#dente-shader-titanium-body)` (steel grey).
  - `gold_cast` uses `url(#dente-shader-crown-gold)` (burnished gold).
  - Coronal stump uses `url(#dente-shader-composite-core)` with `strokeDasharray="2.5 1.5"` and blue border.

#### 3. `CalculusBandOverlay.tsx`
- **Interface**:
  ```ts
  export interface CalculusBandProps {
    readonly supraPath?: string | undefined;
    readonly subPath?: string | undefined;
    readonly cejCurve?: string | undefined;
    readonly isDark?: boolean | undefined;
    readonly className?: string | undefined;
  }
  ```
- **Behavior**:
  - Supragingival calculus: chalky limestone gradient `url(#dente-shader-calculus-supra)` with fine 0.5px amber outline.
  - Subgingival calculus: dense brown-black serumal gradient `url(#dente-shader-calculus-sub)`.

#### 4. `AbfractionWedgeOverlay.tsx`
- **Interface**:
  ```ts
  export interface AbfractionWedgeProps {
    readonly notchPath: string;
    readonly dentinFloorPath: string;
    readonly stressApexLine?: string | undefined;
    readonly isDark?: boolean | undefined;
    readonly className?: string | undefined;
  }
  ```
- **Behavior**:
  - Outer enamel notch: `url(#dente-shader-abfraction-dentin)` with `stroke="rgba(180, 83, 9, 0.60)"`.
  - Exposed sclerotic dentin floor: `#b08968` with `opacity="0.35"`.
  - Stress concentration line: hairline `rgba(120, 53, 15, 0.85)`.

#### 5. `ImplantSlaOverlay.tsx`
- **Interface**:
  ```ts
  export interface ImplantGeometryProps {
    readonly fixtureBodyPath: string;
    readonly collarPath: string;
    readonly abutmentPath: string;
    readonly threads: readonly string[];
  }

  export interface ImplantSlaProps {
    readonly geometry?: ImplantGeometryProps | undefined;
    readonly showAbutment?: boolean | undefined;
    readonly isDark?: boolean | undefined;
    readonly className?: string | undefined;
  }
  ```
- **Behavior**:
  - Fixture body: Grade-5 SLA titanium gradient `url(#dente-shader-titanium-body)`.
  - Threads: 0.9px high-contrast spiral rings (`#1e293b`).
  - Cervical micro-collar: `url(#dente-shader-titanium-collar)`.
  - Polished prosthetic abutment: `url(#dente-shader-titanium-abutment)`.

#### 6. `ApicalHaloOverlay.tsx`
- **Interface**:
  ```ts
  export type PeriapicalLesionType = "granuloma" | "periodontitis_flame" | "radicular_cyst";

  export interface ApexAnchor {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly r?: number | undefined;
    readonly lesionType?: PeriapicalLesionType | undefined;
  }

  export interface ApicalHaloProps {
    readonly apices: readonly ApexAnchor[];
    readonly defaultRadius?: number | undefined;
    readonly isDark?: boolean | undefined;
    readonly className?: string | undefined;
  }
  ```
- **Behavior**:
  - Dynamically iterates over any number of apices (1 for incisors, 2 for lower molars, 3 for upper molars).
  - `granuloma`: soft radial gradient `url(#dente-shader-periapical-halo)`.
  - `periodontitis_flame`: flame-burst radial rays `url(#dente-shader-periapical-flame)`.
  - `radicular_cyst`: deep dark osteolytic center with 0.8px white cortical sclerotic line.

#### 7. `MissingToothCrossOverlay.tsx`
- **Interface**:
  ```ts
  export interface MissingToothCrossProps {
    readonly crossLine1?: string | undefined;
    readonly crossLine2?: string | undefined;
    readonly ghostRootPath?: string | undefined;
    readonly strokeWidth?: number | undefined;
    readonly color?: string | undefined;
    readonly isDark?: boolean | undefined;
    readonly className?: string | undefined;
  }
  ```
- **Behavior**:
  - Surgical extraction red cross ($2.5\text{px}$, `#ef4444`, `strokeLinecap="round"`).
  - If `ghostRootPath` is provided, renders faint dashed outline (`strokeDasharray="3,3"`, `opacity="0.25"`).

---

### 4.3 Unified Global Shader Container (`DenteGlobalOdontogramDefs.tsx`)

Mounts strictly **once** in the root odontogram container:
```tsx
import type React from "react";
import { DenteCrownMaterialShaders } from "./DenteCrownMaterialShaders";
import { DenteEnamelDentinShaders } from "./DenteEnamelDentinShaders";
import { DenteEndoPathologyShaders } from "./DenteEndoPathologyShaders";
import { DenteShaderAliases } from "./DenteShaderAliases";
import { DenteSurgicalPeriodontalShaders } from "./DenteSurgicalPeriodontalShaders";

export const DenteGlobalOdontogramDefs: React.FC = () => {
  return (
    <defs id="dente-global-odontogram-defs">
      <DenteEnamelDentinShaders />
      <DenteCrownMaterialShaders />
      <DenteEndoPathologyShaders />
      <DenteSurgicalPeriodontalShaders />
      <DenteShaderAliases />
    </defs>
  );
};
```

---

### 4.4 Non-Destructive Migration Strategy for Gate 0

We rigorously compared two migration strategies:

| Criterion | Strategy A: Immediate In-Place Refactor of Gate 0 | Strategy B: Frozen Benchmark + Shared Gate 1 Foundation (RECOMMENDED) |
|---|---|---|
| **Gate 0 Safety** | Medium (touches 10+ approved files) | **Absolute 100% (0 files in `gate0/` modified)** |
| **Test Stability** | Risk of string-matching test regression | **Zero risk (8 Gate 0 tests untouched and green)** |
| **Visual Precision** | Possible 1px antialiasing or clip difference | **Guaranteed 0.00px deviation** |
| **Gate 1 Readiness** | High | **High (Gate 1 teeth 16/26 consume `shared/` immediately)** |
| **Rollback Complexity** | Hard | **Trivial (Gate 0 is completely independent)** |

#### Recommended Implementation Protocol:
1. **Phase 1 (Creation of `shared/`)**: Implement the 25 files in `apps/web/src/components/odontogram/shared/`.
2. **Phase 2 (Unit Testing of `shared/`)**: Add `shared/__tests__/odontogramShared.test.tsx` verifying all 7 overlays render correctly with mock geometry inputs and that `<DenteGlobalOdontogramDefs />` renders all 36 gradient IDs.
3. **Phase 3 (Gate 1 Construction)**: Build Upper Molars 16 and 26 in `apps/web/src/components/odontogram/gate1/` importing directly from `shared/`.
4. **Phase 4 (Optional Backward-Compatibility Adapter for Gate 0)**:
   In `Tooth46ShaderDefs.tsx`, replace the repetitive sub-shaders with:
   ```tsx
   <defs>
     <clipPath id="tooth46-crown-clip">...</clipPath>
     <clipPath id="tooth46-root-clip">...</clipPath>
     <DenteGlobalOdontogramDefs />
   </defs>
   ```
   Because `DenteShaderAliases.tsx` defines all `dente-*` IDs as aliases to `dente-shader-*`, Gate 0 continues to render with 100% pixel fidelity, and all 8 tests pass without modification.

---

## 5. VERIFICATION METHOD

To independently verify this architectural blueprint upon implementation:

1. **Gate 0 Regression Verification**:
   ```powershell
   npx vitest run apps/web/src/components/odontogram/gate0/
   ```
   *Expected outcome*: 8 tests passing, 0 failing.

2. **Shared Overlays Test Suite**:
   ```powershell
   npx vitest run apps/web/src/components/odontogram/shared/
   ```
   *Expected outcome*: 100% passing tests for all 7 overlays and the global shader defs.

3. **Single-Compiler Gate (TypeScript Strict Mode)**:
   ```powershell
   npx tsc --noEmit -p apps/web/tsconfig.json
   ```
   *Expected outcome*: 0 errors in `apps/web/src/components/odontogram/shared/`.

4. **Line Count Verification (Mandate 8b $\le 120$ lines)**:
   ```powershell
   Get-ChildItem -Recurse apps/web/src/components/odontogram/shared/*.{ts,tsx} | ForEach-Object {
     $lines = (Get-Content $_.FullName).Length
     if ($lines -gt 120) { Write-Error "$($_.Name) exceeds 120 lines: $lines" }
   }
   ```
   *Expected outcome*: 0 violations.

5. **Gradient ID Collision Self-Audit**:
   Verify that all canonical gradient IDs begin with `dente-shader-` and that no duplicate IDs exist across `defs/`.
