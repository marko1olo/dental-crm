# Document Generation Forms & Legal Documentation Highway


> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)
Date: 2026-05-18 (Updated 2026-09-04)

> ⚠️ **Нормативная база и системная конституция:**
> * **[THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** — Высшая Конституция проекта (CTO Supremacy, презумпция брака, Apple/Mac HIG, Мандат 8e — Запрет на палки в колёса врачам и персоналу).
> * **[INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Главный интертекстуальный навигационный хаб.
> * **[DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — Жизненный цикл медицинской документации, печать черновиков, штампы УКЭП/ПЭП и headless PDF.
> * **[CLINICAL_PROTOCOLS_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_PROTOCOLS_REGISTRY.md)** — Канонический реестр клинических протоколов 043/у по МКБ-10, пакетов 804н и СанПиН 3.3686-21.
> * **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Клинический движок, одонтограмма, правила валидации визитов и защита автономии врача.
> * **[BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Финансовый контур, касса 54-ФЗ и справка ФНС КНД 1151156.

Goal: The document generator produces legally grounded, audit-ready, and print-perfect medical, legal, and financial documents with zero friction for doctors and clinic administrators (Mandate 8e).

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
- dental medical card 043/у for the dental outpatient chart, mapped as a dedicated structured DENTE payload with required clinical tooth/segment rows from the visit record;
- orthodontic medical card 043-1/у for orthodontic care with facial anthropometry, cephalometry, and dental indices;
- daily dentist diary 037/у-88 for daily patient and UET tracking;
- summary dentist statement 039/у-88 for monthly and quarterly work volume and UET consolidation;
- radiation dose sheet for SanPiN 2.6.1.1192-03 patient radiation passport and cumulative dose tracking;
- medical record extract (003-В/у);

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

## Verified Legal Anchors & Regulatory Invariants

- **Tax deduction certificate for payments from 2024 onward (KND 1151156, FNS Order N EA-7-11/824@):**
  * **Нормативная база:** Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@, пп. 3 п. 1 ст. 219 Налогового кодекса РФ.
  * **Код услуги 01 (Обычное лечение):** Стандартная стоматологическая терапия, эстетическая реставрация, профессиональная гигиена, удаление зубов, базовое протезирование. Установлен совокупный предельный лимит социального налогового вычета — 150 000 ₽ в год (максимальный возврат 13% составляет до 19 500 ₽).
  * **Код услуги 02 (Дорогостоящее лечение по Постановлению Правительства РФ № 458):** Дентальная имплантация, костно-пластические и реконструктивные операции на челюстях, синус-лифтинг, сложное ортопедическое протезирование на имплантатах. Предельный лимит отсутствует — налоговый вычет 13% рассчитывается со **всей фактически оплаченной суммы** без ограничений.
  * **XML экспорт и валидация XSD 5.01:** Маршрут API `/api/documents/:id/tax-xml` генерирует машиночитаемый XML с корневым тегом `Документ` и атрибутом `КНД="1184043"`, проходящим внутренний структурный префлайт DENTE (проверка реквизитов организации, ИНН налогоплательщика, паспортных данных, разделения сумм по кодам 01 и 02). Справка связывается исключительно с проверенными фискальными чеками 54-ФЗ (`fiscalReceiptNumber`, `fiscalReceiptDate`).
  * **Защита от повторной выдачи:** Повторная генерация справки за тот же налоговый период по тому же пациенту и налогоплательщику блокируется до аннулирования предыдущей через регламент `voidAttestation`.
- **Pre-2024 treatment expenses:** Расходы на лечение за 2021–2023 годы формируются по прежней форме Справки об оплате медицинских услуг (Приказ Минздрава РФ и МНС РФ № 289/БГ-3-04/256) и строго блокируются для платежей с 2024 года.
- **Информированные добровольные согласия и отказы (ИДС по Приказу Минздрава РФ № 1051н):**
  * **Нормативная база:** Ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в РФ», Приказ Минздрава России от 12.11.2021 № 1051н.
  * **Специализированные пакеты:** `CONSENT_THERAPY` (кариес, эндодонтия), `CONSENT_SURGERY_IMPLANT` (удаление, имплантация, костная пластика), `CONSENT_ORTHODONTICS` (брекеты, элайнеры), `CONSENT_ORTHOPEDICS` (коронки, виниры, съемные протезы), `CONSENT_HYGIENE_BLEACHING` (УЗ-скейлинг, Air-Flow, фторирование, отбеливание), `CONSENT_ANESTHESIA` (инфильтрационная, проводниковая анестезия препаратами артикаина/мепивакаина), `CONSENT_PERSONAL_DATA` (ФЗ № 152-ФЗ).
  * **Цифровая подпись ПЭП:** Реализована через сенсорный холст (`SignatureCanvasPad`) с динамическим расчетом скорости росчерка, сглаживанием кривыми Безье и экспортом в защищенный векторный SVG для встраивания в PDF.
  * **Отказ от медицинского вмешательства:** Формируется с обязательным разъяснением пациенту клинических рисков и возможных осложнений.
- **Договор на оказание платных медицинских услуг (Постановление Правительства РФ № 736):**
  * **Нормативная база:** Постановление Правительства РФ от 11.05.2023 № 736 «Об утверждении Правил предоставления медицинскими организациями платных медицинских услуг».
  * **Регистратура без палок в колёса (Мандат 8e):** Регистратор имеет законное и техническое право распечатать бланк договора с суммой 0 ₽ и строками прочерков `_______` для ручного внесения паспортных данных пациентом до врачебного осмотра **БЕЗ 403-ошибок**.
  * **Запрет на блокировку:** Система **НИКОГДА** не требует обязательного выбора ассистента или наличия согласованного плана лечения для печати бланка договора.
- **Акты выполненных услуг по Номенклатуре медицинских услуг (Приказ Минздрава РФ № 804н):**
  * **Нормативная база:** Приказ Минздрава России от 13.10.2017 № 804н.
  * **Состав акта:** Коды медицинских вмешательств разделов A11 (инъекции, анестезия), A16 (оперативные вмешательства, препарирование, пломбирование), A06 (рентгенологические исследования), A02 (функциональные исследования, снятие оттисков), гарантийные обязательства клиники и установленный срок службы.
  * **Скрытие микро-расходников (`hideInPatientPresentation: true`):** Мелкие расходные материалы (валики, салфетки, перчатки, матричные ленты, полировочные пасты) автоматически скрываются из клиентского акта, сохраняясь в чеке как часть комплексной услуги, но списываются со склада с поштучной точностью.
- **Регламент статуса и штампа «ЧЕРНОВИК» (Мандат 8e):**
  * **Открытый приём (`status: "draft"`):** Печать Формы 043/у, плана лечения или сметы разрешена в любой момент. Документ снабжается полупрозрачным фоновым водяным знаком под углом -32° `«ЧЕРНОВИК»` и статусной плашкой в шапке `«ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)»`.
  * **Закрытый приём (`status: "signed"`):** Документ печатается со штампом `«ПОДПИСАНО ВРАЧОМ»` либо отметкой усиленной квалифицированной электронной подписи (УКЭП КриптоПро ГОСТ Р 34.10-2012 / ГОСТ Р 34.11-2012) с указанием номера сертификата и периода действия.
  * **Версионный аудит («Исправленному верить»):** Жесткие 24-часовые замки запрещены. Врач правит карту при необходимости; каждое сохранение создает ревизию, а на печати выводится юридический штамп `«ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ N)»` с фиксацией автора и даты изменения.
- **Выдача копий и выписок из медицинских документов (Приказ Минздрава РФ № 789н):**
  * Разделение заявления пациента и расписки о получении оригиналов/копий, эксплицитный экспорт DICOM-исследований на цифровых носителях.
- **Рентгенологические направления (Приказ Минздрава РФ № 560н):**
  * Направления на RVG / ОПТГ / КЛКТ с указанием клинической цели, анатомической зоны, противопоказаний и дозового контроля.
- **Единая амбулаторная медицинская документация (Приказ Минздрава РФ № 274н):**
  * Структурированный маппинг Формы № 025/у и специализированной Формы № 043/у (стоматологическая карта) с обязательными клиническими зубными строками (`clinicalToothRows`), привязкой к диагнозам МКБ-10 и визитам.

Source checks verified again on 2026-05-25 (re-verified 2026-09-04):
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
- Exact official outpatient medical-record forms must be mapped from Order N 274n before the app may label them as official form output. Form 025/у is the first mapped official outpatient card in this prototype; form 043/у is the dedicated dental medical card with its own typed payload, required clinical tooth/segment rows, date guards and issue blockers. Any additional 274n form must be added the same way instead of piggybacking on the generic extract.

- Document lifecycle is explicit: `draft` can be issued, issued/draft documents can be voided, and voided documents cannot be issued again.
- Document voiding is explicit: `/api/documents/:id/void` must receive a structured `voidAttestation` with reason code, reason text, staff full name, staff role, replacement-required flag, patient/payer-notified flag, archive-preserved confirmation, status-reviewed confirmation, and optional correction document id. The API rejects an empty void body and validates that a correction document belongs to the same organization/patient and is not the document being voided.
- Browser issue flow is explicit too: a draft row can only open the Russian `Проверить и выдать` confirmation block. The operator must see patient scope, amount, tax year/INN when relevant, open the HTML draft, and press `Выдать после проверки` before `/api/documents/:id/issue` is called from the UI.
- The browser document workspace uses the explicitly selected patient. Communication-task shortcuts must set that patient before opening a form, and visit-bound documents are blocked when the selected patient does not match the active visit; DENTE must not attach another patient's `visitId` to a generated document.
- Drafts with unresolved placeholders must not be issued; the API must reject issue attempts until clinic-required fields are complete.
- Patient intake questionnaire, personal-data processing consent, informed voluntary consent, tax deduction application, anesthesia consent/log, medication order, lab work order, photo/video/xray consent, X-ray/CBCT referral, outpatient medical card 025/у, dental medical card 043/у, medical-document release receipt, and payment refund/correction request now accept structured `document.payload` data. Rendering can still show editable drafts, but creation and issue are blocked until those document kinds carry their specific payloads instead of empty placeholders.
- The structured payload slice is deliberately narrow: patient complaint/allergies/medications/chronic conditions/pregnancy-lactation/anticoagulants/infection/systemic-risk confirmation, personal-data operator/purpose/category/action/transfer/retention/revocation/medical-data acknowledgement facts, informed voluntary consent intervention/indication/objectives/description/alternatives/risks/complications/outcomes/refusal consequences/post-care/urgent signs and confirmation flags, tax application taxpayer full name/INN/birth date/identity document/relationship/year/form/delivery/contact/duplicate-control facts, anesthesia method/drug/dose log/allergy status, medication rows/safety notes, lab work material/shade/source/deadline, photo/video material types/allowed purposes/publication/revocation facts, X-ray/CBCT study type/area/clinical question/indication/pregnancy-status/safety/result-handoff facts, 025/у medical organization/patient/card/diagnosis/specialist-visit/clinical-tooth/event/X-ray-dose/operator-confirmation facts, 043/у organization/patient/doctor/visit clinical text and required clinical tooth/segment rows, release recipient/authority/channel/document list/protection facts, and refund action/selected paid source payment ids/amount/reason/method/recipient/source receipt/decision facts. Wider official-form mapping must be added type-by-type, not as free text.


- The Documents UI must collect those payloads before document creation. It must validate required patient intake, personal-data processing consent, informed voluntary consent, tax application, anesthesia, medication, lab, photo/video, X-ray/CBCT referral, release, and refund/correction fields client-side and send the typed payload to `/api/documents`, so the user does not create a knowingly blocked draft by accident.

- The Documents UI must normalize every select-driven payload value before it enters React state. This applies to document kind, intake pregnancy/lactation status, tax relationship/form/delivery channel, procedure type, treatment-plan acceptance variant, post-visit care topic, X-ray study/priority/pregnancy status, 025/у demographic locality/sex codes, medical-release channel, refund action/method, and document void reason. Source smokes reject raw DOM casts for these fields.
- Legal, tax, payment, consent, release and official medical-record documents must receive clinic legal profile from the server render context. Issue/render is blocked if legal name, INN, address, phone, medical license number, license date, or license issuer is missing. Internal workflow drafts that do not claim legal/fiscal status may render with sparse clinic data: patient intake questionnaire, post-visit recommendations, treatment plan draft, anesthesia log, medication order, X-ray/CBCT referral, lab order and warranty memo.
- Financial document payload dates must be real calendar dates, not arbitrary text. Contract-adjacent payment forms reject impossible dates such as 31.02.2026 and non-ISO/non-Russian date formats for invoice, receipt, installment, act and estimate fields before a draft can be created or issued.
- HTML output must include patient identity, document status, date, signatures/checklist, and the stored issue signature attestation after issue.
- Medical-record copy requests, medical-record extracts, outpatient medical card 025/у, dental medical card 043/у, and medical-document release receipts must be sourced from signed medical facts where the form depends on visit records. Copy requests, extracts, and release receipts create a durable release journal entry on issue: request registration, extract issue, or completed release with recipient, authority, material kind, delivery method, period, source snapshot hash, and staff issuer. The 025/у issue blocker rejects unsigned source visits, source-period mismatches and missing dental clinical rows before issue. The 043/у issue blocker rejects empty clinical tooth/segment rows and unparseable visit, birth, license, or lock dates before issue. Document payloads plus issue/void attestations are repaired for legacy mojibake before they are stored, so the issue passport and archived HTML cannot preserve broken `Ð...` recipient facts. The `sourceSnapshotSha256` field is mandatory-format audit data: copy requests and extracts hash the issued source DTO, while a release receipt points to the issued copy-request snapshot hash when that source request exists.
- Medical-record copy requests, medical-record extracts, outpatient medical card 025/у, dental medical card 043/у, and medical-document release receipts must reject issue when non-empty request, period, issue, delivery, visit, or access dates are not parseable as a real `YYYY-MM-DD`-prefixed date, or when the selected period/access window is in reverse order. Draft creation can remain editable; legal issue cannot proceed until the dates are corrected.

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
- dental medical card 043/у renders organization/patient/doctor facts, visit clinical text, required clinical tooth/segment rows with surfaces and planned actions, and is blocked when clinical tooth rows are empty;
- payment refund/correction request renders action, amount, reason, method, recipient, fiscal receipt, accountant decision, and is blocked when the requested amount exceeds paid visit facts;
- all structured payload forms listed above are issue-ready only with complete payload and are blocked when payload is missing.


`npm run smoke:document-payload-ui-source` checks that the browser document factory imports the shared payload, issue attestation and audit-facts types, validates structured document kinds before posting, sends `payload` to the document API, mounts only the selected structured payload editor instead of keeping inactive legal/tax/patient/payment/workflow editors as hidden DOM, forces explicit refund/correction source-payment selection, keeps saved payment selections clinic-scoped, keeps reusable issue signature/staff defaults and outpatient 025/u local draft keys clinic-scoped with migration fallback, normalizes issue signature mode instead of raw DOM casting, and exposes source links, issue passport plus archived HTML/PDF actions.

`npm run smoke:document-legal-confirmations` checks that required legal statements are explicit UI confirmations, that the document issue button opens the review confirmation block instead of directly calling the issue endpoint, that issue requires identity/document-opened/recipient-signature/clinic-signature checkboxes, and that shared payload schemas still require literal `true` confirmations where the form legally depends on operator confirmation.

`npm run smoke:document-issue-chains` checks that completed works acts require an exact issued contract, release receipts require an issued matching copy request, medical extracts and outpatient medical card 025/у require signed source visits in period, 025/у blocks unsigned source facts and source-period mismatches, dental medical card 043/у blocks empty clinical tooth rows and unparseable visit dates then issues and renders clinical tooth detail in HTML, copy/extract/release issue is blocked when legal-chain dates are unparseable or reversed, and broken legacy release/signature text is repaired before the issue response, audit passport and archived HTML are returned.


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

---

## Detailed Legal Forms Specification & Execution Protocol

### 1. Бланки информированных добровольных согласий (ИДС по Приказу Минздрава РФ № 1051н)
- **Нормативная основа:** Статья 20 Федерального закона от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации», Приказ Минздрава России от 12.11.2021 № 1051н.
- **Архитектура пакетов согласий:**
  * `CONSENT_THERAPY` (ИДС-01-ТЕР): лечение кариеса, пульпита, периодонтита, эндодонтическое вмешательство, эстетическая реставрация композитами.
  * `CONSENT_SURGERY_IMPLANT` (ИДС-02-ХИР): простое и сложное удаление зубов, синус-лифтинг, костная пластика, дентальная имплантация, установка формирователей десны.
  * `CONSENT_ORTHODONTICS` (ИДС-03-ОРТ): ортодонтическое лечение с применением несъемной брекет-системы или съемных капп-элайнеров, ретенционный период.
  * `CONSENT_ORTHOPEDICS` (ИДС-04-ОРТОПЕД): несъемное (коронки, мостовидные протезы, виниры) и съемное протезирование, снятие оптических или силиконовых слепков.
  * `CONSENT_HYGIENE_BLEACHING` (ИДС-05-ГИГ): профессиональная гигиена полости рта (УЗ-скейлинг, Air-Flow Clinpro), глубокое фторирование, клиническое и домашнее отбеливание.
  * `CONSENT_ANESTHESIA` (ИДС-06-АНЕСТ): местное обезболивание (инфильтрационная, проводниковая, интралигаментарная анестезия препаратами на основе артикаина/мепивакаина с вазоконстрикторами).
  * `CONSENT_PERSONAL_DATA` (СОГЛ-ПД-152): согласие на обработку персональных данных в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ.
  * `REFUSAL_INTERVENTION` (ОТКАЗ-ОТ-ВМЕШАТЕЛЬСТВА): официальный отказ пациента от предложенного медицинского вмешательства с разъяснением возможных неблагоприятных исходов (развитие флегмоны, потеря зуба, остеомиелит).
- **Сенсорная векторная подпись ПЭП (Touch/Pad):**
  * Пациент расписывается на планшете у кресла или экране регистратуры (`SignatureCanvasPad.tsx`).
  * Алгоритм Безье сглаживает кривые, рассчитывает динамическую скорость росчерка (`calculatePointVelocity`) и толщину штриха (`calculateStrokeWidth`).
  * Результат экспортируется в защищенный векторный SVG и Base64 PNG с отметкой точного времени, IP-адреса и идентификатора устройства.
- **Динамическая интерполяция клинических переменных:**
  * `{{PATIENT_NAME}}`, `{{BIRTH_DATE}}`, `{{PASSPORT}}`, `{{DOCTOR_NAME}}`, `{{CLINIC_NAME}}`, `{{DIAGNOSIS_ICD}}`, `{{TOOTH_NUMBERS}}`, `{{DATE}}`.

### 2. Договоры на оказание платных медицинских услуг (Постановление Правительства РФ № 736)
- **Нормативная основа:** Постановление Правительства РФ от 11.05.2023 № 736 «Об утверждении Правил предоставления медицинскими организациями платных медицинских услуг».
- **Регистратура без палок в колёса (Мандат 8e):**
  * Администратор/регистратор клиники имеет безусловное законное и системное право распечатать официальный договор с суммой 0 ₽ и строками прочерков `_______` для ручного заполнения паспортных данных пациентом до первичного осмотра врачом.
  * Система **НИКОГДА** не выдает ошибку `403 Forbidden` и не блокирует печать бланка договора из-за отсутствия предварительно составленного плана лечения или неприкрепленного ассистента врача.
- **Типы договоров:**
  * Двусторонний договор: Клиника — Совершеннолетний пациент (Потребитель / Заказчик в одном лице).
  * Трехсторонний договор: Клиника — Законный представитель (Родитель / Опекун / Заказчик) — Несовершеннолетний пациент (Потребитель).

### 3. Справки об оплате медицинских услуг для ФНС (КНД 1151156, коды 01 и 02)
- **Нормативная основа:** Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@, пп. 3 п. 1 ст. 219 НК РФ.
- **Дифференциация кодов медицинских услуг:**
  * **Код 01 (Обычное лечение):** Терапевтическое лечение кариеса и пульпита, профгигиена, пародонтологические манипуляции, простое удаление зубов, терапевтическая ортодонтия. Лимит совокупного социального вычета составляет 150 000 ₽ в год (максимальный возврат 13% — до 19 500 ₽).
  * **Код 02 (Дорогостоящее лечение по Постановлению Правительства РФ № 458):** Дентальная имплантация, костная пластика (аугментация альвеолярного отростка), расщепление костного гребня, открытый и закрытый синус-лифтинг, сложное протезирование с опорой на дентальные имплантаты. **Лимит вычета отсутствует**: государство возвращает 13% со **всей фактически уплаченной суммы**.
- **Интеграция с фискальным контуром 54-ФЗ:**
  * Справка формируется исключительно на основе подтвержденных фискальных оплат: обязательна сверка номеров фискальных чеков (`fiscalReceiptNumber`) и фискальных дат (`fiscalReceiptDate`).
  * Привязка к ИНН и паспортным данным реального налогоплательщика (если плательщик и пациент — разные лица, формируется Лист 001 и Лист 002).
- **Машиночитаемый XML экспорт (XSD 5.01):**
  * Эндпоинт `GET /api/documents/:id/tax-xml` выгружает валидированный XML документ с тегом `Документ` и кодом `КНД="1184043"`.
  * Встроенный структурный префлайт проверяет: 4-значный код налогового органа (СОНО), ИНН/КПП клиники, паспортные данные, раздельные суммы по коду 01 и 02.
  * Блокировка дублирующих справок в рамках одного налогового года и одного налогоплательщика.

### 4. Акты выполненных услуг по Номенклатуре Минздрава РФ № 804н
- **Нормативная основа:** Приказ Минздрава России от 13.10.2017 № 804н «Об утверждении номенклатуры медицинских услуг».
- **Структура акта:**
  * Коды разделов Номенклатуры: A11 (инъекции и обезболивание), A16 (хирургические и терапевтические вмешательства), A06 (рентгенологические исследования), A02 (диагностические приемы и снятие оттисков).
  * Фиксация гарантийных сроков и сроков службы по каждому виду выполненных работ (например: пломба Estelite — гарантия 24 мес, срок службы 36 мес; коронка из диоксида циркония — гарантия 36 мес, срок службы 60 мес; имплантат Osstem — гарантия 120 мес).
- **Скрытие микро-расходников (`hideInPatientPresentation: true`):**
  * Копеечные вспомогательные материалы (валики, салфетки, перчатки, матричные системы) не выводятся в печатную форму акта пациента, чтобы исключить загромождение документа десятками мелких позиций.
  * На складе материалы списываются со 100% точностью через технологические карты (BOM).

### 5. Регламент водяного знака и статусного штампа «ЧЕРНОВИК» (Мандат 8e)
- **Приём в процессе (`status: "draft"`):**
  * Любая форма (043/у, 025/у, предварительная смета, согласование плана) выводится на печать с диагональным (-32°) полупрозрачным водяным знаком `«ЧЕРНОВИК»` по диагонали всего листа A4.
  * В шапке документа размещается контрастная статусная плашка: `«ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)»`.
- **Приём завершен (`status: "signed"`):**
  * Документ печатается без водяного знака «ЧЕРНОВИК».
  * В подвале выводится штамп `«ПОДПИСАНО ВРАЧОМ»` с ФИО врача, датой и точным временем подписания, либо синий графический штамп УКЭП (КриптоПро ГОСТ Р 34.10-2012) с номером квалифицированного сертификата.
- **Версионный аудит («Исправленному верить»):**
  * При внесении врачом изменений в ранее подписанный дневник система создает запись ревизии (`visit_diary_revisions`).
  * При последующей печати выводится юридический штамп: `«ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ N)»` с фиксацией автора изменений и точного таймстемпа.

---

## Cross-References & System Documentation Hub

* **[THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** — Высшая Конституция проекта (CTO Supremacy, презумпция брака, Apple/Mac HIG, Мандат 8e — Запрет на палки в колёса врачам).
* **[INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Главный интертекстуальный навигационный хаб.
* **[DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — Полное руководство по жизненному циклу документов, SHA-256 хэшированию, headless Chromium PDF генератору и аттестации подписей.
* **[CLINICAL_PROTOCOLS_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_PROTOCOLS_REGISTRY.md)** — Реестр клинических протоколов 043/у по МКБ-10, пакетов 804н и СанПиН 3.3686-21.
* **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Клинический движок, одонтограмма, правила валидации визитов и защита автономии врача.
* **[BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Касса 54-ФЗ, справка ФНС КНД 1151156, расчеты вычетов и семейные кошельки.
* **[CLINICAL_USER_MANUAL.md](file:///C:/Clinic_MVP/dental-crm/docs/CLINICAL_USER_MANUAL.md)** — Клиническое руководство пользователя: КЛКТ, Хаунсфилд (D1–D4), сметы, Dental UX.
