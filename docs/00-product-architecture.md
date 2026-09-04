# 🏛️ DENTE Dental CRM — Product Architecture

> **Ключевые ссылки навигации:**<br/>
> 🗺️ **Главный Индекс Документации:** **[.agents/INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)**<br/>
> 🏗️ **Архитектура Системы:** **[.agents/ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** | **[docs/ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/docs/ARCHITECTURE.md)**<br/>
> 📚 **База Знаний и Документация:** **[docs/README.md](file:///C:/Clinic_MVP/dental-crm/docs/README.md)**<br/>
> 🗄️ **Реестр Базы Данных:** **[.agents/DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)**<br/>
> ⚠️ **Высшая Конституция (THE HAMMER):** **[.agents/THE_HAMMER_MASTER_PROMPT.md](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)**

---

## Competitive Parity & Audit Suite

For full feature parity maps, 63-feature competitor matrix (IDENT, DentalPRO, iStom), PostgreSQL schemas, API route registries, and implementation options, see:
- 🗺️ **[OUR_CRM_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/OUR_CRM_MAP.md)**
- 📋 **[FEATURES_REGISTRY.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)**
- 🗄️ **[DATABASE_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/DATABASE_DEEP_MAP.md)**
- 🔌 **[API_ROUTES_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md)**
- 🖥️ **[FRONTEND_COMPONENTS_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md)**
- 🧮 **[ALGORITHMS_AND_SHARED_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ALGORITHMS_AND_SHARED_DEEP_MAP.md)**
- 🧪 **[SCRIPTS_AND_CLI_DEEP_MAP.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md)**
- 📐 **[BACKLOG.md](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/BACKLOG.md)**

---

## Decision

Build DENTE as a web-first dental CRM/MIS with a single backend API and a PWA client first.

Do not start from native Android/desktop. Native shells come after the web app is useful:
- desktop: Tauri wrapper around the same web client;
- Android/iOS: Capacitor wrapper around the same PWA;
- Telegram bot: integration client, not the system core.

Telegram integration rule:
- DENTE supports `@dentecrm_bot` as a shared safe-notification bot and later clinic-owned bots on the same backend model;
- Telegram may link patients/staff, confirm appointments, request callbacks, keep safe next-action inline keyboards after appointment callbacks, create deduplicated administrator tasks for document/form requests, create doctor post-visit instruction tasks from care-topic buttons, and notify document readiness;
- Telegram must not carry diagnoses, imaging files, medical-record copies, tax PDFs, treatment plans, or arbitrary clinical advice by default;
- bot tokens are server-only env/encrypted tenant secrets and are never returned to the browser.

PWA rule:
- cache only application shell/static assets;
- do not cache `/api/*` medical responses in the service worker;
- local offline queues are temporary continuity tools until encrypted storage, conflict resolution UI, auth, and deployment-grade backups exist.

## Production Technology Stack

Active Production Stack (React 19, Node Fastify, PostgreSQL 18.4, WebWorker 3D MPR):
- **Web App:** React 19 (`@dental/web`, React 19.2+) + Vite 6 + TypeScript 5.8+ + Tailwind CSS v4 + Vanilla Design Tokens (`var(--paper)`, `var(--paper-strong)`, `var(--ink)`).
- **Backend API:** Fastify v5 (`@dental/api`, Fastify 5.3+) + TypeScript 5.8+ + Node.js 22+.
- **Database Engine:** Native PostgreSQL 18.4 on `127.0.0.1:5432` (Data directory `.data/pg18`, pool via `pg.Pool`). Multi-tenant Row-Level Security (RLS) with `withTenantCtx` AsyncLocalStorage. PGlite is NOT installed.
- **ORM & Migrations:** Drizzle ORM (v0.45+) with 20 modular domain schemas under `apps/api/src/db/schema/` and backward-compatible proxy `apps/api/src/db/schema.ts`.
- **3D CBCT & DICOM MPR Hub:** Off-thread WebWorker (`apps/web/src/mprWorker.ts`, `mprMath.ts`) with zero-copy `Transferable ArrayBuffer` (`Float32Array`) slice generation, Cornerstone3D (`@cornerstonejs/core` v5.1+), and WebGL 2.0 / Canvas 2D multi-planar rendering.
- **3-Tier Treatment Planning:** Multi-tier parallel clinical plans (`packages/shared/src/treatment-plans/treatmentPlanEngine.ts`) with Economy, Optimum (Recommended), and Premium/VIP tiers, 3 clinical stages, strict penny-exact kopeck balancing, installments, and mobile Segmented Control (`[ Эконом | ★ Оптимум | Премиум ]`).
- **Clinical & Legal Documents:** Template-driven HTML -> Headless Chromium/Edge PDF export with deterministic SHA-256 integrity signatures and Mandate 8e draft watermarks.
- **Real-Time Layer:** WebSocket Broker (`apps/api/src/services/websocketBroker.ts`) with typed clinical events, queue updates, and softphone signaling.

Rejected for initial build:
- Pure local desktop app: bad for phones, backups, remote access, and SaaS migration.
- Telegram bot as core: useful for reminders and voice capture, not safe as medical source of truth.
- SQLite as production database: acceptable for quick experiments, wrong for multi-user clinic/SaaS.
- Separate native apps first: duplicates product logic before the workflow is proven.
- Full microservices first: too much operational overhead for one cabinet.

## Competitor Notes

### 32top

Observed from official site and screenshots:
- sells a dental MIS/CRM from roughly 3500-3700 RUB/month;
- claims free integration and EGISZ transfer up to 100 protocols;
- focuses on schedule, patient accounting, protocol templates, analytics, auto mailings, online booking, cash register.
- source: https://mis.32top.ru/

Weakness to attack:
- likely module-heavy, sales-led implementation;
- physician speed and document automation can be better;
- migration and AI dictation can become the differentiator.

### IDENT

Observed from official page metadata:
- dental MIS;
- claims 4000+ clinics in Russia/CIS;
- has EGISZ, online booking, analytics, schedule, cash register, documents.
- source: https://ident24.ru/

Weakness to attack:
- broad incumbent product usually means heavier UX;
- small one-chair clinic can be served with faster onboarding and fewer screens.

### DentalTap

Observed from official metadata:
- cloud dental software;
- patient management, treatment workflows, billing/payment, documentation, treatment diary, insurance, inventory;
- calendar, graphical dental chart, reports, analytics, patient portal, online booking, mobile app, AI positioning.
- source: https://dentaltap.com/ru/

Weakness to attack:
- not Russian-law-first;
- EGISZ/tax documents/Russian clinic paperwork are not the default advantage.

### Cliniccards / Western Cloud Products

Observed positioning:
- cloud CRM/practice management;
- scheduling, billing, imaging, patient communication, analytics.
- sources: https://cliniccards.com/ru/, https://www.dentrix.com/, https://carestack.com/, https://www.curvedental.com/feature-overview, https://www.opendental.com/site/features.html

Weakness to attack:
- Russian legal workflow, tax certificate generation, and EGISZ bridge matter locally.

## Scale-Agnostic Spectrum & Target Clinic Personas (Primary Focus on Solo Doctor & Small Clinic)

> 🎯 **СТРАТЕГИЧЕСКИЙ ПРИОРИТЕТ №1 И ГЛАВНЫЙ АКЦЕНТ ПРОДУКТА: СОЛО-ВРАЧ И НЕБОЛЬШАЯ КЛИНИКА (1–3 КРЕСЛА). ДО БОЛЬШИХ СЕТЕВЫХ КЛИНИК НАМ ЕЩЁ РАСТИ И РАСТИ!**
> 
> Наш главный, первичный и самый массовый пользователь прямо сейчас — это **соло-врач на аренде кресла / в собственном небольшом кабинете (ИП, самозанятый)** и **небольшая частная стоматологическая клиника на 1–3 установки** без раздутого штата и сложной иерархии.
> До масштаба гигантских федеральных сетей на 10+ филиалов нам ещё расти и расти. Поэтому:
> 1. **Любая фича, любой экран, форма и сценарий обязаны в ПЕРВУЮ очередь быть кристально удобными, быстрыми и понятными соло-врачу и маленькой клинике.** Если соло-врачу неудобно, если ему нужно сделать больше 1–2 кликов, если система требует от него несуществующего ассистента, кладовщика, начмеда или ИНН физлица — это БРАК.
> 2. **Энтерпрайз-модули (крупные сети, филиалы, сложные комиссии, ЕГИСЗ, МДЛП) закладываются архитектурно по закону отсутствия тупиков (Zero Dead-Ends), но НИКОГДА не навязываются, не маячат перед глазами и не замедляют работу соло-врача.** В интерфейсе не должно быть сетевого шума, корпоративных селекторов и лишних вкладок.
> 3. **Врач на аренде должен чувствовать абсолютный комфорт:** всё под рукой, 0 бюрократии, мгновенный приём, 1-клик касса 54-ФЗ, 1-клик списание анестетиков, чистая печать 043/у и договоров.

### 1. Solo Rental Doctor / Частный кабинет (1–2 кресла, ИП, самозанятый на аренде) — ГЛАВНЫЙ ФОКУС №1
- **Профиль:** Врач работает один или с приходящим ассистентом. Совмещает роли директора, регистратора, лечащего врача, кассира и медсестры.
- **Главная ценность:** Скорость, нулевая бюрократия, отсутствие навязанных ролей.
- **Инварианты работы:**
  * Запись создается за 5 секунд (пациент + время), выбор ассистента СТРОГО необязателен.
  * Полная автономия кассы 54-ФЗ и документов: врач пробивает чек и печатает бланки договоров со строками `_____` без 403 Forbidden.
  * Списание расходников пакетом нормы в 1 клик («Стандартная анестезия», «Пломбирование») без складских комиссий и накладных.
  * Интерфейс отключает избыточный сетевой шум (виджеты колл-центров, выбор филиалов, тяжелые аудиты).

### 2. Standard Private Dental Clinic (3–5 кресел) — ВТОРОЙ КЛЮЧЕВОЙ СЕГМЕНТ
- **Профиль:** Классическая клиника. Главврач, 1–2 администратора, 4–8 врачей-стоматологов, старшая медсестра, визиограф/ОПТГ.
- **Главная ценность:** Четкая передача пациента между регистратурой и кабинетом, надежный финансовый и санитарный учет.
- **Инварианты работы:**
  * Зоны внимания: звонки АТС только на стойке администратора, стерильный экран врача (VisitView) не отвлекается звонками.
  * Свобода скидок врача и 100% гарантийных переделок без блокировки приёма.
  * Семейный кошелек и сплит-платежи в кассе 54-ФЗ (нал + карта + аванс) без копеечных ошибок.
  * Журналы стерилизации СанПиН 3.3686-21 и автоклавирование в 1 клик.

### 3. Large Dental Center / Enterprise Network (10+ кресел, филиальная сеть) — СТРАТЕГИЧЕСКИЙ РЕЗЕРВ («НА ВЫРОСТ», ДО БОЛЬШИХ СЕТЕЙ НАМ ЕЩЁ РАСТИ)
- **Профиль:** Масштабная сеть. Филиалы, единый колл-центр, собственная ЗТЛ, 3D КЛКТ, аптечный склад FEFO / МДЛП («Честный Знак»), ЕГИСЗ (РЭМД), корпоративный аудит начмеда (CMO), маркетинг и сквозная аналитика.
- **Главная ценность:** Надежная филиальная изоляция, прозрачная зарплата врачей (Т-51 Net Revenue), регуляторный комплаенс.
- **Инварианты работы:**
  * Изоляция филиалов на уровне базы данных PostgreSQL (RLS / tenant & branch context).
  * RBAC: гранулярные права доступа; аудит начмеда работает в фоновом аналитическом режиме и никогда не блокирует врача у кресла.
  * Поддержка номенклатуры 804н, тегов маркировки 1214/1212 в 54-ФЗ и выгрузка РЭМД.

### 4. Закон отсутствия тупиков (Zero Dead-Ends Law)
- Система НИКОГДА не блокирует клинический процесс тупиковыми ошибками («Невозможно выбить чек: у пациента нет ИНН», «Невозможно сохранить визит: склад не оприходован»).
- Мягкая деградация: отсутствие enterprise-модулей компенсируется надежными клиническими дефолтами (норма в 1 клик, мягкий овердрафт склада с предупреждением вместо ошибки).
- Плавный рост клиники без миграций и потери данных.

---

## MVP Scope

MVP must support all workflow tiers from one small rental chair to multi-chair clinics:

1. Patients
- patient profile;
- contacts;
- patient insight summary: clinical flags, administrative flags, missing documents, open communication tasks, recall date, balance, and next best action;
- consent flags;
- document history;
- medical history notes;
- attachments.

2. Electronic medical record
- visits;
- complaints, anamnesis, objective status, diagnosis, treatment plan;
- tooth chart baseline;
- treatment protocols from templates;
- specialty focus filtered by active doctor, chair, appointment reason, and current selection, with full specialty templates for exams, therapy, orthopedics, surgery, implantology, orthodontics, periodontology, hygiene, pediatric dentistry, and radiology available on demand;
- quick dictation phrases for repetitive clinical note fragments;
- local per-visit autosave for transcript, selected specialty, and editable EMR fields;
- pending server-save queue for reviewed visit notes when the API is unavailable;
- server revision and client mutation receipt for accepted visit notes, so retries do not create duplicate audit/mutation noise and future conflict UI has a factual base;
- shared deterministic server/client rule-parser fallback when model/API/network is unavailable, with specialty profiles for exams, therapy, orthopedics, surgery, implantology, orthodontics, periodontology, hygiene/prevention, pediatric dentistry, and radiology;
- editable reviewed dictation/AI draft acceptance into the active visit before final signing;
- clinical rule evaluations for required bundles, limited services, warnings, and follow-up obligations;
- immutable audit trail after signing/closing.

3. Schedule
- day/week calendar;
- doctors/assistants/chairs;
- appointment status;
- calculated load by doctor, assistant, and chair;
- role-aware recommended actions for the current shift;
- appointment readiness score with doctor/admin/assistant owner and compact prep checks;
- schedule suggestions for attention-needed visits, assistant assignment gaps, schedule buffers, and overloaded resources;
- gap/buffer suggestions compare appointments only inside the same clinic-local calendar date, so a new day never creates a fake overnight window or buffer warning;
- visit close checklist with score, warning items, owner role, and target section for EMR, documents, imaging, payment, AI draft review, and post-visit communication;
- role queues for doctor, administrator, assistant, and manager;
- warnings for unsigned visits, images needing review, tax-document drafts, missing patients, and mode/role readiness gaps;
- quick patient creation from appointment;
- SMS/Telegram/WhatsApp reminder hooks later.

3a. Communications
- confirmation tasks for planned appointments;
- payment reminders tied to open balances and documents;
- post-visit instructions tied to visits and assistants;
- recall tasks for follow-up visits;
- completion requires a narrow outcome (`no answer`, `callback`, `reschedule`, `promised payment`, or `document pickup`) so staff cannot close communication tasks as generic done;
- reusable channel templates for phone, SMS, WhatsApp, Telegram, email, and in-person instructions;
- communication events for audit and handoff between administrator, assistant, doctor, and manager.

4. Payments and documents
- service catalog;
- treatment plan line items linked to patient, visit, service, tooth, doctor, and chair;
- 3-tier parallel clinical plans: Economy (базовый), Optimum (рекомендованный баланс цена/качество/долговечность), Premium / VIP (максимальная эстетика и расширенная гарантия) с гарантией целочисленных расчетов в копейках без ошибок округления;
- 3 клинических этапа лечения (1. Неотложная помощь и терапевтическая санация -> 2. Хирургия и имплантация -> 3. Ортопедия и эстетическая реабилитация);
- мобильная эргономика через нативный Segmented Control `[ Эконом | ★ Оптимум | Премиум ]`, исключающий 2500px скролл-туннели (Мандат THE HAMMER §VI.3);
- калькулятор рассрочки на 3, 6, 12, 24 месяца с точным ежемесячным взносом;
- разделение стоимости на работу врача и материалы клиники (`splitLaborAndMaterials`);
- scenario phases with amount, time window, focus, clinical pros, tradeoffs, and warnings;
- service price list analysis for copied tables/OCR/photo text, including materials, brands, crown/restoration types, units, confidence, and review warnings before catalog mapping;
- invoice/payment records;
- payment capture from the working UI;
- billing summary: planned amount, paid amount, due amount, discount, tax-deduction eligible amount, unpaid documents;
- contract for paid medical services;
- act of completed works;
- tax deduction certificate package, including KND 1151156 support;
- print/PDF/export.

5. Migration
- CSV/XLSX import wizard;
- smart mixed parser for old MIS exports, OCR text, RVG/DICOM folder manifests, `.ima` exports, TRG/Ceph rows, and noisy copy-paste;
- document/table ingestion hub for PDF, DOCX, XLSX, PPTX, CSV, TXT, HTML, RTF, JSON, XML, OpenDocument, and image placeholders before routing into patient, imaging, price-list, or smart preview;
- migration preset catalog for 32top, IDENT, Cliniccards, Open Dental, spreadsheets, OCR paper archives, imaging folders, PACS/DICOMweb, and accounting/tax exports;
- patient dedupe by phone/name/birthdate;
- imaging import for RVG/periapical, bitewing, OPG, TRG/ceph, CBCT/DICOM, PACS/DICOMweb, and watched folders;
- read-only server-side watched-folder scan that turns files into preview rows before any database write;
- read-only DICOM header scan for local folders and regular ZIP archives, extracting Study/Series/SOP UID, modality, descriptions, instance number, date, and patient name before any pixel loading;
- DICOM series preview for Study/Series UID grouping, folder fallback grouping, ZIP archive entry expansion, modality detection, file-count warnings, MPR readiness, and recommended viewer routing before any pixel storage;
- DICOMweb connector check, GPU-aware workstation readiness, render-cache plan, viewer launch manifest, pixel-free tool-state bundle, one-shot workbench manifest, and redacted server-saved workbench bundle recovery for QIDO/WADO/OHIF/Cornerstone/external-viewer handoff; CRM stores metadata, notes, warnings, state, launch/cache intent, and markup recovery while dedicated viewers own diagnostic pixel rendering;
- DICOM folder workup combines read-only header scanning, series grouping, workstation/GPU readiness, and render-cache planning into one Settings action for CBCT folders, so admins can decide MPR/downsample/external/metadata paths without exposing this complexity to the doctor;
- local CT/DICOM folder discovery scans configured roots and common user folders with bounded metadata checks, scores likely patient export folders, and feeds the existing folder workup instead of forcing admins to hunt paths manually;
- local imaging organizer scans the same roots for CT/DICOM plus dental 3D model formats (`.stl`, `.obj`, `.ply`, `.glb`, `.gltf`, `.3mf`), classifies model roles such as upper/lower arches, bite, crown, bridge, implant/surgical guide, aligner, and scan body, then groups metadata-only case candidates without storing raw pixels or meshes;
- server-restored CT/MPR workbench bundles can be reconnected to a current workstation folder through the same folder discovery/workup pipeline, preserving recovery while keeping local file paths out of server state;
- local workstation bridge preflight for optional CBCT/DICOM worker and OHIF viewer runs through `/api/system/local-bridges/readiness`; it probes only configured localhost/private LAN health URLs by default and returns readiness/warnings without clinical pixel transfer;
- local bridge use-plans run through `/api/system/local-bridges/use-plans`, converting bridge readiness into safe current paths for CBCT/MPR and imaging import: local worker, external viewer, metadata preview, or manual review;
- dedicated Imaging page for patient image review, with the Shift screen reduced to counts and a fast entry point instead of a heavy viewer;
- lightweight 2D viewer controls for rotate, flip, invert, brightness, contrast, zoom, and reset in the Imaging page;
- CBCT/CT 3D MPR client-side engine: выделенный фоновый WebWorker (`apps/web/src/mprWorker.ts`, `mprMath.ts`) с zero-copy передачей `Float32Array` буферов в главный поток, 3-плоскостная ортогональная MPR (Axial, Coronal, Sagittal), косые срезы (Oblique), криволинейная панорамная реконструкция зубной дуги (Catmull-Rom центростремительный сплайн) и поперечные кросс-секции зубов, пресеты окон Хаунсфилда (HU: кость D1–D4, мягкие ткани, эмаль, синус, нерв), измерительные калибры, интеграция Cornerstone3D (`@cornerstonejs/core`) и WebGL, без фризов пользовательского интерфейса.
- read-only price-list analyzer that turns old clinic price sheets and price-list photos into reviewed service catalog candidates before any database write;
- import preview before commit;
- source-system mapping presets later.

6. AI assistant
- voice note -> transcription -> draft visit note;
- speech providers are configured as a server-key-only catalog: browser speech for zero-load helper, Groq/OpenAI/Deepgram/AssemblyAI/Cloudflare for wired cloud STT evaluation, Azure/Google/Hugging Face for admin/provider-choice research, native mobile speech for later app shells, and Whisper.cpp/Vosk for local offline bridge;
- local speech bridge readiness is checked separately from cloud provider health, so Whisper.cpp/Vosk can accelerate one clinic PC without leaking keys to the browser or blocking typed dictation when the bridge is absent;
- speech use-plans explicitly choose local STT bridge, server STT, or browser/typed deterministic fallback based on current readiness, while keeping the doctor-facing Visit screen a single non-blocking workflow;
- voice recording should be chunked and locally queued in IndexedDB before upload, with raw transcript and polished draft stored separately;
- doctor-facing visit safety should be visible as a compact strip: local autosave, server draft sync, browser/device readiness, queued STT audio, and recovery state, while provider and storage diagnostics stay in Settings;
- `/api/speech/*` is the only allowed server speech gateway; clients never call STT vendors directly or store vendor keys;
- speech polish is layered: deterministic dental cleanup is always available, optional OpenAI-compatible neural polish is server-only and accepted only after anti-hallucination guards;
- price-list/photo OCR classification is layered the same way: deterministic taxonomy first, optional Groq JSON extraction second, schema validation always;
- photo/X-ray/image attachment -> AI summary as draft only;
- paper journal OCR -> patient/import draft with confidence and warnings;
- recognition jobs keep source, target, confidence, result text, warnings, and next step for audit/review;
- template completion from dictation;
- never silently writes final medical diagnosis without doctor confirmation.

7. Admin
- users and roles;
- clinic details;
- clinic mode: solo doctor, one-chair office, small clinic, network clinic;
- workspace profiles for personal doctor, one-chair, small clinic, branch, and network usage;
- role access policies for owner, doctor, administrator, assistant, and manager, including first screen, readable sections, writable sections, restricted sections, approval points, and audit event keys;
- staff specialties and chair/room inventory;
- explicit specialty selection when creating doctors and assistants;
- service catalog;
- Settings -> Прайс for bulk price/material mapping; this stays admin-only and does not pollute the doctor visit UI with unrelated specialties;
- protocol templates;
- clinical rule studio for required service bundles, important warnings, owner roles, severity, and patient-facing explanations;
- specialty protocol templates for therapist, orthopedist, surgeon, orthodontist, periodontist, hygienist, pediatric dentist, implantologist, radiologist, and universal visits;
- document templates;
- backup/export.

## Legal and Compliance Baseline

Russian dental CRM handles medical personal data. Architecture must assume:
- 152-FZ personal data obligations;
- health data as sensitive personal data;
- 323-FZ medical secrecy;
- paid medical service contract requirements;
- security measures for personal data information systems;
- data localization in Russia for Russian clinics;
- EGISZ integration must be isolated behind an adapter because rules and endpoints change.

AI rule:
- AI output is draft/supporting material.
- If software starts making independent diagnostic or treatment decisions, medical-device regulation risk rises sharply.
- Keep AI as physician assistant until legal review says otherwise.

## Product Positioning & Target Clinic Spectrum

Attack line:
For a one-chair dental office / rental doctor: "Start today in 1 minute, documents do not hurt, doctor dictates instead of typing, 1-click 54-FZ cashier, zero bureaucracy, grow seamlessly to multi-chair clinic".

Not enough:
- just another calendar;
- generic CRM;
- Telegram bot with a database;
- pretty UI without document/legal workflow.

### Strategic Focus #1: Solo Doctor & Small Clinic (1–3 Chairs)
> ⚠️ **Core Priority: The solo practitioner on chair rental (ИП / самозанятый) and the compact private clinic (1–3 chairs) are our primary, day-to-day focus. To large enterprise networks we have a long way to grow.**
> Every screen, shortcut, and default value is optimized for zero-friction solo operation first:
> 1. Fast appointment creation without requiring an assistant (patient + time in 5 seconds).
> 2. Cashier 54-FZ without demanding physical person INN (strictly required only for legal entities/sole proprietors).
> 3. Printing blank contracts with `_______` lines before patient arrives without 403 Forbidden.
> 4. 1-click clinical package write-offs (anesthesia, composite) without requiring a 3-person warehouse commission.
> 5. Zero Dead-Ends Law: The software never traps the user or blocks treatment/checkout due to missing secondary back-office data.

### Clinic Scale Spectrum (Zero Dead-Ends Architecture)
1. **Category A: Solo Doctor / Rental Chair (1–2 chairs, ИП, самозанятый) — Core Priority #1:**
   Combines doctor, receptionist, cashier, and nurse. Needs 0-click 54-FZ cashier, instant Form 043/u print, 1-click normal presets, zero corporate noise.
2. **Category B: Standard Private Clinic (3–5 chairs) — Key Mid-Market:**
   Clear separation between receptionist (billing, queue, calls) and doctor (sterile clinical zone, treatment plan, 043/u). Family wallets, SanPiN sterilization logs.
3. **Category C: Enterprise Network (10+ chairs, multi-branch) — Strategic Future Runway:**
   Tenant/branch isolation, background CMO audit without doctor blocking, MDLP Honest Sign, EGISZ REMD. Architecture accommodates growth without database migrations or retraining.

## Data Model Skeleton

Core tables:
- organizations;
- clinics;
- users;
- roles;
- staff_members;
- chairs;
- clinic_settings;
- integration_presets;
- patients;
- patient_insights or computed patient_context view;
- patient_contacts;
- patient_consents;
- appointments;
- visits;
- visit_notes;
- diagnoses;
- tooth_chart_entries;
- service_catalog_items;
- treatment_items;
- invoices;
- payments;
- document_templates;
- generated_documents;
- attachments;
- protocol_templates;
- import_batches;
- import_rows;
- audit_events;
- ai_jobs;
- ai_drafts.

Multi-tenancy:
- every business row has organization_id;
- tenant access enforced in API;
- future row-level security can be added in PostgreSQL.

Prototype persistence rule:
- seed data is allowed only for bootstrapping and demos;
- mutable patients, staff, chairs, documents, payments, communication tasks/events, imaging studies, imports, AI jobs, clinical rules, clinic profile, and audit events must survive API restart during MVP testing;
- the current file-backed state is a prototype bridge, not the production source of truth;
- current prototype writes a SHA-256 checksum and rotates local JSON backups before overwrite;
- Settings -> Audit exposes save timestamp, checksum presence, backup count, latest backup timestamp, backup readability/checksum verification, and emergency JSON export;
- `/api/system/persistence/verify` and `/api/system/persistence/export` are owner/admin continuity tools for MVP testing only; they are not a substitute for authenticated tenant backups or a restore workflow;
- `/api/health` is a public liveness endpoint only and must not expose persistence, backup, state-file, checksum, or local path metadata; Settings/Audit reads those details through the guarded persistence verify route;
- access secrets are domain-scoped even in the prototype: `DENTE_CLINICAL_ADMIN_SECRET` is the only fallback for clinical patients, documents, imaging, speech, imports, and emergency state export; `DENTE_SCHEDULE_ADMIN_SECRET` unlocks appointment mutations; `DENTE_SETTINGS_ADMIN_SECRET` unlocks settings routes; `DENTE_TELEGRAM_ADMIN_SECRET` unlocks Telegram control-plane routes. A deployment may set the same value deliberately, but the API must not silently promote a Telegram/settings/schedule secret into another domain;
- the web app mirrors this boundary with separate in-memory sessions and password-input drafts for clinical, schedule, settings, and Telegram secrets. A successful clinical/global unlock can seed all four domains for a one-secret deployment; fixed Schedule, Settings, and Telegram panels pass their target access domain explicitly, update only that domain, clear only the relevant draft, and do not reload or clear clinical dashboard state;
- Telegram control-plane validation keeps internal error codes for contracts but translates URL and signed-button failure details into operator-readable Russian messages before they reach the browser. Raw validation reason tokens and callback secret env names are not user-facing copy;
- Telegram outbound delivery keeps stable machine block reasons for contracts but translates transport failures into Russian operator warnings/messages before they reach the browser or audit UI. Rate-limit delay is carried as structured `retryAfterSeconds`, not as a raw warning token;
- PostgreSQL tenant storage, backups, restore, migrations, and real auth remain mandatory before clinic deployment.

## UX Rules

The first screen should be the work surface, not marketing:
- left rail: Shift, Schedule, Patients, Visit, Documents, Settings;
- Payments is a first-class working view between Documents and Settings, not a hidden admin report;
- Communications is a first-class working view because reminders, post-visit instructions, debts, and return visits are daily admin/assistant work;
- primary default: Shift dashboard with current patient, next actions, patient context, and image counts/entry point;
- dedicated Imaging section for 2D review and CBCT workbench controls;
- heavy admin tools are split into Settings tabs: Clinic, Protocols, Sources, AI, Import, Audit;
- large touch targets for phone use;
- Russian medical terms, not developer terms;
- every screen must answer: "what does the doctor do next?"

Clinic configuration rule:
- solo doctor, one-chair, small clinic, and network clinic modes are Settings-level product configuration;
- the doctor shift screen should receive the result of that configuration, not expose tenant architecture;
- dashboard API returns a shift intelligence object with mode fit, doctor/assistant/chair resource load, role queues, and schedule warnings;
- clinic mode must affect operational defaults and warnings, not only labels in Settings;
- role permissions are derived from role defaults first, then explicit overrides later;
- workspace profiles decide the first screen, visible sections, compact navigation, required capabilities, automations, and safeguards for each clinic mode;
- role access policies must separate medical signing, finance, imports, communication, and settings before full authentication is implemented;
- the shift UI may expose a role-focus switcher, but it is only a presentation filter over existing policies and queues, not a security boundary;
- chair and room data must support imaging equipment flags because RVG/OPG/CBCT workflows often depend on physical room setup.

Migration preset rule:
- every source type exposes capabilities, supported input formats, risk level, and migration notes before the user pastes data;
- presets are compact and Settings-only, with usable-now sources opened and future connectors collapsed;
- all sources still go through preview, dedupe, warnings, explicit commit, import batch metrics, and audit events;
- direct vendor/database connectors are future adapters, not shortcuts around the safety flow.

AI recognition rule:
- voice transcription, paper OCR, image summary, and document drafting are queued recognition jobs;
- every AI job returns confidence, warnings, result text, and a suggested next step;
- jobs may prefill import or visit draft text, but never sign EMR, create final diagnosis, or issue legal documents alone;
- local/free model providers can be swapped behind the job interface without changing clinical screens.

Specialty protocol rule:
- visit templates are selected by dental specialty and prefill complaint prompts, objective status, diagnosis hints, treatment plan text, required documents, imaging suggestions, and safety warnings;
- templates reduce typing and omissions, but keep final diagnosis, medical record signing, and legal documents under clinician control;
- the visit screen shows the relevant protocol choice; template library review/editing, import, and bulk mapping stay in Settings.

Patient context rule:
- patient insight is a compact computed layer, not another manual form;
- it should summarize risk, recall, documents, debt, communication, and next action without hiding the full chart;
- the card must stay readable on phone because front desk and assistants use it during calls.

Recommended action rule:
- dashboard should send a short, typed action list computed from real state, not hardcoded UI copy;
- recommended actions are presentation guidance, not permission enforcement;
- show only a few actions for the selected role so the shift surface stays usable.

Appointment readiness rule:
- schedule rows should show readiness, not force staff to open patient, documents, imaging, and payments one by one;
- readiness is computed from existing data and displayed as a score, owner role, next action, and a few compact checks;
- appointment team readiness includes the assigned assistant when the clinic is not in solo-doctor mode;
- the row must remain scannable on phone, so full checklists belong behind later drill-down, not in the default schedule.

Schedule suggestion rule:
- suggestions are a short role-aware lane above the timeline, not a second schedule;
- generate them from readiness, resource load, gaps, and warnings;
- cap visible suggestions so the timeline remains the primary object.

Visit close checklist rule:
- closing a visit is a computed typed state, not duplicated React-only logic;
- the doctor sees dictation first, quick phrase chips second, editable structured EMR draft third, then collapsed warning rows;
- admin and assistant work stays connected through owner roles and target sections instead of adding more visit-screen panels.

Clinical rule rule:
- clinical rules are data, not hardcoded UI branches;
- a rule defines trigger services, required services, required completed services, limited services, severity, owner role, doctor-facing warning, and patient-facing explanation;
- owners and lead doctors can create and disable rules from Settings without code changes;
- rule changes must create audit events because they affect medical and financial workflow;
- rule evaluation is allowed to recommend, warn, or require confirmation, but the doctor remains responsible for final diagnosis and signed EMR;
- rule results must appear where work happens: Visit for medical closure, Finance for plan variants and patient explanation, Shift as warnings.

Billing rule:
- service catalog items define category, specialty, base price, expected duration, and tax-deduction eligibility;
- treatment plan items are the clinical-financial bridge between EMR, documents, chair schedule, and payment;
- treatment plan scenarios are the patient-facing bridge between clinical necessity, budget, phased treatment, and future maintenance;
- optional strategy changes may alter presentation and phasing, but must not disable critical clinical constraints such as required imaging or infection control;
- payments are append-only operational events with method, amount, document link, visit link, timestamp, and audit trail;
- tax-deduction documents must be derived from paid/deductible services, not typed as isolated paperwork.

Communication rule:
- patient communication is structured work, not free-form notes hidden in a patient card;
- each task has patient, role owner, channel, intent, status, priority, due time, body, and optional appointment/visit/document links;
- completing a task creates a communication event and audit entry;
- message templates can prefill text, but sending final medical advice still needs clinic-controlled wording and human review.

Operator-facing API error rule:
- browser-visible API errors must keep stable machine codes in `code`/`error` fields where needed, but `message`, `warnings`, and `nextAction` must be clinic-readable;
- raw env keys, header names, URL parser text, fetch/AbortError text, spawn exception text, browser headless labels, and internal validation reason tokens belong in server logs/tests/docs, not operator copy;
- global API validation fallback must never return zod `issues`, schema paths, DTO field names, or parser tokens; route-owned validation copy is preferred, and the global fallback is the last safety boundary for missed direct parses;
- the API server module exposes an app factory for runtime smokes and integration tests; the HTTP listener and Telegram due worker start only through the entry point path;
- persistence/readiness reports must translate missing, unreadable, and checksum-failed state files into operator actions; JSON parser text and bounded diagnostic codes are not browser-visible warning copy;
- Settings/Audit can say "server settings", "local module", "browser for document printing", or "tax-office code"; it must not train clinic staff to memorize deployment variable names.

For older doctors:
- no hidden critical actions;
- predictable forms;
- keyboard and mouse friendly;
- big print/export buttons;
- voice dictation visible in visit note editor.

## First Development Milestones

Milestone 1:
- monorepo scaffold;
- web shell;
- API health endpoint;
- database schema draft;
- Docker Compose with Postgres;
- initial patient/appointment/visit CRUD.

Milestone 2:
- EMR visit editor;
- service catalog;
- document template rendering;
- contract and act PDFs.

Milestone 3:
- tax deduction certificate workflow;
- import wizard;
- audit log;
- role permissions.

Milestone 4:
- voice transcription job interface;
- AI draft note review flow;
- Telegram reminder bridge.

Milestone 5:
- deployment hardening;
- backups;
- legal template review;
- EGISZ adapter design.
