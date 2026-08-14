# Project: DENTE CRM Quality, Visual Polish & Financial Integrity Roadmap

## Architecture
- **Backend (`apps/api`)**: Fastify REST API, TypeScript, Drizzle ORM over PostgreSQL 18 at `127.0.0.1:5432`, pessimistic `FOR UPDATE` locking, 4D GIST exclusion constraints on schedule resources (`btree_gist`), 54-FZ FFD 1.2 tags, Sberbank acquiring gateway with HMAC-SHA256 webhooks, and NDFL KND 1151156 XML/PDF generation.
- **Frontend (`apps/web`)**: React 18, Vite, TypeScript, Tailwind CSS, Cornerstone3D for WebGL MPR & CT slice reconstruction, Catmull-Rom dental arch projections, Misch HU bone density cylindrical integration, and 4-state visual system (Mobile/Desktop × Light/Dark).
- **Shared (`packages/shared`)**: Exact integer kopeck math (`moneyRubSchema`, `parseKopecks`, `kopecksToNumericString`, `sumKopecks`), Zod boundary validators.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1-LinterLeak | Eliminate JSX linter leak string in `VisitView.tsx:2706` | M1 | explorer_survey_ui |
| 2 | R1-DarkWhiteouts | Eliminate `#fff` whiteouts on focus/accordions/drawers in `main.css`, `shadow-analyst.css`, `VisitView.tsx` | M1 | explorer_survey_ui |
| 3 | R1-4StateLayout | Fix MPR toolbar wrap & Panorex mobile window clipping (`Cornerstone3DViewer.tsx`, `PanoramicRendererWindow.tsx`) | M1 | explorer_survey_ui |
| 4 | R1-SilentPrefetch | Silence intrusive background/mount error toasts across 7 widgets | M1 | explorer_survey_ui |
| 5 | R1-TouchTargets | Enforce min 44x44px touch targets on mobile (`touch-targets.css`, inline styles) | M1 | explorer_survey_ui |
| 6 | R1-FinanceEmpty | Neutral empty state for `FinancePlanning.tsx` cards (eliminate "не определено" spam) | M1 | explorer_survey_ui |
| 7 | R2-SberAcquiring | Fix Sberbank terminal modal status mapping for `"success"` / `"approved"` / `"failed"` in `SberbankTerminalPaymentModal.tsx` | M2 | explorer_survey_fin |
| 8 | R2-DoctorLabYield | Add ЗТЛ (lab order) deduction column & metrics to `DoctorPayoutDashboard.tsx` | M2 | explorer_survey_fin |
| 9 | R2-NegativeExplain | Synchronize `SUPERSEDED_METHOD_SENTENCE` in `payoutNegativeExplain.ts` with `doctorPayouts.ts` | M2 | explorer_survey_fin |
| 10 | R2-KopeckMath | Verify 100% integer kopeck arithmetic, 54-FZ FFD 1.2 tags, and NDFL KND 1151156 compliance | M2 | explorer_survey_fin |
| 11 | R3-Form043uAutosave | Form 043/u SOAP autosave (30s interval + localStorage fallback) and forensic revisions | M3 | explorer_survey_ehr_dicom |
| 12 | R3-ScheduleLocking | 4D PostgreSQL GIST exclusion constraints and `FOR UPDATE` deterministic row locking | M3 | explorer_survey_ehr_dicom |
| 13 | R4-DicomMprHu | CT/DICOM MPR viewer, Catmull-Rom dental arch FDI mapping, and active volume HU density | M3 | explorer_survey_ehr_dicom |
| 14 | Iron-Gate-Verification | Monorepo static typecheck (shared, api, web), check:encoding, and domain test suite verification | M4 | orchestrator_r9 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | UI & Ergonomics Polish (R1) | Eliminate 4-state visual defects, dark mode whiteouts, linter leaks, intrusive toasts, touch targets <44px, and finance empty spam | none | IN_PROGRESS |
| M2 | Financial & Acquiring Integrity (R2) | Fix Sberbank terminal status polling, doctor lab payout dashboard, and payout negative explanation sync | M1 | PLANNED |
| M3 | EHR 043/u & CT/DICOM MPR Verification (R3 & R4) | Verify Form 043/u SOAP autosave, schedule concurrency locks, and DICOM MPR / FDI / HU calculation | M1, M2 | PLANNED |
| M4 | Final Static, Encoding & Iron Gate Verification | Monorepo-wide `npm run check:encoding`, `npm run typecheck`, and test suite execution | M1, M2, M3 | PLANNED |

## Interface Contracts

### Sberbank Acquiring Status Response
- `GET /api/sberbank/status/:orderId` returns `{ success: boolean, status: "success" | "failed" | "approved" | "refunded" | "pending", amount?: number }`
- Client modal `SberbankTerminalPaymentModal.tsx` must handle normalized lowercase `"success"`, `"approved"`, `"paid"`, `"confirmed"`, as well as error statuses `"failed"`, `"declined"`, `"expired"`.

### Doctor Payouts with Lab Deductions
- `DoctorPayoutRow` interface in `DoctorPayoutDashboard.tsx` matches `doctorPayouts.ts`:
  - `revenueRub: number`
  - `commissionPct: number`
  - `accruedRub: number`
  - `materialCostRub: number`
  - `materialDeductionPct: number`
  - `withheldMaterialRub: number`
  - `labCostRub: number`
  - `labOrdersCount: number`
  - `labDeductionPct: number | null`
  - `withheldLabRub: number | null`
  - `payoutRub: number`

### Schedule Collision Error Contract
- Database GIST exclusion violation (PostgreSQL `23P01`) is mapped to HTTP 409 Conflict with `{ error: "resource_overlap", message: string }`.

## Code Layout
- `apps/web/src/VisitView.tsx`: Tooth diagnostic modal, linter leak elimination, theme variables.
- `apps/web/src/styles/main.css`: Theme variables, `.smart-field`, `.smart-details`, `.drawer-content`, dark mode overrides.
- `apps/web/src/styles/touch-targets.css`: Mobile touch targets (>= 44px).
- `apps/web/src/components/dicom/Cornerstone3DViewer.tsx`: MPR reconstruction, toolbar layout, jaw spline.
- `apps/web/src/components/dicom/PanoramicRendererWindow.tsx`: Panorex viewport constraints.
- `apps/web/src/FinancePlanning.tsx`: Financial summary empty state.
- `apps/web/src/components/finance/SberbankTerminalPaymentModal.tsx`: Sberbank acquiring status polling.
- `apps/web/src/pages/DoctorPayoutDashboard.tsx`: Doctor payout dashboard with lab deductions.
- `apps/api/src/services/finance/payoutNegativeExplain.ts`: Negative payout string explanations.
