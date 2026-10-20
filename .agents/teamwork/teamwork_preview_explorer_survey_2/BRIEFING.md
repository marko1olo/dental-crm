# BRIEFING — 2026-10-20T02:32:00Z

## Mission
Red Team Inquisitor survey for Requirements R2 (Seamless Integration of 9 Orphaned Clinical Modules into Real CRM Navigation & Context) and R4 (Real Backend Wiring for Stubbed Endpoints & Direct Uploads, Dead Actions).

## 🔒 My Identity
- Archetype: Explorer / Red Team Inquisitor (Survey Explorer 2)
- Roles: Read-only investigation, architectural defect hunting, navigation integration audit, Fastify/Drizzle endpoint analysis, stub elimination
- Working directory: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_2
- Original parent: 1dba1dd3-1b54-431d-9253-a722303ba51f
- Milestone: Survey & Architectural Blueprint for R2/R4 Eradication

## 🔒 Key Constraints
- Read-only investigation — do NOT modify application source code
- Mandate 8e: Doctor & staff autonomy, zero disabled blocking buttons
- Mandate 8n: Solo-doctor & small clinic scale sovereignty
- Mandate 8y/8z: Zero pharmacological paranoia, soft negative stock
- Apple HIG & Mobile Invariants: No squeezed desktop, touch target >= 44x44px, bottom sheets
- 100% truth, zero fabrication, exact file:line references

## Current Parent
- Conversation ID: 1dba1dd3-1b54-431d-9253-a722303ba51f
- Updated: 2026-10-20T02:32:00Z

## Investigation State
- **Explored paths**:
  - `apps/web/src/main.tsx` (standalone query param routes already purged by peers, leaving modules orphaned without direct root routing)
  - `apps/web/src/components/appLayout/modalsContainerModules/standalone/SpecializedClinicalLaunchers.tsx` & `StandaloneLaunchers.tsx` (uncovered hardcoded mock patients: Смирнова, Ковалёв, Захаров)
  - 9 Clinical Workspaces: AnesthesiaQuickBar, HygieneIndicesPanel, PerioChartModal & PeriodontogramChart, PrescriptionModal, ImplantPassportModal, ClinicalTasksTable, TaxDeductionCertificateModal, OrthopedicsChairsidePanel, TelephonyFloatingWidget
  - Real Navigation Trees: `PatientCardModal.tsx`, `PatientWorkspaceToolbar.tsx`, `VisitViewModals.tsx`, `VisitTabNav.tsx`, `VisitEmkTab.tsx`, `MobileChairsideVisitWorkspace.tsx`, `Sidebar.tsx`, `App.tsx`
  - Backend API Parity: `apps/api/src/routes/` (anesthesia, perio, prescriptions, clinicalImplants, tasks, documents/ndflCalculator, telephony, lab/scansUploadRoutes, portal/portalMockStorageRoutes)
  - Lab Scan Direct Upload: `apps/api/src/services/labScanDirectUpload.ts` and `apps/web/src/components/lab/attachScanModules/useLabAttachScanState.ts` (uncovered that web frontend never calls upload API, only appends `'scans/' + name`, plus Fastify MIME mismatch for `model/ply` vs `application/x-ply`)
  - Dead Actions: `ChairsideToothFdiGrid.tsx`, `AddServiceToothSelector.tsx`, `ChairsideProtocolsSection.tsx`, `VisitEmkInteractiveStage.tsx`, `EmkToolbar.tsx`
- **Key findings**:
  1. Root `main.tsx` standalone routes were eliminated, making in-app integration into `PatientCardModal`, `VisitViewModals`, and `PatientWorkspaceToolbar` urgent.
  2. Root `App.tsx:1602` still renders `ImplantPassportModal` with hardcoded fake Russian patient "Ковалёв Роман Станиславович", `patientId="PAT-2026-088"`.
  3. `VisitEmkModals.tsx:37` has dead state `isLocalPerioModalOpen` where `setIsLocalPerioModalOpen(true)` is never invoked.
  4. Web frontend lab scan attachment (`useLabAttachScanState.ts`) never calls `POST /api/lab/orders/:id/scans/upload-url`, saving a raw string `'scans/' + name` without file upload, guaranteeing 404 when downloading.
  5. `portalMockStorageRoutes.ts` misses `model/ply` content-type parser (only has `application/x-ply`), causing 415 HTTP error on PLY uploads.
  6. Empty arrow functions (`() => {}`) used in `ChairsideProtocolsSection.tsx` (`beginRevise`, `onDisposalCarpules`) and `AnatomicalToothSVG` inside buttons.
- **Unexplored areas**: None. Scope fully surveyed.

## Key Decisions Made
- Deliver a comprehensive, deeply structured `survey_report.md` with:
  1. Full Matrix of 9 Workspaces (Component Path, Props Interface, Current Standalone Mock State, Exact UI Integration Blueprint with live props, Fastify Route & Drizzle Schema).
  2. Complete Lab Scan Direct Upload Architecture analysis (Root Cause of 404, Offline Local Storage Fallback, Fastify Content-Type Parser Fix, Web Hook Client upload implementation).
  3. Catalog of Dead Action Handlers with exact file paths, line numbers, and proposed live handler implementations.
- Author `handoff.md` strictly following the 5-component protocol.

## Artifact Index
- `DISPATCH.md` — Inbound instructions log
- `BRIEFING.md` — Working memory and status
- `progress.md` — Heartbeat and step checklist
- `survey_report.md` — Comprehensive technical report for R2 & R4
- `handoff.md` — 5-component handoff report
