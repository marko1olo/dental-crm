# BRIEFING — 2026-08-18T17:15:30Z

## Mission
Comprehensive survey of frontend architecture in apps/web (documents, signing, crypto, tooth chart, websockets, FNS/MIAC/IDS/scripts, UI standards compliance).

## 🔒 My Identity
- Archetype: explorer
- Roles: frontend_integration_explorer
- Working directory: C:/Clinic_MVP/dental-crm/.agents/survey_frontend_explorer
- Original parent: 652b0f7c-875d-47a2-99ee-b79f32a60de3
- Milestone: survey_phase

## 🔒 Key Constraints
- Read-only investigation — do NOT implement production changes directly
- Strict compliance with dental-crm/.agents/AGENTS.md, UI_STANDARDS.md, DOCUMENTS_LIFECYCLE.md
- Produce structured 5-component handoff report

## Current Parent
- Conversation ID: 652b0f7c-875d-47a2-99ee-b79f32a60de3
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `apps/web/src/DocumentsView.tsx`
  - `apps/web/src/components/documents/` (DocumentUkepSignButton, NdflCalculatorModal, DocumentPayloadCard, forms)
  - `apps/web/src/components/odontogram/` (ToothChart, OdontogramModule, EndoCanalLogModal)
  - `apps/web/src/components/egisz/` (EgiszCdaExportModal, egiszCdaValidator, EgiszMonitor)
  - `apps/web/src/utils/cryptoPro.ts`, `apps/web/src/lib/cryptopro.ts`
  - `apps/web/src/hooks/useWebsocket.ts`, `useScheduleRealtime.ts`, `useDocumentMutations.ts`
  - `apps/web/src/components/reports/ManagerReportsPanel.tsx`
  - `apps/web/src/styles/` (tailwind.css, token-aliases.css, dente-operations.css)
- **Key findings**:
  - Full CAdES-BES detached signing pipeline implemented in `apps/web/src/utils/cryptoPro.ts` and `DocumentUkepSignButton.tsx`.
  - 5-surface FDI ISO 3950 tooth chart (`SurfaceSelector` B/L/O/M/D, quadrants 1-8) fully integrated in `ToothChart.tsx` and `OdontogramModule.tsx`.
  - FNS tax deduction UI implemented via `NdflCalculatorModal.tsx`, `TaxDeductionApplicationForm.tsx`, and `downloadTaxDocumentXml`.
  - 4 specialty IDS templates (therapy, surgery, prosthetics, orthodontics) unified under `ProcedureSpecificConsentForm.tsx` and `packages/shared/src/index.ts`.
  - Document status updates lack dedicated WebSocket hook; currently polled or manual.
  - MIAC Form 039/u and UET metrics need new CMO view/tab in frontend.
  - Staff speech scripts for patient refusal require structured modal/drawer.
  - Design compliance, Tailwind v4 theme tokens, and UTF-8 encoding verified (`npm run check:encoding` 2666 files clean, `npm run typecheck` 0 errors).
- **Unexplored areas**: All required investigation scope has been explored in full.

## Key Decisions Made
- Generated 5-component structured handoff report detailing exact component paths, props, data flows, and execution plans for all 6 requirements.

## Artifact Index
- `C:/Clinic_MVP/dental-crm/.agents/survey_frontend_explorer/handoff.md` — Comprehensive frontend integration report
