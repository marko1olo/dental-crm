# Document Generation Forms

Date: 2026-05-18

Goal: the document generator must produce useful clinic drafts without pretending to be a signed legal system.

## Current Catalog

Patient and visit forms:
- patient intake questionnaire;
- personal-data processing consent with purpose, operator, patient rights, medical-data acknowledgement, and revocation channel;
- informed voluntary consent;
- procedure-specific dental consent packet for anesthesia, endodontics, surgery, implants, prosthetics, orthodontics, hygiene and whitening;
- refusal of medical intervention;
- treatment plan;
- treatment plan acceptance with alternatives, rejected options, warranty/control boundaries, and planned amount;
- local anesthesia consent and administration log;
- medication/prescription instruction draft for doctor review;
- post-visit recommendations;
- certificate of dental visit attendance for work, school, or place of request;
- warranty/service memo for completed dental work and follow-up conditions;
- outpatient medical card 025/у for ambulatory care, mapped as a dedicated structured DENTE payload from signed visit records;
- medical record extract;
- medical record copy/release request;
- medical document release receipt for paper/PDF/DICOM handoff;
- X-ray / OPG / TRG / CBCT referral.

Payment and clinic forms:
- paid medical services contract;
- treatment cost estimate;
- payment invoice;
- payment receipt/check memo;
- installment/payment schedule;
- completed works act;
- refund/payment correction request tied to explicitly selected paid fiscal records.

Workflow forms:
- dental lab work order for crowns, inlays/onlays, veneers, bridges, removable work, aligners, caps, retainers, materials, shade, scans/impressions, implant platform, and deadline.

Representative and media forms:
- legal representative/minor consent;
- photo/video/radiology material consent with a separate marketing control.

Tax forms:
- patient/payer application for tax deduction certificate;
- data draft for KND 1151156 tax deduction certificate;
- legacy pre-2024 tax deduction certificate draft for 2021-2023 payments;
- payment registry for the tax certificate.

## Verified Legal Anchors

- Tax deduction certificate for payments from 2024 onward: FNS Order of 2023-11-08 N EA-7-11/824@, KND 1151156. The app renders a clinic-reviewed HTML draft with a print-control block for лист 001/002, certificate number, correction number, payer/patient flag, identity-document kind code, service-code sums, and fiscal receipt basis. The API also exports a guarded XML draft at `/api/documents/:id/tax-xml` shaped to the published XSD 5.01 fields and runs an internal DENTE structural preflight before archiving; it is still not a signed ТКС package and not a substitute for external XSD/КЭП/ЭДО validation. Official FNS attachments for appendices 1-4 and the XSD 5.01 file are pinned in `docs/legal-sources/fns-knd-1151156.json` with bytes and SHA-256 so source drift is visible.
- Pre-2024 treatment expenses must not be rendered as KND 1151156. The app routes 2021-2023 expenses to the legacy certificate draft based on the old certificate process, and blocks the legacy draft for 2024+ payments.
- Informed consent/refusal: Health Ministry Order of 2021-11-12 N 1051n is the general anchor for informed voluntary consent/refusal forms through its stated validity period. Health Ministry Order of 2025-04-04 N 165n is a separate informed-consent/refusal source for clinical approbation workflows and must not be silently treated as the routine private dental consent template.
- Paid medical service contract/act/payment forms: Government Resolution of 2023-05-11 N 736 is the anchor for paid medical service rules; the app drafts clinic-side documents and does not replace legal review.
- Medical document copies/releases: Health Ministry Order of 2020-07-31 N 789n is the anchor. The generator separates the patient request from the release receipt and makes DICOM/source-file handoff explicit.
- Radiology directions and result handling: Health Ministry Order of 2020-06-09 N 560n is the anchor for rules of radiological examinations. The DENTE X-ray/CBCT referral is a clinic workflow direction with required clinical question, indication, area, safety note, and result handoff fields; it is not a replacement for a radiology department's internal protocol.
- Unified outpatient medical documentation: Health Ministry Order of 2025-05-13 N 274n was published on 2025-05-30, came into force on 2025-09-01, and is the current official anchor for exact outpatient record forms and maintenance procedures. DENTE now has a dedicated structured renderer for form 025/у, `Медицинская карта пациента, получающего медицинскую помощь в амбулаторных условиях`. It maps clinic legal facts, patient administrative facts, final diagnoses, signed specialist visit records, dental clinical rows, observations, events, X-ray dose rows, final epicrisis and required operator confirmations. The doctor-facing 025/у draft is recovered locally per patient/visit/form until changed, while final issue still requires signed source visits and operator confirmations. DENTE still does not claim ЕГИСЗ/MIS electronic exchange, УКЭП signing or official electronic medical-card storage for this form.

Source checks verified again on 2026-05-25:
- FNS medical social deduction page: https://www.nalog.gov.ru/rn77/fl/interest/tax_deduction/fl_medik/
- FNS order page for EA-7-11/824@: https://www.nalog.gov.ru/rn77/about_fts/docs/14112883/
- FNS KND 1151156 form PDF: https://www.nalog.gov.ru/html/sites/www.new.nalog.ru/2023/about_fts/docs_fts/pril1_14112883.pdf
- FNS KND 1151156 XSD 5.01: https://www.nalog.gov.ru/html/sites/www.new.nalog.ru/2023/about_fts/docs_fts/xsd/UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd
- DENTE pinned source manifest for this FNS order: `docs/legal-sources/fns-knd-1151156.json`
- FNS field-filling note for payer/patient identity facts in KND 1151156: https://www.nalog.gov.ru/rn39/ifns/ob9/info/15134030/
- FNS note on KND 1151156 from 2024 and legacy certificates for 2021-2023: https://www.nalog.gov.ru/rn26/news/smi/16490481/
- Official publication, Health Ministry Order N 1051n: https://publication.pravo.gov.ru/Document/View/0001202111250019
- Official publication, Health Ministry Order N 165n: https://publication.pravo.gov.ru/document/0001202505060004
- Official publication, Health Ministry Order N 274n: https://publication.pravo.gov.ru/document/0001202505300033
- Official publication, Health Ministry Order N 789n: https://publication.pravo.gov.ru/Document/View/0001202009240027
- Official publication, Health Ministry Order N 560n: https://publication.pravo.gov.ru/Document/View/0001202009140035
- Official publication, Government Resolution N 736: https://publication.pravo.gov.ru/Document/View/0001202305120025
- Official publication, Government Resolution N 458: https://publication.pravo.gov.ru/Document/View/0001202004090029

## Product Rules

- Every generated document stays a draft until a clinic user reviews and issues/signs it.
- Every document kind in shared metadata must carry an operator-visible source status:
  `Официальная форма`, `Официальный порядок`, `Шаблон клиники`, or `Внутренний реестр`.
  The generator UI shows the authority, legal/workflow reference, practical note, check date, and official source links for the selected form before creation. The issue passport returned by `/api/documents/:id/audit-facts` carries the same `sourceUrls`. This prevents a doctor from mistaking a DENTE clinic template for a final government form and gives the clinic an auditable route back to FNS/Минздрав/official publication sources.
- Exact official outpatient medical-record forms must be mapped from Order N 274n before the app may label them as official form output. Form 025/у is the first mapped official outpatient card in this prototype; any additional 274n form must be added with its own typed payload, source URL and issue blockers instead of piggybacking on the generic extract.
- Document lifecycle is explicit: `draft` can be issued, issued/draft documents can be voided, and voided documents cannot be issued again.
- Document voiding is explicit: `/api/documents/:id/void` must receive a structured `voidAttestation` with reason code, reason text, staff full name, staff role, replacement-required flag, patient/payer-notified flag, archive-preserved confirmation, status-reviewed confirmation, and optional correction document id. The API rejects an empty void body and validates that a correction document belongs to the same organization/patient and is not the document being voided.
- Browser issue flow is explicit too: a draft row can only open the Russian `Проверить и выдать` confirmation block. The operator must see patient scope, amount, tax year/INN when relevant, open the HTML draft, and press `Выдать после проверки` before `/api/documents/:id/issue` is called from the UI.
- The browser document workspace uses the explicitly selected patient. Communication-task shortcuts must set that patient before opening a form, and visit-bound documents are blocked when the selected patient does not match the active visit; DENTE must not attach another patient's `visitId` to a generated document.
- Drafts with unresolved placeholders must not be issued; the API must reject issue attempts until clinic-required fields are complete.
- Patient intake questionnaire, personal-data processing consent, tax deduction application, anesthesia consent/log, medication order, lab work order, photo/video/xray consent, X-ray/CBCT referral, outpatient medical card 025/у, medical-document release receipt, and payment refund/correction request now accept structured `document.payload` data. Rendering can still show editable drafts, but creation and issue are blocked until those document kinds carry their specific payloads instead of empty placeholders.
- The structured payload slice is deliberately narrow: patient complaint/allergies/medications/chronic conditions/pregnancy-lactation/anticoagulants/infection/systemic-risk confirmation, personal-data operator/purpose/category/action/transfer/retention/revocation/medical-data acknowledgement facts, tax application taxpayer full name/INN/birth date/identity document/relationship/year/form/delivery/contact/duplicate-control facts, anesthesia method/drug/dose log/allergy status, medication rows/safety notes, lab work material/shade/source/deadline, photo/video material types/allowed purposes/publication/revocation facts, X-ray/CBCT study type/area/clinical question/indication/pregnancy-status/safety/result-handoff facts, 025/у medical organization/patient/card/diagnosis/specialist-visit/clinical-tooth/event/X-ray-dose/operator-confirmation facts, release recipient/authority/channel/document list/protection facts, and refund action/selected paid source payment ids/amount/reason/method/recipient/source receipt/decision facts. Wider official-form mapping must be added type-by-type, not as free text.
- The Documents UI must collect those payloads before document creation. It must validate required patient intake, personal-data processing consent, tax application, anesthesia, medication, lab, photo/video, X-ray/CBCT referral, release, and refund/correction fields client-side and send the typed payload to `/api/documents`, so the user does not create a knowingly blocked draft by accident.
- The Documents UI must normalize every select-driven payload value before it enters React state. This applies to document kind, intake pregnancy/lactation status, tax relationship/form/delivery channel, procedure type, treatment-plan acceptance variant, post-visit care topic, X-ray study/priority/pregnancy status, 025/у demographic locality/sex codes, medical-release channel, refund action/method, and document void reason. Source smokes reject raw DOM casts for these fields.
- Legal, tax, payment, consent, release and official medical-record documents must receive clinic legal profile from the server render context. Issue/render is blocked if legal name, INN, address, phone, medical license number, license date, or license issuer is missing. Internal workflow drafts that do not claim legal/fiscal status may render with sparse clinic data: patient intake questionnaire, post-visit recommendations, treatment plan draft, anesthesia log, medication order, X-ray/CBCT referral, lab order and warranty memo.
- Financial document payload dates must be real calendar dates, not arbitrary text. Contract-adjacent payment forms reject impossible dates such as 31.02.2026 and non-ISO/non-Russian date formats for invoice, receipt, installment, act and estimate fields before a draft can be created or issued.
- HTML output must include patient identity, document status, date, signatures/checklist, and the stored issue signature attestation after issue.
- Medical-record copy requests, medical-record extracts, outpatient medical card 025/у, and medical-document release receipts must be sourced from signed medical facts. Copy requests, extracts, and release receipts create a durable release journal entry on issue: request registration, extract issue, or completed release with recipient, authority, material kind, delivery method, period, source snapshot hash, and staff issuer. The 025/у issue blocker rejects unsigned source visits, source-period mismatches and missing dental clinical rows before issue. Document payloads plus issue/void attestations are repaired for legacy mojibake before they are stored, so the issue passport and archived HTML cannot preserve broken `Ð...` recipient facts. The `sourceSnapshotSha256` field is mandatory-format audit data: copy requests and extracts hash the issued source DTO, while a release receipt points to the issued copy-request snapshot hash when that source request exists.
- Medical-record copy requests, medical-record extracts, and medical-document release receipts must reject issue when non-empty request, period, issue, delivery, or access dates are not parseable as a real `YYYY-MM-DD`-prefixed date, or when the selected period/access window is in reverse order. Draft creation can remain editable; legal issue cannot proceed until the dates are corrected.
- Patient administrative profile is now a first-class persisted source for legal document identity fields: patient identity document, patient taxpayer INN, registration/residential address, insurance/SNILS references, legal representative facts, representative authority, contact, and preferred document recipient. Renderers and the document UI must use this data for the selected document patient when available and must not ask the doctor/admin to retype it in every consent or release form. When the patient is also the payer, payment capture may reuse the saved patient INN/document details so KND 1151156 drafts do not require duplicate typing.
- No document renderer may fall back to "template not configured" for an enum value.
- AI may draft text but must not issue legal documents alone.
- KND 1151156 certificate and tax payment registry must be tied to paid amounts and fiscal/payment records, not planned treatment only.
- As of 2026-05-19 this section was rechecked against the FNS KND 1151156 publication for Order N EA-7-11/824@ dated 2023-11-08 and current FNS public guidance that 2024+ treatment expenses use KND 1151156; the legacy 2001 certificate path remains a separate draft/checklist for pre-2024 records.
- KND 1151156 certificate and tax payment registry must be blocked for tax years before 2024. The legacy tax deduction certificate is allowed only for 2021-2023 and must be blocked for 2024+.
- KND 1151156 certificate and tax payment registry must carry an explicit tax/payment year and must not aggregate paid records from other years.
- Tax paid-year selection must use the fiscal receipt issue date first and the CRM `paidAt` date only as fallback. The renderer must compare the explicit stored year, not timezone-shifted local dates, so a 2025-12-31 fiscal receipt cannot leak into 2026.
- KND 1151156 certificate and tax payment registry may carry an explicit `taxPayerInn` scope; when present, paid amount calculation and rendered fiscal rows must include only that payer's selected-year payments.
- KND 1151156 certificate and tax payment registry must render actual selected-year paid records when the ledger has fiscal receipt number, payer full name, payer birth date, payer INN, payer identity document, payer relationship, and service code `1`/`2`; old-year payments must not leak into the registry. The API must not infer service code `1` when staff omit the code.
- Issuing a KND 1151156 or legacy tax certificate must be duplicate-safe at the annual taxpayer scope: if another issued certificate already covers the same patient, tax year, certificate form, and taxpayer identity, the API must reject a second issue until the previous certificate is annulled/corrected through the structured void workflow. Fiscal receipt/payment overlap remains a fallback guard for older records, but a new same-year receipt from the same taxpayer is not allowed to create a second certificate. After a structured tax-correction void, a replacement certificate can be issued from a fresh explicit payment scope while the old issued certificate remains archived and voided. The rendered checklist must remind staff about the payer application, two copies, and annual cumulative paid amount.
- KND 1151156 certificate and tax payment registry must not mix different taxpayers in one issued document. Included payments must carry explicit payer full name, payer birth date, payer INN, payer identity-document details, and payer relationship; split separate payers into separate certificates. Same name/INN with different birth date, identity document, or relationship is still a different taxpayer context and must be blocked.
- KND 1151156 certificate must render taxpayer and patient facts separately, including the official same-person flag. When the patient is also the payer, saved payment facts may fill patient INN/document fields; otherwise patient facts must come from the patient administrative profile before issue.
- KND 1151156 HTML must include the official-form control fields from FNS appendix N 1: form title, лист 001, optional лист 002 when payer and patient differ, certificate number, correction number, reporting year, medical organization INN/KPP, identity-document kind code, service-code sums, page count, and QR/control zone note. Issue must freeze the patient, clinic profile and selected payment facts for later XML. XML export must keep the same issue guards, require a 4-digit tax-office code from server settings without exposing the env key in user-facing API errors, emit `Документ/@КНД="1184043"` per XSD 5.01, pass the internal DENTE structural preflight for root/tags/notice number/payer-patient flag/sums before archiving, persist the first successful XML bytes/hash/tax-office code as an immutable archive, and must not be described as a signed electronic FNS package until ТКС/signature validation exists.
- Tax certificate payer relationship is an allowlist, not free text. Only patient/self, spouse, parent, child, or ward contexts are accepted in the current workflow; unsupported values such as friend/colleague/neighbor are blocked before issue.
- KND 1151156 certificate, legacy tax deduction certificate, tax payment registry, issued payment receipts, and refund/correction requests must be blocked if an included paid record has no fiscal receipt number or fiscal receipt date. A fallback internal payment id is useful for drafts only, not for issued fiscal paperwork.
- KND 1151156 certificate, legacy tax deduction certificate, and tax payment registry must require explicit payer full name, payer birth date, payer INN, payer identity-document details, relationship, and tax service code `1`/`2`.
- Issued payment receipts, refund requests, and correction requests must require stored payer full name and payer birth date. They are payment facts and must not be inferred from the patient card.
- Tax deduction application may be drafted before receipt reconciliation and before final certificate issuance, but it must not carry invented planned or fallback amounts. It must carry structured taxpayer name, INN, birth date, identity document, relationship, requested year/form, delivery/contact, and duplicate-certificate control before creation/issue. Selected fiscal payment ids are optional for the application intake stage; when absent, the rendered application must show that checks are pending administrator reconciliation and must not expose internal payment UUIDs. KND/legacy certificates and tax registries still require explicit paid fiscal receipt selection before issue. The UI may prefill application fields from scoped fiscal payment facts first, then from the saved patient administrative profile when the patient is the payer.
- `visitId` must be validated against `patientId` before any document or payment is saved.
- Documents marked `requiresVisit` must be rejected when `visitId` is missing, even if the patient exists.
- Legal representative/minor consent is visit-required because it must be tied to a concrete intervention or visit context, not issued as a floating generic form.
- Planned-amount documents must use server-side patient/visit treatment-plan facts, not dashboard totals supplied by the browser.
- Non-tax paid documents must not aggregate all patient payments when visit/payment scope is missing.
- Planned-amount documents must not aggregate all patient treatment items when visit/plan scope is missing.
- Shared document metadata is the source of truth for labels, UI groups, amount source, and paid-record requirements.
- The Postgres `document_kind` enum must be migrated whenever shared `DocumentKind` expands.
- PostgreSQL `generated_documents` must retain the same administrative scope as file-backed state: `tax_payer_inn` for tax packets and `payload_json` for structured clinical/workflow payloads. A renderer that works only in JSON state is not production-ready.
- The database must keep document `visitId`, `patientId`, and `organizationId` consistent through a composite visit/document constraint.
- `/api/documents/:id/issue` and `/api/documents/:id/void` must write audit events and preserve the document record instead of deleting mistakes.
- `/api/documents/:id/void` must persist `voidAttestation`, `voidedAt`, and `voidedByUserId` in PostgreSQL/file-backed state and expose the attestation through `/api/documents/:id/audit-facts`; public document responses must still hide local archive paths.
- `/api/documents/:id/issue` must require a structured `signatureAttestation` body before changing document status. The attestation records signature mode, signing time, recipient, recipient role, staff representative, staff role, identity check, opened-document check, recipient signature, and clinic representative signature.
- `/api/documents/:id/issue` must write an immutable issued HTML snapshot to local storage and stamp `issuedSnapshotSha256`, `issuedSnapshotCreatedAt`, and `issuedByUserId`; `/api/documents/:id/html` must serve that snapshot for issued and later-voided issued documents instead of re-rendering changed patient data.
- Issued HTML must pass snapshot integrity verification. If the stored snapshot is missing, its SHA-256 metadata is missing, its creation timestamp metadata is missing, or the stored SHA-256 differs from the issued metadata, the API must return an integrity error rather than silently re-rendering mutable current data.
- `/api/documents/:id/html?download=1` is the release-grade archive download for issued or later-voided issued documents. It must set an HTML attachment filename and return the same verified snapshot as preview.
- `/api/documents/:id/pdf` renders a real PDF from the verified issued HTML snapshot through server-side Chromium/Edge print after signature attestation exists. It must never re-render mutable patient/profile data and must return an explicit operator-readable service error if the deployment has no configured browser path in server settings; user-facing API errors must not expose the env key. Slow clinic servers can tune the bounded browser wait with `DENTE_PDF_EXPORT_TIMEOUT_MS` (default 60000 ms, clamped to 10000-180000 ms).
- `/api/documents/:id/audit-facts` must expose the operator-facing issue passport: document ids, status, issued time, source authority/reference, source status, snapshot SHA-256, signature attestation, medical release journal entry with `sourceSnapshotSha256` when relevant, HTML/PDF archive availability, XML availability and blockers/warnings. For KND XML it must expose the source-facts snapshot SHA-256, the external-validation status/note, and after first export the archived draft XML SHA-256 and creation time. It must not expose local filesystem paths.
- Public document responses, including dashboard payloads, must expose issued snapshot hash/date/issuer only; local snapshot filesystem paths are server-side state and must not be sent to the browser.
- Re-issuing an already issued document must return `409`, not silently reuse the old record, because duplicate issue attempts must stay visible to the operator and must not bypass current guards.
- Signature lines may remain blank in a printed draft, but issue, PDF export, and tax XML export require explicit signature attestation. Non-signature required fields still block issue.
- Payment creation must not silently attach money to another patient's or another visit's document.
- Payment capture can store fiscal receipt number/date, payer full name, payer INN, payer birth date, payer identity document, payer relationship, and tax deduction service code. These fields are administrative facts for the tax packet, not clinical note text. Missing tax deduction service code must remain `null` until staff explicitly select `1` or `2`.
- Visit attendance certificates and warranty memos must not invent diagnosis, incapacity, or guarantee terms. They are drafts that require clinic review and local policy text before issue.
- Refund/correction requests must be tied to one or more explicitly selected paid source records with fiscal receipt number/date and stored payer identity data. The original fiscal receipt in the payload must match the selected source payment, and requested amount must not exceed the sum of the selected source payments. Planned treatment amounts and unrelated visit payments are not eligible.
- The browser refund/correction form must force an `Исходный платеж` selection from eligible paid fiscal receipts before posting payload. Choosing that row may prefill amount, payer and original fiscal receipt fields, but the API remains authoritative and validates patient, visit, paid status, fiscal receipt and duplicate selection.
- Locally saved tax/payment receipt selections are clinic-scoped through the organization id. A selection made in one clinic must not appear in another clinic with the same browser profile.
- Payment ledger entries must be positive amounts. A zero-ruble "paid" row is not a payment fact and must not enter tax or refund paperwork.

## Regression

`npm run smoke:documents-catalog` renders every supported `DocumentKind` from synthetic no-PHI data and fails if:
- a template falls back to an unconfigured placeholder;
- patient identity disappears;
- `undefined` or a script tag is rendered;
- KND/consent/refusal control fragments are missing.
- any document can be issued without required clinic legal license data.
- payment receipt/refund/correction documents can be issued without required fiscal date or payer identity facts.
- official-form / official-workflow metadata does not expose at least one absolute HTTPS `sourceUrl`, or the KND/consent/medical-record sources lose their pinned official URLs.

`npm run smoke:official-document-sources` checks the pinned FNS KND 1151156 source manifest, appendices 1-4, XSD 5.01 filename/URL/bytes/SHA-256, shared metadata `sourceUrls`, package script wiring, and this documentation. It does not fetch the network and does not prove official XSD validation; it proves DENTE did not lose the official source anchors used by the draft.

`npm run smoke:document-guards` checks the administrative guardrails:
- KND certificate/registry are blocked without paid records;
- KND certificate/registry are blocked for tax years before 2024;
- legacy tax deduction certificate is allowed for 2021-2023 and blocked for 2024+;
- KND certificate/registry are blocked without an explicit tax year and include only paid records from that year;
- KND certificate/registry with a payer INN scope include only that taxpayer's paid records and can be issued even when another payer has same-year payments;
- duplicate issue of a KND/legacy tax certificate for the same patient/year/form/taxpayer is blocked, including a later new fiscal receipt from that same taxpayer;
- a structured tax-correction void unlocks one replacement issue path while keeping the original certificate archived and voided;
- unsupported taxpayer relationships are blocked before tax certificate issue;
- KND certificate output includes the taxpayer/patient same-person flag and separate patient birth date/INN/document rows;
- user-supplied planned amounts are normalized down to verified paid amounts for paid-record documents;
- non-tax paid documents without visit/payment scope are blocked;
- user-supplied planned/global amounts are ignored for planned documents and replaced with server-side patient/visit treatment-plan totals;
- planned documents without explicit visit/plan scope are blocked;
- visit-required documents are blocked when `visitId` is absent;
- minor/legal representative consent is blocked when `visitId` is absent;
- patient/visit mismatches are rejected;
- the tax application does not receive a fake amount.
- issue-ready payment receipt rejects issue without signature attestation, then issues with attestation while printed signature lines may stay blank;
- payment receipts and refund/correction requests are blocked if paid records exist but fiscal receipt numbers are missing;
- refund/correction requests require an explicit selected source payment, reject source payments from another visit, and calculate refundable paid amount only from selected source payments;
- incomplete consent remains blocked before issue.

`npm run smoke:document-payloads` checks the first structured clinical/workflow payload slice:
- patient intake questionnaire renders chief complaint, allergies, medications, chronic conditions, pregnancy/lactation, anticoagulants, infection/systemic risks, emergency contact, notes, and patient confirmation;
- personal-data processing consent renders operator facts, processing purposes, data categories, transfer rules, retention period, revocation channel, voluntary consent, and medical-data acknowledgement;
- anesthesia consent/log renders captured method, anesthetic, vasoconstrictor, zone, allergy status, restrictions and dose rows;
- medication order renders medication, dosage, instructions, duration, safety notes and urgent-contact reason;
- lab work order renders work type, teeth/area, material, shade, source, deadline and technician notes;
- photo/video/xray consent renders material types, record use, lab transfer, colleague consultation, education/marketing permissions, recognizable-publication gate, anonymization and revocation channel;
- X-ray/CBCT referral renders study type, area, clinical question, indication, pregnancy/limitations status, safety note, priority, DICOM/report handoff, recipient, due date, and requesting doctor;
- medical-document release receipt renders recipient, authority, delivery channel, document list, period, protection note, and third-party-data check;
- outpatient medical card 025/у renders official 274n anchor, clinic/patient/card facts, diagnoses, signed specialist visit records, clinical tooth rows, event sections, X-ray dose rows, final epicrisis and required operator confirmations;
- payment refund/correction request renders action, amount, reason, method, recipient, fiscal receipt, accountant decision, and is blocked when the requested amount exceeds paid visit facts;
- all structured payload forms listed above are issue-ready only with complete payload and are blocked when payload is missing.

`npm run smoke:document-payload-ui-source` checks that the browser document factory imports the shared payload, issue attestation and audit-facts types, validates structured document kinds before posting, sends `payload` to the document API, mounts only the selected structured payload editor instead of keeping inactive legal/tax/patient/payment/workflow editors as hidden DOM, forces explicit refund/correction source-payment selection, keeps saved payment selections clinic-scoped, keeps reusable issue signature/staff defaults and outpatient 025/u local draft keys clinic-scoped with migration fallback, normalizes issue signature mode instead of raw DOM casting, and exposes source links, issue passport plus archived HTML/PDF actions.

`npm run smoke:document-legal-confirmations` checks that required legal statements are explicit UI confirmations, that the document issue button opens the review confirmation block instead of directly calling the issue endpoint, that issue requires identity/document-opened/recipient-signature/clinic-signature checkboxes, and that shared payload schemas still require literal `true` confirmations where the form legally depends on operator confirmation.

`npm run smoke:document-issue-chains` checks that completed works acts require an exact issued contract, release receipts require an issued matching copy request, medical extracts and outpatient medical card 025/у require signed source visits in period, 025/у blocks unsigned source facts and source-period mismatches, copy/extract/release issue is blocked when legal-chain dates are unparseable or reversed, and broken legacy release/signature text is repaired before the issue response, audit passport and archived HTML are returned.

`npm run smoke:patient-forms-lifecycle` checks the real API lifecycle for the core patient forms: intake questionnaire, personal-data processing consent, minor/legal representative consent, and photo/video consent. It verifies missing payload rejection, visit-required blocking for the minor consent, signature-attestation requirement before issue, archived immutable HTML, audit-facts source/archive readiness, stable HTML download filenames, hidden storage paths, and no re-render from mutated patient data after issue.

`npm run smoke:visit-workflow-forms-lifecycle` checks the same route lifecycle for visit/workflow forms: informed consent, procedure-specific consent packet, anesthesia consent/log, prescription/medication order, lab work order, X-ray/CBCT referral, visit-attendance certificate, warranty memo, medical-intervention refusal, and refund/correction request. It verifies visit-required blocking for consent forms, missing structured payload rejection, signature-attestation requirement before issue, audit-facts source/archive readiness, archived immutable HTML, stable download filenames, hidden storage paths, and no re-render from mutated patient data after issue.

`npm run smoke:telegram-control-ui-source` also checks that the PostgreSQL schema has `tax_payer_inn` and `payload_json`, preventing the current structured document forms from becoming file-mode-only behavior.

Telegram-originated document tasks store a stable `workflowCode`, so the Communications quick actions can open the correct tax, medical-record, consent or patient-form workflow without depending on mutable Russian task titles. Legacy title matching is kept only for old prototype tasks already present in local state.

`npm run smoke:billing-document-link` checks that payment capture accepts a matching document link and rejects a document belonging to another patient.
It also verifies that document-linked payments inherit the document visit when the browser omits `visitId`, that zero-ruble paid rows fail shared input validation, and that the API does not invent a tax deduction service code when the request omits one.

`npm run smoke:settings-persistence-file` verifies first-run/Settings-critical clinic profile fields, UI preferences including document issue signature/staff defaults, doctor/assistant/chair working hours, and patient preferred appointment window survive file-backed API state persistence and a fresh module load.

`npm run smoke:document-lifecycle` checks issue/void audit behavior, rejects issue without signature attestation, rejects void without structured attestation, rejects repeated issue, rejects issued HTML when snapshot hash metadata is missing, verifies that public issue, dashboard and audit-facts responses do not expose local snapshot paths, verifies that signature and void attestations are rendered/audited, verifies that issued or later-voided issued HTML is served from the stored snapshot even if the source patient record changes later, verifies `html?download=1` returns an attachment with the same immutable HTML, and verifies `/pdf` returns a non-empty `%PDF` attachment generated from that archive.

`npm run smoke:tax-knd-xml` checks the KND 1151156 XML route against the guarded issue flow: source facts for patient, clinic and selected payments are frozen at issue; the internal DENTE structural preflight exists and rejects technical placeholders; first successful XML draft export stores immutable XML bytes/hash/source-snapshot hash/tax-office code; the audit passport keeps the external XSD/КЭП/ЭДО boundary visible; repeated downloads return the same XML after live patient, clinic, payment and environment changes.

`npm run smoke:tax-registry-fiscal` renders tax certificate and registry from synthetic fiscal payments, verifies code `1`/`2` amount split, includes selected-year receipt numbers, uses fiscal receipt date before CRM paid date, excludes old-year payments, blocks missing fiscal receipt numbers/dates, blocks missing service code, blocks mixed taxpayers including same name/INN with different identity document, rejects a tax deduction application without structured payload, renders a complete structured tax application, renders the legacy 2021-2023 certificate, and proves complete tax documents are issue-ready.

The same smoke now rejects tax certificate issue when an included fiscal payment lacks explicit payer full name, payer birth date, or payer relationship to the patient. Renderer fallbacks are draft-only; issued tax paperwork must use stored payer identity data.

`npm run smoke:documents-catalog` also verifies the visit-attendance certificate, warranty memo, and refund/correction request render as first-class document kinds.

`npm run smoke:api-text-encoding` now includes document HTML and issue-block reasons in the API encoding regression. Legacy seed text may still enter through old fixtures, but Russian output must be repaired before it reaches the browser, document preview, or operator-facing guard error.

## 2026-06-04 Issued HTML Preview Safety Delta

- Issued HTML preview opens `/api/documents/:id/html` directly instead of fetching the HTML into a browser-owned `blob:` URL. The server response keeps the API `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and restrictive HTML CSP headers in force for the preview.
- If the browser blocks the popup, the UI leaves visible fallback guidance and immediately invokes the existing authenticated `html?download=1` archive download path. When the current clinic session relies on a custom clinical-secret header, the UI also uses the authenticated download fallback instead of opening a new tab that cannot carry that header. Operators still have the row-level `Скачать HTML` action when mobile Safari, clinic PCs, or desktop shells reject the automatic fallback.
- `npm run smoke:document-html-preview-source` guards the source path against `fetch -> blob -> window.open(blob:)` regressions and checks the server HTML header hook.
