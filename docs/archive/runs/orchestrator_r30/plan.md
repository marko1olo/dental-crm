# Engineering Plan — Round 30: Odontogram Workflow Streamlining & Form 043/u Integration

## 1. Objectives
1. **Minimalist 1-Tap Tooth Diagnosis (Zero Surface Bloat)**:
   - Make tapping a tooth on the dental arch open a clean, floating context popup anchored directly to the selected tooth (or centered cleanly).
   - Instant 1-tap buttons for primary diagnoses: Кариес, Пульпит, Периодонтит, Пломба, Коронка, Имплантат, Удален, Здоров.
   - Eliminate forced/obstructive 5-surface selector widgets and sidebar clutter that block the clinical workflow.
2. **Seamless Form 043/u & Clinical Diary Integration**:
   - Provide instant 1-click generation and clipboard copy of Form 043/u clinical diary entries (SOAP: complaints, objective status, ICD-10 diagnosis, treatment description).
   - Provide direct quick access to Журнал корневых каналов (Эндо 043/у) and История зуба without clunky navigation.
3. **Visual Purity & 10-Theme 4-State Proof**:
   - Ensure VisitOdontogramTab, ChairsiderPerspectiveView, ShiftView, and OdontogramStudioStandalone maintain 100% theme compliance across all 10 themes.
   - Touch target area >= 44x44px for all controls.
   - 0 TypeScript errors, 100% test pass rate, 0 broken CSS tokens, 0 encoding errors.

## 2. Granular Task Breakdown
- **Phase 1**: Reconnaissance & Architecture Census
  - Survey `apps/web/src/components/odontogram/` (AnatomicalSvgOdontogram.tsx, RadialToothMenu.tsx, ToothInspectorDrawer.tsx, ToothDetailsModal.tsx, OdontogramToolbar.tsx, VisitOdontogramTab.tsx, ChairsiderPerspectiveView.tsx, etc.)
  - Analyze current tooth selection, radial menu, inspector panel, and 5-surface selector.
  - Survey Form 043/u protocol generation and clipboard integration.
- **Phase 2**: Implement Minimalist 1-Tap Floating Tooth Popup
  - Update or refactor floating tooth popup / RadialToothMenu / ToothInspector to provide lightning-fast 1-tap diagnoses with zero surface obstruction.
  - Ensure surface selector is collapsed or optional, never forced or blocking.
- **Phase 3**: Seamless Form 043/u & Clinical Diary / Endo Protocol
  - Enhance Form 043/u SOAP entry generator with 1-click clipboard copy, rich anatomical terminology (Russian nomenclature), and quick links to Root Canal Journal & Tooth History.
- **Phase 4**: Verification & Theme Audit
  - Run `npm run check:encoding`
  - Run `node scripts/check-css-tokens.mjs`
  - Run `npm run typecheck`
  - Run `npm test -w @dental/web` and `npm test -w @dental/shared`
  - Run Playwright / Puppeteer multi-theme visual audit across 10 themes and 4 states (PC Light, PC Dark, Mobile Light, Mobile Dark).
- **Phase 5**: Victory Audit & Handoff
