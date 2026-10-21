# Orchestration Plan — End-to-End Medical Forms, EMR 043/u, EGISZ & Backend Transactions Audit

## Milestones
- **M1: Patient Card, Medical History & Form 043/u Print Integration**:
  - Audit patient profile tabs, medical history events, and anamnesis synchronization.
  - Verify Form 043/u HTML/PDF generation, dental formula integration, and ICD-10 diagnostics formatting.
- **M2: EGISZ CDA R2 / SEMD 108 Export Engine**:
  - Audit CDA XML generation, OID structures, doctor and clinic credentials, and validator compliance.
- **M3: Backend Transaction Safety & Booking Concurrency**:
  - Audit transaction boundaries in appointment creation, patient records, and treatment plan persistence.
- **M4: Full Monorepo Quality Gate & Verification**:
  - `npm run check:encoding`, `node scripts/check-css-tokens.mjs`, `npm run typecheck`, `npm test`.
