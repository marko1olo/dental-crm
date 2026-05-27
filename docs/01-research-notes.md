# Research Notes

Date: 2026-05-12

## Competitors Checked

- 32top MIS: https://mis.32top.ru/
  - Official metadata positions it as dental MIS from roughly 3500-3700 RUB/month.
  - Feature claims: schedule, patient accounting, EGISZ transfer, protocol templates, analytics, auto mailings, online booking, cash register.
- 32top tariffs: https://mis.32top.ru/tariffs/
  - Pricing depends on chair count, with 7-day trial positioning.
- IDENT: https://ident24.ru/
  - Official metadata claims dental MIS for 4000+ clinics in Russia/CIS.
  - Surface claims include EGISZ, online booking, analytics, schedule, cash register, documents.
- DentalTap: https://dentaltap.com/ru/
  - Cloud dental software with patient management, treatment workflows, billing/payment, documentation, treatment diary, insurance, inventory, calendar, graphical dental chart, reports, analytics, patient portal, online booking, mobile app, AI positioning.
- Cliniccards: https://cliniccards.com/ru
  - Cloud CRM for dental clinic process automation from medical data storage to clinic management.
- Open Dental: https://www.opendental.com/site/features.html
  - Broad practice-management baseline for scheduling, patient records, billing and operational workflows.
- Curve Dental: https://www.curvedental.com/
  - Western cloud dental practice-management positioning.
- Dentrix Ascend: https://www.dentrixascend.com/
  - Cloud system for scheduling, billing, imaging, patient communication and analytics.
- CareStack: https://carestack.com/
  - All-in-one cloud dental practice-management positioning.
  - 2026 re-check: CareStack positions itself as cloud all-in-one for DSOs, groups, single offices, specialty practices and startups, with scheduling, patient engagement, clinical notes/templates, charting, imaging integrations, eRx, backups, revenue cycle, analytics, implant tracker, lab cases and referrals.
- Dentrix: https://www.dentrix.com/products/dentrix
  - 2026 re-check: Dentrix positions around insurance/billing/collections, clinical charting and notes, imaging/AI-assisted diagnostics, patient communications, analytics, multi-location reporting, cybersecurity and backup/recovery.
- Curve Dental: https://www.curvedental.com/feature-overview
  - 2026 re-check: Curve positions as all-in-one cloud for scheduling, charting, imaging, billing, patient engagement and analytics.
- Open Dental: https://www.opendental.com/manual/chart.html
  - 2026 re-check: Open Dental charting emphasizes clinical chart/progress note workflows, imaging module handoff, prescription/medication workflows and configurable features.

## Legal Sources Checked

- 152-FZ personal data: https://www.consultant.ru/document/cons_doc_LAW_61801/
- 323-FZ health protection and medical secrecy baseline: https://www.consultant.ru/document/cons_doc_LAW_121895/
- Government Decree 736 paid medical services rules: https://publication.pravo.gov.ru/Document/View/0001202305120025
- FSTEC Order 21 personal-data security measures: https://www.consultant.ru/document/cons_doc_LAW_146520/
- FNS Order EA-7-11/824@ for medical-service payment certificate / tax deduction workflow: https://www.nalog.gov.ru/rn77/about_fts/docs/14112883/
- KND 1151156 certificate reference: https://www.consultant.ru/document/cons_doc_LAW_32451/d86aa8655278047981d6236e08f6a1b286a36df9/
- KND 1151156 is the new medical-services certificate for expenses from 2024 onward. FNS regional guidance says 2021-2023 expenses use the previous certificate process under Health Ministry / Tax Ministry Order 289/BG-3-04/256; the CRM must not label old-year expenses as KND 1151156.
- Health Ministry Order 1051n is the routine informed consent/refusal anchor; Health Ministry Order 165n is tracked separately for clinical approbation consent/refusal and must not be merged into normal dental visit templates without legal review.

## Product Consequences

- The MVP cannot be just a CRM. It must include EMR, service catalog, payments, contract, act, and tax deduction document flow.
- Russian compliance must be designed in from the first schema: organization scoping, audit events, document statuses, consent records and immutable visit signing.
- AI must remain draft-only until legal review. Voice/image AI can speed the doctor, but final medical text must require human confirmation.
- EGISZ must be an adapter boundary, not baked into core business tables.

## Competitive Strategy

- Do not compete by adding a bigger wall of modules. Compete by making the doctor workflow faster: patient -> specialty focus -> dictation -> editable EMR -> save -> sign later.
- Cloud competitors are broad, but many workflows still depend on connectivity and integrations. Our differentiator is offline-first continuity: local autosave, server persistence, explicit restore, local rule parser fallback.
- Specialty focus must be first-class. Therapy, orthopedics, surgery, implantology, orthodontics, periodontology/prevention, pediatric, radiology and general exam must each have their own phrases, templates and warnings, not one generic dental screen.
- AI must be replaceable by deterministic parsers. If model/API/key/network is unavailable, regex/rule parser still drafts complaint, anamnesis, objective, diagnosis hints and plan for doctor review.
- Safety posture: AI never signs, local parser never signs, warnings never block treatment flow, every save/accept creates audit, final signing remains separate.
