# Original User Request

## 2026-07-27T00:09:13Z

Execute a comprehensive UI unification and cohesion overhaul across all 11 modules of DENTE Dental CRM (`C:\Clinic_MVP\dental-crm`).

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: `development`

## Requirements

### R1. Cohesive UI Design System Unification
Unify all visual elements across all 11 views (Shift, Schedule, Patients, Imaging, Visit, Documents, Finance, Analytics, Communications, Settings, Marketing):
- Standardize card border-radii (`14px`), container paddings, typography scales (`Golos Text`), and elevation shadow depths.
- Harmonize button variants (Primary teal gradient, Secondary soft border, Ghost text) and status badges (`status-pill`) across all views.
- Ensure 100% theme consistency across Light, Dark, and Night modes without raw color mismatches.

### R2. Structural Inline Style Cleanup & Responsive Refactoring
Audit and refactor all view components to replace ad-hoc inline styles with unified CSS classes from `dente-redesign.css` and `main.css`. Ensure clean responsive flex/grid layouts without horizontal scrolling or text clipping on mobile (390px) and desktop (1440px).

### R3. Quality & Verification Gates
- Verify zero TypeScript errors (`npm run typecheck`).
- Execute `dente-redesign-shots.mjs` to capture 4-state visual proof (Desktop/Mobile x Light/Dark).
- Commit every modified file individually per Clinic MVP Constitution.

## Acceptance Criteria

### Verification
- [ ] `npm run typecheck` passes with 0 errors.
- [ ] All 11 views demonstrate a cohesive, unified visual language.
- [ ] 4-state visual proof matrix generated and self-audited.
