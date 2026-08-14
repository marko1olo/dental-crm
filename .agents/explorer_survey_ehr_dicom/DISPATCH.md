# Dispatch: Explorer Survey EHR & DICOM (R3 & R4)

## Mission
Survey the codebase for Requirements R3 & R4:
- R3: Form 043/u electronic health record & schedule collision prevention. Autosave of visit protocols, convenient chart filling, doctor chair collision prevention with DB-level locking (FOR UPDATE + Exclusion Constraints).
- R4: CT / DICOM viewer MPR slice reconstruction, Catmull-Rom dental arch projection (FDI), and accurate Hounsfield (HU) bone density calculation from active volume cache.

## Scope & Targets
- `apps/api/src/routes/visits*`, `apps/api/src/routes/schedule*`, `apps/api/src/db/schema.ts`, `apps/api/src/routes/records*`, `apps/api/src/routes/dicom*`, `apps/api/src/routes/imaging*`
- `apps/web/src/components/schedule/`, `apps/web/src/components/patient/`, `apps/web/src/components/records/`, `apps/web/src/components/imaging/`, `apps/web/src/components/dicom/`
- Check FOR UPDATE / postgres exclusion constraints on doctor/chair schedule overlaps.
- Check Form 043/u autosave debounce / draft recovery / protocol templates.
- Check MPR (Axial, Coronal, Sagittal) reconstruction logic, FDI dental arch spline interpolation (Catmull-Rom), and HU density calculation.

## Output
Write your findings to `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_ehr_dicom\handoff.md`.
Follow AGENTS.md mandates strictly.

## 2026-08-14T15:50:04Z
Task:
Perform a comprehensive survey of EHR 043/u and CT/DICOM MPR viewer targeting Requirements R3 & R4:
1. Form 043/u electronic health record: autosave mechanism for visit protocols, draft restoration, tooth chart interaction, clinical protocols.
2. Schedule collision prevention: check doctor chair collision handling in backend schedule routes (`apps/api/src/routes/schedule*`, `apps/api/src/routes/visits*`) and DB schema (`apps/api/src/db/schema.ts`). Check for DB-level locking (`FOR UPDATE`) and PostgreSQL exclusion constraints / overlapping check logic.
3. CT / DICOM viewer MPR slice reconstruction (Axial, Coronal, Sagittal), Catmull-Rom dental arch projection (FDI numbering), and accurate Hounsfield (HU) bone density calculation from active volume cache (`apps/web/src/components/imaging/` or `apps/web/src/components/dicom/` or `apps/api/src/routes/dicom*`).

Write your detailed findings, exact file paths, line numbers, and proposed remediation plan to C:\Clinic_MVP\dental-crm\.agents\explorer_survey_ehr_dicom\handoff.md.
Send a message back to parent when complete.
