## 2026-07-31T12:24:47Z
<USER_REQUEST>
You are a Worker subagent assigned to Milestone 3 - Requirement R2 (Clinical Seed Expansion & Realistic Demo Data).
Your working directory is: `C:\Clinic_MVP\dental-crm\.agents\worker_m3`.

Read the Explorer reconnaissance report at `C:\Clinic_MVP\dental-crm\.agents\explorer_m1_r2\analysis.md` before making changes.

Your tasks:
1. `apps/api/.data/dental-crm-state.json` & `apps/api/src/scripts/seedOpsScreenshotDemo.ts`:
   - Expand base seed dataset to at least 15 patients with full administrative profiles: Passport (10 digits `серия/номер`), INN (12 digits), SNILS (11 digits `XXX-XXX-XXX XX`), OMS (16 digits ЕНП) or DMS policy, address, gender, legal representative (for minors).
2. EMK Visits & Tooth Formula 11–48:
   - Include completed EMK visits with objective findings (complaints, anamnesis, objective examination, ICD-10 diagnosis, treatment plan, doctor signature).
   - Seed `tooth_states` covering FDI teeth 11 through 48 with statuses (`Caries`, `Pulpitis`, `Missing`, `Crown`, `Implant`, `Filled`, `Healthy`, `Planned_Implant`) and surface codes (`O`, `M`, `D`, `V`, `L`).
3. Financial & Document Artifacts:
   - Include completed works acts (`completed_works_act`) with contract numbers, act numbers, and itemized services.
   - Include 54-FZ fiscal receipt metadata (`fiscalReceiptNumber`, `fiscalReceiptIssuedAt`, `fiscalReceiptUrl`, 54-FZ JSON details) on payments.
   - Include NDFL tax deduction certificates (КНД 1151156 XML snapshots generated via `buildKnd1151156Xml` from `apps/api/src/documents/taxXml.ts`).
   - Include EGISZ CDA XML snapshots (generated via `generateDentalCdaXml` from `apps/api/src/services/egiszCdaGenerator.ts`).
4. Verification:
   - Verify `seedOpsScreenshotDemo.ts` runs cleanly and populates `dental-crm-state.json` and `.ops-shot-tokens.json` without errors.
   - Commit modified seed/script files individually using `git commit` per Clinic MVP Constitution with conventional commit messages and NO AI tool attributions.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your changes report to `C:\Clinic_MVP\dental-crm\.agents\worker_m3\changes.md` and handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_m3\handoff.md`.
Reply with a summary citing your handoff report when complete.
</USER_REQUEST>
