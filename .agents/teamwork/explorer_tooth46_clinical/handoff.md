# CLINICAL ENDODONTICS, PATHOLOGY & CROWN MATERIALS MASTERPIECE AUDIT: TOOTH 46 (LOWER RIGHT FIRST MOLAR, FDI 46)

> **Document Type**: 5-Component Technical & Clinical Handoff Report (Iteration 5 Masterpiece Remediation)  
> **Target Workspace**: `apps/web/src/components/odontogram/gate0/` & `shared/`  
> **Author**: Clinical Endodontics, Pathology & Crown Materials Gaps Explorer  
> **Parent Coordinator**: `987018df-6f5f-4542-ab02-ae4ce2a9f05f`  
> **Directives**: The Hammer Supreme Constitution, Wheeler's Dental Anatomy Ch. 11, Mandate 8b ($\le 120$ lines per file).

---

## 1. OBSERVATIONS

Direct inspection of `apps/web/src/components/odontogram/gate0/` and `shared/` under Iteration 5 instructions revealed:

### 1.1 Pulp Chamber Morphology & Anatomical Gaps (Wheeler's Dental Anatomy Ch. 11)
- In `Tooth46PulpGeometry.ts` (lines 17–30):
  * `coronalPulpChamber` currently spans $X = 24.5\text{--}75.5$ (width 51px, >60% of crown width) and $Y = 15\text{--}58.5$.
  * *Severe Anatomical Violation*: The pulp chamber roof extends up to $Y = 15$, colliding directly into the occlusal enamel table! In normal human anatomy (Wheeler Ch. 11), the roof of the pulp chamber (`tegmen cavi`) sits in the lower half of the crown ($Y = 42\text{--}46$), leaving at least $2.5\,\text{mm}$ (10–12px) of dense protective coronal dentin and enamel above it.
  * In `gate0_tooth46_macro_granuloma.png`, the pulp chamber looked blocky with square stepped borders, rather than an organic anatomical dome with 5 slender conical pulp horns (`cornua pulpae`) pointing towards the 5 cusps.
  * Canal orifices at the chamber floor (`fundus cavi`) were placed at $Y = 57.0$, whereas the cervical constriction (CEJ) is at $Y = 74.0$. The true floor of the chamber sits at $Y = 69\text{--}72$ with funnel-shaped canal entries directly above the furcation.

### 1.2 Parasitic Caries in Endodontic Presets
- In `Tooth46BasePresets.ts` (lines 41–52):
  * Preset `periodontitis` included `caries: true`! This caused an unwanted buccal pit / occlusal caries cavity to render on top of pure endodontic/periapical pathology screens, confusing clinical diagnosis.
  * *Directive*: In endodontic and periapical presets (`pulpitis`, `periodontitis`, `endodontics`), `caries` must be strictly `false`.

### 1.3 ViewBox Periapical Clipping
- In `TOOTH46_GEOMETRY.viewBox = "0 0 100 160"`:
  * Apices sit at $Y = 147$ (Distal) and $Y = 149$ (Mesial).
  * A large inflammatory lesion (such as a radicular cyst with radius $14\text{--}16\text{px}$ extending down to $Y = 165$, or an overfilled sealer puff extending to $Y = 153.5$) is clipped or flush against the bottom edge of the SVG.
  * *Remedy*: Expanding the viewBox height to `"0 0 100 170"` guarantees 21–23px of clear alveolar bone margin below the apices for unclipped rendering of all periapical osteolytic defects.

### 1.4 Crown Materials & Restorative Integrity
- In `Tooth46CrownShaders.tsx` & `Tooth46CrownOverlay.tsx`:
  * 6 materials are defined (`zirconia`, `pfm`, `emax`, `gold`, `metal`, `pmma`).
  * E-Max is missing the perimeter cuspal opalescent halo.
  * Ceramic chipping in `Tooth46CrownDefects.tsx` falls back to slate grey (`#64748b`), making fractured ceramic look like exposed grey metal instead of white opaque zirconia or yellowish natural dentin.
  * **Overhanging proximal margin (нависающий край)** is completely absent.

### 1.5 Endodontic Spectrum Gaps
- In `Tooth46EndoCanals.tsx`:
  * Canals only support a binary toggle: vital pulp or hermetic gutta-percha.
  * Missing: necrotic/gangrenous dark hollow lumen, underfilled canals (short by 3.5mm), overfilled sealer puff extrusion, broken rotary NiTi file with segmented flutes, and anatomical 2-root cast post-and-core (КШВ).

---

## 2. LOGIC CHAIN

```
[Observation 1.1] ──> Pulp chamber extends to Y=15, colliding with occlusal table; fundus at Y=57 is too high.
                   │
                   └──> [Inference 1] Redesign pulp chamber strictly per Wheeler Ch. 11:
                                      - Tegmen cavi at Y=42..46 (lower half of crown, under >=2.5mm solid dentin);
                                      - Width 40..45% (X=30..68), protecting thick lateral dentin walls;
                                      - 5 slender pulp horns (ML Y=26, MB Y=32, DB Y=34, DL Y=29, D Y=36);
                                      - Fundus cavi convex at Y=69..72 with funnel orifices;
                                      - Canals originating at cervical line Y=72.

[Observation 1.2] ──> Periodontitis preset carries `caries: true`.
                   │
                   └──> [Inference 2] Eliminate parasitic caries from endo presets (`caries: false`).

[Observation 1.3] ──> ViewBox height 160 clips large cysts and sealer puffs.
                   │
                   └──> [Inference 3] Expand viewBox to "0 0 100 170" for complete periapical margin.

[Observation 1.4, 1.5] ──> Full matrices of 6 crown materials x 2 states + 12 endodontic/periapical states.
                       │
                       └──> [Inference 4] Provide complete mathematical Bezier formulas and modular decomposition
                                          strictly complying with Mandate 8b (<=120 lines per file).
```

---

## 3. CAVEATS

1. **ViewBox Aspect Ratio**: Expanding viewBox from `"0 0 100 160"` to `"0 0 100 170"` adjusts the height-to-width ratio from $1.60$ to $1.70$. In `Tooth46Container.tsx`, `width={100 * zoom}` and `height={170 * zoom}` maintains exact $1:1$ scale without distortion.
2. **Read-Only Scope**: This report delivers complete, copy-paste ready mathematical Bezier definitions, SVG shader code, and architectural blueprints. Implementation will be executed by the designated sculptor/worker subagents.

---

## 4. CONCLUSION & DEFINITIVE MATHEMATICAL BLUEPRINT

### 4.1 Anatomical Pulp Chamber (Wheeler Dental Anatomy Ch. 11)

```typescript
/**
 * Wheeler's Dental Anatomy Ch. 11 — Mandibular First Molar Pulp Chamber
 * ViewBox: "0 0 100 170"
 * - Width: X=30..68 (40-45% of crown width, thick lateral dentin walls)
 * - Tegmen cavi (roof): Y=42..46 (lower half of crown, under >=2.5mm solid dentin & enamel)
 * - 5 slender pulp horns (cornua pulpae):
 *     * ML horn (highest lingual): summit at (X: 35, Y: 26)
 *     * DL horn: summit at (X: 62, Y: 29)
 *     * MB horn: summit at (X: 32, Y: 32)
 *     * DB horn: summit at (X: 50, Y: 34)
 *     * D horn: summit at (X: 66, Y: 36)
 * - Fundus cavi (floor): convex crest at Y=69..72 over furcation with 3 funnel-shaped orifices:
 *     * MB orifice: (X: 34, Y: 72)
 *     * ML orifice: (X: 42, Y: 72)
 *     * D orifice:  (X: 60, Y: 72)
 */
export const TOOTH46_WHEELER_PULP_CHAMBER = {
  coronalPulpChamber:
    "M 30,68 " +
    "C 30,56 31,46 32,44 " + // Mesial lateral wall rising to MB horn base
    "C 31,39 31.5,35 32,32 " + // MB Horn apex (Y=32)
    "C 33,36 34,40 34.5,42 " + // Inter-horn notch MB-ML
    "C 34.5,34 34.8,29 35,26 " + // ML Horn apex (highest lingual, Y=26)
    "C 36.5,35 39,43 44,44 " + // Sloping tegmen cavi towards DB
    "C 46,38 48.5,36 50,34 " + // DB Horn apex (Y=34)
    "C 52,38 54,42 56,43 " + // Inter-horn notch DB-DL
    "C 58,36 60.5,31 62,29 " + // DL Horn apex (Y=29)
    "C 63.5,35 65,40 65.5,42 " + // Inter-horn notch DL-D
    "C 65.8,38 66,37 66.5,36 " + // D Horn apex (Y=36)
    "C 67.5,42 68,52 68,68 " + // Distal lateral wall descending to floor
    "C 66,71 63,72 60,72 " + // D canal funnel orifice
    "C 56,70 54,69 50,69 " + // Convex fundus cavi crest over furcation
    "C 46,69 44,70 42,72 " + // ML canal funnel orifice
    "C 38,72 36,71 34,72 " + // MB canal funnel orifice
    "C 32,71 30,70 30,68 Z", // Return to mesial junction

  // Radicular canals originating strictly from cervical floor at Y=72
  canals: [
    {
      id: "MB",
      nameRu: "Медиально-щечный канал",
      orifice: { x: 34, y: 72 },
      apex: { x: 23, y: 145.8 },
      centerLine:
        "M 34.0,72.0 C 31.0,88 22.0,112 21.6,128 C 22.3,137 22.7,142 23,145.8",
      taperedLumen:
        "M 32.5,72.0 C 29.5,88 20.2,112 20.8,128 C 21.8,137 22.3,142.5 22.3,145.8 " +
        "L 23.7,145.8 C 23.7,142.5 23.4,137 22.7,128 C 23.8,112 32.5,88 35.5,72.0 Z",
    },
    {
      id: "ML",
      nameRu: "Медиально-язычный канал",
      orifice: { x: 42, y: 72 },
      apex: { x: 23, y: 145.8 },
      centerLine:
        "M 42.0,72.0 C 38.0,88 27.5,110 24.2,126 C 23.4,137 23.1,142 23,145.8",
      taperedLumen:
        "M 40.5,72.0 C 36.5,88 26.0,110 23.2,126 C 22.7,137 22.5,142.5 22.5,145.8 " +
        "L 23.5,145.8 C 23.8,142.5 24.0,137 25.0,126 C 28.5,110 39.5,88 43.5,72.0 Z",
    },
    {
      id: "D",
      nameRu: "Дистальный канал",
      orifice: { x: 60, y: 72 },
      apex: { x: 79, y: 144.5 },
      centerLine:
        "M 60.0,72.0 C 65.0,88 73.0,112 76.6,128 C 77.8,137 78.5,142 79,144.5",
      taperedLumen:
        "M 58.0,72.0 C 63.0,88 71.5,112 75.4,128 C 77.0,137 78.2,142 78.2,144.5 " +
        "L 79.8,144.5 C 79.8,142.0 79.2,137 78.2,128 C 74.5,112 67.0,88 62.0,72.0 Z",
    },
  ],
  neuroPlexus: [
    { id: "mb", d: "M 32,32 C 32,44 33,54 34,68" },
    { id: "ml", d: "M 35,26 C 36,40 38,54 42,68" },
    { id: "db", d: "M 50,34 C 49,46 48,56 48,68" },
    { id: "dl", d: "M 62,29 C 61,42 58,54 56,68" },
    { id: "d",  d: "M 66.5,36 C 65,46 63,56 60,68" },
  ],
} as const;
```

---

### 4.2 Full Clinical Matrices

#### Matrix 1: 6 Restorative Crown Materials $\times$ 2 Integrity States

| Material | Sound State (Hermetic Seal) | Defective State | Exposed Core/Substructure |
|---|---|---|---|
| **1. Zirconia (`zirconia`)** | Pearl-white glaze, milled Y-5 grooves, chamfer margin | Ceramic chipping, marginal gap, wear hole | Opaque white zirconia core (`#e2e8f0` $\to$ `#cbd5e1`) |
| **2. PFM (`pfm`)** | Dense porcelain, subgingival dark metal collar (`#1e293b`) | Porcelain spall fracture, metal collar gap | Dark oxidized metal coping (`#1e293b` $\to$ `#0f172a`) |
| **3. E-Max (`emax`)** | Translucent lithium disilicate, cuspal opalescent halo | Chipping of incisal/cuspal edge, gap | Warm prepared natural dentin stump (`#d97706`) |
| **4. Gold (`gold`)** | 18K/24K warm yellow satin/mirror luster, burnished margin | Occlusal wear perforation hole, margin gap | Burnished golden hole rim into dark cavity (`#92400e`) |
| **5. Co-Cr Metal (`metal`)** | Cold steel-grey specularity, chrome reflections | Occlusal wear perforation, margin gap | Metallic wear rim into hollow dentin (`#334155`) |
| **6. PMMA (`pmma`)** | Matte warm ivory-beige polymer, softened contours | Fractured cusp, cervical margin leakage | Matte resin core (`#fde68a`) |

*Defect Types*:
1. `chipping`: Fracture on MB cusp exposing material-correct substructure.
2. `cervical_gap`: Marginal gap > 50 microns at CEJ with brown-black secondary caries infiltration (`url(#dente-caries-lesion)`).
3. `perforation`: Full-thickness occlusal wear hole on DB cusp.
4. `overhang`: Proximal margin ledge protruding 1.2mm into the mesial interdental embrasure.

#### Matrix 2: 12 Endodontic & Periapical Canal States

1. `vital`: Intact vital pulp (Wheeler Ch. 11 dome, 5 pulp horns, capillary plexus).
2. `pulpitis`: Acute focal/diffuse pulpitis (hyperemic glowing ruby pulp, `caries: false`).
3. `necrotic`: Devitalized gangrenous pulp (dark hollow lumen `#292524`, ash borders `#57534e`, debris).
4. `obturated`: Hermetic 3-canal gutta-percha obturation (terminating 0.8mm from apices at physiological constriction, white radiopaque reflection lines, sealer sheath).
5. `underfilled`: Insufficient obturation (gutta-percha terminates 3.5mm short of apices at $Y=127$, leaving apical 1/3 as dark infected anaerobic lumen).
6. `overfilled`: Sealer puff & gutta-percha extrusion past apical foramen into periapical bone ($Y=153.2$ on Mesial, $Y=151.8$ on Distal).
7. `broken_file`: Fractured rotary NiTi file in apical third of curved mesial root ($Y=132\text{--}145.5$, 7 segmented flutes with silver-steel gradient).
8. `fiber_post`: Quartz fiberglass post (СВШ) in distal canal with parallel fiber texture, dual-cure cement line, and composite core.
9. `cast_post`: Anatomical two-root Cast Post-and-Core (КШВ): primary distal post + mesial anti-rotational pin + coronal cast core stump in Co-Cr or Gold.
10. `granuloma`: Chronic periapical granuloma (circumscribed radiolucent lesion with dense fibrous capsule rim at mesial and/or distal apex).
11. `radicular_cyst`: Radicular cyst (large osteolytic cavity with thin white hyperostotic radiopaque cortical border and amber-brown cystic fluid).
12. `root_resorption`: Apical root resorption (pathological blunting, shortening by 9 SVG units to $Y=140$, and concave cratering of mesial root with Howship's lacunae).

---

### 4.3 Mandatory File Decomposition Plan (Mandate 8b Compliance: $\le 120$ Lines)

| File Path | Responsibility | Lines |
|---|---|---|
| `tooth46Types.ts` | Complete type definitions (Crown, Endo, Periapical, Defect types) | ~110 lines |
| `tooth46GeometryConstants.ts` | Crown monolith, cusps, CEJ, apices, viewBox: `"0 0 100 170"` | ~110 lines |
| `Tooth46PulpGeometry.ts` | Wheeler Ch. 11 pulp chamber & primary canal trajectories | ~95 lines |
| `Tooth46EndoPathologyGeometry.ts` | Underfilled, overfilled puffs, broken NiTi file, 2-root КШВ | ~95 lines |
| `Tooth46PeriapicalGeometry.ts` | Fibrous capsule, hyperostotic cortical border, resorbed root crater | ~85 lines |
| `Tooth46CrownDefectGeometry.ts` | Chipping, cervical gap, wear perforation, proximal overhang, E-Max halo | ~90 lines |
| `Tooth46PeriapicalShaders.tsx` | Granuloma core, cyst fluid, cortical glow, resorption lacunae | ~70 lines |
| `Tooth46EndoShaders.tsx` | Vital ruby, necrotic gangrene, NiTi file metallic, gutta-percha, sealer puff | ~85 lines |
| `Tooth46PeriapicalOverlay.tsx` | Granuloma with capsule, Radicular cyst, Apical resorption | ~90 lines |
| `Tooth46EndoCanals.tsx` | 8-state endodontic renderer cleanly delegating geometry | ~112 lines |
| `Tooth46CrownDefects.tsx` | 4 crown defect modes with material-specific exposed cores | ~95 lines |
| `Tooth46CrownOverlay.tsx` | 6 crown materials with chamfer, PFM collar, cuspal halo, defects | ~110 lines |
| `Tooth46Roots.tsx` | Supports `isResorbed` branch using normal or resorbed root outline | ~98 lines |
| `Tooth46Container.tsx` | Root SVG composition (viewBox 100x170), clean layer pipeline | ~110 lines |
| `Tooth46BasePresets.ts` | Base presets with `caries: false` in endodontic presets | ~75 lines |
| `Tooth46ClinicalPresets.ts` | 31 unified presets covering 100% of the clinical spectrum | ~95 lines |

---

## 5. VERIFICATION METHOD

1. **Mandate 8b Check**:
   ```powershell
   Get-ChildItem -Path "apps/web/src/components/odontogram/gate0" -Filter "*.ts*" | ForEach-Object {
       $lines = (Get-Content $_.FullName).Count
       if ($lines -gt 120) { Write-Error "$($_.Name) has $lines lines (>120)" }
       else { Write-Host "$($_.Name): $lines lines [PASS]" }
   }
   ```
2. **Machine Compilation**:
   ```powershell
   npm run typecheck -w @dental/web
   npx vitest run apps/web/src/components/odontogram/gate0/
   ```
3. **Playwright 4-State Visual Proof Verification**:
   Verify that all 31 presets render at `?stand=odontogram&tooth=46` without clipping at $Y \le 170$ in PC Light/Dark and Mobile Light/Dark.
