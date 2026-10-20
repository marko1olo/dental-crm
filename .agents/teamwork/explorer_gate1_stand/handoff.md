# HANDOFF REPORT — Gate 1 Test Stand & Visual Proof Pipeline Exploration (FDI 16 & 26)

**Agent**: `explorer_gate1_stand`  
**Milestone**: Gate 1 Upper First Molars (FDI 16 & 26) Test Stand & Visual Proof Pipeline  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_gate1_stand\`  
**Target File**: `C:\Clinic_MVP\dental-crm\.agents\teamwork\explorer_gate1_stand\handoff.md`  

---

## 1. Observation

### 1.1 Existing Gate 0 Stand Structure & Precedent
1. **`apps/web/src/components/odontogram/gate0/Tooth46InspectionStand.tsx` (108 lines)**:
   - Root element uses `data-testid="tooth-46-gate0-stand"`.
   - Theme sync via `useEffect` applying `data-theme` attribute (`document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")`).
   - Zoom controls `[1x, 2x, 4x]` mapped to SVG dimensions: $100\times \text{zoom} \times 160\times \text{zoom}$ px.
   - Stage container: `main` with `overflow-auto`, relative positioning, and `.stand-hud` displaying zoom factor, active preset, WCAG contrast ratio, and anatomical landmarks.
   - Presets bar (`Tooth46StandToggles.tsx`): horizontal scrollable carousel with CSS fade mask `[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent_100%)]`, `scrollbar-none`, `touch-pan-x`.
   - Prosthetic bar (`Tooth46ProstheticBar.tsx`): 6 crown materials (Zirconia, PFM, E-Max, Gold, Metal, PMMA) and condition switches (`adequate` vs `defective`).

2. **`apps/web/src/main.tsx` Stand Routing (Lines 873–896)**:
   ```tsx
   } else if (
       typeof window !== "undefined" &&
       (new URLSearchParams(window.location.search).get("stand") === "odontogram-gate0" ||
           new URLSearchParams(window.location.search).has("odontogram-gate0") ||
           window.location.hash.toLowerCase().includes("odontogram-gate0"))
   ) {
       applyThemeToRoot(document.documentElement, resolveTheme((localStorage.getItem("dente_theme") as any) || "auto", window.matchMedia("(prefers-color-scheme: dark)").matches));
       installApiAuthFetch();
       appRoot.render(
           <React.StrictMode>
               <BootErrorBoundary audience="clinic">
                   <React.Suspense fallback={<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">Загрузка стенда одонтограммы Gate 0...</div>}>
                       <Tooth46InspectionStand />
                   </React.Suspense>
                   <GlobalToast />
               </BootErrorBoundary>
           </React.StrictMode>
       );
   }
   ```
   - Lazy import at line 121: `const Tooth46InspectionStand = React.lazy(() => import("./components/odontogram/gate0").then((m) => ({ default: m.Tooth46InspectionStand })));`
   - **Gate 1 is currently not routed in `main.tsx`**.

3. **`scripts/capture-odontogram-gate0-4state.mjs` (427 lines)**:
   - Uses Playwright Chromium, spawns Vite dev server on port 5173 if not responding.
   - Suppresses overlays (`vite-error-overlay`, `.global-toast-container`).
   - Captures Desktop PC (1440x900) Light & Dark, Mobile Smartphone (390x844 @2x) Light & Dark.
   - Hides `.stand-hud` and captures 4x macro close-ups using bounding box clipping.
   - Enforces `verifyByteGuard` with floor `BYTE_GUARD_MIN = 20480` (20 KB).

4. **Current Status of `apps/web/src/components/odontogram/gate1/`**:
   - 37 modular TypeScript / TSX files exist, all strictly $\le 120$ lines (Mandate 8b verified: `tooth16GeometryConstants.ts` = 118 lines, `Tooth16RestorationOverlay.tsx` = 117 lines, `Tooth16Container.tsx` = 103 lines, `Tooth16InspectionStand.tsx` = 110 lines).
   - Vitest tests: `npx vitest run apps/web/src/components/odontogram/gate1` passes 100% (2 files, 14 passed, 0 failed in 335ms).
   - TypeScript check on `gate1`: 0 compile errors.
   - **Current Defects in `Tooth16InspectionStand.tsx` and UI subcomponents**:
     * Line 41: Uses hardcoded `dark bg-slate-950` / `bg-slate-100` instead of CSS design tokens (`var(--paper)`, `var(--ink)`, `var(--line)`).
     * Missing `data-theme` attribute synchronization on `document.documentElement`.
     * Missing `data-testid="tooth-16-gate1-stand"`.
     * Missing `.stand-hud` telemetry overlay.
     * `Tooth16StandToggles.tsx` (lines 9–28) and `Tooth16ProstheticBar.tsx` (lines 13–20) contain **cartoon emojis** (`🌱`, `🦷`, `⛰️`, `🌉`, `✨`, `🩸`, `🧬`, `🌸`, `🔴`, `🦠`, `🪨`, `🔩`, `👑`, `🍶`, `💎`, `🟡`, `🔘`, `🧪`). This violates the 7 Deadly Sins of UI ("0 cartoon emojis in medical forms").
     * Interactive buttons lack `min-h-[44px]` or touch expansion on mobile screens, violating touch target minimum $\ge 44\times 44\text{px}$.
     * Display stage container has `overflow-hidden` at line 91, which clips the tooth during 4x zoom (400×640px) inside `min-h-[380px]`.

---

## 2. Logic Chain

1. **Routing Logic (Step 1 $\to$ Observation 1.2)**:
   - To integrate Gate 1 without disturbing Gate 0, `main.tsx` must parse:
     `new URLSearchParams(window.location.search).get("stand") === "odontogram-gate1"` OR
     `new URLSearchParams(window.location.search).has("odontogram-gate1")` OR
     `window.location.hash.toLowerCase().includes("odontogram-gate1")` OR
     unified selector: `stand=odontogram` with `tooth=16` or `tooth=26`.
   - Gate 0 routing must also recognize `stand=odontogram&tooth=46`.
   - The lazy import `Tooth16InspectionStand = React.lazy(() => import("./components/odontogram/gate1").then(m => ({ default: m.Tooth16InspectionStand })))` must be placed alongside `Tooth46InspectionStand`.

2. **Stand Shell & Theme Synchronization (Step 2 $\to$ Observation 1.1, 1.4)**:
   - `Tooth16InspectionStand.tsx` must initialize `isDark` from `document.documentElement.getAttribute("data-theme") === "dark" || document.documentElement.classList.contains("dark")`.
   - On change, it must execute `document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")` and toggle `.dark` on `document.documentElement`.
   - The stand must style its background and surfaces using `var(--paper)`, `var(--ink)`, and `var(--line)` to achieve crisp Apple HIG Light mode and true OLED Dark mode.

3. **Bilateral Mirroring & URL Tooth Selection (Step 3 $\to$ Observation 1.4, Wheeler 11th Ed.)**:
   - Maxillary First Molars are bilateral anatomical counterparts: Tooth 16 is Upper Right, Tooth 26 is Upper Left.
   - `Tooth16Container.tsx` already implements horizontal mirror projection:
     `<g transform={isFlipped ? "translate(100, 0) scale(-1, 1)" : undefined}>`.
   - The stand must initialize `toothNumber` (16 | 26) from URL search param `?tooth=26` (defaulting to 16).
   - The header switcher must allow 1-tap switching between 16 and 26, updating `window.history.replaceState` seamlessly.

4. **Eliminating UI Sins & Enforcing Clinical Ergonomics (Step 4 $\to$ Observation 1.4, Mandate 8e, 8ze)**:
   - Cartoon emojis in `Tooth16StandToggles.tsx` and `Tooth16ProstheticBar.tsx` must be replaced with clinical typography and checkmarks (`✓ ` when active).
   - In accordance with Gate 0 Iteration 5 lessons:
     * Label must be `Пресет:` (not «СОСТОЯНИЕ:»).
     * Badges must have zero text ellipsis cuts: `Норма`, `Кариес`, `Пульпит`, `Гранулема`, `Эндо (4К)`, `Пломба (сост.)`, `Пломба (дефект)`, `ZrO2`, `PFM`, `E-Max`, `Gold`, `КХС`, `PMMA`, `Клин. дефект`, `Штифт/Культя`, `Имплант`, `Удален`.
     * All touch targets on mobile ($\le 768\text{px}$) must satisfy $\ge 44\times 44\text{px}$ touch hit area.
     * Single-row horizontally scrolling carousel with CSS gradient mask: `[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent_100%)]`.

5. **Apex Vertical Clearance (>150px) & Display Stage (Step 5 $\to$ Observation 1.4)**:
   - Maxillary teeth have roots pointing UPWARDS (Palatal apex at Y=8, MB at Y=14, DB at Y=18) and crown pointing DOWNWARDS (Y=96..155).
   - The stage container must have `overflow-auto` (replacing `overflow-hidden`) so that at 2x (320px) and 4x (640px) zoom, root apices and crown can be scrolled and inspected cleanly.
   - Vertical padding must guarantee $>150\text{px}$ clearance between the bottom crown edge and floating controls, and $>40\text{px}$ top clearance from HUD telemetry.
   - Outer container must have `overflow-x: clip; max-width: 100vw;`.

6. **Playwright Visual Proof Pipeline Architecture (Step 6 $\to$ Observation 1.3, Mandate 8b)**:
   - To strictly comply with Mandate 8b ($\le 120$ lines per file), the 427-line monolith from Gate 0 must not be copied as a giant file.
   - The Gate 1 visual proof pipeline must be decomposed into modular files under `scripts/gate1/`:
     * `gate1CaptureConstants.mjs` ($\le 60$ lines): URLs, paths, viewports, shot names.
     * `gate1ServerHelper.mjs` ($\le 60$ lines): Vite dev server liveness check and spawning.
     * `gate1BrowserHelper.mjs` ($\le 85$ lines): Chromium launch, overlay suppression, theme toggle, zoom, tooth selector.
     * `gate1AntiBlankGuard.mjs` ($\le 80$ lines): File size guard ($\ge 20480$ bytes) and canvas/DOM pixel variance verification ($> 15.0$ luminance stddev).
     * `gate1DesktopCaptures.mjs` ($\le 100$ lines): 1440x900 PC Light & Dark for Tooth 16 and Tooth 26.
     * `gate1MacroCaptures.mjs` ($\le 120$ lines): 4x zoom occlusal Carabelli, trifurcation, canals, caries, pulpitis, granuloma, zirconia, gold, defective.
     * `gate1MobileCaptures.mjs` ($\le 85$ lines): 390x844 Mobile Light & Dark for Tooth 16 and Tooth 26.
     * `capture-odontogram-gate1-4state.mjs` ($\le 70$ lines): Root entry-point orchestrator script.

---

## 3. Caveats

1. **Dirty Worktree Context**:
   - `npm run typecheck -w @dental/web` currently reports pre-existing TypeScript errors in unrelated modules (`apps/web/src/components/visit/`, `stagePayment/`, `patientRecall.test.ts`) being actively edited by concurrent subagents.
   - `apps/web/src/components/odontogram/gate1/` has **0 TypeScript errors** and **14/14 passing Vitest tests**.
2. **Server Port Assumption**:
   - The visual proof pipeline assumes Vite runs on `http://127.0.0.1:5173`. The server helper will automatically detect if 5173 is already running or spawn it on demand.
3. **Browser Executables**:
   - Playwright will prioritize installed system Google Chrome or Microsoft Edge on Windows (`C:\Program Files\Google\Chrome\Application\chrome.exe`), falling back to Playwright bundled Chromium.

---

## 4. Conclusion

The architecture for Gate 1 (Upper First Molars: FDI 16 & 26) stand integration and automated visual proof capture pipeline is fully formulated and ready for downstream implementation:

### 4.1 Proposed `apps/web/src/main.tsx` Routing Diff
```tsx
// 1. Lazy import alongside Gate 0:
const Tooth16InspectionStand = React.lazy(() =>
	import("./components/odontogram/gate1").then((m) => ({
		default: m.Tooth16InspectionStand,
	})),
);

// 2. Non-destructive routing block (inserted immediately after Gate 0 block):
} else if (
	typeof window !== "undefined" &&
	(new URLSearchParams(window.location.search).get("stand") === "odontogram-gate1" ||
		new URLSearchParams(window.location.search).has("odontogram-gate1") ||
		window.location.hash.toLowerCase().includes("odontogram-gate1") ||
		(new URLSearchParams(window.location.search).get("stand") === "odontogram" &&
			(new URLSearchParams(window.location.search).get("tooth") === "16" ||
				new URLSearchParams(window.location.search).get("tooth") === "26" ||
				!new URLSearchParams(window.location.search).get("tooth"))))
) {
	applyThemeToRoot(
		document.documentElement,
		resolveTheme(
			(localStorage.getItem("dente_theme") as any) || "auto",
			window.matchMedia("(prefers-color-scheme: dark)").matches,
		),
	);
	installApiAuthFetch();

	appRoot.render(
		<React.StrictMode>
			<BootErrorBoundary audience="clinic">
				<React.Suspense fallback={<div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-sm">Загрузка стенда одонтограммы Gate 1 (Зубы 16 / 26)...</div>}>
					<Tooth16InspectionStand />
				</React.Suspense>
				<GlobalToast />
			</BootErrorBoundary>
		</React.StrictMode>,
	);
```

### 4.2 Proposed UI Refactoring for Gate 1 Stand
1. **`Tooth16InspectionStand.tsx`**:
   - Add `data-testid="tooth-16-gate1-stand"`.
   - Read initial `toothNumber` (16 | 26) from `window.location.search`.
   - Integrate `document.documentElement` theme synchronization.
   - Replace hardcoded background with `style={{ backgroundColor: "var(--paper)", color: "var(--ink)" }}`.
   - Replace `overflow-hidden` with `overflow-auto` on stage container.
   - Add `.stand-hud` overlay for live telemetry.
2. **`Tooth16StandHeader.tsx`**:
   - Replace toy emojis with medical iconography and text.
   - Ensure touch targets $\ge 44\times 44\text{px}$ on mobile (`min-h-[44px] sm:min-h-[30px]`).
3. **`Tooth16StandToggles.tsx` & `Tooth16ProstheticBar.tsx`**:
   - Remove all 18 cartoon emojis.
   - Use clinical badges with `✓ ` active state indicators.
   - Add Apple HIG gradient fade mask and horizontal touch scrolling.

### 4.3 Proposed Playwright Pipeline Files (`scripts/gate1/` & `scripts/capture-odontogram-gate1-4state.mjs`)
Decomposed into 8 files, all strictly $\le 120$ lines:
1. `scripts/gate1/gate1CaptureConstants.mjs`
2. `scripts/gate1/gate1ServerHelper.mjs`
3. `scripts/gate1/gate1BrowserHelper.mjs`
4. `scripts/gate1/gate1AntiBlankGuard.mjs`
5. `scripts/gate1/gate1DesktopCaptures.mjs`
6. `scripts/gate1/gate1MacroCaptures.mjs`
7. `scripts/gate1/gate1MobileCaptures.mjs`
8. `scripts/capture-odontogram-gate1-4state.mjs`

Target artifacts to be generated in `docs/proofs/odontogram/`:
- `gate1_tooth16_pc_light.png` ($\ge 20\text{KB}$, 1440x900)
- `gate1_tooth16_pc_dark.png` ($\ge 20\text{KB}$, 1440x900)
- `gate1_tooth16_mobile_light.png` ($\ge 20\text{KB}$, 390x844 @2x)
- `gate1_tooth16_mobile_dark.png` ($\ge 20\text{KB}$, 390x844 @2x)
- `gate1_tooth26_pc_light.png` ($\ge 20\text{KB}$, 1440x900)
- `gate1_tooth26_pc_dark.png` ($\ge 20\text{KB}$, 1440x900)
- `gate1_tooth26_mobile_light.png` ($\ge 20\text{KB}$, 390x844 @2x)
- `gate1_tooth26_mobile_dark.png` ($\ge 20\text{KB}$, 390x844 @2x)
- 10 Macro shots at 4x zoom (`gate1_tooth16_macro_*.png`).

---

## 5. Verification Method

Downstream agents and reviewers can independently verify this pipeline using:

1. **Vitest Unit Test Suite**:
   ```powershell
   npx vitest run apps/web/src/components/odontogram/gate1
   ```
   *Expected outcome*: 2 test suites passing, 14 tests passed, 0 failures.

2. **TypeScript Compilation Check**:
   ```powershell
   npx tsc --noEmit -p apps/web/tsconfig.json
   ```
   *Expected outcome*: 0 errors in `apps/web/src/components/odontogram/gate1/`.

3. **Mandate 8b Line Count Audit**:
   ```powershell
   Get-ChildItem -Path "apps/web/src/components/odontogram/gate1", "scripts/gate1" -Recurse -File | Select-Object Name, @{Name="Lines";Expression={(Get-Content $_.FullName | Measure-Object -Line).Lines}} | Where-Object { $_.Lines -gt 120 }
   ```
   *Expected outcome*: 0 files returned (all files $\le 120$ lines).

4. **Visual Proof Execution**:
   ```powershell
   node scripts/capture-odontogram-gate1-4state.mjs
   ```
   *Expected outcome*: All 18 PNG files captured in `docs/proofs/odontogram/`, each $\ge 20480$ bytes, non-blank variance pass.

5. **Visual Inspection**:
   Inspect generated PNG artifacts directly via `view_file` to confirm lack of word truncation, lack of cartoon emojis, proper root clearance, and clean Apple HIG shading.
