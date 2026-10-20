# HANDOFF REPORT: TOOTH 46 INSPECTION STAND & PLAYWRIGHT VISUAL ATLAS PIPELINE

> **Role**: Explorer & Visual Testing Architect (Tooth 46 Stand & Visual Atlas)  
> **Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_tooth46_stand`  
> **Status**: Completed Read-Only Forensic Audit, Stand UI Ergonomics Blueprint & Automated Visual Atlas Pipeline Design (Iteration 5 Remediation)  
> **Target Scope**: `apps/web/src/components/odontogram/gate0/` & `scripts/`  
> **Mandate Compliance**: Mandate 8b (all proposed files $\le 120$ lines), Mandate 8d/8al (Apple HIG touch $\ge 44\times 44\text{px}$, 0 cartoon emojis, CSS design tokens, >150px apex clearance, Anti-Blank Guard $\ge 20480\text{B}$, $\sigma > 15.0$)

---

## 1. OBSERVATION

### 1.1 Existing Component Inventory & Line Count Audit (Mandate 8b)
A comprehensive scan of `apps/web/src/components/odontogram/gate0/` revealed 35 files:
1. `Tooth46InspectionStand.tsx`: 108 lines.
2. `Tooth46StandToggles.tsx`: 89 lines.
3. `Tooth46ProstheticBar.tsx`: 81 lines.
4. `Tooth46StandHeader.tsx`: 58 lines.
5. `Tooth46Container.tsx`: 114 lines.
6. `Tooth46Roots.tsx`: 106 lines.
7. `Tooth46OcclusalCusps.tsx`: 110 lines.
8. `Tooth46EndoCanals.tsx`: 103 lines.
9. `Tooth46CariesOverlay.tsx`: 115 lines.
10. `Tooth46CrownOverlay.tsx`: 106 lines.
11. `Tooth46RestorationOverlay.tsx`: 102 lines.
12. `Tooth46PathologyOverlay.tsx`: 112 lines.
13. `Tooth46SurgeryOverlay.tsx`: 74 lines.
14. `Tooth46CrownDefects.tsx`: 54 lines.
15. `Tooth46ShaderDefs.tsx`: 78 lines.
16. `Tooth46CrownShaders.tsx`: 94 lines.
17. `Tooth46EndoShaders.tsx`: 59 lines.
18. `Tooth46PathologyShaders.tsx`: 64 lines.
19. `Tooth46RestorationShaders.tsx`: 23 lines.
20. `tooth46Types.ts`: 86 lines.
21. `tooth46GeometryConstants.ts`: 104 lines.
22. `Tooth46PulpGeometry.ts`: 68 lines.
23. `Tooth46CariesGeometry.ts`: 82 lines.
24. `Tooth46RestorationGeometry.ts`: 65 lines.
25. `Tooth46DefectGeometry.ts`: 34 lines.
26. `Tooth46PathologyGeometry.ts`: 85 lines.
27. `Tooth46BasePresets.ts`: 75 lines.
28. `Tooth46CrownPresets.ts`: 101 lines.
29. `Tooth46PathologyPresets.ts`: 65 lines.
30. `Tooth46ClinicalPresets.ts`: 20 lines.
31. `tooth46LayerConstants.ts`: 24 lines.
32. `Tooth46CrownMaps.ts`: 50 lines.
33. `index.ts`: 26 lines.
34. `Tooth46Clinical.test.tsx`: 74 lines.
35. `Tooth46Gate0.test.tsx`: 88 lines.

**Observation 1.1A**: All 35 existing components and test files in `gate0/` satisfy Mandate 8b ($\le 120$ lines).

### 1.2 Existing Playwright Capture Scripts Audit (Mandate 8b Violation)
A forensic inspection of the existing capture scripts revealed:
1. `scripts/capture-odontogram-gate0-4state.mjs`: **427 lines** (CRITICAL VIOLATION of Mandate 8b $\le 120$ lines).
2. `scripts/capture-odontogram-gate0-extended.mjs`: **193 lines** (CRITICAL VIOLATION of Mandate 8b $\le 120$ lines).

**Observation 1.2A**: Both existing Gate 0 capture scripts severely breach Mandate 8b and must be decomposed into modular files under 120 lines, identical to the pattern in `scripts/gate1/` (`gate1CaptureConstants.mjs`, `gate1ServerHelper.mjs`, `gate1BrowserHelper.mjs`, `gate1AntiBlankGuard.mjs`, `gate1DesktopCaptures.mjs`, `gate1MobileCaptures.mjs`, `gate1MacroCaptures.mjs`).

### 1.3 Audit of Stand UI for Apple HIG & Visual Ergonomics (The 7 Deadly Sins)
Inspection of live code and visual proofs (`gate0_tooth46_pc_light.png`, `gate0_tooth46_mobile_light.png`) revealed the following defects:
1. **Deadly Sin #7 (Cartoon Emojis in Medical UI)**:
   - File `apps/web/src/components/odontogram/gate0/Tooth46StandHeader.tsx:52`:
     ```tsx
     {isDark ? "🌙 Dark" : "☀️ Light"}
     ```
     Observed verbatim: Cartoon emojis `🌙` and `☀️` are rendered directly in the clinical theme switcher.
2. **Apple HIG Touch Target Minimum Violation ($< 44\times 44\text{px}$)**:
   - File `Tooth46StandHeader.tsx:37`: `min-h-[32px] sm:min-h-[28px] min-w-[32px]` for zoom buttons `1x`, `2x`, `4x`.
   - File `Tooth46StandHeader.tsx:50`: `min-h-[32px] sm:min-h-[28px]` for theme toggle.
   - File `Tooth46StandToggles.tsx:43`: `min-h-[36px] sm:min-h-[30px]` for preset buttons.
   - File `Tooth46StandToggles.tsx:74`: `min-h-[32px] sm:min-h-[26px]` for layer buttons.
   - File `Tooth46ProstheticBar.tsx:36,48,66`: `px-2 py-0.5 rounded` ($\approx 24\text{px}$ height) for material and condition buttons.
   - Observed verbatim: Every single clickable control on the mobile viewport ($390\times 844$) has a touch target between 24px and 36px, directly violating Apple iOS HIG standard ($\ge 44\times 44\text{px}$) for gloved chairside manipulation.
3. **Deadly Sin #1 (Truncated Russian Clinical Terms)**:
   - File `Tooth46StandHeader.tsx:25`:
     ```tsx
     <p className="text-[11px] sm:text-xs opacity-60 truncate max-w-[340px] sm:max-w-none">
       Wheeler Dental Anatomy 2.5D · 6 Материалов коронок · Состоятельные / Несостоятельные
     </p>
     ```
     Observed verbatim on mobile 390px screenshot (`gate0_tooth46_mobile_light.png`): text renders as `"Wheeler Dental Anatomy 2.5D · 6 Материалов коронок · Состоятельные ..."` with trailing ellipsis.
   - File `Tooth46ProstheticBar.tsx:73`: `"Несостоятельная (втор. кариес)"` contains informal abbreviation.
   - File `tooth46LayerConstants.ts:17,22`: `"Клин. дефект"`, `"Удален (Х)"`.
4. **CSS Design Tokens Non-Compliance**:
   - File `Tooth46InspectionStand.tsx:57-60`:
     ```tsx
     const bg = isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900";
     const card = isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200";
     ```
     Observed verbatim: Stand uses hardcoded Tailwind slate palette instead of DENTE CSS design tokens (`var(--paper)`, `var(--paper-strong)`, `var(--ink)`, `var(--line)`).
5. **Apex Clearance on Mobile ($> 150\text{px}$)**:
   - In `Tooth46InspectionStand.tsx:84-103`, `<main>` has `p-2 sm:p-8`. On mobile ($390\times 844$), when headers and toggles consume $\approx 240\text{px}$, tooth 46 in 2x zoom occupies $320\text{px}$. While it fits vertically when static, there is insufficient bottom padding (`pb-8` vs required $\ge 150\text{px}$) if a chairside action bar or drawer is active. In 4x zoom ($640\text{px}$), the apex overflows without designated overscroll margin.

### 1.4 Iteration 5 Red Team Autopsy of `gate0_tooth46_macro_granuloma.png`
Direct inspection of `gate0_tooth46_macro_granuloma.png` via `view_file` revealed 3 fatal defects:
1. **Periapical Lesion Clipping**:
   - The mesial and distal root apices ($y=149$ and $y=147$) are located near the bottom of `viewBox="0 0 100 160"`.
   - The periapical granuloma halo ($r=10\text{--}12\text{px}$) extends to $y=161\text{--}164$.
   - In `gate0_tooth46_macro_granuloma.png`, the lower half of both periapical halos is violently sliced off by the SVG viewBox and Playwright clip box (`wholeToothClip.height`).
2. **Parasitic Caries in Periodontitis Preset**:
   - In `Tooth46BasePresets.ts:50`:
     ```ts
     { id: "periodontitis", nameRu: "Периодонтит / Гранулема", layers: { ...def, pulp: true, canals: true, periapicalHalo: true, caries: true } }
     ```
     Observed verbatim: `caries: true` is hardcoded in the periodontitis preset, causing a massive dark necrotic fissure caries and necrotic pit to be drawn directly across the occlusal table during an endodontic/periodontic inspection!
3. **Pulp Chamber Roof (Tegmen Cavi) Wheeler Coordinates**:
   - In `gate0_tooth46_macro_granuloma.png`, the pulp chamber glows pink directly beneath the enamel surface, creating the impression of an unphysiologic raw steak.
   - Wheeler Chapter 11 anatomy dictates:
     * Tegmen cavi (roof of pulp chamber) sits at $Y=42\text{--}46$ in the cervical/middle third of the anatomical crown. Above it lies dense occlusal dentin ($> 15\text{px}$) and enamel cap.
     * 5 pulp cornua (horns) extend toward cusps: ML $Y=26$, MB $Y=32$, DB $Y=34$, DL $Y=29$, D $Y=36$.
     * Fundus cavi (pulp floor) sits at $Y=69\text{--}72$. Canals originate at $Y=72$.

### 1.5 Machine Verification Baseline
Running the test command:
`node --import tsx --import ./testCssStub.mjs --test src/components/odontogram/gate0/Tooth46Clinical.test.tsx src/components/odontogram/gate0/Tooth46Gate0.test.tsx` in `apps/web`:
```
✔ Gate 0 Advanced Clinical States — Tooth 46 (115.2416ms)
✔ Gate 0 First Article — Tooth 46 Monolithic Anatomical Odontogram (203.3891ms)
ℹ tests 8, suites 2, pass 8, fail 0 (Exit Code 0)
```
Routing in `apps/web/src/main.tsx:884-888`: Stand mounts cleanly under `?stand=odontogram-gate0` or `?stand=odontogram&tooth=46`.

---

## 2. LOGIC CHAIN

1. **Premise 1 (Mandate 8b Invariant)**: Every single file in the repository must be $\le 120$ lines.
   - From Obs 1.1A, all 35 existing components in `gate0/` are compliant ($\le 114$ lines).
   - From Obs 1.2A, `scripts/capture-odontogram-gate0-4state.mjs` (427 lines) and `scripts/capture-odontogram-gate0-extended.mjs` (193 lines) violate Mandate 8b.
   - *Inference*: The capture pipeline MUST be decomposed into a modular directory `scripts/gate0/` with focused modules $\le 120$ lines, identical to the successful architecture of `scripts/gate1/`.

2. **Premise 2 (Apple HIG & Clinical Ergonomics Standard)**:
   - From Obs 1.3, the stand UI contains: (1) cartoon emojis in `Tooth46StandHeader.tsx:52`, (2) touch targets $< 44\times 44\text{px}$ across all buttons on mobile, (3) clipped Russian text in the header, (4) hardcoded palette classes instead of CSS tokens, and (5) insufficient root apex clearance ($< 150\text{px}$) on mobile.
   - *Inference*: The stand UI components must be refactored:
     - Replace emojis with clean medical typography (`Светлая` / `Тёмная`).
     - Enforce `min-h-[44px]` touch targets on mobile viewports ($\le 640\text{px}$ / `pointer: coarse`).
     - Refactor container to use `var(--paper)` and `var(--ink)` CSS design tokens.
     - Add `pb-40` ($160\text{px}$) bottom clearance on mobile zoom stage so apices are never obscured.
     - Eliminate word truncation and informal abbreviations.

3. **Premise 3 (Elimination of Autopsy Defects from Iteration 5)**:
   - From Obs 1.4:
     * Expanding SVG viewBox from `"0 0 100 160"` to `"0 0 100 174"` with `height={174 * zoom}` guarantees that periapical lesions extending down to $y=164$ have $\ge 10\text{px}$ clearance and will NEVER be clipped.
     * Setting `caries: false` in `Tooth46BasePresets.ts:50` eliminates the parasitic caries in the periodontitis preset.
     * Refactoring `Tooth46PulpGeometry.ts` to enforce Wheeler coordinates (tegmen cavi at $Y=42\text{--}46$, horns at ML 26, MB 32, DB 34, DL 29, D 36, fundus at $Y=69\text{--}72$) restores authentic anatomical depth.

4. **Premise 4 (Full Clinical Spectrum: 6 Crowns x 2 States & 11 Endo States)**:
   - Orthopedic matrix: 6 materials (ZrO2, PFM, E-Max, Gold, Co-Cr, PMMA) $\times$ 2 conditions (Sound / Defective) = 12 states.
   - Endodontic matrix: 11 distinct clinical states:
     1. Vital pulp (Витальная)
     2. Acute pulpitis (Пульпит)
     3. Empty / necrotic canals (Пустые некротические каналы)
     4. Quality 3D gutta-percha (Гуттаперча 3D)
     5. Underfilled (-3mm) (Недопломбировка)
     6. Overfilled with apical puff (Гиперпломбировка / Puff)
     7. Broken file in MB canal (Сломанный инструмент в MB)
     8. Fiberglass post СВШ (Стекловолоконный штифт)
     9. Cast post-and-core КШВ (Культевая штифтовая вкладка)
     10. Periapical granuloma halo (Гранулема)
     11. Radicular cyst with cortical border (Радикулярная киста) / Apical resorption (Резорбция верхушки).

5. **Premise 5 (Definitive Visual Atlas Pipeline & Anti-Blank Guard)**:
   - The Visual Atlas requires automated, deterministic generation of:
     - 4 Base Proofs: Desktop Light (1440x900), Desktop Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844).
     - 15+ Macro 4x Clinical Close-ups covering every pathological permutation.
     - Each captured PNG must satisfy Anti-Blank Guard: size $\ge 20480$ bytes and pixel/byte stddev $> 15.0$.
   - *Inference*: The refactored capture pipeline in `scripts/gate0/` will deterministically sequence page navigation, zoom configuration, preset/layer activation, clip-box targeting with bottom padding, and Anti-Blank Guard validation.

---

## 3. CAVEATS

1. **Read-Only Explorer Boundary**: As an explorer subagent, no modifications were written to files outside `C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_tooth46_stand\`. All component designs, file decompositions, and scripts detailed below are documented as a drop-in architectural blueprint for the implementer agent.
2. **Backward Compatibility Guarantee**: The proposed type expansions in `tooth46Types.ts` maintain 100% backward compatibility with existing tests (`Tooth46Clinical.test.tsx` and `Tooth46Gate0.test.tsx`) by preserving existing layer flag getters while adding domain state enums.
3. **SVG ViewBox Coordinate Invariants**: All new anatomical overlays (broken file, overfilled puff, cyst, resorption) are anchored to Wheeler's anatomical coordinates in `viewBox="0 0 100 174"` (Mesial apex at `{ x: 23, y: 149 }`, Distal apex at `{ x: 79, y: 147 }`, Periapical clearance to $y=174$).

---

## 4. CONCLUSION & BLUEPRINT SPECIFICATION

### 4.1 Stand UI Component Architecture & Layout Blueprint

The Tooth 46 Inspection Stand is redesigned into modular components, all strictly $\le 120$ lines:

```
apps/web/src/components/odontogram/gate0/
├── Tooth46InspectionStand.tsx   (110 lines: Root layout, theme sync, CSS tokens, apex clearance)
├── Tooth46StandHeader.tsx       (75 lines: No emojis, 44px touch targets, compact subtitle, 1x/2x/4x zoom)
├── Tooth46StandToggles.tsx      (85 lines: Domain tabs & sub-bar orchestrator)
├── Tooth46PresetBar.tsx         (95 lines: 24 clinical presets, 44px mobile touch targets)
├── Tooth46EndoBar.tsx           (90 lines: 11 endodontic clinical state toggles)
├── Tooth46PeriapicalBar.tsx     (80 lines: Periapical & cervical pathology toggles)
└── Tooth46ProstheticBar.tsx     (85 lines: 6 crown materials, Sound vs Defective, Composite A2/A3 vs Secondary Caries)
```

#### Detailed Ergonomic Specifications:
1. **Header (`Tooth46StandHeader.tsx`)**:
   - Zero emojis: theme toggle displays text `"Светлая"` / `"Тёмная"`.
   - Subtitle: `"FDI 46 · 2.5D Wheeler · 6 материалов · Эндо · Патология"` (guaranteed 0px overflow on 390px screens).
   - Touch targets: `min-h-[44px] min-w-[44px]` on mobile (`h-11 sm:h-8 px-3 sm:px-2.5`).
2. **Theme & CSS Tokens (`Tooth46InspectionStand.tsx`)**:
   - Container styles: `background: var(--paper, #ffffff); color: var(--ink, #0f172a);`.
   - Stage card: `background: var(--paper-strong, #f8fafc); border: 1px solid var(--line, #e2e8f0);`.
   - Apex clearance: Stage has `pb-40` ($160\text{px}$) on mobile viewports so floating bottom bars never obscure root apices.
   - Stage zoom stage: `overflow-auto -webkit-overflow-scrolling: touch` supporting smooth inspection at 1x, 2x, and 4x.
3. **Wheeler Anatomical Pulp Coordinates (`Tooth46PulpGeometry.ts`)**:
   - Tegmen cavi at $Y=42\text{--}46$.
   - 5 horns: ML $Y=26$, MB $Y=32$, DB $Y=34$, DL $Y=29$, D $Y=36$.
   - Fundus cavi at $Y=69\text{--}72$.
   - Canals MB, ML, D originating at $Y=72$.
4. **ViewBox Height Expansion**:
   - ViewBox expanded to `"0 0 100 174"`, SVG height `{174 * zoom}`.
   - Guaranteed $\ge 10\text{px}$ clearance below deepest periapical lesion ($y=164$).

---

### 4.2 Complete Clinical Preset Matrix (24 States)

| ID | Clinical Name (RU) | Domain | Key Layers / States Active |
|---|---|---|---|
| `intact` | Норма / Интактный | Анатомия | Эмаль, корни, 5 бугров, борозда |
| `caries_class1` | Кариес I класс (фиссурный) | Терапия | `caries: true` (дендритный кариес Y-5) |
| `caries_secondary` | Кариес вторичный (краевой) | Терапия | `composite: true, compositeCondition: "defective"` |
| `pulpitis` | Пульпит острый очаговый | Эндодонтия | Пульпарная камера, 5 рогов, микрососудистое сплетение |
| `endo_necrotic` | Некроз пульпы / Гангрена | Эндодонтия | Пустые каналы с темным некротическим дентином |
| `endo_quality_gp` | Обтурация 3D (гуттаперча) | Эндодонтия | 3 конусных канала, коралловая гуттаперча до апексов |
| `endo_underfilled` | Недопломбировка каналов | Эндодонтия | Гуттаперча останавливается за 3мм до верхушки корня |
| `endo_overfilled_puff`| Гиперпломбировка с Puff | Эндодонтия | Выведение гуттаперчи/силера грибовидным облаком за апекс |
| `endo_broken_file` | Обломок инструмента в MB | Эндодонтия | Фрагмент Ni-Ti файла с винтовой нарезкой в апикальной 1/3 MB |
| `post_core_kshv` | Культевая вкладка (КШВ) | Ортопедия | Цельнолитой металлический штифт + литая культя |
| `post_core_svsh` | Стекловолоконный штифт (СВШ)| Ортопедия | Кварцевый прозрачный штифт + композитная культя |
| `periodontitis_gran`| Периодонтит (гранулема) | Периодонтия | Диффузный периапикальный ореол (halo), `caries: false` |
| `radicular_cyst` | Радикулярная киста | Периодонтия | Остеолитическая полость с белым кортикальным ободком |
| `apical_resorption` | Апикальная резорбция корня | Периодонтия | Укороченный размытый апекс с лакунами рассасывания |
| `abfraction` | Клиновидный дефект | Терапия | V-образная цервикальная убыль эмали у десневого края CEJ |
| `crown_zirconia` | Коронка: Цирконий (сост.) | Ортопедия | Монолитный многослойный ZrO2, глазурь, анатомия 5 бугров |
| `crown_zirconia_def`| Коронка: Цирконий (скол) | Ортопедия | Скол керамики на MB бугре, щель 1.8px, перфорация |
| `crown_emax` | Коронка: E-Max дисиликат | Ортопедия | Стеклокерамика с молочной опалесценцией и микробликами |
| `crown_pfm` | Коронка: Металлокерамика | Ортопедия | Керамика с поддесневой темной металлической гирляндой |
| `crown_gold` | Коронка: Золото 18K/24K | Ортопедия | Полированное цельнолитое золото с янтарным отливом |
| `crown_cocr` | Коронка: Co-Cr сплав | Ортопедия | Клинический кобальт-хромовый сплав со стальным блеском |
| `crown_pmma` | Коронка: PMMA временная | Ортопедия | Матовая фрезерованная полимерная текстура |
| `implant_grade5` | Титановый имплант Grade-5 | Хирургия | SLA-микрорезьба, полированная шейка, абатмент |
| `missing_cross` | Удаленный зуб (крест) | Хирургия | Клинический красный крест хирургического удаления |

---

### 4.3 Automated Playwright Capture Pipeline Decomposition (Mandate 8b <= 120 lines)

The capture architecture is refactored into `scripts/gate0/`:

```
scripts/
├── capture-odontogram-gate0-4state.mjs   (70 lines: Primary runner, summary table, gate validation)
├── capture-odontogram-gate0-extended.mjs (65 lines: Macro runner delegate)
└── gate0/
    ├── gate0CaptureConstants.mjs          (45 lines: URLs, paths, viewports, byte & stddev floors)
    ├── gate0ServerHelper.mjs              (55 lines: Vite port polling & auto-spawn)
    ├── gate0BrowserHelper.mjs             (95 lines: Chromium launch, overlay suppression, theme & zoom control)
    ├── gate0AntiBlankGuard.mjs            (50 lines: Buffer validation, size >= 20480B, stddev > 15.0)
    ├── gate0BaseCaptures.mjs              (90 lines: Desktop Light/Dark 1440x900, Mobile Light/Dark 390x844)
    └── gate0MacroAtlasCaptures.mjs        (118 lines: 15+ 4x macro clinical close-ups with bottom padding)
```

#### Detailed Specification of Capture Scripts:

1. **`gate0CaptureConstants.mjs` (45 lines)**:
   - Stand URL: `http://127.0.0.1:5173/?stand=odontogram-gate0`.
   - Output Dir: `C:/Clinic_MVP/dental-crm/docs/proofs/odontogram`.
   - Anti-Blank Guard floors: `BYTE_GUARD_MIN = 20480` (20 KB), `STDDEV_MIN = 15.0`.
   - Viewport definitions: Desktop ($1440\times 900$, 1x dpr), Mobile ($390\times 844$, 2x dpr).

2. **`gate0ServerHelper.mjs` (55 lines)**:
   - Probes `STAND_URL` via `fetch()`. If offline, spawns `vite.js` on port 5173 in `apps/web` with `--host 127.0.0.1 --port 5173`.
   - Polls every 500ms up to 30s. Kills child process safely in `finally`.

3. **`gate0BrowserHelper.mjs` (95 lines)**:
   - Launches Chromium headless using system Chrome if available (`C:\Program Files\Google\Chrome\Application\chrome.exe`) or bundled Chromium.
   - Suppresses overlays: Removes Vite error overlay, tour spotlights, toast notifications, disables CSS animations/transitions for pixel-perfect deterministic screenshots.
   - Theme switcher: Clicks theme toggle and sets `data-theme` + classes `.dark`/`.light` on `document.documentElement`.
   - Zoom setter: Selects 1x, 2x, or 4x button on stand.

4. **`gate0AntiBlankGuard.mjs` (50 lines)**:
   - Reads PNG file buffer. Verifies `stats.size >= 20480`.
   - Samples pixel byte variance at 4-byte intervals across buffer. Calculates standard deviation $\sigma = \sqrt{\frac{1}{N}\sum(x_i - \mu)^2}$.
   - Throws error if $\sigma < 15.0$ (detects uniform white, black, or grey blank screens).
   - Returns `{ size, stdDev }`.

5. **`gate0BaseCaptures.mjs` (90 lines)**:
   - Captures the 4 canonical base proofs:
     1. `gate0_tooth46_pc_light.png` ($1440\times 900$, Light theme, 2x zoom).
     2. `gate0_tooth46_pc_dark.png` ($1440\times 900$, Dark theme, 2x zoom).
     3. `gate0_tooth46_mobile_light.png` ($390\times 844$, Light theme, 2x dpr, 2x zoom).
     4. `gate0_tooth46_mobile_dark.png` ($390\times 844$, Dark theme, 2x dpr, 2x zoom).

6. **`gate0MacroAtlasCaptures.mjs` (118 lines)**:
   - Sets stand zoom to 4x ($400\times 696\text{px}$ vector render).
   - Targets SVG bounding box with 16px lateral margin and **+36px bottom margin** to guarantee 0px clipping of periapical halos and cysts.
   - Sequentially applies presets and captures the 15+ macro clinical close-ups:
     1. `gate0_tooth46_macro_cusps.png`: Occlusal table with Y-5 fissure & 5 cusps.
     2. `gate0_tooth46_macro_caries.png`: Class I dendritic fissure caries.
     3. `gate0_tooth46_macro_broken_file.png`: Broken endodontic file in mesial canal.
     4. `gate0_tooth46_macro_overfilled_puff.png`: Overfilled gutta-percha with apical puff.
     5. `gate0_tooth46_macro_underfilled.png`: Underfilled canal (-3mm from apex).
     6. `gate0_tooth46_macro_post_core_kshv.png`: Cast post-and-core (КШВ).
     7. `gate0_tooth46_macro_post_core_svsh.png`: Fiberglass post (СВШ).
     8. `gate0_tooth46_macro_granuloma.png`: Periapical granuloma without parasitic caries, 0px clipping.
     9. `gate0_tooth46_macro_radicular_cyst.png`: Radicular cyst with cortical border.
     10. `gate0_tooth46_macro_apical_resorption.png`: Apical root resorption.
     11. `gate0_tooth46_macro_zirconia.png`: Multi-layer zirconia crown.
     12. `gate0_tooth46_macro_crown_gold.png`: High-noble burnished gold crown.
     13. `gate0_tooth46_macro_crown_defective.png`: Defective crown porcelain chipping & margin gap.
     14. `gate0_tooth46_macro_composite_defective.png`: Defective margin gap with secondary caries.
     15. `gate0_tooth46_macro_implant.png`: Titanium implant Grade-5 SLA fixture.
     16. `gate0_tooth46_macro_missing.png`: Missing tooth red cross.
     17. `gate0_tooth46_macro_abfraction.png`: Cervical abfraction wedge defect.

---

## 5. VERIFICATION METHOD

To independently reproduce and verify all findings:

1. **Verify Line Counts of Existing Gate 0 Components ($\le 120$ lines)**:
   ```powershell
   Get-ChildItem -Path "apps/web/src/components/odontogram/gate0" -Filter "*.ts*" | ForEach-Object {
       $lines = (Get-Content $_.FullName).Count
       [PSCustomObject]@{ File = $_.Name; Lines = $lines; Compliant = ($lines -le 120) }
   } | Format-Table -AutoSize
   ```
   *Expected Result*: All 35 files have line count $\le 114$ (100% PASS).

2. **Verify Line Count Breaches of Existing Scripts ($> 120$ lines)**:
   ```powershell
   (Get-Content "scripts/capture-odontogram-gate0-4state.mjs").Count
   (Get-Content "scripts/capture-odontogram-gate0-extended.mjs").Count
   ```
   *Observed Result*: 427 lines and 193 lines (Violations confirmed).

3. **Verify Machine Test Execution**:
   Run the canonical test command in `apps/web`:
   ```powershell
   node --import tsx --import ./testCssStub.mjs --test src/components/odontogram/gate0/Tooth46Clinical.test.tsx src/components/odontogram/gate0/Tooth46Gate0.test.tsx
   ```
   *Expected Result*: 8 passing tests, 0 failing, Exit Code 0.

4. **Verify Live Stand Routing**:
   Start Vite server or inspect `apps/web/src/main.tsx:884-888`:
   Confirm `?stand=odontogram-gate0` and `?stand=odontogram&tooth=46` route to `<Tooth46InspectionStand />`.

5. **Invalidation Conditions**:
   - Any script or component file exceeding 120 lines.
   - Any emoji rendered in the stand header or controls.
   - Any touch target $< 44\times 44\text{px}$ on the mobile viewport.
   - Any captured screenshot failing the byte floor ($< 20480$ bytes) or variance floor ($\sigma \le 15.0$).
   - Any periapical lesion clipped at the bottom of the stage.
