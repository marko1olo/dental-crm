# Handoff Report — Subagent 2: Dentalpin Periodontogram & Clinical Modules Ingestor

## 1. Observation
- Inspected all relevant source files in `dentalpin`:
  - `backend/app/modules/periodontogram/` (`constants.py`, `indices.py`, `models.py`, `service.py`, `schemas.py`, `router.py`)
  - `backend/app/modules/periodontogram/frontend/` (`types.ts`, `usePerioHeatmap.ts`, `PerioArchBlock.vue`, `PeriodontogramChart.vue`)
  - `backend/app/modules/patient_timeline/` (`models.py`, `events.py`, `service.py`)
  - `backend/app/modules/budget/` and `docs/adr/0006-budget-public-link-2-factor-auth.md`, `docs/adr/0013-periodontogram-snapshot-model.md`
- Compared with DENTE CRM codebase:
  - `apps/web/src/components/odontogram/PeriodontalChartModule.tsx`
  - `apps/web/src/components/odontogram/periodontalMath.ts`
  - `apps/web/src/components/odontogram/perioTypes.ts`
  - `packages/shared/src/perio/*`
  - `apps/api/src/routes/perio.ts`

## 2. Logic Chain
- Reverse-engineered SEPA vs Florida Probe differences:
  - **SEPA index calculation**: Uses theoretical denominator ($6 \times \text{present teeth}$) for BOP% and Plaque% to avoid inflating partial exams.
  - **DENTE index calculation**: Uses actual probed sites denominator with comprehensive Form 043/u protocol generation and Lang & Tonetti (2003) 6-axis PRA Spider Diagram.
  - **Snapshot Model**: Dentalpin uses 3 normalized PostgreSQL tables with strict draft $\to$ closed lifecycle and frozen `indices` JSONB blob on close. DENTE uses `perio_charts` with JSONB records.
  - **Patient Timeline**: Uses polymorphic `source_table` and `source_id` without hard foreign keys, plus own-session DB commits (ADR 0019).
  - **Budget 2FA Links**: Implements possession factor (UUID) + knowledge factor (`phone_last4` $\to$ `dob` $\to$ `verbal_code`) with lockout and dedicated secret key (ADR 0006).

## 3. Caveats
- DENTE's Florida Probe workflow already features advanced Form 043/u clinical diary export and PRA Spider diagram not present in Dentalpin.
- Integrating Dentalpin's `phone_last4` / `dob` 2FA into DENTE's public patient portal requires coordinating with the SMS/WhatsApp notification queue.

## 4. Conclusion
- All mathematical formulas, snapshot structures, timeline event patterns, and 2FA public link mechanisms have been extracted and documented.
- Complete comparative ingest report has been communicated to the parent agent.

## 5. Verification Method
- Codebase files verified line-by-line across both repositories.
- Report delivered via `send_message` with recipient `0284cf50-cf45-4b19-be4c-f6f53b03120f`.
