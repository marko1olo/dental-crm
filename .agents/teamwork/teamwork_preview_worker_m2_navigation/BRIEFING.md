# BRIEFING — 2026-10-20T05:13:00Z

## Mission
Seamless integration of 9 orphaned clinical workspaces into authentic CRM navigation and context (PostgreSQL 18 / Fastify / React 19).

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m2_navigation
- Original parent: 1dba1dd3-1b54-431d-9253-a722303ba51f
- Milestone: Milestone 2 (teamwork_preview_worker_m2_navigation)

## 🔒 Key Constraints
- Mandate 8e: Doctor autonomy (never disable save buttons without cause, quick access).
- Mandate 8n: Solo-doctor and small clinic ergonomics (no bureaucratic blockers).
- Apple HIG / Mandate 8ze: Desktop density, max 1 toolbar row, compact 32-36px buttons.
- Zero fake/mock implementations: genuine integration with live context (patientId, visitId, doctorId).
- Do NOT recreate duplicate components. All 9 exist in apps/web/src/components/.
- Git safety: per-file git add, no git reset --hard, no git restore.

## Current Parent
- Conversation ID: 1dba1dd3-1b54-431d-9253-a722303ba51f
- Updated: 2026-10-20T05:13:00Z

## Task Summary
- **What to build**: Integrate 9 orphaned clinical modules into CRM UI:
  1. PeriodontogramChart in visit EMK toolbar & patient card
  2. AnesthesiaModal in visit chairside protocol panel
  3. HygieneIndicesPanel in patient card & chairside visit
  4. PrescriptionModal/Print in visit chairside
  5. ImplantPassportModal dynamic patient & doctor context binding
  6. TaxDeductionCertificateModal in PatientWorkspaceToolbar
  7. ClinicalTaskBoard in Sidebar / quick navigation
  8. OrthopedicsChairsidePanel in TreatmentPlanModal
  9. TelephonyFloatWidget in AppShell
- **Success criteria**: Genuine UI entry points, live props bound, TypeScript clean, tests passing.
- **Interface contracts**: apps/web/src/components/
- **Code layout**: apps/web/

## Change Tracker
- **Files modified**: None yet.
- **Build status**: Pending.
- **Pending issues**: None.

## Quality Status
- **Build/test result**: Not run yet.
- **Lint status**: Clean.
- **Tests added/modified**: Pending.

## Loaded Skills
- None yet.
