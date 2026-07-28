# R2 — COMPETITOR GAP DOSSIER (recon, read-only)

Packet: `R2-competitor-gap`. Lead: [ARCHON]. Repo: `C:\Clinic_MVP\dental-crm`.
Rule of this file: every line carries a `file:line` or a real command output. No inherited numbers.
`docs/competitive-audit/` is treated as a record of past CLAIMS, never as evidence.

---

## PART A — WHAT DENTE ACTUALLY HAS ON THE RUSSIAN-OBLIGATION AXIS
(verified in code, one by one, before any competitor was looked at)

### A1. 54-ФЗ / фискальный чек — DENTE records a receipt, DENTE cannot PRINT one. DEBT.
**What exists.** A full manual fiscal-details form: `apps/web/src/PaymentCapture.tsx:17-34` declares
`fiscalCashierName`, `fiscalFd`, `fiscalFn`, `fiscalFpd`, `fiscalReceiptIssuedAt`,
`fiscalReceiptNumber`, `fiscalReceiptUrl` with seven `on*Change` callbacks; the collapsible panel is
`FiscalDetails` at `PaymentCapture.tsx:101`. Storage exists:
`apps/api/src/db/schema.ts:481-484` = `fiscal_receipt_number`, `fiscal_receipt_issued_at`,
`fiscal_receipt_url`, `fiscal_receipt` (jsonb), plus a **NOT NULL** `fiscal_receipt_number` at
`schema.ts:1021`. Validation is real, not decorative: `packages/shared/src/index.ts:1942-1947`
rejects an ОФД link that does not start with `http(s)://`.

**What does not exist.** No ККТ/ОФД integration of any kind. Verified:
```
rg -in 'atol|orangedata|modulkassa|evotor|kassa|shtrih|ofd\.ru|platformaofd|ferma|
        robokassa|cloudpayments|yookassa|tinkoff|sbp|СБП|фискализ' apps/api/src apps/web/src packages/shared/src
```
→ zero integration hits. The only `СБП` string in the whole source tree is a **demo dictation chip**:
`apps/web/src/PaymentCapture.tsx:600` → `onClick={() => handleSmartDictation("20000 сбп, вычет")}`.
The payment-method enum has no СБП and no QR at all:
`apps/api/src/db/schema.ts:99` → `pgEnum("payment_method", ["cash","card","bank_transfer","online","insurance","family_wallet","other"])`
(mirrored in `packages/shared/src/index.ts:851`).

**Meaning for a solo dentist.** Today the dentist rings the sale on a separate ККТ (Эвотор/Атол/
банковский терминал), then **re-types FD/FN/ФПД by hand into DENTE**. That is the single most
error-prone keystroke sequence in the product and it is on the money path, where §8b demands
kopeck exactness.

### A2. ЕГИСЗ / РЭМД — CDA R2 generation is REAL; signing and transmission do not exist, and the
### code says so out loud. Partial, honestly labelled.
`apps/api/src/routes/egisz.ts` (341 lines) exposes 4 endpoints:
- `egisz.ts:80` `GET /api/clinical/egisz/integration-status` — derives status from env
  (`EGISZ_N3_BASE_URL`, `EGISZ_N3_GUID`, `EGISZ_N3_LPU_ID`, `EGISZ_FRMO_ID`, `EGISZ_CLINIC_OID`,
  read at `egisz.ts:54-66`) instead of the hardcoded `"CONNECTED"` literals it used to return
  (the file documents its own former lie at `egisz.ts:18-24`).
- `egisz.ts:124` `POST /api/clinical/egisz/validate-doctor-snils` — real СНИЛС checksum via
  `apps/api/src/utils/snils.ts`.
- `egisz.ts:164` `GET /api/egisz/multiple-diagnoses`.
- `egisz.ts:193` `GET /api/egisz/visits/:visitId/cda` — builds a СЭМД «Протокол стоматологического
  осмотра» from live `visits`/`patients`/`organizations`/`appointments`/`users` rows and returns
  `application/xml` as a download. Generator: `apps/api/src/services/egiszCdaGenerator.ts:32`
  `generateDentalCdaXml()` (130 lines).

The capability self-report is the most honest block in this repo — `egisz.ts:109-113`:
```
capabilities: { cdaGeneration: true, ukepSigning: false, remdTransmission: false }
```
**Gap:** no УКЭП signature over the CDA, no N3.Health/РЭМД transport. So a clinic cannot discharge
its РЭМД obligation from DENTE; it can only export an XML and upload it elsewhere by hand.

### A3. Справка КНД 1151156 (налоговый вычет) — REAL and unusually deep. ALREADY HAVE.
`apps/api/src/documents/taxXml.ts` (679 lines). `taxXml.ts:20` pins the print-form code `"1151156"`;
`taxXml.ts:531` `buildKnd1151156Xml()`; `taxXml.ts:636` names the file
`UT_SVOPLMEDUSL_DENTE_<year>_<number>` — the real ФНС file-naming convention. It carries a
**preflight validator** (`taxXml.ts:97 validateKnd1151156XmlDraft`) that refuses to emit garbage and
returns Russian human-language reasons, e.g. `taxXml.ts:558` «Для XML КНД 1151156 укажите в
серверных настройках 4-значный код налогового органа», `taxXml.ts:587` «каждый платеж должен иметь
код услуги 1 или 2», `taxXml.ts:598` «нужны ФИО, дата рождения и 12-значный ИНН либо документ
личности налогоплательщика». The official XSD and the FTS order are cited in
`packages/shared/src/index.ts:640-642`. There is a dedicated route file
`apps/api/src/routes/documents/taxXml.ts` and a snapshot freezer
`apps/api/src/documents/taxPaymentSnapshot.ts`.
**Verdict: ALREADY HAVE, and better than most competitors advertise.** This is the strongest
Russian-obligation asset in the product.

### A4. Online booking — the BACKEND IS LIVE AND REAL, the patient-facing FRONTEND IS ORPHANED. 879
### lines of dead code. This is the single biggest solo-practice gap.
**Backend: real.** `apps/api/src/routes/publicBooking.ts` (605 lines), registered at
`apps/api/src/server.ts:457` → `app.register(registerPublicBookingRoutes, { prefix: "/api/public/booking" })`.
Three endpoints (`publicBooking.ts:248` doctors, `:278` slots, `:396` book). It is not a stub — it
rate-limits by IP (`publicBooking.ts:251`), rejects past times, >8h durations and cross-org doctor
IDs, checks clinic working hours, and really writes: `publicBooking.ts:566` `.insert(patients)` and
`publicBooking.ts:579` `.insert(appointments)`.
Live proof against the running dev API:
```
curl -s -w "\nHTTP=%{http_code}\n" http://127.0.0.1:4100/api/public/booking/00000000-0000-0000-0000-000000000000/doctors
→ []
  HTTP=200
```

**Frontend: orphaned.** `apps/web/src/pages/PublicBookingWidget.tsx` = **477 lines**, and it calls
the correct URLs (`PublicBookingWidget.tsx:97` `/api/public/booking/${organizationId}/doctors`,
`:181` `/api/public/booking/${organizationId}/book`). It is imported by **nothing**:
```
rg -n 'PublicBookingWidget' apps/web/src --glob '!**/PublicBookingWidget.tsx'
→ apps/web/src/pages/PublicBookingWidget.css:2:.PublicBookingWidget-root {   (its own stylesheet, only)
```
`apps/web/src/components/QrGatewayPanel.tsx` = **402 lines**, also imported by nothing
(`rg -n 'QrGatewayPanel' apps/web/src --glob '!**/QrGatewayPanel.tsx'` → empty), and it prints a QR
code pointing at a hardcoded domain and paths this application does not serve:
`QrGatewayPanel.tsx:55` `https://dente.clinic/booking?clinicId=${clinicId}`,
`QrGatewayPanel.tsx:56` `https://dente.clinic/portal/login`.
Those paths cannot resolve: `fd -e html . apps/web --max-depth 2` → **one** entry (`apps/web/index.html`),
and `apps/web/src/main.tsx:35` renders a single root with no pathname branch. There is no router.

**Total dead patient-acquisition surface: 879 lines** (`wc -l` on the two files).

> **Self-correction recorded, because this repo's rule is to record them.** My first pass "found" the
> widget calling a corrupt URL `/api/publicl/...`. That was **my own tool artefact**: I ran
> `rg -rl '…|/booking' …`, and in ripgrep `-r` is `--replace`, so every matched `/booking` was printed
> as the literal `l`. The file is correct. Verified by re-running without `-r`. Nobody else made this
> error; I am logging it so the lead does not inherit a phantom bug from me.

**Verdict: TAKE, top priority.** DIKIDI's entire free product is this one feature, and it is what a
solo dentist actually uses to stop answering the phone. iStom sells «Онлайн-запись» as a paid module;
StomX advertises site/social/messenger booking; DentalPRO leads with «запись пациентов через интернет».
DENTE has the hard half done and the easy half missing.

### A5. МДЛП / «Честный знак» — ABSENT, zero code.
```
rg -in 'МДЛП|mdlp|честный.?знак|sgtin|gtin|datamatrix|крипто.?хвост' apps/api/src apps/web/src packages/shared/src
→ (no matches)
```
DentalPRO advertises «Честный знак» among its 30+ integrations and iStom lists «Честный знак» in its
feature set. **Verdict: CUT for solo, with a caveat.** МДЛП matters for a clinic that dispenses
prescription medicines; a solo dentist buys anaesthetic carpules as a *material*, not as a dispensed
medicine, and the MDLP obligation on a dental cabinet is thin. Building an MDLP client would add a
whole authenticated государственная-система integration and a scanner workflow to a product whose own
online booking page does not render. Cost to the interface: a scanner mode and a compliance tab on
every material. Record as DEBT with reason, do not build now.

### A6. Маркировка рекламы (ЕРИР / ОРД / erid) — ABSENT, zero code.
Verified with a precise pattern (an earlier loose `ОРД\b` pattern false-matched «дашбОРД» — that
false positive is why this line names the precise pattern):
`rg -in '\berid\b|ЕРИР|маркировк[аи] реклам' …` → no code hits, only prose in unrelated comments.
No competitor above advertises it either. **Verdict: CUT.** Ad marking is the marketing agency's
obligation, not the МИС's; a solo dentist running an Instagram post is out of scope for a chair-side
product and putting an `erid` field on a marketing screen would be pure §4 overload.

### A7. Информированное согласие / document pack — REAL and broad. ALREADY HAVE.
`packages/shared/src/index.ts` holds a catalogue of **31 templates** (`rg -c 'sourceReference:'` → 33,
of which 31 are documents). Legally-named forms present, with the ordering act cited:
`index.ts:155` «Информированное добровольное согласие» (`index.ts:436` cites «Приказ N 1051н об ИДС и
отказе от медицинского вмешательства»), `:164` «Согласие на стоматологическое вмешательство по
процедуре», `:191` «Согласие и журнал местной анестезии», `:209` «Согласие на обработку персональных
данных», `:218` «Согласие законного представителя несовершеннолетнего», `:227` «Согласие на фото-,
видео- и рентген-материалы», `:236` «Отказ от медицинского вмешательства», `:290` «Медицинская карта
… форма N 025/у», `:326` «Направление на рентген/КЛКТ», `:335` «Зуботехнический заказ-наряд»,
`:344` «Справка о посещении врача-стоматолога».
IDENT's equivalent claim is one line — «Печатайте документы для пациента: договоры, ИДС,
счета-квитанции, справки для возврата НДФЛ». **DENTE is ahead here.**

### A8. Paperless patient signature on a document — BACKEND READY, NO UI. Half-built.
`apps/api/src/db/schema.ts:526` `signature_svg` on `generated_documents` («Ink / canvas signature
captured in browser»). `apps/api/src/routes/documents/sign.ts:8` declares
`POST /api/documents/:id/sign` and it is a serious handler, not a stub: it rejects anything that is
not `<svg…</svg>` (`sign.ts:26`), strips `<script`/`<iframe`/`on*=` XSS vectors (`sign.ts:34`),
prevents replay of an identical signature scoped by `organizationId` (`sign.ts:45-57`), and writes at
`sign.ts:96`.
**Nothing in the web app ever calls it.** `rg -n 'documents/.*\/sign\b|signatureSvg' apps/web/src` →
zero hits for the ink route. The only signature-pad component,
`apps/web/src/components/SignaturePad.tsx`, has exactly one consumer —
`apps/web/src/components/odontogram/TreatmentEstimator.tsx:8,663` — where it signs a **treatment
plan** (`treatment_plans.patient_signature`, `schema.ts:1350`), not a consent form.
**Contrast:** the market is moving to paperless consent — the 2026 vendor sweep shows «интеграция с
F.doc для безбумажной подписи документов с пациентами» as a selling point.
**Verdict: TAKE, cheap.** The component exists, the route exists, the column exists. What is missing
is one button in the documents view.

### A9. УКЭП signing of documents by staff — REAL and wired. ALREADY HAVE.
`apps/api/src/routes/documents/signUkep.ts:8` `POST /api/documents/:id/sign-ukep` stores a detached
PKCS#7 blob, refuses to overwrite an existing signature (`signUkep.ts:61`), and blocks replay
(`signUkep.ts:69-78`). It is genuinely reachable from the UI:
`apps/web/src/components/documents/DocumentUkepSignButton.tsx:95` posts to it, and the browser-side
CryptoPro bridge is real — `apps/web/src/utils/cryptoPro.ts:168` calls `oSignedData.SignCades(...)`.
Diary locking uses the same path (`apps/web/src/components/useVisitDiaryLogic.ts:178,212`).
**This is the piece that makes A2 fixable**: DENTE can already produce a ГОСТ-2012 CAdES signature in
the browser, so signing the ЕГИСЗ CDA is a wiring job, not a new capability.

### A10. Voice dictation into the medical record — REAL, LIVE, and the market's #1 pain point.
### DENTE's strongest differentiator.
The market complaint, from the 2026 vendor/review sweep, is that filling the card and the dental
formula steals doctor time (an `otzovik` review of «1С:Медицина. Стоматологическая клиника» says the
dental formula «функциональная, но врач тратит много времени на её заполнение»), and vendors are only
now shipping «голосовое заполнение медкарты» and AI assistants as *new* features.

DENTE already runs it. `apps/api/src/routes/speech.ts:313-321` registers 9 endpoints. Live proof:
```
curl -s http://127.0.0.1:4100/api/speech/status
→ {"providerId":"groq_whisper","providerLabel":"Groq Whisper","serverTranscriptionEnabled":true,
   "serverTranscriptionCurrentlyAvailable":true,"keyConfigured":true,
   "keyPool":{"configuredKeyCount":9,"availableKeyCount":9,"rotationEnabled":true,
              "maxAttemptsPerProvider":3,"timeoutMs":45000,...},
   "configuredProviderIds":["groq_whisper","openai_transcribe","google_speech"],
   "fallbackProviderIds":["groq_whisper","openai_transcribe"],
   "chunkingPolicy":{"strategy":"time_and_silence","minChunkMs":10000,"maxChunkMs":25000,
                     "silenceMs":900,"rmsThreshold":0.015,"overlapMs":500,"dedupeWindowChars":600},
   "polishPolicy":{"deterministicEnabled":true,"neuralEnabled":true,...}}
```
Nine keys, rotation, cooldowns, two fallback providers, silence-aware chunking with overlap and
de-duplication, and a transcript-polish stage. This is not a demo.
It is mounted where the work happens, not orphaned: `apps/web/src/components/VisitDiaryEditor.tsx:338,375,528`
(three mics in the diary), `apps/web/src/PaymentCapture.tsx:586`, `apps/web/src/ScheduleView.tsx:17`,
`apps/web/src/components/schedule/NewAppointmentForm.tsx:193`,
`apps/web/src/components/patient/PatientCoreForm.tsx:54`,
`apps/web/src/components/documents/forms/MedicalInterventionRefusalForm.tsx:84,92,100,108`,
`apps/web/src/CommunicationsView.tsx:307`; the floating assistant is mounted at `apps/web/src/App.tsx:4830`.
Dictation even fills the dental formula: `apps/api/src/ai/visitDraft.ts:163` instructs the model to
return `toothStates` keyed by tooth number with `treatment|planned|watch|done|missing`, and
`apps/api/src/ai/visiograph.ts:112` extracts `toothStates` from X-ray analysis into
`schema.ts:887 ai_tooth_states`.
**Verdict: ALREADY HAVE, and it is the thing to market.** No Russian competitor in this sweep
advertises equivalent depth.

---

## PART B — THE ORPHAN LAYER: FEATURES DENTE BUILT AND THEN NEVER MOUNTED
This is the central structural finding of this recon, and it changes how the competitor gap should be
read. Several capabilities the competitors sell are **already written in this repo and rendered
nowhere**. §5 of the constitution names exactly this: «components imported AND used, never orphaned
files».

**Method.** For each candidate, `rg -n "from ['\"].*<Name>['\"]|import .*\b<Name>\b|<<Name>[ />]" apps/web/src --glob "!**/<Name>.tsx"`
must return 0, AND there must be no lazy import. The lazy check was run separately, because this app
does code-split by view (`apps/web/src/App.tsx:386-395`, `apps/web/src/AppHelpers.tsx:370-378`) — a
naive import grep would have produced false orphans:
```
rg -n 'lazy\(\s*\(\)\s*=>\s*import|await import\(' apps/web/src   # 20 hits, all view-level
rg …lazy… | rg -i 'smartimport|waitlist|qrgateway|publicbooking|guestlab|consenttemplate|tourengine|dicomtoolbar|shiftintelligence|financialdashboard|patientadministrative|patientcoreform'
→ (no matches)
```
Every component below therefore renders in no code path at all.

| Orphaned file | lines | competitor capability it would have delivered |
| :-- | --: | :-- |
| `apps/web/src/components/settings/SmartImportStudio.tsx` | 4244 | **superseded duplicate** — the import feature IS live via `SettingsImportsTab.tsx` (mounted at `SettingsView.tsx:164`) and `MigrationWizard.tsx`. Dead weight, not a missing feature. |
| `apps/web/src/components/settings/LegacyMigrationStudio.tsx` | 2623 | ditto — referenced only inside prose comments (`MigrationWizard.tsx:8`, `SettingsClinicTab.tsx:14`) |
| `apps/web/src/components/dicom/DicomToolbar.tsx` | 606 | chairside X-ray viewer controls (Dentrix's praised strength) |
| `apps/web/src/pages/PublicBookingWidget.tsx` | 477 | **24/7 online self-booking** — DIKIDI's whole product, Curve's «24/7 Self-Scheduling», iStom's paid «Онлайн-запись» module |
| `apps/web/src/components/schedule/WaitlistDrawer.tsx` | 436 | **waitlist / cancellation backfill** — Curve's «Smart Fill», IDENT's «Лист ожидания» |
| `apps/web/src/components/QrGatewayPanel.tsx` | 402 | QR booking code — DIKIDI books via «QR-код … в печатных материалах» |
| `apps/web/src/components/TourEngine.tsx` | 343 | onboarding tour (every competitor sells «бесплатное обучение всех сотрудников» instead) |
| `apps/web/src/GuestLabPortal.tsx` | 245 | dental-lab portal — StomX «зуботехническая лаборатория», iStom «онлайн-сервис зуботехников» |
| `apps/web/src/components/patient/PatientAdministrativeForm.tsx` | 184 | patient intake form — Curve's «Smart Forms» |
| `apps/web/src/components/workspace/shift/ShiftIntelligence.tsx` | 173 | the day's briefing (Open Dental's praised colour-coded day view) |
| `apps/web/src/components/patient/PatientCoreForm.tsx` | 90 | patient intake core fields (also carries a dictation mic at `:54`) |
| `apps/web/src/components/ConsentTemplateEditor.tsx` | 80 | editable consent templates — Клиентикс is praised precisely for «удобно самостоятельно вносить правки в документы» |
| `apps/web/src/pages/FinancialDashboard.tsx` | 60 | owner's money view |

`wc -l` on the 12 non-duplicate + duplicate set above (excluding LegacyMigrationStudio) = **7340 lines**.
Adding `LegacyMigrationStudio.tsx` (2623) gives **9963 orphaned lines**.

**The mount guard exists but covers 6 components only.** `apps/web/src/tests/panelsAreMounted.test.ts:39-44`
asserts mounting for `DayConfirmationsPanel`, `ManagerReportsPanel`, `MessageDeliveryConsole`,
`CampaignPanel`, `PatientDuplicateAlert`, `RecallListPanel`. None of the 13 orphans is in that list.
**That is the cheapest structural fix in this whole report: extend the existing test's array.**

### B1. The waitlist backfill engine is orphaned on BOTH ends. Highest-value single gap after booking.
`GET /api/appointments/:appointmentId/waitlist-matches` — `apps/api/src/routes/waitlistMatches.ts:31`,
backed by `apps/api/src/services/schedule/waitlistMatching.ts` (222 lines) which really scores
candidates: it prefers the same doctor and a time that fits (`waitlistMatching.ts:201`
`(match.sameDoctor ? 0 : 1) + (match.timeFits ? 0 : 1)`), builds a human `reason` string
(`waitlistMatching.ts:191`) and caps the list (`:215`).
**No web caller:** `rg -n 'waitlist-matches|waitlistMatches' apps/web/src` → 0 hits.
The only waitlist UI, `WaitlistDrawer.tsx` (436 lines, fetches `/api/waitlist` at `:67,:95,:126,:397`),
is itself unmounted.
**Why this is worth more than a module:** for a solo dentist a 14:00 cancellation is a lost hour of the
only chair. Curve markets exactly this as «Smart Fill … identifies wait-list patients, patients with
overdue recare, and those with unscheduled high-value treatment plans to fill last-minute
cancellations». DENTE has the scoring engine and the human reason text already written.

### B2. Recall / recare — REAL and mounted. ALREADY HAVE (with a placement objection).
`apps/api/src/routes/patientRecall.ts:44` `GET /api/patients/recall-candidates` and `:67`
`POST /api/patients/recall-candidates/invite`, backed by
`apps/api/src/services/patients/recallCandidates.ts` (239 lines). It IS reachable:
`apps/web/src/components/patients/RecallListPanel.tsx:100,120` fetches both, and the panel is mounted
twice — `apps/web/src/MarketingView.tsx:399` and `apps/web/src/pages/AnalyticsDashboardView.tsx:559`.
**Objection under §3/§5:** for a solo dentist the recall list belongs on the day screen, not buried in
«Маркетинг» and «Аналитика». A solo dentist has no marketer. Nobody opens a marketing tab to fill
tomorrow.
Dead sibling: `apps/api/src/services/recallScheduler.ts` is referenced only by its own test
(`apps/api/src/services/tests/recallScheduler.test.ts:3`) and by comments in
`apps/api/src/services/communications/appointmentReminders.ts:10` recording that it was never wired.

### B3. Reminders — REAL, worker starts at boot, transport is genuine. ALREADY HAVE (unconfigured here).
`apps/api/src/server.ts:510-511` starts `startCommunicationDispatchWorker`, whose tick runs
appointment reminders, campaign launch/completion, inbound messenger ingestion and expired
action-code purge (`apps/api/src/services/communications/dispatchWorker.ts:15-19`). Non-overlapping
ticks, env-gated off by default, with a deliberate `AutomaticSendingState` so the UI can say «никто их
не отправляет» rather than silently queueing — the reasoning is written out at `dispatchWorker.ts:34-42`.
SMS transport is real, not a mock: `apps/api/src/smsTransport.ts:26` `SmsProviderId = "smsru" | "smsc"`,
real POSTs at `smsTransport.ts:276` (`/sms/send`) and `:364` (`/sys/send.php`), with provider error-code
tables (`:155`, `:210`). Channel fallback order `["telegram","whatsapp","sms","email"]` at
`apps/api/src/services/communications/dispatcher.ts:126`.
**Not configured on this host** — variable NAMES present in root `.env` are only:
`API_HOST, API_PORT, ATTACHMENT_STORAGE_PATH, DATABASE_URL, DENTAL_SPEECH_POLISH_TIMEOUT_MS,
DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS, DENTE_CLINICAL_ALLOW_UNGUARDED_READS,
DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS, DOCUMENT_STORAGE_PATH, NODE_ENV, REDIS_URL, WEB_ORIGIN`
(`rg -o '^[A-Z0-9_]+' .env | sort -u` — names only, no values read). No `DENTE_SMS_PROVIDER`, no
`EGISZ_*`. That is a deployment gap, not a code gap.

---

## PART C — LIVE DATABASE MEASUREMENTS (read-only `pg` client, 2026-07-28)
Method: a throwaway read-only `node` script using the repo own `pg` dependency, reading `DATABASE_URL`
from `.env` without printing it, running only `select count(*)`. Script deleted after use.

```
     18 patients                      0 visit_diaries        <- 10 visits, ZERO diaries
     27 appointments                  0 treatment_plans
     10 visits                        0 appointment_waitlists
      8 payments                      0 rebooking_conversion_rules
      4 generated_documents           0 lab_orders
     25 tooth_states                  0 egisz_multiple_diagnoses
      1 clinics                       0 inventory_items
      4 organizations                 0 crm_leads
      7 users                         0 family_groups / patient_invoices
      1 imaging_studies               0 communication_settings / _events / _tasks
      6 communication_outbox          3 communication_templates
      0 dente_whatsapp_bot_configs / dente_max_bot_configs / dente_telegram_bot_configs / messenger_inbound_events
payments by method: [{"method":"card","n":8}]
payments with a non-empty fiscal_receipt_number: 0
```
Non-existent tables (named in docs or in my own guesses, absent from the live DB):
`waitlist_entries`, `schedule_waitlist`, `waitlist`, `communication_messages`, `patient_recalls`,
`sterilization_cycles`, `insurance_policies`. The real waitlist table is `appointment_waitlists`
(`apps/api/src/db/schema.ts:1596`).

**Three of these numbers are the report:**
1. **`payments` = 8, all `method='card'`, and 0 carry a fiscal receipt number.** The manual 54-FZ
   fields from A1 are not filled even by whoever seeded this data. A field a human must re-type off a
   paper cheque is a field that stays empty. This is the empirical case for the KKT integration.
2. **`communication_outbox` = 6 with the dispatch worker env-gated off.** Six messages queued and
   nothing sending them — exactly the scenario `dispatchWorker.ts:34-42` warns about in prose. The
   `AutomaticSendingState` type exists to surface it; the lead should verify the UI really shows it.
3. **`visit_diaries` = 0 against 10 `visits` and 25 `tooth_states`.** Teeth get marked; the medical
   record does not get written. If that holds outside seed data it is the §1 hole in the daily loop.

> **CORRECTION to the briefing I was given:** the ground truth handed to me says «`organizations` = 2».
> Measured now: **4**. `clinics` = 1 and `communication_settings` = 0 both held. Re-measure before
> quoting; something created two more organizations.

---

## PART D — THE CAPABILITY MATRIX
**RU competitors** = IDENT / Клиентикс / DentalPRO / iStom / StomX / Dikidi / 1С:Медицина.
**Intl** = Dentrix / Open Dental / Curve / Denticon. Sources listed in PART F.

| # | Capability | Who has it | DENTE today (file:line) | Verdict |
|--:|:--|:--|:--|:--|
| 1 | **Онлайн-запись 24/7** (site widget, link, QR, maps button) | Dikidi (free, it IS their product), iStom (paid module), StomX, DentalPRO, 1С (widget for site + socials), Curve (24/7 Self-Scheduling), Denticon | Backend live: `apps/api/src/routes/publicBooking.ts:248/278/396`, registered `server.ts:457`. UI **orphaned**: `apps/web/src/pages/PublicBookingWidget.tsx` (477 L), `components/QrGatewayPanel.tsx` (402 L) | **TAKE #1** |
| 2 | **Онлайн-касса / фискальный чек 54-ФЗ** | IDENT (Атол + Штрих-М, X/Z-отчёты, чек на телефон или e-mail), iStom (Штрих-М + Атол), StomX, 1С (онлайн ККМ + кассовый сервер + e-чек по SMS), Клиентикс (кассовый аппарат) | Manual typing only: `PaymentCapture.tsx:17-34`, `schema.ts:481-484`. **0 of 8 payments carry a receipt number.** No provider client anywhere | **TAKE #2** |
| 3 | **ЕГИСЗ / РЭМД передача СЭМД** — a licence requirement for a single dental cabinet, and the cheap tiers give it away free | IDENT (module, "напрямую из IDENT"), DentalPRO + StomX (both N3.Health partners), iStom, 1С (via 1С:ЕГИСЗ) | CDA generation only: `egisz.ts:193` + `egiszCdaGenerator.ts:32`. `egisz.ts:109-113` `ukepSigning:false, remdTransmission:false`; live-confirmed `configured:false` | **TAKE #3** |
| 4 | **Эквайринг: сумма уходит в терминал сама** (card / QR / СБП) | IDENT (Сбербанк terminal — "сумма счета передается автоматически", card, QR, biometrics, Вжух), 1С (эквайринговые терминалы) | Absent. `payment_method` enum `schema.ts:99` has no `sbp` and no `qr`. The only «СБП» string in the tree is a demo dictation chip, `PaymentCapture.tsx:600` | **TAKE #4 (thin version)** |
| 5 | **Справка КНД 1151156 + XML для ФНС** | IDENT (print + XML, org data synced from FNS daily), iStom (preloaded справки) | `apps/api/src/documents/taxXml.ts` 679 L, real preflight validator `:97`, correct FNS filename `:636` | **ALREADY HAVE — deeper than theirs** |
| 6 | **ИДС + document pack** | all of them, as a one-line claim | 31 templates, `packages/shared/src/index.ts:128-398`, ordering act cited at `:436` | **ALREADY HAVE — ahead** |
| 7 | **Голосовое заполнение медкарты** | the market is only now shipping it; the complaint it answers is that the doctor spends too long filling the card and the dental formula | Live: `speech.ts:313-321`, 9 Groq keys + 2 fallback providers, mounted in the diary at `VisitDiaryEditor.tsx:338/375/528` and 8 other places; AI fills `toothStates` (`ai/visitDraft.ts:163`) | **ALREADY HAVE — the differentiator** |
| 8 | **Зубная формула / карта зубов** | all (DentalPRO 3D-карта зубов, 1С graphical formula, iStom, IDENT "наглядная зубная формула") | `odontogram.ts` 4 routes; **`tooth_states` = 25 live rows**; mounted via `VisitOdontogramTab.tsx`, `PatientsView.tsx` | **ALREADY HAVE** |
| 9 | **Лист ожидания / заполнение отмен** | IDENT ("Лист ожидания" + "Задачи для обзвона"; a no-show task is created 15 min after the slot should have ended), Curve (Smart Fill) | Engine written: `waitlistMatches.ts:31` + `waitlistMatching.ts` (222 L, real scoring `:201`, human reason string `:191`). **Zero web callers.** `WaitlistDrawer.tsx` (436 L) orphaned; `appointment_waitlists` = 0 rows | **TAKE #5** |
| 10 | **Безбумажная подпись пациента на документе** | Curve Smart Forms (e-signature by finger on any form incl. consent); the RU market is moving to F.doc | Route `documents/sign.ts:8` is real (SVG validation `:26`, XSS strip `:34`, replay block `:45-57`, write `:96`); column `schema.ts:526`; `SignaturePad.tsx` exists. **No UI caller** — the pad is wired only to a treatment plan (`TreatmentEstimator.tsx:663`) | **TAKE #6 — cheapest big win** |
| 11 | **Пациент заполняет анкету заранее** | Curve Smart Forms — data integrates instantly, eliminating manual data entry | `PatientAdministrativeForm.tsx` (184 L) and `PatientCoreForm.tsx` (90 L) both **orphaned**; a patient portal exists (`portal.ts`, 4 routes) | **TAKE #7** |
| 12 | **Recall / recare (возврат на профгигиену)** | IDENT, Curve (Automated Recare), 1С (триггерные рассылки), Dikidi (segment "кто давно не был на чистке") | Real and mounted: `patientRecall.ts:44/67` <- `RecallListPanel.tsx:100/120`, mounted at `MarketingView.tsx:399` and `AnalyticsDashboardView.tsx:559` | **ALREADY HAVE — but MOVE it (§3)** |
| 13 | **SMS / messenger reminders** | all | Real: `smsTransport.ts:26/276/364` (SMS.RU + SMSC.RU), worker started `server.ts:510`, fallback chain `dispatcher.ts:126`. Unconfigured here; **6 rows stuck in `communication_outbox`** | **ALREADY HAVE — needs a config screen and a stuck-queue warning** |
| 14 | **Материалы / склад со списанием по приёму** | IDENT "Материалы", StomX "склад (учёт расхода материалов)", iStom, DentalPRO, 1С | Real, and the write-off is tied to the visit: `inventory.ts:131` items, `:215` transactions, **`diary.ts:336` deducts material inside the diary transaction**. `inventory_items` = 0 (nobody has entered stock) | **ALREADY HAVE** |
| 15 | **Телефония: карточка звонящего** | DentalPRO (shows the patient card and treatment plan on ring), StomX (UIS), iStom (UIS), 1С | `telephony.ts` = 2 POST webhooks only, 189 L. No incoming-call UI found in `App.tsx` | **TAKE #8 (small)** |
| 16 | **Зуботехническая лаборатория (ЗТЛ)** | StomX, iStom (онлайн-сервис зуботехников), DentalPRO, IDENT, 1С | `lab.ts` 6 routes; `lab_orders` = 0 rows; `GuestLabPortal.tsx` (245 L) **orphaned** | **CUT for solo, TAKE for small** |
| 17 | **Расчёт зарплаты врачей** | IDENT (module), StomX, iStom, 1С, DentalPRO, Клиентикс | **Deliberately removed as unbuildable, and honestly logged.** `clinical.ts:272-280`: the route "удалён вместе со своим экраном", `pricelist_doctor_payrolls` has no writer, "ДОЛГ: расчёт зарплаты врача требует поля процента у сотрудника". Doctor output IS computed from real payments (`services/reports/managerReports.ts` doctorPerformance) | **CUT for solo; TAKE later for small — needs ONE field first** |
| 18 | **AI анализ снимков** | Diagnocat resold by IDENT (top tier only), StomX, DentalPRO | Own implementation: `ai/visiograph.ts`, `ai/visiographPrompt.ts`, writes `schema.ts:887 ai_tooth_states` | **ALREADY HAVE** |
| 19 | **Онбординг / обучение** | every vendor sells "бесплатное обучение всех сотрудников"; IDENT quotes implementation up to 20 days | `TourEngine.tsx` (343 L) **orphaned** | **TAKE #9 (cheap)** |
| 20 | **Мобильное приложение врача/директора** | StomX, iStom (iStom Mobile), 1С (apps for doctors and admins) | PWA manifest only (`apps/web/public/manifest.webmanifest`) | **CUT** — a responsive PWA is enough for one chair; a native app is a second product to maintain |
| 21 | **Скидки / лояльность / семейные скидки** | IDENT (numbered cards, family, cumulative, per-service, referral), 1С (bonuses, automatic birthday greetings) | `family_groups` + wallet (`finance_family.ts`); `family_groups` = 0 rows | **CUT the card programme; keep the family wallet** |
| 22 | **Филиалы / сеть, centralised pricing** | IDENT "Филиалы", Denticon (proven at 140+ locations), 1С, Клиентикс | `clinics` table exists, 1 row | **CUT** — §5 says the focus is solo and small; this is the enterprise weight that overloads the screen |
| 23 | **Страховые / ДМС** | IDENT "Страховая компания" module; Dentrix (eligibility to claim to payment posting, its most-praised strength) | `insurance.ts` 5 routes; `insurance_policies` does not exist in the live DB | **CUT** — a Russian solo cabinet is cash and card; US insurance depth is irrelevant here |
| 24 | **100+ отчётов / рабочий стол директора** | 1С "более 100 отчетов", Клиентикс "более 20 преднастроенных", IDENT (10 named reports) | `reports.ts` 10 routes, `analytics.ts`, `services/reports/managerReports.ts` | **CUT the volume.** A solo dentist needs revenue, debtors, no-shows, recall due, chair load. Five. |
| 25 | **МДЛП / Честный знак** | DentalPRO, iStom, 1С | Zero code (verified) | **CUT — record as DEBT** |
| 26 | **Маркировка рекламы (ЕРИР / erid)** | nobody in this sweep | Zero code | **CUT** |
| 27 | **Free or cheap entry tier** | Dikidi free; StomX has a free tier; one vendor free up to 100 patients; StomX from 1000 RUB (a second source says 6700 — **unresolved**), 1С from 2100 RUB, MEDIDEA from 3700 RUB | n/a — DENTE is not priced yet | Pricing input, not a build item |

---

## CORRECTION TO MY OWN FINDING A9 (УКЭП signing) — issued before the recommendations
A9 above says the УКЭП path "is genuinely reachable from the UI". That is **half right, and I am
splitting it** rather than leaving the over-claim standing:

- **Diary УКЭП signing IS live.** `apps/web/src/components/VisitDiaryEditor.tsx:627` calls
  `await doLock(thumbprint, signature)`; `doLock` is defined at
  `apps/web/src/components/useVisitDiaryLogic.ts:178` and POSTs the PKCS#7 at `:212`.
  `VisitDiaryEditor` is mounted via `apps/web/src/components/visit/VisitOdontogramTab.tsx:6,70`.
- **Document УКЭП signing is NOT reachable.** `apps/web/src/components/documents/DocumentUkepSignButton.tsx`
  (225 lines) is a **14th orphan**: `rg -n "DocumentUkepSignButton" apps/web/src --glob "!**/DocumentUkepSignButton.tsx"`
  returns exactly one hit, and it is a test manifest — `apps/web/src/tests/documentsViewDecomposition.test.ts:170`.
  It is not imported by `DocumentsView.tsx` and there is no lazy import for it.

So `POST /api/documents/:id/sign-ukep` (`signUkep.ts:8`) has a fully written client that nothing
renders. **Revised orphan total: 14 components, 10188 lines** (9963 + 225).

---

## PART E — RANKED TOP TEN FOR A SOLO PRACTICE
Ordering rule: how many seconds it removes from the daily loop *(see who is coming → open the patient
→ read the last visit and the X-ray → dictate what was done → take money → print or send the document
→ book the next visit)*, divided by how much new surface it adds. **Nine of the ten are wiring work on
code that already exists.** That is the actual headline of this recon.

### 1. Mount the online-booking page. (capability #1)
**Smallest honest version.** A single branch at `apps/web/src/AppShell.tsx:79-96` — before
`<DentalWorkspace />` — that renders the existing `PublicBookingWidget` when the URL says so and does
**not** load the workspace or ask for a login. Use the app's own hash convention (`#booking`,
matching `viewFromHash()`'s `hash.split("/")[0]` with no leading slash) so no server-side SPA fallback
is needed. Then replace the hardcoded domain at `apps/web/src/components/QrGatewayPanel.tsx:55-56`
(`https://dente.clinic/booking`, `https://dente.clinic/portal/login`) with the configured origin —
hardcoding it violates the anti-hardcode doctrine anyway — and mount `QrGatewayPanel` in a settings
tab so the dentist can copy the link and print the QR.
**Zero backend work.** `publicBooking.ts` is live and proven (HTTP 200 on the running server).
**Files:** `apps/web/src/AppShell.tsx`, `apps/web/src/pages/PublicBookingWidget.tsx`,
`apps/web/src/components/QrGatewayPanel.tsx`, `apps/web/src/tests/panelsAreMounted.test.ts`.
**Why first:** DIKIDI gives this away free and 125 000 businesses use it; Curve cites 95% of patients
preferring to book online. A solo dentist cannot answer the phone with a handpiece running.

### 2. Read the fiscal cheque with the camera instead of typing it. (capability #2)
**Smallest honest version.** A «Сканировать QR с чека» button inside the existing `FiscalDetails`
panel (`apps/web/src/PaymentCapture.tsx:101`) that parses the ФНС cheque QR string — the published
format is `t=ггггММддTЧЧммсс&s=<руб.коп>&fn=<ФН>&i=<ФД>&fp=<ФПД>&n=<тип>`, mandated by Приказ ФНС
России от 14.09.2020 № ЕД-7-20/662@ — and fills `fiscalReceiptIssuedAt`, `fiscalFn`, `fiscalFd`,
`fiscalFpd`. The fields already exist one-to-one (`PaymentCapture.tsx:17-34`), so no schema change.
Then **cross-check `s` against the amount already entered** and, on mismatch, say it in human words
(«В чеке 3 943,26 ₽, а в оплате 4 000 ₽ — какой из них верный?»), per §3.
**Explicitly NOT recommended now:** an Атол / Штрих-М driver integration. That is IDENT's and iStom's
version; it needs a device on the premises, a vendor driver, and per-model testing, and it does not
help the dentist who fiscalises on a bank terminal or Эвотор.
**Evidence this is the right target:** all 8 payments in the live DB have `fiscal_receipt_number` empty.
Nobody types those five numbers. A camera shot they will take.
**Files:** `apps/web/src/PaymentCapture.tsx`; a parser beside `fiscalReceiptDetailsSchema`
(`packages/shared/src/index.ts:1966`).

### 3. Wire the cancellation-backfill engine into the schedule. (capability #9)
**Smallest honest version.** Mount `WaitlistDrawer.tsx` inside `ScheduleView.tsx`, and when an
appointment is cancelled call the existing `GET /api/appointments/:appointmentId/waitlist-matches`
(`waitlistMatches.ts:31`) and show the top three with the human `reason` string the service already
builds (`waitlistMatching.ts:191`) plus one tap to call or to move them in. The write path already
exists — `POST /api/waitlist` at `waitlist.ts:72` — which is why `appointment_waitlists` = 0 is a UI
problem, not a schema problem.
**Files:** `apps/web/src/ScheduleView.tsx`, `apps/web/src/components/schedule/WaitlistDrawer.tsx`.
**Why this high:** Curve sells it as «Smart Fill»; IDENT ships «Лист ожидания» + a no-show call task
created automatically 15 minutes after the slot should have ended. For one chair, an unfilled 14:00 is
the whole afternoon's margin.

### 4. Let the patient sign on the screen. (capability #10)
**Smallest honest version.** Mount the already-written `DocumentUkepSignButton.tsx` in
`DocumentsView.tsx` (that alone restores staff УКЭП signing, see the correction above), and add a
«Подписать на экране» action that opens the existing `SignaturePad` and POSTs to the already-hardened
`POST /api/documents/:id/sign` (`sign.ts:8`). Then render `signature_svg` into the PDF.
**Files:** `apps/web/src/DocumentsView.tsx`, `apps/web/src/components/documents/DocumentUkepSignButton.tsx`,
`apps/web/src/components/SignaturePad.tsx`, `apps/api/src/routes/documents/pdf.ts`.
**Why:** consent-on-paper is the last paper in the loop. Curve's Smart Forms sign «by finger, on any
device»; the RU market is buying F.doc for it. DENTE has the pad, the route, the validation and the
column, and connects none of them.

### 5. Sign the ЕГИСЗ CDA with the УКЭП DENTE already has. (capability #3)
**Smallest honest version, two steps, and step (b) must not be faked.**
(a) Reuse `apps/web/src/utils/cryptoPro.ts:168` (`oSignedData.SignCades`) — the exact call the diary
already makes — over the bytes returned by `GET /api/egisz/visits/:visitId/cda`, store the detached
PKCS#7 next to the visit, and flip `capabilities.ukepSigning` to `true` **only then**.
(b) Leave `remdTransmission:false` until a gateway contract exists. DentalPRO and StomX both went
through **N3.Health** rather than building a direct ЗСПД channel, and 1С documents why: direct
connection means аттестация, hardware protection and a paid channel. Buying the same route is the
honest minimum.
**Do not touch `egisz.ts:109-113` except to tell the truth.** That block is the repo's best precedent —
it exists because the endpoint used to return hardcoded `"CONNECTED"` (`egisz.ts:18-24`).
**Files:** `apps/api/src/routes/egisz.ts`, `apps/api/src/services/egiszCdaGenerator.ts`,
`apps/web/src/utils/cryptoPro.ts`.
**Why it cannot be dropped:** ЕГИСЗ transmission is a **licence requirement for every medical
organisation regardless of specialisation, single dental cabinets included**, and the cheap tiers
(StomX, MEDIDEA) advertise it as *free*. A CRM that cannot do it is not sellable to a licensed cabinet.

### 6. Move the recall list onto the day screen. (capability #12 — relocation, no new code)
**Smallest honest version.** Mount the already-working `RecallListPanel` on `ShiftView` with a count
badge («12 пациентов пора позвать»). Keep or drop the Marketing and Analytics copies
(`MarketingView.tsx:399`, `AnalyticsDashboardView.tsx:559`).
**Files:** `apps/web/src/ShiftView.tsx`, `apps/web/src/components/patients/RecallListPanel.tsx`.
**Why:** §3 and §5. A solo dentist has no marketer and never opens a marketing tab. The feature is
built, paid for, and invisible.

### 7. Make the stuck message queue visible, and give the SMS provider a settings screen. (capability #13)
**Smallest honest version.** Surface the existing `AutomaticSendingState`
(`dispatchWorker.ts:34-42` explains exactly why it exists) in the already-mounted
`MessageDeliveryConsole` (`CommunicationsView.tsx:354`): «Автоотправка выключена. 6 сообщений ждут
отправки» plus the one action that fixes it. Add fields for `DENTE_SMS_PROVIDER` and its credentials.
**Files:** `apps/web/src/components/communications/MessageDeliveryConsole.tsx`,
`apps/api/src/services/communications/dispatchWorker.ts`, the settings communications tab.
**Why:** measured — `communication_outbox` = 6 rows, worker off, root `.env` has no
`DENTE_SMS_PROVIDER`. The worst case is already written down in that file's own comment: the
administrator believes reminders go out, patients stop coming, and nobody connects the two for weeks.

### 8. Let the patient fill the intake form before arriving. (capability #11)
**Smallest honest version.** Expose the orphaned `PatientCoreForm` + `PatientAdministrativeForm`
through the existing OTP portal (`apps/api/src/routes/portal.ts`, 4 routes) behind a one-time link
attached to the reminder that already goes out, writing into `patients.administrative_profile` — the
column is already read at `egisz.ts:271` (snils) and `:273` (gender), so ЕГИСЗ export improves for free.
**Files:** `apps/api/src/routes/portal.ts`, `apps/web/src/components/patient/PatientCoreForm.tsx`,
`apps/web/src/components/patient/PatientAdministrativeForm.tsx`.
**Why:** Curve's Smart Forms are sold on «eliminating manual data entry», and the market's loudest
complaint is time-to-fill-the-card. This removes typing from the *dentist* and moves it to the patient.

### 9. One toast when the phone rings. (capability #15)
**Smallest honest version.** `telephony.ts` already receives 2 webhooks. Broadcast the caller's number
over the existing `wsBroker` (`apps/api/src/routes/websocket.ts`) and show ONE toast: name, next
appointment, balance, and a single «открыть карту» button. Not a call centre, not a CRM funnel — one
toast, then it disappears (§4).
**Files:** `apps/api/src/routes/telephony.ts`, `apps/api/src/routes/websocket.ts`, `apps/web/src/App.tsx`.
**Why:** DentalPRO advertises exactly this (identifies the caller, shows the card and the treatment
plan). It is the cheapest "the software knew before I did" moment in the product.

### 10. Turn on the tour, and make the mount guard cover everything.
**Smallest honest version.** Mount `TourEngine.tsx` (343 lines, written, orphaned) on first run, and
extend the array at `apps/web/src/tests/panelsAreMounted.test.ts:39-44` from 6 entries to cover all 14
orphans found here.
**Files:** `apps/web/src/App.tsx`, `apps/web/src/components/TourEngine.tsx`,
`apps/web/src/tests/panelsAreMounted.test.ts`.
**Why last and why non-negotiable:** every competitor sells «бесплатное обучение всех сотрудников»
because their products need it; a tour is cheaper than a trainer. And the guard is the only thing that
stops the next 10 000 lines from being written and never rendered. **This is the item that prevents
this recon from being needed again.**

### Explicitly NOT in the top ten, with the reason (§7 second half)
- **Атол / Штрих-М driver integration** — device-bound, per-model testing, no help for a bank-terminal
  or Эвотор dentist. Item 2 gets 90% of the value for 5% of the work.
- **Филиалы / multi-clinic** (#22), **страховые / ДМС** (#23), **100+ reports** (#24),
  **loyalty card programme** (#21), **native mobile app** (#20), **МДЛП** (#25),
  **маркировка рекламы** (#26) — all CUT. Every one of them adds permanent screen furniture a
  one-chair cabinet must look past every day. §4: richness is not a pile of visible buttons.
- **Salary calculation** (#17) — blocked on one missing datum, not on a module. The honest sequence is:
  add a доля/процент field to the staff record first, then compute. Until then
  `services/reports/managerReports.ts` doctorPerformance is the truthful answer, and
  `clinical.ts:272-280` already says so.
- **ЗТЛ / lab portal** (#16) — real for a small clinic, noise for a solo dentist who phones one
  technician. `GuestLabPortal.tsx` should be mounted behind a `clinicMode` flag (§5), not deleted.

---

## PART F — SOURCES
Competitor claims below are vendor marketing or aggregator reviews, i.e. **claims, not verified
behaviour**. They are used only to establish *what the market advertises*; every DENTE-side statement
in this dossier is verified in code, in the live DB, or against the running server.

- IDENT — `dent-it.ru/function` (fetched: modules list; «IDENT интегрируется с кассами Атол и
  Штрих-М», чеки в ФНС «в соответствии с законом 54-ФЗ», X/Z-отчёты, чек на телефон или e-mail;
  «Оплаты через терминал СберБанка» — «сумма счета передается автоматически», card/QR/biometrics/Вжух;
  «Формирование справки для возврата НДФЛ» print + XML with FNS data synced daily; ЕГИСЗ module and
  banner; «Печатайте документы для пациента: договоры, ИДС, счета-квитанции, справки для возврата
  НДФЛ»); `dent-it.ru/price`, `ident24.ru` (tariffs, incl. a «Смарт» tier aimed at 1–2-chair clinics);
  `help.dent-it.ru` (CRM module: лист ожидания, «Задачи для обзвона», no-show task after 15 min).
- Клиентикс — `a2is.ru`, `hf.ru/services/klientics_crm`, `otzyvmarketing.ru`, `picktech.ru`
  (per-visit pricing, cash-register integration, 20+ reports; complaints: no refund of an annual
  prepayment, promised Эвотор integration delivered for a different device, «костыльность»).
- DentalPRO — `dental-pro.online`, `n3health.ru/dentalpro` (N3.Health partner for ЕГИСЗ),
  `crmindex.ru/products/dentalpro/reviews` (30+ integrations incl. «Честный знак», amoCRM/Bitrix;
  3D tooth map; IP telephony shows the caller's card and plan; a review complains the cash module has
  no cash handling).
- iStom — `i-stom.ru`, `a2is.ru`, `hf.ru/services/istom` (54-ФЗ with Штрих-М and Атол, UIS telephony,
  «Честный знак», ЕГИСЗ, «Онлайн-запись» as a separate paid module, preloaded ИДС and справки, iStom
  Mobile; complaint: some documents print without the patient's data filled in).
- StomX — `stomx.ru`, `demokrat-fr.com`, `uiscom.ru` (free tier + paid tier, касса and онлайн-касса
  54-ФЗ, склад, зарплата, ЗТЛ, N3.Health СЭП, Diagnocat, Bitrix24, UIS, mobile app, site/social/
  messenger booking). **Price conflict left unresolved: one source says from 1000 ₽/mo, another 6700 ₽/mo.**
- Dikidi — `dikidi.net`, `support.dikidi.net` (free online booking; booking button on Yandex/Google
  Maps, direct link, catalogue, printable QR; 125 000+ businesses; one journal-per-business rule).
- 1С:Медицина. Стоматологическая клиника — `solutions.1c.ru/catalog/stoma`, `stoma1c.ru`,
  `otzovik.com` (online ККМ 54-ФЗ + acquiring terminals + a «кассовый сервер» that polls the payment
  queue and prints/emails/SMSes receipts; ЕГИСЗ via 1С:ЕГИСЗ because direct connection needs
  аттестация and a paid channel; online-booking widget for site and socials; patient portal; mobile
  apps for doctors and admins; МДЛП; 100+ reports; base licence ≈45 300 ₽ + per-seat licences.
  A review names the dental formula as functional but slow to fill).
- Market reviews of the pain point — `mis.32top.ru` (17-system review, per-system minuses),
  `md.medsteg.ru/reviews-mis`, `forum.32top.ru`, `a2is.ru`, `crmindex.ru`. Recurring complaints:
  slow card and dental-formula filling, too many clicks when the UI is not adapted to teeth,
  overloaded and therefore slow systems, slow support. Vendor answers in 2026: voice card filling,
  AI assistant, a "smart" formula (up to 7 diagnoses per tooth), and F.doc paperless signing.
- Cheap-tier landscape — `mis.32top.ru`, `a2is.ru`, `livemedical.ru` (a free tier capped at 100
  patients; StomX from 1000 ₽; 1С from 2100 ₽; MEDIDEA from 3700 ₽ with free ЕГИСЗ; market entry from
  ~2500 ₽/mo; per-chair pricing common; **ЕГИСЗ transmission stated as a licence requirement for all
  medical organisations including dental cabinets**; switching МИС later costs 150–300k ₽).
- Intl patterns — `selecthub.com`, `capterra.com`, `curvedental.com` (Smart Forms with finger
  e-signature on consent forms, 24/7 Self-Scheduling, Automated Recare, «Smart Fill» cancellation
  backfill using wait-list + overdue recare + unscheduled high-value plans), `g2.com`, `getapp.com`
  (Denticon is enterprise-leaning and «not particularly well suited for solo practices»; Open Dental
  praised for front-desk learnability, colour coding and open API; Dentrix praised for insurance depth
  and chairside imaging, criticised for a dated, clunky UI and add-on fees; Dentrix ≈$500/mo vs Open
  Dental ≈$179/mo).
- ФНС cheque QR format — the published pair-string
  `t=ггггММддTЧЧммсс&s=<руб.коп>&fn=<ФН>&i=<ФД>&fp=<ФПД>&n=<тип>`, Приказ ФНС России от 14.09.2020
  № ЕД-7-20/662@ (superseding ММВ-7-20/229@); the printed QR must be a key=value string, not a URL.

---

## PART G — WHAT MY METHOD COULD STILL BE MISSING
Stated because a recon that claims completeness is lying.

1. **The route gate never ran.** `node scripts/smoke-clinical-mutation-guard.mjs` refused at the build
   freshness check: «СБОРКА УСТАРЕЛА … Исходников новее своей сборки: 2 — `apps/api/src/server.ts`,
   `apps/api/src/services/communications/dispatcher.ts`; Компилируемых файлов без выхода сборки: 2 —
   `apps/api/src/routes/waitlistMatches.ts`, `apps/api/src/services/schedule/waitlistMatching.ts`»
   (`scripts/lib/api-route-census.mjs:228`). Building is a lead-only gate, so I could not clear it.
   **Everything I say about routes is static plus unauthenticated live GETs — not the 436-entry census.**
   Note the irony: the two files with no build output are precisely the waitlist-matching engine in
   recommendation 3.
2. **Orphan detection can produce false positives in ways I have not fully excluded.** I checked static
   imports, JSX usage and `React.lazy`. I did NOT check: string-keyed component registries, dynamic
   `require`, components rendered by a config-driven renderer, or anything reached only through
   `workspaceActionsPlacement.ts`-style indirection. `TourEngine` and `ShiftIntelligence` are the most
   likely candidates for that kind of indirection and deserve a second look before deletion. Nothing
   should be deleted on my word; mounting is safe, deleting is not.
3. **The live DB is a development database with 18 patients.** `visit_diaries` = 0 may be a seeding
   artefact rather than a product defect. I flagged it; I did not prove it.
4. **Competitor claims are unverified marketing.** I did not obtain a trial of any competitor. When
   iStom says «соответствует требованиям 54-ФЗ и работает с онлайн-кассами Штрих-М и Атол», I have
   established that they *advertise* it. Клиентикс's own review corpus contains a case where an
   advertised Эвотор integration did not exist, and a vendor publicly alleging a competitor planted a
   negative review — so treat the whole review layer as contested.
5. **Prices are stale and one is contradictory.** StomX appears as both 1000 ₽/mo and 6700 ₽/mo across
   sources. I did not resolve it. Any pricing decision needs a fresh direct check.
6. **I did not read `useAppLogic.tsx` (14.5k lines) or `App.tsx` (4.9k) whole.** I searched them. A
   capability could be wired inside the god context in a way my greps missed — the most likely place
   for a false "we don't have it" claim.
7. **I did not test any UI.** Not one screenshot, not one click. Every "mounted" claim means *imported
   and present in JSX*, which is not the same as *visible, reachable and working for a real dentist*.
   The `PublicBookingWidget` might be broken in twelve other ways once mounted.
8. **I did not audit the reverse direction** — DENTE features with no competitor equivalent that are
   nevertheless useless. `sterilization.ts`, `insurance.ts`, `imaging_planning.ts`, `dicomweb.ts`,
   `ingestion.ts` and `migrationRuns.ts` were not examined at all.
9. **`docs/competitive-audit/` was deliberately not used as evidence** (per the packet, and because
   `GAP_REPORT_2026-07-27.md:8-10` rejects it). If a real capability is documented only there, I
   missed it. That is a chosen cost, not an oversight.
10. **`local-secrets/ai.env` was never opened.** Speech works with 9 keys, so keys exist somewhere; I
    read only variable NAMES from the root `.env` and never a value. There may be provider credentials
    configured in a file I did not look at, which would change my "unconfigured" claims for SMS or ЕГИСЗ.

---

## PART H — WHAT I CONFIRM, AND WHAT I CORRECT, IN THE LEAD'S OWN DOCUMENTS
Read after my own investigation, so nothing above was inherited from them.

### Confirmed independently (their claim, my separate evidence)
- `.agents/archon/RECON_DOSSIER.md:112` already lists `pages/PublicBookingWidget.tsx` (477),
  `pages/FinancialDashboard.tsx` and `GuestLabPortal.tsx` (245) as imported by nothing. **My A4/PART B
  reproduce this independently and add live proof that the booking BACKEND works (HTTP 200).** The
  business consequence — that the single most valuable solo-practice feature is 100% built and 0%
  reachable — is the part worth acting on.
- `RECON_DOSSIER.md:234` EGISZ «valid CDA R2 XML generated, never transmitted» — confirmed.
- `RECON_DOSSIER.md:~236` Telephony «INBOUND ONLY … 0 fetch, no click-to-call» — confirmed
  (`telephony.ts`, 189 lines, 2 POST webhooks).
- `RECON_DOSSIER.md:~228` SMS «REAL — SMS.RU + SMSC.RU» — confirmed at `smsTransport.ts:26/276/364`.

### CORRECTION 1 — «Kopecks unrepresentable» is CLOSED, and this unblocks recommendation 2.
`RECON_DOSSIER.md:335-337` lists as still open: «**Kopecks unrepresentable.** `amountRub` is an
**integer** in `payments`, `treatment_items`, `generated_documents`. Every kopeck amount is rounded.
Wrong for 54-ФЗ and for FNS certificates.»
**Measured against the live database just now — every one of those columns is `numeric(12,2)`:**
```
generated_documents.total_amount_rub :: numeric(12,2)
patient_invoices.insurance_amount_rub / patient_amount_rub / total_amount_rub / total_rub :: numeric(12,2)
payments.amount_rub :: numeric(12,2)
treatment_items.discount_rub / price_rub / unit_price_rub :: numeric(12,2)
```
(`information_schema.columns`, read-only.) `apps/api/drizzle/0131_payments_amount_kopecks.sql` exists
and has plainly been applied. Kopecks ARE representable. **This matters concretely:** the fiscal-QR
cross-check in recommendation 2 compares the cheque's `s=3943.26` against the stored amount, and it
would have been a permanently-firing false warning under the integer claim. It will work.

### CORRECTION 2 — «UKEP absent» is wrong. УКЭП signing exists and runs; it is simply not aimed at the CDA.
`RECON_DOSSIER.md:234` says of EGISZ: «UKEP absent». The УКЭП *capability* is not absent from the
product:
- `apps/web/src/utils/cryptoPro.ts:168` calls `oSignedData.SignCades(...)` — a real CryptoPro CAdES
  signature in the browser.
- It is in daily use for the diary: `apps/web/src/components/VisitDiaryEditor.tsx:627` →
  `doLock(thumbprint, signature)` → `useVisitDiaryLogic.ts:178,212` → the diary-lock endpoint.
- A documents-side client is fully written (`components/documents/DocumentUkepSignButton.tsx`, 225
  lines, POSTs to `signUkep.ts:8`) but is a **14th orphan** — its only reference anywhere is a test
  manifest at `apps/web/src/tests/documentsViewDecomposition.test.ts:170`.
**Why the distinction is worth money:** if УКЭП were absent, ЕГИСЗ signing would be a crypto project.
It is not. It is pointing an existing, working signature call at a different byte stream. That moves
recommendation 5 from "large" to "small".

### CORRECTION 3 — «Speech/STT REAL, 5 providers» is a static count; the live config exposes 3.
`RECON_DOSSIER.md:~231` lists «Deepgram, Groq, OpenAI, AssemblyAI, Gemini». The running server
reports `configuredProviderIds: ["groq_whisper","openai_transcribe","google_speech"]` with
`fallbackProviderIds: ["groq_whisper","openai_transcribe"]`. Both statements can be true (code paths
vs configured providers) but they are not interchangeable, and only the live one describes what a
dentist gets today. The capability verdict does not change: it is real and it is the differentiator.

### CORRECTION 4 — `RECON_DOSSIER.md:105-112` is STALE on `AppRouter.tsx`. It has been fixed and deleted.
This one is worth reading carefully, because **I almost inherited it and published a false undercount.**

`RECON_DOSSIER.md:105-110` states that `apps/web/src/AppRouter.tsx` (359 lines) is dead code carrying
five views `App.tsx` never renders — `InventoryView` (1366), `PayrollView` (867), `LeadsKanbanView`
(996), `OmnichannelInboxView` (1306), `ScannerView` (154). My first instinct was to record that as
4689 lines of transitive orphans my one-hop grep had missed. **I checked instead, and none of it is
true any more:**
```
GONE            apps/web/src/AppRouter.tsx
EXISTS    1525  apps/web/src/components/InventoryView.tsx
EXISTS     346  apps/web/src/ScannerView.tsx
EXISTS    1131  apps/web/src/components/leads/LeadsKanbanView.tsx
GONE            apps/web/src/PayrollView.tsx
GONE            apps/web/src/components/OmnichannelInboxView.tsx
```
`AppRouter.tsx` has been **deleted**, and the three real views are now lazily imported and rendered
from `App.tsx`: declarations at `App.tsx:408,409,410`, rendered at `App.tsx:4809` (`<InventoryView …/>`),
`:4817` (`<ScannerView />`), `:4825` (`<LeadsKanbanView />`). The fix documents itself at
`App.tsx:399-407`: «Склад, журнал стерилизации и воронка обращений: три готовых раздела, которые до
этой правки нельзя было открыть ничем … AppRouter.tsx удалён вместе с двумя лежавшими в нём пустышками
(зарплаты и омниканальный инбокс — их адреса на сервере отвечают 404)». The two deleted files were the
empty ones. The line counts in the dossier are also stale (1366 → 1525, 996 → 1131, 154 → 346).

**Consequences:**
- My PART B census does **not** undercount via `AppRouter.tsx`, because that parent no longer exists.
  The "14 components / 10188 lines" figure stands as measured.
- Capability **#14 «Материалы» is fully ALREADY HAVE**, screen included — `InventoryView` (1525 lines)
  is mounted at `App.tsx:4809`. No TAKE needed. Same for sterilization and the leads funnel.
- The method limit is still real in principle: a one-hop import grep cannot see an orphan whose parent
  is itself dead. Recommendation 10's guard should therefore be a reachability walk from `main.tsx`,
  not a grep — that is the general fix, and it is what would have caught `AppRouter.tsx` years earlier.
- **`RECON_DOSSIER.md:105-112` should be updated or dated.** It is being read as current by agents
  (I read it as current) and it describes a tree that no longer exists.
