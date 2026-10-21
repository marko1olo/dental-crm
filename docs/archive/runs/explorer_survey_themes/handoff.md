# Theme & Visual System Comprehensive Survey Report

## 1. Observation

### 1.1 All 10 Theme Palettes Inventory
DENTE Dental CRM implements 10 named color themes (plus `auto` following system `prefers-color-scheme`), declared and orchestrated across the following core files:

1. **`apps/web/src/store/themeStore.ts` (lines 7-18, 49-56)**:
   - `ThemeMode` union: `"auto" | "light" | "dark" | "night" | "calm_teal" | "contrast" | "sakura" | "ocean" | "emerald" | "cyber_xray" | "warm_sand"`.
   - Store: `useThemeStore` persists mode in `localStorage` (`dente_theme_mode`) and exposes `window.__useThemeStore`.

2. **`apps/web/src/lib/themeClasses.ts` (lines 28-98)**:
   - `resolveTheme(themeMode, prefersDark)`:
     - Maps `auto` to `prefersDark ? "dark" : "light"`.
     - Determines `isDark = theme === "dark" || theme === "night" || theme === "ocean" || theme === "emerald" || theme === "cyber_xray"`.
     - Returns `{ theme, darkClass: isDark, lightClass: !isDark, colorScheme: isDark ? "dark" : "light" }`.
   - `applyThemeToRoot(root, resolved)`: Sets `root.dataset.theme`, `root.classList.toggle("dark", resolved.darkClass)`, `root.classList.toggle("light", resolved.lightClass)`, and `root.style.colorScheme`.

3. **`apps/web/src/styles/tailwind.css` (lines 55-70)**:
   - `@custom-variant dark`:
     ```css
     @custom-variant dark (
       &:where(
         [data-theme="dark"],
         [data-theme="dark"] *,
         [data-theme="night"],
         [data-theme="night"] *,
         [data-theme="ocean"],
         [data-theme="ocean"] *,
         [data-theme="emerald"],
         [data-theme="emerald"] *,
         [data-theme="cyber_xray"],
         [data-theme="cyber_xray"] *,
         .dark,
         .dark *
       )
     );
     ```

4. **`apps/web/src/styles/main.css`**:
   - `:root` (lines 8-73): Base light variables (`--paper: #ffffff`, `--ink: #111827`, `--teal: #0d9488`, `--line: rgba(15, 118, 110, 0.15)`).
   - `:root[data-theme="dark"]` (lines 75-134): Surgical Slate (`--paper: #0f172a`, `--ink: #f8fafc`, `--teal: #2dd4bf`).
   - `:root[data-theme="light"]` (lines 136-192): Clinical Bright.
   - `:root[data-theme="night"]` / `[data-theme="oled"]` (lines 195-262): True OLED Black (`--paper: #09090b`, `--background: #000000`, `--ink: #ffffff`).
   - `:root[data-theme="calm_teal"]` (lines 265-331): Calm Nordic Teal (`--background: #f0fdfa`, `--ink: #134e4a`, `--teal: #0f766e`).
   - `:root[data-theme="contrast"]` (lines 334-398): High-Contrast WCAG AAA 7:1 (`--background: #ffffff`, `--ink: #000000`, `--line: #000000`).
   - `:root[data-theme="sakura"]` (lines 401-469): Aesthetic Rose (`--background: #fff1f2`, `--ink: #4c0519`, `--teal: #db2777`).
   - `:root[data-theme="ocean"]` (lines 472-540): Deep Sapphire Navy (`--background: #081226`, `--paper: #0c1e3d`, `--ink: #f0f9ff`, `--teal: #38bdf8`).
   - `:root[data-theme="emerald"]` (lines 543-611): Forest Restorative (`--background: #022013`, `--paper: #064e3b`, `--ink: #ecfdf5`, `--teal: #34d399`).
   - `:root[data-theme="cyber_xray"]` (lines 614-682): Neon CT (`--background: #030712`, `--paper: #081026`, `--ink: #e0f2fe`, `--teal: #00f0ff`).
   - `:root[data-theme="warm_sand"]` (lines 685-753): Cozy Boutique Ceramic (`--background: #fefce8`, `--ink: #451a03`, `--teal: #d97706`).

5. **`apps/web/src/styles/token-aliases.css`**:
   - Maps semantic tokens (`--background`, `--surface`, `--border-default`, `--text-muted`, `--good`, `--warn`, `--bad`, etc.) in `:root` (lines 56-205).
   - Specific theme blocks for all 10 themes with specificity `(0,2,0)`:
     - `:root, :root[data-theme="light"]` (lines 240-264)
     - `:root[data-theme="dark"]` (lines 266-285)
     - `:root[data-theme="night"]` (lines 287-301)
     - `:root[data-theme="calm_teal"]` (lines 303-317)
     - `:root[data-theme="contrast"]` (lines 319-333)
     - `:root[data-theme="sakura"]` (lines 335-349)
     - `:root[data-theme="ocean"]` (lines 351-365)
     - `:root[data-theme="emerald"]` (lines 367-381)
     - `:root[data-theme="cyber_xray"]` (lines 383-397)
     - `:root[data-theme="warm_sand"]` (lines 399-413)

6. **`apps/web/src/styles/dente-redesign.css` & `premium.css`**:
   - `dente-redesign.css`: Defines glass panel properties for `sakura`, `ocean`, `emerald`, `cyber_xray`, `warm_sand` (lines 357-390).
   - `premium.css`: Only explicitly defines `light` (lines 6-52), `dark` (lines 54-98), `night` (lines 100-144), `calm_teal` (lines 146-190), `contrast` (lines 192-219).

7. **`apps/web/src/components/odontogram/odontogram.css` (lines 18-170)**:
   - Dedicated styling blocks for all 10 theme palettes (`dark`, `night`/`oled`, `cyber_xray`, `ocean`, `emerald`, `sakura`, `warm_sand`, `calm_teal`, `contrast`, `:root` light).

---

### 1.2 Fullscreen Modal & Popup Components Audit
Audit of all modal, dialog, popup, drawer, and overlay components across `apps/web/src/`:

| Component | File Path | Portals to `document.body`? | SSR Check (`typeof document !== "undefined"`) | Status / Issue |
|---|---|---|---|---|
| **EgiszCdaExportModal** | `apps/web/src/components/egisz/EgiszCdaExportModal.tsx:1518-1519` | Yes | Yes (`typeof document !== "undefined"`) | **Compliant** |
| **DentalLabOrderModal** | `apps/web/src/components/lab/DentalLabOrderModal.tsx:1802-1803` | Yes | Yes (`typeof document !== "undefined"`) | **Compliant** |
| **TelephonySimulatorModal** | `apps/web/src/components/telephony/TelephonySimulatorModal.tsx:368-370` | Yes | Yes (`typeof document === "undefined"` early return) | **Compliant** |
| **IncomingCallPopup** | `apps/web/src/components/telephony/IncomingCallPopup.tsx:332-334` | Yes | Yes (`typeof document === "undefined"` early return) | **Compliant** |
| **SignaturePad Modal** | `apps/web/src/components/odontogram/TreatmentEstimator.tsx:896-912` | Yes | Yes (`typeof window !== "undefined"`) | **Compliant** |
| **Print Preview Modal** | `apps/web/src/components/VisitDiaryEditor.tsx:1359-1361` | Yes | Yes (`typeof window !== "undefined"`) | **Compliant** |
| **EndoCanalLogModal** | `apps/web/src/components/odontogram/EndoCanalLogModal.tsx:563, 901` | Yes | **No** (accesses `document.body` without check) | **Missing SSR Guard** |
| **WaitlistDrawer** | `apps/web/src/components/schedule/WaitlistDrawer.tsx:377, 394` | Yes | **No** (accesses `document.body` without check) | **Missing SSR Guard** |
| **Odontogram Radial Menu** | `apps/web/src/components/odontogram/OdontogramModule.tsx:975, 1114` | Yes | **No** (accesses `document.body` without check) | **Missing SSR Guard** |
| **Omnibar** | `apps/web/src/components/Omnibar.tsx:237, 374` | Yes | **No** (accesses `document.body` without check) | **Missing SSR Guard** |
| **SanPiN Scanner Modal** | `apps/web/src/components/VisitDiaryEditor.tsx:1318, 1356` | Yes | **No** (accesses `document.body` without check) | **Missing SSR Guard** |
| **Clinical Context Menu** | `apps/web/src/VisitView.tsx:2697, 3074` | Yes | **No** (accesses `document.body` without check) | **Missing SSR Guard** |
| **CephalometricAnalysisModal** | `apps/web/src/components/orthodontics/CephalometricAnalysisModal.tsx:31, 731` | **No** (imports `createPortal` at line 31 but returns `modalContent` inline at line 731) | **No** | **Broken Portal / Trapped in DOM** |
| **WaitlistQuickFillModal** | `apps/web/src/components/schedule/WaitlistQuickFillModal.tsx:24, 1440` | **No** (imports `createPortal` at line 24 but returns `modalContent` inline at line 1440) | **No** | **Broken Portal / Trapped in DOM** |
| **SberbankTerminalPaymentModal** | `apps/web/src/components/finance/SberbankTerminalPaymentModal.tsx:226` | **No** (renders `<div className="fixed inset-0 z-[9999]...">` directly inside `PaymentCapture`) | **No** | **No Portal / Trapped in Glass Parent** |
| **NdflCalculatorModal** | `apps/web/src/components/documents/NdflCalculatorModal.tsx:82` | **No** (renders `<div className="modal-overlay fixed inset-0...">` inside parent views) | **No** | **No Portal / Trapped in Glass Parent** |
| **InventoryConfirmDialog** | `apps/web/src/components/inventory/InventoryConfirmDialog.tsx:32` | **No** (renders `inventory-confirm-backdrop` inside `InventoryView`) | **No** | **No Portal / Trapped in Glass Parent** |
| **CommandPalette** | `apps/web/src/components/CommandPalette.tsx:149` | **No** (renders `cmd-palette-backdrop` inside component tree) | **No** | **No Portal** |
| **CryptoProSigner (PIN Dialog)** | `apps/web/src/components/visit/CryptoProSigner.tsx:343` | **No** (renders `fixed inset-0 z-[100]` inside visit tab) | **No** | **No Portal** |

---

### 1.3 Inspection of Visual Capture Scripts & Quality Gates

1. **`scripts/check-css-tokens.mjs`**:
   - Runs TypeScript AST parsing to collect JS custom properties and static regex scanner on 53 CSS files.
   - Evaluated output:
     ```
     css-файлов проверено:            53
     объявлено переменных в css:      212
     имён выставляется из js:         9
     использований var():             3757 (из них с запасом: 778)
     имён использовано через var():   190
     НЕ РАЗРЕШАЕТСЯ НИ В ОДНОЙ ТЕМЕ:  0 имён, 0 вхождений
     СВЕТЛЫЙ ЗАПАС ВО ВСЕХ ТЕМАХ:     0 имён, 0 вхождений
     ```
   - Current status: **Clean (Exit code 0)**.

2. **`scripts/capture-all-views-live.mjs`**:
   - Puppeteer script capturing live views against running Vite + API.
   - **Flaw Observed**:
     * Line 151: `const THEMES = ["light", "dark", "night", "calm_teal", "contrast"];` — only captures 5 themes for desktop.
     * Line 196: `for (const theme of ["light", "dark", "calm_teal"])` — only captures 3 themes for mobile.
     * Line 88: `const isDark = themeMode === "dark" || themeMode === "night";` — neglects `ocean`, `emerald`, `cyber_xray`, causing them to miss proper `.dark` class application in tests.

3. **`scripts/detect-overflows.mjs`**:
   - Evaluates elements with `rect.right > window.innerWidth` on 375px mobile viewport.

---

### 1.4 Hardcoded Hex Colors, Contrast Risks & Layout Shift Findings

1. **Hardcoded Inline Hex Background Bleed**:
   - `apps/web/src/VisitView.tsx:2963-2966`:
     ```tsx
     data-testid="visit-view-endo-canal-log-btn"
     className="_ccm-btn"
     data-color="pink"
     style={{
       borderColor: "#ec4899",
       backgroundColor: "#fdf2f8",
       fontWeight: "bold",
     }}
     ```
     In dark/night/oled/cyber_xray themes, `#fdf2f8` is a blinding light pink box against dark background.

2. **Missing Theme Blocks in `apps/web/src/styles/premium.css`**:
   - `premium.css` lacks definitions for `sakura`, `ocean`, `emerald`, `cyber_xray`, `warm_sand`. They inherit `:root` light `--mesh-bg-*` and `--active-item-*` rules.

3. **Test Scope Gaps**:
   - `apps/web/src/tests/themeClasses.test.ts:53`: Only iterates over `["light", "dark", "night", "calm_teal", "contrast", "auto"]`, skipping the other 5 palettes.
   - `apps/web/src/tests/themeTokenSpecificity.test.ts:244`: Only iterates over 5 themes.
   - `apps/web/src/tests/themeContrastGuard.test.ts:34`: Only measures `["light", "dark", "night"]`.

---

## 2. Logic Chain

1. **From Theme Architecture Observations**:
   - All 10 themes are completely defined in `main.css`, `token-aliases.css`, `odontogram.css`, `themeStore.ts`, and `themeClasses.ts`.
   - However, `premium.css` omitted the last 5 themes, and `scripts/capture-all-views-live.mjs` only audits 5 desktop / 3 mobile themes. Therefore, visual verification of the remaining themes was previously unautomated.

2. **From Modal & Portal Observations**:
   - Multiple modal components (`CephalometricAnalysisModal`, `WaitlistQuickFillModal`) import `createPortal` but fail to use it, rendering `fixed` overlays inline inside parent components.
   - Components like `SberbankTerminalPaymentModal`, `NdflCalculatorModal`, `InventoryConfirmDialog`, and `CryptoProSigner` render fixed overlays inside glassmorphism containers (`.workspace`, `.glass-panel`, `.card-body`) that apply `backdrop-filter` and `transform`. In CSS, `backdrop-filter` and `transform` establish a new containing block and stacking context for `position: fixed` descendants, trapping the modal inside the card instead of covering the entire viewport (`document.body`).
   - Several components using `createPortal(..., document.body)` (`EndoCanalLogModal`, `WaitlistDrawer`, `OdontogramModule`, `Omnibar`, `VisitDiaryEditor`, `VisitView`) do not check `typeof document !== "undefined"`, creating SSR/testing fragility.

3. **From Visual & Token Observations**:
   - `scripts/check-css-tokens.mjs` is effective at preventing undefined CSS variable names.
   - Localized inline hardcoded hex values (such as `VisitView.tsx:2963`) bypass CSS variable checking and produce theme contrast defects in dark modes.

---

## 3. Caveats

- **No Source Modifications**: As this is an explorer investigation, no production files were modified.
- **Headless Live Screenshot Execution**: Full live screenshot capture across all 10 themes requires a running Fastify backend (`127.0.0.1:4100`) and Vite frontend (`127.0.0.1:5173`) with live database seeding.

---

## 4. Conclusion

The theme and visual architecture of DENTE Dental CRM is robustly designed around CSS custom property tokens and `data-theme` selectors. However, remediation is needed in three specific areas:
1. **Modal Portaling & SSR Safety**: Update `CephalometricAnalysisModal`, `WaitlistQuickFillModal`, `SberbankTerminalPaymentModal`, `NdflCalculatorModal`, `InventoryConfirmDialog`, `CommandPalette`, and `CryptoProSigner` to portal to `document.body` with `typeof document !== "undefined"` checks, and add SSR checks to existing portals (`EndoCanalLogModal`, `WaitlistDrawer`, `OdontogramModule`, `Omnibar`, `VisitDiaryEditor`, `VisitView`).
2. **Theme Expansion & Cleanup**: Add definitions for the remaining 5 themes in `premium.css`, replace inline hex styles (such as `VisitView.tsx:2963`) with semantic tokens, and expand `themeClasses.test.ts` and `themeTokenSpecificity.test.ts` to cover all 10 palettes.
3. **Screenshot Automation**: Update `scripts/capture-all-views-live.mjs` to capture all 10 theme palettes on both desktop and mobile viewports.

---

## 5. Verification Method

To verify these findings independently:

1. **Verify CSS Token Gate**:
   ```bash
   node scripts/check-css-tokens.mjs
   ```
   *Expected*: Exits with code 0, 0 undefined tokens.

2. **Verify Theme & Unit Tests**:
   ```bash
   npm test -w @dental/web
   ```
   *Expected*: Passes 1451/1451 tests.

3. **Verify Modal Portals via Code Inspection**:
   - Inspect `apps/web/src/components/orthodontics/CephalometricAnalysisModal.tsx:731` — verify `modalContent` is returned directly instead of portaled.
   - Inspect `apps/web/src/components/schedule/WaitlistQuickFillModal.tsx:1440` — verify `modalContent` is returned directly instead of portaled.
   - Inspect `apps/web/src/components/finance/SberbankTerminalPaymentModal.tsx:226` — verify inline render without portal.
   - Inspect `apps/web/src/VisitView.tsx:2963` — verify hardcoded `#fdf2f8` inline style.
