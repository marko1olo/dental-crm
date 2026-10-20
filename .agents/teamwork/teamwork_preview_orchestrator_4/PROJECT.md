# Project: DENTE Dental CRM — Potemkin Village Purge & Real Integration

## Architecture
- **Frontend**: React 19, TypeScript strict, Vite, Vanilla CSS design tokens (`var(--paper)`, `var(--ink)`), Lucide icons. Single entry point: `index.html` mounting `<AppShell />`.
- **Backend**: Fastify API on `127.0.0.1:4100`, Drizzle ORM, PostgreSQL 18 on `127.0.0.1:5432`.
- **Tenant & Autonomy**: Strict isolation by `organizationId`, Mandates 8e (Doctor Autonomy) and 8n (Solo Doctor Sovereignty), Zero-Mocks invariant (Mandates 8f, 8am).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Purge Preview HTMLs | Delete 6 preview HTMLs, 5 CBCT test benches, 2 root HTMLs | M1 | Survey 1 (R1) |
| 2 | Purge Preview Entrypoints | Delete 6 `*_preview_main.tsx` standalone entry files | M1 | Survey 1 (R1) |
| 3 | Purge main.tsx Bypasses | Remove 13 query-param bypass branches (`?hygiene`, `?anesthesia`, `?perio`, `?prescriptions`, `?tax`, `?stand=*`, etc.) | M1 | Survey 1 (R1) |
| 4 | Sandbox Hunter Gate | Update `scripts/sandbox_hunter.cjs` to enforce single `index.html` | M1 | Survey 1 (R1) |
| 5 | In-App Perio Chart | Mount `PeriodontogramChart` into `VisitEmkTab.tsx` and `PatientCardModal.tsx` | M2 | Survey 2 (R2) |
| 6 | In-App Anesthesia Protocol | Integrate `AnesthesiaModal` / protocols into chairside visit toolbar | M2 | Survey 2 (R2) |
| 7 | In-App Hygiene Indices | Mount `HygieneIndicesPanel` in patient card and visit tab | M2 | Survey 2 (R2) |
| 8 | In-App Prescriptions 1094n | Connect `PrescriptionModal` / `PrescriptionPrintModal` in chairside visit | M2 | Survey 2 (R2) |
| 9 | In-App Implant Passports | Bind `ImplantPassportModal` in `App.tsx` to live `activePatient` / `activeDoctor` | M2 | Survey 2 (R2) |
| 10 | In-App Clinical Tasks | Wire clinical tasks board into `Sidebar.tsx` and patient card | M2 | Survey 2 (R2) |
| 11 | In-App Tax Deduction (13%) | Add Tax Deduction Certificate launcher to `PatientWorkspaceToolbar.tsx` | M2 | Survey 2 (R2) |
| 12 | In-App Orthopedics Cockpit | Connect orthopedics lab order creation into treatment plan steps | M2 | Survey 2 (R2) |
| 13 | In-App Telephony Floating Widget | Ensure `TelephonyFloatWidget` is driven by live incoming call events in `AppShell` | M2 | Survey 2 (R2) |
| 14 | Eradicate TreatmentPipeline Fallbacks | Replace "Лечащий врач" and hardcoded requisites with live context & warnings | M3 | Survey 3 (R3) |
| 15 | Eradicate Payroll Fallbacks | Remove "ООО «Денте Стоматология»", fake doctor Voronov, synthetic 61.5k ₽ | M3 | Survey 3 (R3) |
| 16 | Eradicate Print Diary Dummy Data | Remove hardcoded "Иванов Иван Иванович" and "001" from print builders | M3 | Survey 3 (R3) |
| 17 | Eradicate Global Search Dummy Array | Replace `SAMPLE_PATIENTS` in `HeaderGlobalSearch.tsx` with live API search | M3 | Survey 3 (R3) |
| 18 | Eradicate Launcher Mock Contexts | Bind `SpecializedClinicalLaunchers` & `SpecializedAdministrativeLaunchers` to live context | M3 | Survey 3 (R3) |
| 19 | Lab Scan Binary Upload & Local Fallback | Wire real file upload in `useLabAttachScanState.ts`, handle local disk storage when S3 absent | M4 | Survey 2 (R4) |
| 20 | Fix PLY Content-Type 415 | Add `"model/ply"` to Fastify parser in `portalMockStorageRoutes.ts` | M4 | Survey 2 (R4) |
| 21 | Wire Dead Actions & Empty Closures | Fix `onDisposalCarpules`, `beginRevise`, and dummy `onClick={() => {}}` handlers | M4 | Survey 2 (R4) |
| 22 | Root E2E Screenshot Harness | Rewrite screenshot scripts to authenticate on `http://127.0.0.1:5173/` through real UI | M5 | Survey 3 (R5) |
| 23 | 4-State Visual Proofs | Capture 1440x900 Light/Dark and 390x844 Light/Dark for all integrated modules | M5 | Survey 3 (R5) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Purge Fake Preview Sandboxes & main.tsx Branches | Features 1-4: Delete preview HTMLs/TSXs, clean main.tsx, update sandbox hunter | None | DONE |
| M2 | Seamless In-App Navigation & Clinical Workspaces | Features 5-13: Integrate 9 clinical modules into Patient Card, Visit EHR, Sidebar | M1 | IN_PROGRESS |
| M3 | Eradicate Production Hardcoded Fallbacks & Dummy Data | Features 14-18: Clean TreatmentPipeline, DoctorPayout, Search, PrintBuilders | M1 | IN_PROGRESS |
| M4 | Real Backend Wiring for Uploads & Dead Actions | Features 19-21: Lab scan local storage, Fastify PLY parser, wire disposal callbacks | M2 | IN_PROGRESS |
| M5 | Real E2E Root Navigation Proofs & Visual Audits | Features 22-23: Real root authentication, 4-state visual proofs, zero sandboxes | M1, M2, M3, M4 | IN_PROGRESS |

## Interface Contracts
### Clinical Workspaces Navigation Props
- `PeriodontogramChart`: `(props: { patientId: string; patientName: string; readOnly?: boolean; onSave?: () => void })`
- `AnesthesiaModal`: `(props: { isOpen: boolean; onClose: () => void; patientId: string; visitId?: string; doctorId: string; onComplete?: (protocol: AnesthesiaProtocol) => void })`
- `HygieneIndicesPanel`: `(props: { patientId: string; visitId?: string; onIndicesSaved?: () => void })`
- `PrescriptionModal`: `(props: { isOpen: boolean; onClose: () => void; patientId: string; patientName: string; doctorId: string; doctorName: string })`
- `ImplantPassportModal`: `(props: { isOpen: boolean; onClose: () => void; patientId: string; patientName: string; doctorId: string; doctorName: string; initialTooth?: number })`
- `TaxDeductionCertificateModal`: `(props: { isOpen: boolean; onClose: () => void; patientId: string; patientName: string })`

### Storage Fallback Contract
- `POST /api/lab/orders/:id/scans/upload-url` -> returns `{ uploadUrl: string, storageKey: string, method: "PUT" }`
- `PUT uploadUrl` -> streams binary buffer to local `.data/lab_scans/<key>` when S3 credentials not configured.
- `GET /api/portal/mock-storage/download?key=...` -> serves stored binary file from `.data/lab_scans/<key>` with appropriate headers.

## Code Layout
- `apps/web/src/main.tsx` — Root application entry point mounting `<AppShell />` only.
- `apps/web/src/components/visit/` — Chairside visit, EMK tabs, EHR toolbars.
- `apps/web/src/components/patients/` — Patient card modals, clinical tabs.
- `apps/web/src/components/lab/` — Laboratory orders, scan attachment state.
- `apps/web/src/pages/coordinator/` — Treatment pipeline, plan presentation.
- `apps/web/src/pages/` — Doctor payout dashboard, finance views.
- `apps/api/src/routes/portal/` — Storage fallback and portal routes.
- `scripts/` — E2E root screenshot capture scripts.
