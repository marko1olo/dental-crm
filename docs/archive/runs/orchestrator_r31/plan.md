# Execution Plan — Odontogram & Clinical Workspace Polish (R31)

## Objective
Fulfill all 4 requirements with surgical precision, 100% typecheck and test compliance, and 4-state visual verification.

## Requirements Breakdown & Action Plan

### Phase 1: Deep Reconnaissance & Assessment
1. Inspect anatomical odontogram sizing in `apps/web/src/components/odontogram/` (`AnatomicalAdultArch.tsx`, `AnatomicalPediatricArch.tsx`, `ToothAnatomicalGraphic.tsx`, config/constants).
2. Inspect radial menu implementation in `apps/web/src/components/odontogram/RadialToothMenu.tsx` (radius, typography, icon size, center hub, edge clamping).
3. Inspect tooth hover micro-HUD in `apps/web/src/components/odontogram/` or where `.tooth-hover-quick-hud` is rendered.
4. Inspect clinical modals for touch targets (>= 44px) and font sizes (> 11px):
   - `EndoCanalLogModal.tsx`
   - `PediatricMixedDentitionModal.tsx`
   - `VisitSummaryModal.tsx`
   - `EgiszCdaExportModal.tsx`
   - Cariogram and related controls.
5. Inspect multi-theme token compliance and nested card elimination across all 10 themes.

### Phase 2: Surgical Implementation
- **R1**: Adjust SVG viewport scaling, `cfg.width` (66–98px), `cfg.height` (150px) across desktop viewports, ensuring zero horizontal collision / vertical clipping and touch target >= 44x44px.
- **R2**: Upgrade `RadialToothMenu.tsx` (radius = 170px, 13–14px font-black labels, 16px Lucide icons, center hub w-24 h-24, 240px margin clamping). Polish `.tooth-hover-quick-hud` (frosted glass, text-xs font-black, descriptive Russian labels, smart boundary alignment).
- **R3**: Enhance `EndoCanalLogModal.tsx`, `PediatricMixedDentitionModal.tsx`, `VisitSummaryModal.tsx`, `EgiszCdaExportModal.tsx`, and Cariogram table inputs to enforce min-h/min-w >= 44px and eliminate micro-fonts.
- **R4**: Ensure pure CSS variables (`var(--paper)`, `var(--surface)`, `var(--odontogram-paper)`, `var(--odontogram-border)`) and remove card-in-card nesting.

### Phase 3: Verification & Visual Proof
1. Run `npm run check:encoding`
2. Run `node scripts/check-css-tokens.mjs`
3. Run `npm run typecheck`
4. Run `npm test -w @dental/web`
5. Capture multi-theme 4-state visual screenshots (Mobile Light, Mobile Dark, PC Light, PC Dark).
6. Multimodal VLM inspection of screenshots.
7. Final report with evidence and commit hash.
