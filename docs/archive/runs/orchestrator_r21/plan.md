# Plan — Odontogram UI/UX Swarm Overhaul

## Objectives
1. **R1. Authentic 2-Row Horizontal Dental Arch Layout (Dual-Jaw)**:
   - Ensure Anatomical Svg Odontogram, ToothChart, and odontogram.css render strictly as two horizontal arches:
     * Upper Jaw (Row 1): 16 teeth horizontally from right to left (18..11, gap, 21..28).
     * Lower Jaw (Row 2): 16 teeth horizontally from right to left (48..41, gap, 31..38).
     * Flex nowrap on rows and quadrant groups (`.teeth-row`, `.tooth-quadrant-group`).
     * Prominent tooth SVG scale (width ~48-56px, height ~110-130px), multi-roots (3 for upper molars, 2 for lower molars), clear anatomical curves.
2. **R2. Flawless 10-Theme Harmony & Zero Dark/Light Bleed**:
   - In `OdontogramStudioStandalone.tsx`, `OdontogramLiveInvoice.tsx`, `ClassicGostOdontogram.tsx`, and related components:
     * Remove all hardcoded colors, replace with design system variables (`var(--canvas)`, `var(--paper)`, `var(--paper-strong)`, `var(--ink)`, `var(--border)`).
     * Ensure `node scripts/check-css-tokens.mjs` passes with 0 errors.
3. **R3. Centered Radial Tooth Menu & Interactive Ergonomics**:
   - In `RadialToothMenu.tsx`: circular 8-slice pie menu centered on the clicked tooth with boundary clamping, high-contrast action icons, and 1-click assignment. Touch targets >= 44px.
4. **R4. Automated Visual Verification & Screenshot Proof**:
   - Run Playwright test script to capture all 7 required screenshots across themes and viewports.
   - Multimodal visual inspection & self-critique.
5. **Acceptance Verification**:
   - `npm run typecheck -w @dental/web` = 0 errors
   - `npm test -w @dental/web` = all passing
   - `node scripts/check-css-tokens.mjs` = 0 errors
   - `npm run check:encoding` = 0 errors
