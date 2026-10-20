# CLINICAL, ANATOMICAL & VISUAL PROOF INQUISITION REPORT
## Gate 0 Iteration 5: Tooth 46 Masterpiece Remediation (DENTE Dental CRM Odontogram)

**Reviewer Identity**: Clinical, Anatomical & Visual Proof Inquisitor (`reviewer_tooth46_visual`)  
**Verdict**: **REQUEST_CHANGES**  
**Date**: 2026-10-19  

---

## 1. OBSERVATION

### A. Direct Pixel Inspection of Visual Proof PNGs via `view_file`

All 20+ visual proof PNG files in `docs/proofs/odontogram/` were physically opened and inspected pixel-by-pixel:

1. **`gate0_tooth46_pc_light.png` (1440×900)**:
   - Monolithic crown rendered with authentic porcelain gradient (`#ffffff` $\to$ `#f8fafc` $\to$ `#f1f5f9`), specular highlights on cusps and buccal cervical ridge (`buccalCervicalRidge`).
   - 5 anatomical cusps (MB, DB, D, ML, DL) with individual triangular ridges and natural shading.
   - Central fissure complex follows the canonical Dryopithecus Y-5 pattern with hairline rendering ($\le 0.8\text{px}$).
   - Mesial root exhibits authentic longitudinal developmental groove (*Sulcus Longitudinalis*), dividing the root into two columns.
   - Furcation crotch (*bifurcationCrotch* at $\{x: 50, y: 96\}$) rendered with organic radial ambient shadow, zero polygonal wedges.
   - Status HUD displays: `Масштаб: 2x (200x340px) | Статус: Норма / Интактный | WCAG: 3.33:1 (AA) · 5 Бугров: MB, DB, D, ML, DL`.

2. **`gate0_tooth46_pc_dark.png` (1440×900)**:
   - Deep slate-navy background (`#0f172a` / `#1e293b`).
   - Contrast ratio elevated to WCAG AAA (`4.52:1`).
   - Zero white haloing or washed-out patches; delicate hairline contours remain crisp.

3. **`gate0_tooth46_mobile_light.png` & `gate0_tooth46_mobile_dark.png` (390×844)**:
   - Screen adheres strictly to Apple HIG touch-first layout.
   - Header, presets bar, and layer toggles wrap or horizontally scroll with smooth edge fade masks (`[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent_100%)]`).
   - Root apices end comfortably mid-screen; vertical clearance below apices exceeds $176\text{px}$ (`pb-44`), providing over $200\text{px}$ of visible breathing room inside the card container.
   - Zero horizontal scrollbar drift, 0px clipping on 390px viewport.

4. **`gate0_tooth46_macro_pulp.png` & `gate0_tooth46_macro_pulpitis.png`**:
   - Enamel shell is rendered with 2.5D X-Ray translucency (`fillOpacity="0.38"`), revealing the coronal pulp cavity (`cavitas pulparis coronae`).
   - Vaulted roof (`tegmen cavi`) sits at $Y=42\text{--}44$, providing $>20\text{px}$ ($>4.5\text{mm}$) of solid occlusal dentin/enamel buffer below the central fissure ($Y=22$).
   - 5 distinct pulp horns (`cornua pulpae`) project towards the 5 cusps. ML is tallest at $Y=33$, followed by DL at $Y=34$, MB at $Y=37$, DB at $Y=37$, and D at $Y=38.5$.
   - Fine neurovascular capillary strands (`neuroPlexus`) run longitudinally inside the chamber.
   - Pulpal floor (`fundus cavi`) curves upward in a convex vault ($Y=69\text{--}72$) over the furcation, transitioning seamlessly at $Y=72$ into 3 funnel-shaped canal orifices (MB, ML, D) without horizontal step or neck cutoff.

5. **`gate0_tooth46_macro_granuloma.png`**:
   - Parasitic caries and stray buccal pit cavities are completely absent (`caries: false`).
   - Coronal chamber contains dark necrotic pulp breakdown (`#292524`).
   - Symmetrical circumscribed periapical granulomas with fibrous capsule rims at both mesial ($Y=162.5$) and distal ($Y=159.5$) apices are 100% complete and unclipped within the expanded `viewBox="0 0 100 170"`.

6. **`gate0_tooth46_macro_broken_file.png`**:
   - Apical third of mesiobuccal (MB) canal houses a fractured NiTi rotary instrument fragment featuring spiral cutting flutes, jagged fracture line, and clinical amber warning outline.

7. **`gate0_tooth46_macro_radicular_cyst.png`**:
   - Large circular osteolytic lesion ($r=12\text{px}$) with an authentic sclerotic, radiopaque corticated border reaching $Y=167.5$, cleanly fitting inside `viewBox="0 0 100 170"` with $2.5\text{px}$ clearance.

8. **`gate0_tooth46_macro_post_core_kshv.png`**:
   - Anatomical metallic cast core (КШВ) with primary distal post and mesial retention pin; apical canal segments remain hermetically sealed with pink gutta-percha.

9. **`gate0_tooth46_macro_crown_gold.png` & `gate0_tooth46_macro_crown_pfm.png`**:
   - Full cast gold displays warm 18K/24K gradient with specular highlights.
   - PFM features characteristic dark subgingival metal collar (`#dente-pfm-metal-collar`) along the cervical margin above CEJ.

10. **`gate0_tooth46_macro_crown_defective.png`**:
    - MB cusp ceramic chipping with exposed core substructure, cervical cement washout gap with recurrent caries, occlusal wear perforation, and overhanging proximal margin.

11. **🚨 `gate0_tooth46_macro_apical_resorption.png` (CRITICAL VISUAL DEFECT)**:
    - **Observed pixel failure**: The screenshot displays standard intact, pointed root tips extending down to $Y=149$ with two standard round granulomas covering the apices.
    - **No blunted apex or Howship's lacunae are visible!** The actual resorption crater is completely missing from the rendered image.

---

### B. Code Inspection & Architectural Observations

1. **Layer Ordering Collision in `apps/web/src/components/odontogram/gate0/Tooth46Container.tsx` (Lines 48–63)**:
   ```tsx
   48: {a.periapicalCondition === "resorption" && (
   49:     <Tooth46ResorptionOverlay isDark={isDark} />
   50: )}
   51: {(a.periapicalHalo || a.periapicalCondition === "cyst") && (
   52:     <Tooth46CystOverlay
   53:         condition={a.periapicalCondition ?? "granuloma"}
   54:         isDark={isDark}
   55:     />
   56: )}
   57: {a.roots && !a.implant && (
   58:     <Tooth46Roots
   59:         showGrooves={a.grooves ?? true}
   60:         showCej={a.cej ?? true}
   61:         isDark={isDark}
   62:     />
   63: )}
   ```
   - In SVG painters model, elements render in document order.
   - `<Tooth46ResorptionOverlay>` is placed at line 49.
   - `<Tooth46Roots>` is rendered afterwards at line 58 with an opaque fill (`fill="url(#dente-root-dentin)"`) that draws the full normal root down to $Y=149$.
   - The blunted resorption crater in `Tooth46PeriapicalGeometry.ts` resides at $Y=138\text{--}141$.
   - **Result**: The opaque root mass completely paints over and obliterates the resorption overlay!

2. **Periapical Halo Conflict in `Tooth46PathologyPresets.ts` (Line 62)**:
   ```ts
   62: layers: { ...def, pulp: true, canals: true, periapicalHalo: true, periapicalCondition: "resorption", caries: false, canalCondition: "necrotic" },
   ```
   - `periapicalHalo: true` causes line 51 of `Tooth46Container.tsx` to mount `<Tooth46CystOverlay condition="resorption" />`.
   - In `Tooth46CystOverlay.tsx`, `condition !== "cyst"` falls through to render the bilateral circular granulomas (`geo.granuloma.mesial` and `geo.granuloma.distal`), further obscuring the apex.

3. **Self-Certifying Test Shortcut in `Tooth46Clinical.test.tsx` (Lines 79–85)**:
   ```tsx
   79: const resorbHtml = renderToString(
   80:     React.createElement(Tooth46Container, {
   81:         layers: { periapicalCondition: "resorption" },
   82:     }),
   83: );
   84: assert.ok(resorbHtml.includes("tooth46-resorption"));
   ```
   - The unit test passes because `<g id="tooth46-apical-resorption" data-testid="tooth46-resorption">` exists in the rendered HTML string.
   - However, the actual rendered pixels are 100% occluded by subsequent DOM elements. The test passed despite the clinical feature being invisible on screen.

4. **JSDoc vs Code Discrepancy in `Tooth46PulpChamber.tsx` (Lines 13–15)**:
   - JSDoc comment states: `5 slender pulp horns (ML Y=26, MB Y=32, DB Y=34, DL Y=29, D Y=36)`.
   - Real SVG geometry in `Tooth46PulpGeometry.ts` uses: `ML Y=33, MB Y=37, DB Y=37, DL Y=34, D Y=38.5`.
   - *Note*: The actual code coordinates are clinically superior because they maintain a safer protective dentin buffer ($>11\text{--}14\text{px}$ from cusp summits), but the comment was not synchronized.

5. **Crown Defect Aesthetics in `Tooth46CrownDefects.tsx` (Lines 28, 39, 64)**:
   - Chipped ceramic MB cusp and overhanging margin utilize `stroke={alertStroke}` (`#dc2626` / `#f87171`).
   - This creates a glaring bright red CAD-like markup outline around the defect instead of an authentic micro-fractured ceramic boundary.

6. **File Size Compliance (Mandate 8b)**:
   - All 42 TypeScript/TSX files in `apps/web/src/components/odontogram/gate0/` are strictly $\le 120$ lines (maximum is 113 lines in `Tooth46Container.tsx`).

---

## 2. LOGIC CHAIN

1. **Step 1 (Pulp Cavity Evaluation)**:
   - Observation A.4 & Code B.4 demonstrate that the coronal pulp cavity is visible through a translucent shell (`fillOpacity="0.38"`).
   - The vaulted roof sits at $Y=42\text{--}44$, providing $>20\text{px}$ ($>4.5\text{mm}$) buffer beneath the occlusal fissure ($Y=22$).
   - The 5 pulp horns strictly preserve Wheeler Chapter 11 height hierarchy: ML is tallest ($Y=33$), followed by DL ($Y=34$), MB/DB ($Y=37$), and D ($Y=38.5$).
   - The pulpal floor is arched upward over the furcation at $Y=69\text{--}72$ and smoothly opens into MB, ML, and D canal orifices at $Y=72$.
   - *Deduction*: The coronal pulp chamber and canal orifices satisfy Wheeler Chapter 11 anatomy and resolve the previous rejection directive.

2. **Step 2 (Clinical Presets & Stage Clearance)**:
   - In `Tooth46BasePresets.ts` and `Tooth46PathologyPresets.ts`, `caries: false` is explicitly set in all endo and perio presets.
   - In `gate0_tooth46_macro_granuloma.png`, zero stray parasitic caries or buccal pit spots appear.
   - The expanded `viewBox="0 0 100 170"` provides full stage clearance for all periapical lesions: granulomas (lowest point $Y=162.5$), radicular cyst ($Y=167.5$), and sealer puffs ($Y=150$). None are clipped.
   - *Deduction*: Parasitic caries eradication and viewBox stage clearance are fully achieved.

3. **Step 3 (Crown Materials & Apple HIG Ergonomics)**:
   - All 6 crown materials (Zirconia, PFM, E-Max, Gold, Co-Cr Metal, PMMA) are implemented in both sound and defective presets.
   - Specific core substructure fills (white zirconia, warm dentin, dark metal, amber PMMA) are dynamically selected.
   - Touch targets on mobile ($390\times 844$) meet or exceed $44\times 44\text{px}$ (`min-h-[44px]`).
   - Apical vertical clearance on mobile is $176\text{px}$ (`pb-44`), well above the $>150\text{px}$ mandate.
   - *Deduction*: Crown matrix and Apple HIG mobile ergonomics are verified.

4. **Step 4 (Occluded Apical Resorption Failure)**:
   - Direct inspection of `gate0_tooth46_macro_apical_resorption.png` reveals that the root apices are intact and pointed down to $Y=149$.
   - Tracing `Tooth46Container.tsx` reveals that `<Tooth46ResorptionOverlay>` is mounted at line 49, while `<Tooth46Roots>` is mounted at line 58.
   - `<Tooth46Roots>` renders an opaque dentin fill down to $Y=149$, completely occluding the blunted resorption crater at $Y=138$.
   - Furthermore, `periapicalHalo: true` causes `<Tooth46CystOverlay>` to draw granulomas over the intact roots.
   - The unit test in `Tooth46Clinical.test.tsx` merely verified the presence of the string `"tooth46-resorption"` in the server-rendered HTML markup, self-certifying success without visual proof.
   - *Deduction*: The apical root resorption feature is visually broken and occluded in production rendering. Approving this would constitute a violation of the Creator's Supreme Stop Directive: *"Зелёные тесты доказывают лишь отсутствие синтаксического краша, но НЕ доказывают отсутствие визуального брака"*.

---

## 3. CAVEATS

1. **Unrelated Workspace Failures**:
   - `npm test` triggered a global repository pretest check failing on unrelated legacy files exceeding 500 lines (e.g. `apps/api/src/ai/dentalTools/desktopSystemTools.ts`).
   - `npm run typecheck -w @dental/web` halted on unrelated syntax issues in `src/components/lab/DentalLabFinancialGate.tsx`.
   - However, `apps/web/src/components/odontogram/gate0/` compiles with **0 TypeScript errors** and its isolated Vitest suite passes **9/9 tests clean (100% pass)**.
2. **CAD Alert Markup**:
   - The red outlines on crown chipping and overhanging margin in `Tooth46CrownDefects.tsx` were evaluated as a minor aesthetic shortcoming rather than an outright functional blocker, but should be refined to authentic clinical texture.

---

## 4. CONCLUSION & VERDICT

**VERDICT: REQUEST_CHANGES**

### Required Action Items for `worker_tooth46_master`:

1. **Fix Apical Resorption Layer Ordering in `Tooth46Container.tsx` (CRITICAL)**:
   - When `a.periapicalCondition === "resorption"`:
     - Either `<Tooth46ResorptionOverlay>` must be rendered **after** `<Tooth46Roots>` and paint an opaque blunted crater cap over the mesial apex; OR
     - `<Tooth46Roots>` must dynamically use a shortened/resorbed root path terminating at $Y=138$.
2. **Clean Preset Flags in `Tooth46PathologyPresets.ts` (CRITICAL)**:
   - For preset `resorption` (line 62), set `periapicalHalo: false` so that the default granuloma overlay does not cover the resorbed apex.
3. **Clip Canal Terminus in Resorption Mode (MAJOR)**:
   - Ensure the MB/ML canal tracks do not protrude past the shortened apex ($Y=138$) into empty space.
4. **Refine Crown Defect Strokes in `Tooth46CrownDefects.tsx` (MINOR)**:
   - Replace the glaring `#dc2626` alert stroke on ceramic chipping with an authentic micro-fractured enamel/ceramic border (`#cbd5e1` / `#94a3b8` with subtle shadow).
5. **Re-capture Visual Proofs (MANDATORY)**:
   - Re-run Playwright capture for `gate0_tooth46_macro_apical_resorption.png` and `gate0_tooth46_macro_resorption.png`.
   - Inspect visually to confirm that the blunted, scalloped Howship's lacunae apex is genuinely visible on screen!

---

## 5. VERIFICATION METHOD

To independently verify the resolution of these defects:

1. **Verify Source Changes**:
   - Inspect `apps/web/src/components/odontogram/gate0/Tooth46Container.tsx` to ensure `<Tooth46ResorptionOverlay>` is rendered on top of `<Tooth46Roots>` or root path is truncated.
   - Inspect `apps/web/src/components/odontogram/gate0/Tooth46PathologyPresets.ts` to confirm `periapicalHalo: false` for `resorption`.
2. **Execute Machine Gates**:
   - `npx vitest run apps/web/src/components/odontogram/gate0` (Must pass 9/9 tests).
3. **Inspect Captured Visual Proof PNGs via `view_file`**:
   - Open `docs/proofs/odontogram/gate0_tooth46_macro_apical_resorption.png`.
   - Verify that the mesial root apex is visibly shortened and blunted at $Y=138$ with visible Howship's lacunae, rather than ending at $Y=149$ covered by granulomas.
