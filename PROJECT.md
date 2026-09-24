# Project: DENTE Dental CRM — Architecture Staleness & Neglected Domains Revitalization

## Architecture
- **Monorepo Structure**:
  - `packages/shared/`: Shared domain logic, Zod validation schemas, canonical CDA R2 XML builders, Order 1094n prescription types.
  - `apps/api/`: Fastify 5 REST API, PostgreSQL 18 persistence via Drizzle ORM, integer kopecks debt math, recall candidate queries, price lists conforming to Order 804n.
  - `apps/web/`: React 19 clinical UI, Patient Recalls Hub, Leads Kanban funnel, EGISZ REMD signing modal, Prescriptions modal.
- **Data Flow & Shared Contracts**:
  - PostgreSQL 18 (`127.0.0.1:5432`) <-> Drizzle ORM (`apps/api/src/db/`) <-> Fastify Routes (`apps/api/src/routes/`) <-> Zod Schemas (`packages/shared/src/`) <-> React View Components (`apps/web/src/components/`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Patient Debt Calculation SSOT | Integer kopecks debt calculation, signed ledger balance, and live Drizzle query integration | M1 | Survey R1 |
| 2 | Shared Recall Contracts Export | Centralize and export `RecallCandidate`, `RecallReport`, and `RecallBand` schemas in `@dental/shared` | M1 | Survey R1 |
| 3 | Price List Seeding Consolidation | Unify `seed-baseline-804n` endpoints and eliminate duplicate maintenance between pricelist and settings routes | M1 | Survey R1 |
| 4 | Live Recalls Hub Wiring | Wire `PatientRecallsHubModal` to live API data and eliminate blank table state in CommunicationsView | M2 | Survey R2 |
| 5 | Recalls Mock Data Purge | Remove synthetic mock patients from `RecallListPanel.tsx` error fallback | M2 | Survey R2 |
| 6 | 1-Click Non-Blocking Lead Conversion | Unblock "Записать в расписание" from any active lead card with deep-link navigation per Mandates 8e, 8n | M2 | Survey R2 |
| 7 | Recalls & Leads UI Density Optimization | Compact KPI header <=180px, consolidate 5 buttons to primary + dropdown, purge emojis from leadsFunnelEngine | M2 | Survey R2 |
| 8 | EGISZ OID & Validation Fix | Correct NSI OID to `1.2.643.5.1.13.13.11.1522` and align with `@dental/shared/cda` SSOT | M3 | Survey R3 |
| 9 | EGISZ Detached Signature & Mock Purge | Remove forbidden enveloped XML-DSig and purge mock base64 signature in Web Hub | M3 | Survey R3 |
| 10 | Electronic Prescriptions Verification | Verify Order 1094n compliance, vector SVG QR codes, and 0 emojis | M3 | Survey R3 |
| 11 | Single-Compiler Gate & Quality Assurance | Sequential typecheck, 4-state visual proof, and check:encoding pass | M4 | Survey R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Contracts & Anti-Staleness | `packages/shared/src/`, `apps/api/src/routes/patientRecall.ts`, `apps/api/src/routes/pricelist.ts` | none | DONE |
| M2 | CRM Retention & Leads Revitalization | `apps/web/src/components/recalls/`, `apps/web/src/components/leads/`, `apps/web/src/CommunicationsView.tsx` | M1 | DONE |
| M3 | Statutory & Regulatory Assurance | `apps/web/src/components/egisz/`, `apps/web/src/components/prescriptions/`, `packages/shared/src/cda/` | none | DONE |
| M4 | Single-Compiler Gate & Quality Assurance | Sequential typecheck, 4-State visual screenshots, encoding check, E2E | M1, M2, M3 | DONE |

## Interface Contracts
### Recalls Contracts (`@dental/shared` <-> API & Web)
- `recallBandSchema`: z.enum(["due", "overdue", "probably_lost", "never_arrived"])
- `recallCandidateSchema`:
  - `patientId`: string (uuid)
  - `fullName`: string
  - `phone`: string
  - `lastVisitDate`: string | null
  - `lastDoctorName`: string | null
  - `monthsSinceLastVisit`: number
  - `recallBand`: RecallBand
  - `overdueMonths`: number
  - `preferredContactMethod`: "phone" | "whatsapp" | "sms"
- `recallReportSchema`:
  - `candidates`: RecallCandidate[]
  - `totalCount`: number
  - `bandCounts`: Record<RecallBand, number>

### EGISZ REMD Contracts (`@dental/shared/cda` <-> Web Hub)
- `CDAR2_OIDS.DOC_TYPE_NSI`: `"1.2.643.5.1.13.13.11.1522"` (Medical Document Registry NSI)
- Signature standard: Detached CAdES-BES PKCS#7 (`.sig`), zero embedded XML-DSig transforms.

## Code Layout
- `packages/shared/src/recalls/`: Canonical recall schemas and scoring engine.
- `packages/shared/src/cda/`: Canonical CDA R2 XML builder, schematron validation, OID tables.
- `apps/api/src/routes/`: Fastify route definitions (`patientRecall.ts`, `pricelist.ts`, `leads.ts`).
- `apps/api/src/money/`: Integer kopecks financial math engine (`patientDebt.ts`).
- `apps/web/src/components/recalls/`: `PatientRecallsHubModal.tsx`, `RecallListPanel.tsx`.
- `apps/web/src/components/leads/`: `LeadsKanbanView.tsx`, `leadsFunnelEngine.ts`.
- `apps/web/src/components/egisz/`: `EgiszRemdHubModal.tsx`, `cdaR2XmlBuilder.ts`.
- `apps/web/src/components/prescriptions/`: `PrescriptionPrintModal.tsx`.
