# 🛣️ Fastify API Routes Catalog & Highway Architecture — DENTE Dental CRM

> ⚠️ **ВЫСШАЯ КОНСТИТУЦИЯ (THE SUPREME LAW):** [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и [`.agents/AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md).
>
> 🎯 **СТРАТЕГИЧЕСКИЙ ПРИОРИТЕТ №1 И ГЛАВНЫЙ АКЦЕНТ СИСТЕМЫ:**
> **Соло-врач (1–2 кресла, субаренда, ИП/самозанятый) и небольшая клиника (1–3 кресла)**.
> До сетевых холдингов нам ещё расти и расти! Маршруты API обеспечивают полную автономность врача: 1-клик сохранение без обязательного ассистента, мягкий овердрафт склада без блокировок, чеки 54-ФЗ без ИНН с физлиц.
>
> 🛑 **ЗАКОН ОТСУТСТВИЯ ТУПИКОВ (ZERO DEAD-ENDS — МАНДАТ 8n):**
> Маршруты спроектированы так, чтобы никогда не возвращать блокирующие 400/403 ошибки на легитимные врачебные и кассовые действия при отсутствии второстепенных реквизитов.

Этот документ представляет собой исчерпывающий архитектурный реестр всех HTTP и WebSocket маршрутов сервера Fastify (`apps/api/src/server.ts`), входящих параметров, Zod-валидации, ролевого доступа (RBAC) и связанных таблиц PostgreSQL Drizzle ORM.

> **Статус аудита:** Актуализирован на 2026-09-04 по исходному коду `apps/api/src/routes/` и `apps/api/src/server.ts`.  
> **Всего зарегистрированных маршрутов:** 771 эндпоинтов в 14 функциональных доменах.  
> **Закон об отсутствии моков:** Все маршруты подключены к реальным обработчикам и таблицам базы данных.

---

## 🧭 Навигация по архитектуре проекта

* 📋 **[Главная конституция и правила](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Свод законов разработки, запрет моков, правило 8b.
* 🗺️ **[Индекс документации](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Центральная карта документации кодовой базы.
* 📚 **[Портал документации docs/](file:///C:/Clinic_MVP/dental-crm/docs/README.md)** — Центральный шлюз документации и спецификаций проекта.
* 🏗️ **[Архитектура системы](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Fastify, React 19, WebSocket Broker, сессия и proxy.
* 🗄️ **[База данных и схема Drizzle](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — PostgreSQL 18.4, 203 таблицы, RLS политики, миграции.
* 💳 **[Биллинг и финансы](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — 54-ФЗ, эквайринг, семейный баланс, идемпотентность.
* ⚕️ **[Клинические правила](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Клинический движок, МКБ-10, формуляры, правила приёма.
* 📞 **[Телефония и портал](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — АТС webhooks, софтфон, OTP авторизация пациента.
* 📄 **[Жизненный цикл документов](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — Headless PDF, 043/у, ИДС, справки НДФЛ, УКЭП.
* 💬 **[Мессенджеры и боты](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** — WhatsApp WABA, Telegram Bot, VK API, MAX.

---

## 🌟 Фокусный аудит свежих и критических роутов (The Hammer Deep Audit)

### 1. Склад материалов и списание карпул анестетиков (`apps/api/src/routes/warehouse/index.ts`)
В соответствии с Конституцией (**Раздел VII, п. 4**) и требованиями СанПиН 3.3686-21:
* `POST /api/warehouse/:organizationId/quick-carpule-disposal` — **1-клик списание пустых карпул медсестрой единолично** без созыва комиссии из 3 человек. Генерирует официальный акт утилизации медотходов класса Б (`АКТ-КП-ГГГГММДД-XXX`), обновляет остаток в `inventoryItems` и регистрирует транзакцию в `inventoryTransactions`.
* `POST /api/warehouse/:organizationId/soft-overdraft-deduct` — **Мягкий овердрафт склада**. При задержке оприходования накладной поставщика склад фиксирует отрицательный остаток партии, выдаёт мягкое предупреждение, но **НЕ блокирует проведение операции и спасение зуба врачом** (200 OK).

### 2. Стерилизация, журналы ПСО и автоклавы (`apps/api/src/routes/sterilization.ts`)
* `POST /api/sterilization/pso/quick-norm` — Фиксация азопирамовой пробы в 1 клик (реакция отрицательная, норма).
* `POST /api/sterilization/link` — Привязка простерилизованного крафт-пакета по штрихкоду к карте визита 043/у.
* `POST /api/sterilization/daily-tests` — Ежедневные тесты автоклава (Бови-Дик, вакуум-тест, индикаторы 4-5 класса).
* `POST /api/registers/autofill-shift` — Автозаполнение санитарных журналов смены нормой СанПиН.

### 3. Касса 54-ФЗ и фискальные чеки (`apps/api/src/routes/fiscal/`, `billing.ts`)
* `POST /api/fiscal/receipts` — Фискализация чека прихода по ФФД 1.2. Поддержка комбинированной оплаты (нал + карта + аванс/бонусы) с точностью до копейки без округления. **Запрещено требовать ИНН с физлиц**.
* `POST /api/fiscal/refund` — Чек возврата прихода (полный/частичный).
* `GET /api/fiscal/queue`, `POST /api/fiscal/queue/:id/retry` — Очередь чеков при аварии кассы/ОФД и фоновый автоповтор.
* `POST /api/billing/payments` — Идемпотентная регистрация платежей (UUID ключ идемпотентности, защита от двойного списания).

### 4. Планы лечения и электронная карта (`apps/api/src/routes/clinical.ts`, `invoices.ts`)
* `POST /api/clinical/treatment-plans` & `PUT .../:id` — Управление комплексными планами лечения. Истечение 30 дней **НЕ блокирует** создание нарядов ЗТЛ, оказание услуг или оплату.
* `POST /api/invoices/generate-from-plan` — Выставление счёта по этапу плана в 1 клик.
* `GET /api/public/estimates/:token` — Публичная смета для пациента на мобильном устройстве в виде компактного Segmented Control вместо скролла на 2500px.

### 5. Быстрый визиограф и DICOMweb (`apps/api/src/routes/xray.ts`, `dicomweb.ts`)
* `POST /api/xray/upload` & `GET /api/xray/studies/:id` — Открытие снимка визиографа **< 50 мс** в полном 16-битном разрешении датчика без ожидания нейросетей.
* `POST /api/integrations/diagnocat/upload` — Запуск ИИ Diagnocat строго по отдельной кнопке врача. Запрещена перезапись зубной формулы роботом без подтверждения врача.

### 6. WebSocket Broker реального времени (`apps/api/src/routes/websocket.ts`)
* `GET /api/ws/schedule?orgId=...&patientId=...` — Полнодуплексный диспетчер живых событий:
  - `TELEPHONY_INCOMING_CALL` — входящий звонок телефонии (компактная капсула сверху).
  - `SCHEDULE_APPOINTMENT_CHANGE` — перемещение приёма в календаре.
  - `LAB_ORDER_UPDATED` — готовность ортопедической работы в ЗТЛ.

---

## 📊 Сводная таблица по доменам API

| Домен API | Кол-во маршрутов | Основные обработчики | Ключевые таблицы БД |
| :--- | :---: | :--- | :--- |
| [AI, Speech & Copilot](#ai-speech-copilot) | **45** | `ai.ts, copilot.ts, speech.ts...` | `appointments` |
| [Analytics & Reports](#analytics-reports) | **14** | `analytics.ts, dashboard.ts, reports.ts` | `users, treatmentPlans, payments` |
| [Clinical EHR & Odontogram](#clinical-ehr-odontogram) | **87** | `anesthesia.ts, clinical.ts, clinicalImplants.ts...` | `anesthesiaLogs, patients, visits` |
| [System, Settings & WebSockets](#system-settings-websockets) | **89** | `audit.ts, chat.ts, clinicWorkflows.ts...` | `auditEvents, clinicWorkflows, patients` |
| [Auth & Identity](#auth-identity) | **36** | `auth.ts, patientPortal.ts, portal.ts...` | `organizations, users, userInvitations` |
| [Billing, Cash & 54-FZ](#billing-cash-54-fz) | **80** | `billing.ts, cashbox_v2.ts, cashInstallmentsRoutes.ts...` | `fiscalReceiptQueue, cashBoxes, cashBoxShifts` |
| [Integrations & Data Sync](#integrations-data-sync) | **47** | `commerceMl.ts, export.ts, imports.ts...` | `crmLeads, migrationRuns, migrationReconciliations` |
| [Telephony & Messaging](#telephony-messaging) | **89** | `communicationReceipts.ts, communications.ts, communicationsOutbox.ts...` | `organizations, communicationEvents, patients` |
| [Patients & CRM](#patients-crm) | **55** | `crmLeakDetector.ts, leads.ts, loyalty.ts...` | `clinics, crmLeakDetectorLeads, crmLeads` |
| [Schedule & Booking](#schedule-booking) | **32** | `dayConfirmations.ts, publicAppointmentActions.ts, publicBooking.ts...` | `clinics, appointments, organizations` |
| [Dental Lab (ЗТЛ)](#dental-lab-зтл-) | **17** | `dentalLab.ts, lab.ts, labOrders.ts` | `patients, users, labOrders` |
| [Radiology & DICOM](#radiology-dicom) | **42** | `dicomweb.ts, imaging.ts, imaging_planning.ts...` | `patients, patientCtPlannings, diagnocatReports` |
| [Documents & Legal](#documents-legal) | **40** | `auditFacts.ts, create.ts, html.ts...` | `generatedDocuments, documentTemplateVariables, documentTemplateCategories` |
| [Warehouse & SanPiN](#warehouse-sanpin) | **98** | `inventory.ts, mdlp.ts, sanpin.ts...` | `inventoryItems, procedureMaterialRules, serviceCatalogItems` |

---

## 🔐 Политика доступа (RBAC) и изоляция арендаторов

Вся обработка маршрутов в DENTE построена на многоуровневой защите:
1. **Tenant Isolation (`withTenantCtx` / `AsyncLocalStorage`):** Каждый маршрут Fastify оборачивается хуком арендатора, устанавливающим в транзакции PostgreSQL параметр `app.current_tenant = organizationId`. Политики Row Level Security (RLS) на уровне СУБД физически отсекают чтение чужих записей.
2. **Заголовочная аутентификация:** Идентификация выполняется через криптографически подписанные токены:
   - `x-dente-clinic-token` — базовый токен клиники/организации.
   - `x-dente-staff-token` — токен сотрудника (врач, администратор, ассистент, управляющий).
   - `x-dente-admin-secret` — мастер-секрет для чувствительных клинических и финансовых мутаций.
3. **Защита от дискриминации врачей (Doctor Autonomy):** По Конституции (THE HAMMER Master Prompt Раздел VII), врачам **запрещено блокировать** рутинные действия. Маршруты `requireNonDoctorAccess` применяются исключительно к кассовым операциям выдачи наличных из сейфа или глобальным настройкам клиники, но никогда не блокируют проведение приёма, списание материалов или скидки врача.


---

## <a id="ai-speech-copilot"></a>📁 AI, Speech & Copilot (45 эндпоинтов)

> Голосовая диктовка врача у кресла (Yandex / Whisper STT), фильтрация галлюцинаций, клинический Copilot и протоколы приёма на естественном языке.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/ai/parse-dictation` | [ai.ts:405](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/ai.ts#L405) | Clinical Read Secret | `Inline Zod safeParse` | 400 | — |
| `POST` | `/api/ai/post-visit-personalize` | [ai.ts:368](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/ai.ts#L368) | Clinical Read Secret | `Inline Zod safeParse` | 400, 500 | — |
| `POST` | `/api/ai/predict-no-show` | [ai.ts:509](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/ai.ts#L509) | Verified Tenant Org | `predictNoShowBodySchema` | 400, 401, 404 | — |
| `GET` | `/api/ai/recognition-jobs` | [ai.ts:107](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/ai.ts#L107) | Clinical Mutation Secret | `createAiRecognitionJobSchema` | 400, 500 | — |
| `POST` | `/api/ai/recognition-jobs` | [ai.ts:140](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/ai.ts#L140) | Clinical Mutation Secret | `createAiRecognitionJobSchema` | 201, 400 | — |
| `POST` | `/api/ai/treatment-plan-personalize` | [ai.ts:299](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/ai.ts#L299) | Clinical Read Secret | `treatmentPlanPayloadSchema` | 400, 500 | — |
| `POST` | `/api/ai/treatment-plan-validate-and-comment` | [ai.ts:328](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/ai.ts#L328) | Clinical Read Secret | `treatmentPlanValidateAndCommentRequestSchema` | 400, 500 | — |
| `POST` | `/api/ai/visit-flow` | [ai.ts:263](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/ai.ts#L263) | Clinical Mutation Secret | `visitFlowRequestSchema` | 400, 500 | — |
| `POST` | `/api/ai/visit-note-draft` | [ai.ts:215](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/ai.ts#L215) | Clinical Mutation Secret | `visitNoteDraftRequestSchema` | 400, 500 | — |
| `GET` | `/api/speech/chunks` | [speech.ts:478](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speech.ts#L478) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/speech/gateway-health` | [speech.ts:475](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speech.ts#L475) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/speech/lab-session` | [speechLaboratory.ts:750](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speechLaboratory.ts#L750) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/speech/live` | [speechLive.ts:350](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speechLive.ts#L350) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/speech/polish-transcript` | [speech.ts:489](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speech.ts#L489) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/speech/providers/runtime` | [speech.ts:476](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speech.ts#L476) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/speech/recording-strategy` | [speech.ts:477](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speech.ts#L477) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/speech/recordings/:recordingId/assemble` | [speech.ts:480](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speech.ts#L480) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/speech/recordings/recovery` | [speech.ts:479](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speech.ts#L479) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/speech/status` | [speech.ts:474](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speech.ts#L474) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/speech/transcribe-chunk` | [speech.ts:484](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speech.ts#L484) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/v1/copilot/chat` | [copilot.ts:519](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L519) | Verified Tenant Org | — | 400 | — |
| `POST` | `/api/v1/copilot/daemons/emr-savior` | [copilot.ts:1771](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1771) | Verified Tenant Org | `emrSaviorBodySchema` | 400 | — |
| `POST` | `/api/v1/copilot/daemons/gap-filler` | [copilot.ts:1818](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1818) | Verified Tenant Org | `gapFillerBodySchema` | 400, 404 | — |
| `POST` | `/api/v1/copilot/daemons/retention-scan` | [copilot.ts:1795](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1795) | Verified Tenant Org | `retentionScanBodySchema` | 400, 404 | — |
| `POST` | `/api/v1/copilot/daemons/ztl-scan` | [copilot.ts:1747](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1747) | Verified Tenant Org | `ztlScanBodySchema` | 200 | — |
| `POST` | `/api/v1/copilot/dismiss-nudge` | [copilot.ts:1256](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1256) | Verified Tenant Org | — | 400 | — |
| `GET` | `/api/v1/copilot/nudges` | [copilot.ts:1165](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1165) | Verified Tenant Org | — | 200 | `appointments` |
| `GET` | `/api/v1/copilot/proactive/alerts` | [copilot.ts:1858](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1858) | Verified Tenant Org | `proactiveAlertsQuerySchema` | 200 | — |
| `POST` | `/api/v1/copilot/proactive/approve` | [copilot.ts:1559](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1559) | Verified Tenant Org | — | 400, 404 | — |
| `POST` | `/api/v1/copilot/proactive/dismiss-alert` | [copilot.ts:1667](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1667) | Verified Tenant Org | — | 400 | — |
| `GET` | `/api/v1/copilot/proactive/pending` | [copilot.ts:1536](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1536) | Verified Tenant Org | — | 400, 404 | — |
| `POST` | `/api/v1/copilot/proactive/reject` | [copilot.ts:1613](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1613) | Verified Tenant Org | — | 400, 404 | — |
| `POST` | `/api/v1/copilot/proactive/trigger-triage` | [copilot.ts:1704](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1704) | Verified Tenant Org | `ztlScanBodySchema` | 400 | — |
| `GET` | `/api/v1/copilot/sessions` | [copilot.ts:222](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L222) | Verified Tenant Org | `listSessionsQuerySchema` | 201, 400 | — |
| `POST` | `/api/v1/copilot/sessions` | [copilot.ts:250](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L250) | Verified Tenant Org | `createSessionBodySchema` | 201, 400 | — |
| `DELETE` | `/api/v1/copilot/sessions/:sessionId` | [copilot.ts:325](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L325) | Verified Tenant Org | `messageBodySchema` | 400 | — |
| `GET` | `/api/v1/copilot/sessions/:sessionId/messages` | [copilot.ts:285](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L285) | Verified Tenant Org | `getMessagesQuerySchema` | 200 | — |
| `POST` | `/api/v1/copilot/sessions/:sessionId/messages` | [copilot.ts:350](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L350) | Verified Tenant Org | `messageBodySchema` | 400 | — |
| `GET` | `/api/v1/copilot/stream` | [copilot.ts:1523](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1523) | Verified Tenant Org | — | 400 | — |
| `POST` | `/api/v1/copilot/stream` | [copilot.ts:1529](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts#L1529) | Verified Tenant Org | — | 400 | — |
| `GET` | `/api/v1/speech/lab-session` | [speechLaboratory.ts:749](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speechLaboratory.ts#L749) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/v1/speech/lab-status` | [speechLaboratory.ts:238](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speechLaboratory.ts#L238) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/v1/speech/lab-transcribe` | [speechLaboratory.ts:313](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speechLaboratory.ts#L313) | Verified Tenant Org | `transcribeRequestSchema` | 400, 403 | — |
| `GET` | `/api/v1/speech/live` | [speechLive.ts:349](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speechLive.ts#L349) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/v1/speech/live/status` | [speechLive.ts:66](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speechLive.ts#L66) | Verified Tenant Org | — | 200 | — |

---

## <a id="analytics-reports"></a>📁 Analytics & Reports (14 эндпоинтов)

> Аналитика руководителя, динамика выручки, первичка/вторичка, средний чек, загрузка врачей, конверсии и сводные дашборды.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/analytics/curators` | [analytics.ts:793](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/analytics.ts#L793) | Clinical Read Secret | — | 200 | `users, treatmentPlans, payments` |
| `GET` | `/api/analytics/dashboard` | [analytics.ts:74](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/analytics.ts#L74) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/analytics/executive` | [analytics.ts:1009](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/analytics.ts#L1009) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/dashboard` | [dashboard.ts:9](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/dashboard.ts#L9) | Verified Tenant Org | — | 401 | — |
| `GET` | `/api/reports/appointments` | [reports.ts:310](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts#L310) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/reports/chairs` | [reports.ts:295](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts#L295) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/reports/doctors` | [reports.ts:285](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts#L285) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/reports/patient-flow` | [reports.ts:334](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts#L334) | Clinical Read Secret | `periodQuerySchema` | 200 | — |
| `GET` | `/api/reports/receivables` | [reports.ts:372](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts#L372) | Clinical Read Secret | `periodQuerySchema` | 200 | — |
| `GET` | `/api/reports/reminder-effect` | [reports.ts:324](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts#L324) | Clinical Read Secret | `periodQuerySchema` | 200 | — |
| `GET` | `/api/reports/revenue` | [reports.ts:272](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts#L272) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/reports/schedule-load` | [reports.ts:357](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts#L357) | Clinical Read Secret | `periodQuerySchema` | 200 | — |
| `GET` | `/api/reports/services` | [reports.ts:344](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts#L344) | Clinical Read Secret | `periodQuerySchema` | 200 | — |
| `GET` | `/api/reports/summary` | [reports.ts:398](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts#L398) | Verified Tenant Org | — | 200 | — |

---

## <a id="clinical-ehr-odontogram"></a>📁 Clinical EHR & Odontogram (87 эндпоинтов)

> Электронная медицинская карта (043/у), дневники визитов, зубная формула (FDI), история изменений зуба, расчёт анестезии, паспорта имплантатов, протоколы лечения и МКБ-10.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/analytics/lost-patients-filters` | [clinical.ts:870](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L870) | Verified Tenant Org | — | 200, 500 | — |
| `POST` | `/api/anesthesia/calculate-safety` | [anesthesia.ts:64](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/anesthesia.ts#L64) | Verified Tenant Org | `calculateSafetyBodySchema` | 400, 403 | — |
| `DELETE` | `/api/anesthesia/logs/:logId` | [anesthesia.ts:334](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/anesthesia.ts#L334) | Verified Tenant Org | — | 403, 404 | — |
| `GET` | `/api/anesthesia/patients/:patientId/logs` | [anesthesia.ts:106](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/anesthesia.ts#L106) | Verified Tenant Org | — | 403 | `anesthesiaLogs` |
| `POST` | `/api/anesthesia/patients/:patientId/logs` | [anesthesia.ts:189](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/anesthesia.ts#L189) | Verified Tenant Org | `createAnesthesiaLogBodySchema` | 400, 403, 404 | `patients, visits` |
| `POST` | `/api/appointments/:appointmentId/visit` | [visits.ts:413](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/visits.ts#L413) | Clinical Mutation Secret | `visitDraftAutosaveResponseSchema` | 400 | — |
| `GET` | `/api/catalogs/mkb/categories/tree` | [outpatient_v2.ts:130](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/outpatient_v2.ts#L130) | Verified Tenant Org | `getMkbCategoriesQuerySchema` | 400 | `mkbCategories` |
| `GET` | `/api/catalogs/teeth` | [outpatient_v2.ts:32](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/outpatient_v2.ts#L32) | Verified Tenant Org | `getToothDefectsQuerySchema` | 400 | `clinicalTeethCatalog, toothDefectsCatalog` |
| `GET` | `/api/catalogs/tooth-defects` | [outpatient_v2.ts:53](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/outpatient_v2.ts#L53) | Verified Tenant Org | `getToothDefectsQuerySchema` | 400 | `toothDefectsCatalog` |
| `GET` | `/api/catalogs/tooth-defects/tree` | [outpatient_v2.ts:86](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/outpatient_v2.ts#L86) | Verified Tenant Org | `getMkbCategoriesQuerySchema` | 400 | `toothDefectsCatalog` |
| `POST` | `/api/clinical/implants/:installationId/isq` | [clinicalImplants.ts:281](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinicalImplants.ts#L281) | Staff or Admin | `recordIsqMeasurementSchema` | 400, 403, 404 | `patientImplantInstallations` |
| `POST` | `/api/clinical/implants/installations` | [clinicalImplants.ts:32](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinicalImplants.ts#L32) | Staff or Admin | `createImplantInstallationSchema` | 400, 403, 404 | `patients` |
| `GET` | `/api/clinical/implants/patient/:patientId` | [clinicalImplants.ts:392](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinicalImplants.ts#L392) | Verified Tenant Org | — | 403 | `patientImplantInstallations` |
| `POST` | `/api/clinical/phase-completions` | [clinical.ts:340](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L340) | Clinical Mutation Secret | — | 400, 403 | — |
| `POST` | `/api/clinical/rules` | [clinical.ts:149](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L149) | Clinical Mutation Secret | `clinicalRuleSchema` | 400, 403, 500 | — |
| `PATCH` | `/api/clinical/rules/:ruleId` | [clinical.ts:201](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L201) | Clinical Mutation Secret | `clinicalRuleSchema` | 400, 403, 500 | — |
| `DELETE` | `/api/clinical/rules/:ruleId` | [clinical.ts:275](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L275) | Clinical Mutation Secret | — | 200, 400, 403, 404, 500 | — |
| `POST` | `/api/clinical/rules/evaluate` | [clinical.ts:98](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L98) | Clinical Mutation Secret | `clinicalRuleEvaluationResponseSchema` | 400, 500 | — |
| `GET` | `/api/clinical/tasks` | [clinical.ts:431](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L431) | Clinical Read Secret | — | 200, 400, 403, 500 | — |
| `GET` | `/api/crm/custom-crm-task-types` | [clinical.ts:813](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L813) | Verified Tenant Org | — | 200, 500 | — |
| `GET` | `/api/crm/custom-task-types` | [clinical.ts:743](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L743) | Verified Tenant Org | — | 200, 500 | — |
| `POST` | `/api/diaries` | [diary.ts:469](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L469) | Clinical Mutation Secret | `diaryUpsertSchema` | 400, 403 | `visits` |
| `POST` | `/api/diaries/:id/chief-review` | [diary.ts:1923](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L1923) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/diaries/:id/chief-reviews` | [diary.ts:1925](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L1925) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/diaries/:id/lock` | [diary.ts:894](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L894) | Clinical Mutation Secret | `diaryIdParamsSchema` | 400, 403 | — |
| `POST` | `/api/diaries/:id/revise` | [diary.ts:1302](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L1302) | Clinical Mutation Secret | `diaryIdParamsSchema` | 400, 403 | — |
| `GET` | `/api/diaries/:id/revisions` | [diary.ts:350](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L350) | Clinical Read Secret | `diaryIdParamsSchema` | 400, 403, 404 | `visitDiaries` |
| `POST` | `/api/diaries/sync-progress` | [diary.ts:1659](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L1659) | Clinical Mutation Secret | — | 403, 404 | `treatmentPlans, patients` |
| `GET` | `/api/diaries/visit/:visitId` | [diary.ts:217](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L217) | Clinical Read Secret | `diaryVisitParamsSchema` | 400, 403, 404 | `visits` |
| `POST` | `/api/diary/:id/chief-review` | [diary.ts:1922](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L1922) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/diary/:id/chief-reviews` | [diary.ts:1924](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L1924) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/hr/recent-patients` | [clinical.ts:659](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L659) | Staff Identity | `recentPatientViewBodySchema` | 200, 400, 500 | — |
| `POST` | `/api/hr/recent-patients` | [clinical.ts:692](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L692) | Staff Identity | `recentPatientViewBodySchema` | 200, 400, 404, 500 | — |
| `GET` | `/api/integrations/dadata-addresses` | [clinical.ts:614](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L614) | Verified Tenant Org | — | 200, 500 | — |
| `GET` | `/api/integrations/dadata-geocoded-addresses` | [clinical.ts:835](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L835) | Verified Tenant Org | — | 200, 500 | — |
| `GET` | `/api/integrations/landing-field-mappings` | [clinical.ts:786](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L786) | Verified Tenant Org | — | 200, 500 | — |
| `GET` | `/api/odontogram/tooth-history/:patientId/:toothId` | [toothHistory.ts:46](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/toothHistory.ts#L46) | Verified Tenant Org | — | 400, 404 | `patients, visitDiaries` |
| `POST` | `/api/orthodontics/:patientId/aligners/issue-set` | [orthodontics.ts:148](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/orthodontics.ts#L148) | Verified Tenant Org | `patientParamsSchema` | 404 | — |
| `POST` | `/api/orthodontics/:patientId/archwire-change` | [orthodontics.ts:205](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/orthodontics.ts#L205) | Verified Tenant Org | `patientParamsSchema` | 404 | — |
| `POST` | `/api/orthodontics/:patientId/ligatures-activate` | [orthodontics.ts:256](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/orthodontics.ts#L256) | Verified Tenant Org | `patientParamsSchema` | 404 | — |
| `GET` | `/api/orthodontics/:patientId/progress` | [orthodontics.ts:116](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/orthodontics.ts#L116) | Verified Tenant Org | `patientParamsSchema` | 404 | — |
| `POST` | `/api/orthodontics/:patientId/stages/advance` | [orthodontics.ts:305](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/orthodontics.ts#L305) | Verified Tenant Org | `patientParamsSchema` | 404 | — |
| `GET` | `/api/outpatient/templates` | [outpatient_v2.ts:193](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/outpatient_v2.ts#L193) | Verified Tenant Org | `outpatientTemplatesFilterSchema` | 400 | `outpatientTemplateCategories, outpatientTemplates` |
| `GET` | `/api/outpatient/verify` | [outpatient_v2.ts:518](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/outpatient_v2.ts#L518) | Verified Tenant Org | `getVerifyQueueQuerySchema` | 400 | `outpatientVerifications` |
| `PUT` | `/api/outpatient/verify/:id/status` | [outpatient_v2.ts:589](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/outpatient_v2.ts#L589) | Verified Tenant Org | `updateVerificationParamsSchema` | 400, 404 | `outpatientVerifications` |
| `GET` | `/api/outpatient/verify/visit/:visitId/lock-status` | [outpatient_v2.ts:675](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/outpatient_v2.ts#L675) | Verified Tenant Org | `checkLockParamsSchema` | 400 | `outpatientVerifications` |
| `GET` | `/api/patients/:patientId/tooth-defects` | [outpatient_v2.ts:269](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/outpatient_v2.ts#L269) | Verified Tenant Org | `getPatientToothDefectsParamsSchema` | 400 | `patientToothDefects` |
| `POST` | `/api/patients/:patientId/tooth-defects` | [outpatient_v2.ts:346](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/outpatient_v2.ts#L346) | Verified Tenant Org | `getPatientToothDefectsParamsSchema` | 400, 404 | `clinicalTeethCatalog, toothDefectsCatalog` |
| `DELETE` | `/api/patients/:patientId/tooth-defects/:id` | [outpatient_v2.ts:440](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/outpatient_v2.ts#L440) | Verified Tenant Org | `deleteDefectParamsSchema` | 400, 404 | `patientToothDefects` |
| `GET` | `/api/patients/:patientId/tooth-states` | [odontogram.ts:317](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts#L317) | Verified Tenant Org | — | 400, 403, 404 | — |
| `GET` | `/api/patients/:patientId/tooth-states/:toothNumber/endo` | [odontogram.ts:617](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts#L617) | Staff or Admin | — | 400, 403, 404 | `toothStates` |
| `POST` | `/api/patients/:patientId/tooth-states/:toothNumber/endo` | [odontogram.ts:692](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts#L692) | Staff or Admin | `toothEndoUpsertSchema` | 400, 403, 404 | — |
| `POST` | `/api/patients/:patientId/tooth-states/batch` | [odontogram.ts:423](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts#L423) | Staff or Admin | `batchToothStateSchema` | 400, 404 | `toothStates` |
| `GET` | `/api/patients/:patientId/treatment-plans` | [odontogram.ts:833](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts#L833) | Staff or Admin | — | 400, 403, 404 | — |
| `POST` | `/api/patients/:patientId/treatment-plans` | [odontogram.ts:872](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts#L872) | Staff or Admin | `treatmentPlanUpsertSchema` | 400, 403, 404 | — |
| `POST` | `/api/patients/:patientId/treatment-plans/:planId/approve-variant` | [odontogram.ts:1279](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts#L1279) | Staff or Admin | — | 400, 403, 404 | — |
| `POST` | `/api/patients/:patientId/treatment-plans/:planId/discount-mode` | [odontogram.ts:1634](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts#L1634) | Verified Tenant Org | — | 400, 403, 404 | — |
| `POST` | `/api/patients/:patientId/treatment-plans/:planId/price-freeze` | [odontogram.ts:1494](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts#L1494) | Verified Tenant Org | — | 400, 403, 404 | — |
| `GET` | `/api/patients/:patientId/treatment-plans/:planId/price-freeze` | [odontogram.ts:1581](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts#L1581) | Verified Tenant Org | — | 400, 403, 404 | — |
| `POST` | `/api/patients/:patientId/treatment-plans/alternative-group` | [odontogram.ts:1349](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts#L1349) | Staff or Admin | — | 400, 403, 404 | — |
| `GET` | `/api/patients/:patientId/treatment-plans/alternative-groups` | [odontogram.ts:1448](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts#L1448) | Verified Tenant Org | — | 400, 403, 404 | — |
| `POST` | `/api/pharmacology/check-interactions` | [pharmacology.ts:28](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/pharmacology.ts#L28) | Staff or Admin | `checkInteractionsRequestSchema` | 400 | `patientDrugAllergies` |
| `POST` | `/api/pharmacology/prescriptions` | [pharmacology.ts:72](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/pharmacology.ts#L72) | Staff or Admin | `Inline Zod safeParse` | 400, 404 | `patients` |
| `GET` | `/api/pharmacology/prescriptions/patient/:patientId` | [pharmacology.ts:290](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/pharmacology.ts#L290) | Verified Tenant Org | — | 200 | `electronicPrescriptions` |
| `GET` | `/api/prescriptions` | [prescriptions.ts:187](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/prescriptions.ts#L187) | Verified Tenant Org | — | 403 | `electronicPrescriptions` |
| `POST` | `/api/prescriptions` | [prescriptions.ts:342](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/prescriptions.ts#L342) | Staff or Admin | `createPrescriptionBodySchema` | 400, 403, 404, 422 | `patients` |
| `GET` | `/api/prescriptions/:id` | [prescriptions.ts:252](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/prescriptions.ts#L252) | Verified Tenant Org | — | 403, 404 | `electronicPrescriptions, electronicPrescriptionItems` |
| `GET` | `/api/prescriptions/:id/print-html` | [prescriptions.ts:772](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/prescriptions.ts#L772) | Verified Tenant Org | — | 403, 404 | `electronicPrescriptions, organizations, patients, electronicPrescriptionItems` |
| `POST` | `/api/prescriptions/:id/sign-ukep` | [prescriptions.ts:552](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/prescriptions.ts#L552) | Staff or Admin | `signUkepBodySchema` | 400, 403 | — |
| `POST` | `/api/prescriptions/:id/verify` | [prescriptions.ts:704](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/prescriptions.ts#L704) | Verified Tenant Org | — | 404 | `electronicPrescriptions, electronicPrescriptionItems` |
| `POST` | `/api/prescriptions/preview-html` | [prescriptions.ts:166](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/prescriptions.ts#L166) | Verified Tenant Org | — | 400, 403 | — |
| `GET` | `/api/prescriptions/reference-catalog` | [prescriptions.ts:123](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/prescriptions.ts#L123) | Verified Tenant Org | — | 400 | — |
| `POST` | `/api/prescriptions/validate` | [prescriptions.ts:143](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/prescriptions.ts#L143) | Verified Tenant Org | — | 400, 403 | — |
| `GET` | `/api/system/single-session-enforcements` | [clinical.ts:590](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts#L590) | Verified Tenant Org | — | 200, 500 | — |
| `GET` | `/api/templates` | [templates.ts:105](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/templates.ts#L105) | Clinical Read Secret | — | 403 | `visitTemplates` |
| `POST` | `/api/templates` | [templates.ts:199](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/templates.ts#L199) | Clinical Mutation Secret | `templateCreateBodySchema` | 201, 400, 403 | — |
| `GET` | `/api/templates/:id` | [templates.ts:172](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/templates.ts#L172) | Clinical Mutation Secret | `templateCreateBodySchema` | 400, 403, 404 | `visitTemplates` |
| `DELETE` | `/api/templates/:id` | [templates.ts:251](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/templates.ts#L251) | Clinical Mutation Secret | — | 403, 404 | `visitTemplates` |
| `POST` | `/api/templates/seed` | [templates.ts:293](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/templates.ts#L293) | Clinical Mutation Secret | — | 403 | `visitTemplates` |
| `PUT` | `/api/treatment-plans/:planId/signature` | [diary.ts:1682](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts#L1682) | Clinical Mutation Secret | `diaryIdParamsSchema` | 403, 404 | `treatmentPlans, patients` |
| `POST` | `/api/visits/:visitId/apply-plan-items` | [visits.ts:673](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/visits.ts#L673) | Clinical Mutation Secret | `applyPlanItemsToVisitSchema` | 400, 500 | — |
| `POST` | `/api/visits/:visitId/draft/accept` | [visits.ts:546](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/visits.ts#L546) | Clinical Mutation Secret | — | 500 | — |
| `GET` | `/api/visits/:visitId/draft/autosave` | [visits.ts:458](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/visits.ts#L458) | Clinical Read Secret | `visitDraftAutosaveResponseSchema` | 404 | — |
| `PUT` | `/api/visits/:visitId/draft/autosave` | [visits.ts:512](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/visits.ts#L512) | Clinical Mutation Secret | `visitDraftAutosaveResponseSchema` | 200 | — |
| `PUT` | `/api/visits/:visitId/quality-control` | [visits.ts:638](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/visits.ts#L638) | Clinical Mutation Secret | `applyPlanItemsToVisitSchema` | 400, 404 | — |
| `GET` | `/api/visits/quality-control` | [visits.ts:626](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/visits.ts#L626) | Clinical Mutation Secret | `applyPlanItemsToVisitSchema` | 400, 404 | — |
| `POST` | `/api/visits/quick` | [visits.ts:344](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/visits.ts#L344) | Clinical Mutation Secret | — | 201, 400 | `chairs` |

---

## <a id="system-settings-websockets"></a>📁 System, Settings & WebSockets (89 эндпоинтов)

> Настройки клиники, филиалы, кресла, прайс-лист по номенклатуре 804н, брокер WebSocket (/api/ws/schedule), аудит безопасности и мониторинг серверов.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/attachments/:attachmentId/download` | [files.ts:236](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/files.ts#L236) | Verified Tenant Org | — | 403, 404 | `attachments, patients` |
| `GET` | `/api/audit/logs` | [audit.ts:52](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L52) | Staff or Admin | `auditQuerySchema` | 200 | `auditEvents` |
| `POST` | `/api/audit/logs` | [audit.ts:170](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L170) | Verified Tenant Org | — | 200 | — |
| `DELETE` | `/api/audit/logs` | [audit.ts:172](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L172) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/audit/logs/:id` | [audit.ts:171](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L171) | Verified Tenant Org | — | 200 | — |
| `DELETE` | `/api/audit/logs/:id` | [audit.ts:173](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L173) | Verified Tenant Org | — | 200 | — |
| `PUT` | `/api/audit/logs/:id` | [audit.ts:174](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L174) | Verified Tenant Org | — | 200 | — |
| `PATCH` | `/api/audit/logs/:id` | [audit.ts:175](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L175) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/audit/medical-access` | [audit.ts:113](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L113) | Staff or Admin | — | 200, 403 | — |
| `POST` | `/api/audit/medical-access` | [audit.ts:177](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L177) | Verified Tenant Org | — | 200 | — |
| `DELETE` | `/api/audit/medical-access` | [audit.ts:179](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L179) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/audit/medical-access/:id` | [audit.ts:178](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L178) | Verified Tenant Org | — | 200 | — |
| `DELETE` | `/api/audit/medical-access/:id` | [audit.ts:180](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L180) | Verified Tenant Org | — | 200 | — |
| `PUT` | `/api/audit/medical-access/:id` | [audit.ts:181](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L181) | Verified Tenant Org | — | 200 | — |
| `PATCH` | `/api/audit/medical-access/:id` | [audit.ts:182](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts#L182) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/chat/quota` | [chat.ts:18](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/chat.ts#L18) | Verified Tenant Org | `chatSendSchema` | 400, 403, 404, 500 | — |
| `POST` | `/api/chat/sms/send` | [chat.ts:39](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/chat.ts#L39) | Verified Tenant Org | `chatSendSchema` | 400, 403, 404, 422 | — |
| `GET` | `/api/clinic/workflows` | [clinicWorkflows.ts:44](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinicWorkflows.ts#L44) | Verified Tenant Org | `createWorkflowSchema` | 200, 400, 500 | `clinicWorkflows` |
| `POST` | `/api/clinic/workflows` | [clinicWorkflows.ts:65](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinicWorkflows.ts#L65) | Verified Tenant Org | `createWorkflowSchema` | 201, 400, 500 | — |
| `DELETE` | `/api/clinic/workflows/:id` | [clinicWorkflows.ts:186](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinicWorkflows.ts#L186) | Verified Tenant Org | `workflowParamsSchema` | 200, 400, 404 | — |
| `POST` | `/api/clinic/workflows/:id/toggle` | [clinicWorkflows.ts:119](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinicWorkflows.ts#L119) | Verified Tenant Org | `workflowParamsSchema` | 200, 400, 404 | `clinicWorkflows` |
| `GET` | `/api/files/patients/:patientId/attachments` | [files.ts:106](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/files.ts#L106) | Verified Tenant Org | — | 400, 403 | `patients` |
| `POST` | `/api/files/patients/:patientId/attachments` | [files.ts:221](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/files.ts#L221) | Verified Tenant Org | — | 403, 404 | `attachments` |
| `GET` | `/api/files/visits/:visitId/attachments` | [files.ts:337](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/files.ts#L337) | Verified Tenant Org | — | 403, 404 | `visits, attachments` |
| `POST` | `/api/files/visits/:visitId/attachments` | [files.ts:412](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/files.ts#L412) | Verified Tenant Org | — | 403, 409 | `visits, visitDiaries` |
| `GET` | `/api/health` | [health.ts:18](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/health.ts#L18) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/health/discovery` | [health.ts:31](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/health.ts#L31) | Clinical Read Secret | — | 200 | — |
| `POST` | `/api/imaging/decode-heic` | [files.ts:534](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/files.ts#L534) | Verified Tenant Org | — | 200, 400, 500 | `chunk` |
| `GET` | `/api/insurance/contracts` | [insurance.ts:99](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L99) | Staff or Admin | `insuranceCreateBodySchema` | 400, 404 | `insuranceContracts` |
| `POST` | `/api/insurance/contracts` | [insurance.ts:154](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L154) | Staff or Admin | `insuranceCreateBodySchema` | 400 | — |
| `GET` | `/api/insurance/contracts/:contractId` | [insurance.ts:122](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L122) | Staff or Admin | `insuranceCreateBodySchema` | 400, 404 | `insuranceContracts` |
| `PUT` | `/api/insurance/contracts/:contractId` | [insurance.ts:234](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L234) | Staff or Admin | `insuranceUpdateBodySchema` | 400, 404 | `insuranceContracts` |
| `DELETE` | `/api/insurance/contracts/:contractId` | [insurance.ts:363](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L363) | Staff or Admin | — | 404 | `insuranceContracts` |
| `GET` | `/api/insurance/guarantee-letters` | [insurance.ts:497](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L497) | Verified Tenant Org | `querySchema` | 400 | `dmsGuaranteeLetters` |
| `POST` | `/api/insurance/guarantee-letters` | [insurance.ts:636](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L636) | Staff or Admin | `dmsGuaranteeLetterCreateSchema` | 400 | — |
| `GET` | `/api/insurance/guarantee-letters/:letterId` | [insurance.ts:580](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L580) | Verified Tenant Org | — | 200, 404 | `dmsGuaranteeLetters` |
| `PUT` | `/api/insurance/guarantee-letters/:letterId` | [insurance.ts:725](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L725) | Staff or Admin | `dmsGuaranteeLetterUpdateSchema` | 400, 404 | `dmsGuaranteeLetters` |
| `DELETE` | `/api/insurance/guarantee-letters/:letterId` | [insurance.ts:829](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L829) | Staff or Admin | `recordUsageBodySchema` | 200, 400, 404 | `dmsGuaranteeLetters` |
| `POST` | `/api/insurance/guarantee-letters/:letterId/record-usage` | [insurance.ts:877](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L877) | Staff or Admin | `recordUsageBodySchema` | 200, 400 | `dmsGuaranteeLetters` |
| `POST` | `/api/insurance/quick-attach` | [insurance.ts:1204](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L1204) | Staff or Admin | — | 400 | — |
| `POST` | `/api/insurance/split-invoice` | [insurance.ts:1091](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/insurance.ts#L1091) | Verified Tenant Org | `splitInvoiceBodySchema` | 400 | `dmsGuaranteeLetters` |
| `GET` | `/api/marketing/attribution` | [marketing.ts:59](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/marketing.ts#L59) | Clinical Read Secret | — | 200 | `crmLeads, appointments, payments, patients` |
| `GET` | `/api/marketing/online-booking/funnel` | [marketing.ts:276](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/marketing.ts#L276) | Clinical Read Secret | — | 200 | `crmLeads, appointments, payments` |
| `GET` | `/api/marketing/patient-field-requirements` | [marketing.ts:328](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/marketing.ts#L328) | Clinical Mutation Secret | `patientFieldRequirementsInputSchema` | 200, 400, 500 | `organizations` |
| `PUT` | `/api/marketing/patient-field-requirements` | [marketing.ts:365](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/marketing.ts#L365) | Clinical Mutation Secret | `patientFieldRequirementsInputSchema` | 200, 400, 500 | `organizations` |
| `GET` | `/api/marketing/reports` | [marketing.ts:419](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/marketing.ts#L419) | Verified Tenant Org | — | 200, 500 | `crmLeads, payments` |
| `GET` | `/api/mobile/bundle.zip` | [mobileOta.ts:335](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mobileOta.ts#L335) | Clinical Mutation Secret | — | 200, 304, 400 | — |
| `GET` | `/api/mobile/health` | [mobileOta.ts:423](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mobileOta.ts#L423) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/mobile/publish` | [mobileOta.ts:369](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mobileOta.ts#L369) | Clinical Mutation Secret | — | 200, 400 | — |
| `GET` | `/api/mobile/version.json` | [mobileOta.ts:292](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mobileOta.ts#L292) | Verified Tenant Org | `mobileOtaVersionQuerySchema` | 200, 304 | — |
| `GET` | `/api/patients/:patientId/attachments` | [files.ts:105](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/files.ts#L105) | Verified Tenant Org | — | 400, 403 | `patients` |
| `POST` | `/api/patients/:patientId/attachments` | [files.ts:220](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/files.ts#L220) | Verified Tenant Org | — | 404 | `attachments` |
| `POST` | `/api/pricelist/analyze` | [pricelist.ts:34](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/pricelist.ts#L34) | Clinical Read Secret | `dentalPricelistAnalysisResponseSchema` | 400 | — |
| `POST` | `/api/settings/catalog` | [settings.ts:1630](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1630) | Verified Tenant Org | — | 201, 400 | — |
| `PUT` | `/api/settings/catalog/:serviceId` | [settings.ts:1659](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1659) | Verified Tenant Org | — | 400 | — |
| `DELETE` | `/api/settings/catalog/:serviceId` | [settings.ts:1715](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1715) | Verified Tenant Org | — | 400 | — |
| `POST` | `/api/settings/chairs` | [settings.ts:1473](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1473) | Verified Tenant Org | `chairSchema` | 201, 400 | — |
| `PUT` | `/api/settings/chairs/:chairId` | [settings.ts:1533](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1533) | Verified Tenant Org | `chairSchema` | 400 | — |
| `DELETE` | `/api/settings/chairs/:chairId` | [settings.ts:1583](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1583) | Verified Tenant Org | `chairSchema` | 400 | — |
| `PUT` | `/api/settings/chairs/:chairId/working-hours` | [settings.ts:1491](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1491) | Verified Tenant Org | `chairSchema` | 400 | — |
| `GET` | `/api/settings/clinic` | [settings.ts:930](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L930) | Verified Tenant Org | `clinicSettingsSchema` | 400 | — |
| `POST` | `/api/settings/clinic/mode` | [settings.ts:1010](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1010) | Verified Tenant Org | `clinicSettingsSchema` | 201, 400 | — |
| `PUT` | `/api/settings/clinic/profile` | [settings.ts:1026](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1026) | Verified Tenant Org | `clinicSettingsSchema` | 201, 400 | — |
| `GET` | `/api/settings/preferences` | [settings.ts:937](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L937) | Verified Tenant Org | `uiPreferencesSchema` | 400 | — |
| `PUT` | `/api/settings/preferences` | [settings.ts:959](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L959) | Verified Tenant Org | `uiPreferencesSchema` | 400, 409 | — |
| `POST` | `/api/settings/protocols` | [settings.ts:1758](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1758) | Verified Tenant Org | — | 201, 400 | — |
| `PUT` | `/api/settings/protocols/:templateId` | [settings.ts:1787](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1787) | Verified Tenant Org | — | 400 | — |
| `DELETE` | `/api/settings/protocols/:templateId` | [settings.ts:1843](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1843) | Verified Tenant Org | — | 400 | — |
| `POST` | `/api/settings/reset-demo` | [settings.ts:1871](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1871) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/settings/reset-zero` | [settings.ts:1879](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1879) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/settings/staff` | [settings.ts:1046](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1046) | Verified Tenant Org | `staffMemberSchema` | 201, 400 | — |
| `PUT` | `/api/settings/staff/:staffId` | [settings.ts:1186](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1186) | Verified Tenant Org | `staffMemberSchema` | 400 | — |
| `DELETE` | `/api/settings/staff/:staffId` | [settings.ts:1241](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1241) | Verified Tenant Org | `staffMemberSchema` | 400 | — |
| `PUT` | `/api/settings/staff/:staffId/authority` | [settings.ts:1403](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1403) | Verified Tenant Org | — | 400, 401, 403 | — |
| `PUT` | `/api/settings/staff/:staffId/commission` | [settings.ts:1293](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1293) | Verified Tenant Org | — | 400, 503 | — |
| `POST` | `/api/settings/staff/:staffId/credentials` | [settings.ts:1062](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1062) | Verified Tenant Org | — | 200, 400 | — |
| `PUT` | `/api/settings/staff/:staffId/working-hours` | [settings.ts:1140](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1140) | Verified Tenant Org | `staffMemberSchema` | 400 | — |
| `GET` | `/api/settings/staff/commissions` | [settings.ts:1276](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts#L1276) | Verified Tenant Org | — | 400, 503 | — |
| `GET` | `/api/system/health/detailed` | [health.ts:40](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/health.ts#L40) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/system/local-bridges/readiness` | [system.ts:939](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/system.ts#L939) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/system/local-bridges/use-plans` | [system.ts:951](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/system.ts#L951) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/system/metrics` | [health.ts:71](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/health.ts#L71) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/system/persistence/export` | [system.ts:963](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/system.ts#L963) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/system/persistence/verify` | [system.ts:931](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/system.ts#L931) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/workspace/chairs` | [workspaceProfile.ts:679](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/workspaceProfile.ts#L679) | Verified Tenant Org | `Inline Zod safeParse` | 401, 500 | — |
| `POST` | `/api/workspace/preset/:name` | [workspaceProfile.ts:808](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/workspaceProfile.ts#L808) | Verified Tenant Org | `workspacePresetBodySchema` | 400, 401 | — |
| `GET` | `/api/workspace/profile` | [workspaceProfile.ts:645](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/workspaceProfile.ts#L645) | Verified Tenant Org | — | 401, 500 | — |
| `GET` | `/api/ws/schedule` | [websocket.ts:171](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/websocket.ts#L171) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/ws/telephony` | [websocket.ts:172](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/websocket.ts#L172) | Verified Tenant Org | — | 200 | — |

---

## <a id="auth-identity"></a>📁 Auth & Identity (36 эндпоинтов)

> Аутентификация персонала, PIN-коды смены, токены сессий, RBAC права и гостевой OTP-вход в личный кабинет пациента.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/clinic/login` | [auth.ts:485](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L485) | Verified Tenant Org | — | 400 | `organizations` |
| `POST` | `/api/auth/clinic/set-password` | [auth.ts:785](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L785) | Verified Tenant Org | `clinicSetPasswordBodySchema` | 400, 403 | — |
| `POST` | `/api/auth/invites/accept` | [auth.ts:1572](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L1572) | Verified Tenant Org | `acceptInviteBodySchema` | 400 | `userInvitations` |
| `POST` | `/api/auth/invites/create` | [auth.ts:1485](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L1485) | Verified Tenant Org | `createInviteBodySchema` | 400, 403 | — |
| `POST` | `/api/auth/login` | [auth.ts:1347](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L1347) | Verified Tenant Org | `loginBodySchema` | 400 | `users, organizations` |
| `POST` | `/api/auth/register` | [auth.ts:1200](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L1200) | Verified Tenant Org | `registerBodySchema` | 400, 409 | `organizations, users` |
| `POST` | `/api/auth/setup/init` | [auth.ts:1050](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L1050) | Verified Tenant Org | `setupInitBodySchema` | 400 | `organizations` |
| `POST` | `/api/auth/staff/set-pin` | [auth.ts:905](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L905) | Verified Tenant Org | `staffSetPinBodySchema` | 400, 403 | `users` |
| `POST` | `/api/auth/staff/unlock` | [auth.ts:623](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L623) | Verified Tenant Org | — | 400, 401 | `users` |
| `GET` | `/api/auth/status` | [auth.ts:735](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L735) | Verified Tenant Org | — | 200 | `users` |
| `GET` | `/api/auth/user/me` | [auth.ts:1729](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L1729) | Verified Tenant Org | `updatePasswordBodySchema` | 401, 404 | `users` |
| `POST` | `/api/auth/user/update-password` | [auth.ts:1772](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L1772) | Verified Tenant Org | `updatePasswordBodySchema` | 400, 401 | `users` |
| `POST` | `/api/auth/user/update-pin` | [auth.ts:1844](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts#L1844) | Verified Tenant Org | `updatePinBodySchema` | 400, 401 | `users` |
| `POST` | `/api/portal/auth/send-otp` | [portal.ts:356](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L356) | Public / OTP / Webhook | — | 400 | — |
| `POST` | `/api/portal/auth/telegram-webapp` | [patientPortal.ts:97](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientPortal.ts#L97) | Verified Tenant Org | — | 400, 401, 404 | `patients` |
| `POST` | `/api/portal/auth/verify-otp` | [portal.ts:733](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L733) | Public / OTP / Webhook | — | 400, 401 | — |
| `GET` | `/api/portal/consents` | [portal.ts:1187](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L1187) | Public / OTP / Webhook | — | 401, 404 | `patients, patientConsents` |
| `POST` | `/api/portal/consents/:consentId/sign` | [portal.ts:1291](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L1291) | Public / OTP / Webhook | — | 400, 401, 404 | `patients, patientConsents` |
| `GET` | `/api/portal/documents/:documentId/html` | [portal.ts:1004](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L1004) | Public / OTP / Webhook | — | 401, 404, 409 | — |
| `GET` | `/api/portal/extract-043/html` | [patientPortal.ts:341](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientPortal.ts#L341) | Verified Tenant Org | — | 401, 404 | `patients, visitDiaries` |
| `GET` | `/api/portal/health-questionnaire` | [portal.ts:1441](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L1441) | Public / OTP / Webhook | — | 401, 404 | `patients` |
| `POST` | `/api/portal/health-questionnaire` | [portal.ts:1488](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L1488) | Public / OTP / Webhook | — | 401 | — |
| `GET` | `/api/portal/imaging` | [portal.ts:2384](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L2384) | Public / OTP / Webhook | — | 401 | `xrayScans` |
| `GET` | `/api/portal/me` | [portal.ts:917](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L917) | Public / OTP / Webhook | — | 401, 404 | `patients, visitDiaries, treatmentPlans` |
| `POST` | `/api/portal/payments/confirm-sbp` | [portal.ts:2186](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L2186) | Public / OTP / Webhook | — | 400, 401, 404 | `patientInvoices` |
| `POST` | `/api/portal/payments/create-sbp-qr` | [portal.ts:2062](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L2062) | Public / OTP / Webhook | — | 401 | `patientInvoices` |
| `GET` | `/api/portal/tax-certificate/knd-1151156` | [patientPortal.ts:184](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientPortal.ts#L184) | Verified Tenant Org | — | 401, 404 | `patients, payments` |
| `GET` | `/api/portal/treatment-plans` | [portal.ts:1760](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L1760) | Public / OTP / Webhook | — | 401 | `treatmentPlans, patients` |
| `POST` | `/api/portal/treatment-plans/:planId/select-tier` | [portal.ts:1996](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts#L1996) | Public / OTP / Webhook | — | 400, 401, 404 | `patients` |
| `GET` | `/api/staff/:staffId/profile` | [staff.ts:214](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/staff.ts#L214) | Verified Tenant Org | `candidateSchema` | 400, 404 | — |
| `PUT` | `/api/staff/:staffId/profile` | [staff.ts:342](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/staff.ts#L342) | Verified Tenant Org | `updateStaffProfileExtendedSchema` | 400 | — |
| `GET` | `/api/staff/:staffId/sessions` | [staff.ts:679](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/staff.ts#L679) | Verified Tenant Org | — | 404 | — |
| `POST` | `/api/staff/:staffId/terminate-session` | [staff.ts:655](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/staff.ts#L655) | Verified Tenant Org | — | 404 | — |
| `POST` | `/api/staff/evaluate-password` | [staff.ts:322](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/staff.ts#L322) | Verified Tenant Org | `bodySchema` | 400 | — |
| `GET` | `/api/staff/extended` | [staff.ts:184](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/staff.ts#L184) | Verified Tenant Org | `Inline z.object` | 404 | — |
| `POST` | `/api/staff/validate-duplicates` | [staff.ts:255](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/staff.ts#L255) | Verified Tenant Org | `candidateSchema` | 400 | — |

---

## <a id="billing-cash-54-fz"></a>📁 Billing, Cash & 54-FZ (80 эндпоинтов)

> Платежи, касса 54-ФЗ (ОФД, ФФД 1.2), чеки прихода/возврата, очередь фискализации, мультикассовость, P&L отчётность, внутренняя рассрочка, СБП QR-коды и Sber POS.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/billing/fiscal-queue/:id/retry` | [billing.ts:959](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/billing.ts#L959) | Clinical Mutation Secret | `paramsSchema` | 200, 400, 404 | `fiscalReceiptQueue` |
| `GET` | `/api/billing/fiscal-queue/pending` | [billing.ts:899](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/billing.ts#L899) | Clinical Mutation Secret | `querySchema` | 200 | `fiscalReceiptQueue` |
| `POST` | `/api/billing/fiscal-queue/retry-all` | [billing.ts:1074](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/billing.ts#L1074) | Clinical Mutation Secret | — | 200 | `fiscalReceiptQueue` |
| `POST` | `/api/billing/fiscalize-receipt` | [sbpQr.ts:363](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sbpQr.ts#L363) | Staff or Admin | `createFiscalReceiptPayloadSchema` | 400, 404, 409 | `patients, patientInvoices, payments` |
| `POST` | `/api/billing/invoices/:id/payments` | [billing.ts:790](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/billing.ts#L790) | Clinical Mutation Secret | `Inline z.object` | 200 | — |
| `POST` | `/api/billing/payments` | [billing.ts:788](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/billing.ts#L788) | Clinical Mutation Secret | `Inline z.object` | 200 | — |
| `GET` | `/api/billing/payouts` | [billing.ts:442](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/billing.ts#L442) | Verified Tenant Org | `payoutQuerySchema` | 400 | — |
| `POST` | `/api/billing/refunds/partial` | [billing.ts:808](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/billing.ts#L808) | Clinical Mutation Secret | `partialRefundBodySchema` | 400 | — |
| `POST` | `/api/billing/sbp/generate-qr` | [sbpQr.ts:291](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sbpQr.ts#L291) | Verified Tenant Org | `generateSbpDynamicQrSchema` | 201, 400 | — |
| `POST` | `/api/billing/sbp/verify-payload` | [sbpQr.ts:339](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sbpQr.ts#L339) | Staff or Admin | `bodySchema` | 400, 404 | `patients, patientInvoices` |
| `POST` | `/api/billing/sbp/webhook` | [sbpQr.ts:1195](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sbpQr.ts#L1195) | Public / OTP / Webhook | — | 200 | — |
| `GET` | `/api/cash/cash-box` | [cashbox_v2.ts:40](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashbox_v2.ts#L40) | Staff or Admin | `bodySchema` | 400 | `cashBoxes, cashBoxShifts` |
| `POST` | `/api/cash/cash-box-all-closing` | [cashbox_v2.ts:167](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashbox_v2.ts#L167) | Staff or Admin | `bodySchema` | 200 | `cashBoxShifts, cashBoxes` |
| `POST` | `/api/cash/cash-box-all-open` | [cashbox_v2.ts:64](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashbox_v2.ts#L64) | Staff or Admin | `bodySchema` | 400 | `cashBoxes, cashBoxShifts` |
| `POST` | `/api/cash/cash-introduction` | [cashbox_v2.ts:251](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashbox_v2.ts#L251) | Staff or Admin | `bodySchema` | 400 | `cashBoxes, cashBoxShifts` |
| `POST` | `/api/cash/cash-withdrawal` | [cashbox_v2.ts:377](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashbox_v2.ts#L377) | Staff or Admin | `bodySchema` | 400 | `cashBoxes, cashBoxShifts` |
| `GET` | `/api/cash/expense-reason` | [cashbox_v2.ts:532](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashbox_v2.ts#L532) | Verified Tenant Org | `querySchema` | 200 | `cashOperations` |
| `GET` | `/api/cash/expense-reasons` | [cashbox_v2.ts:531](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashbox_v2.ts#L531) | Verified Tenant Org | `querySchema` | 200 | `cashOperations` |
| `GET` | `/api/cash/operation-list` | [cashbox_v2.ts:545](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashbox_v2.ts#L545) | Verified Tenant Org | `querySchema` | 200 | `cashOperations` |
| `GET` | `/api/expenses` | [expenses.ts:173](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/expenses.ts#L173) | Staff or Admin | `createExpenseBodySchema` | 400 | `cashExpenseReasons, cashBoxes` |
| `POST` | `/api/expenses` | [expenses.ts:277](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/expenses.ts#L277) | Staff or Admin | `summaryQuerySchema` | 400 | `cashOperations` |
| `DELETE` | `/api/expenses/:id` | [expenses.ts:390](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/expenses.ts#L390) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/expenses/summary` | [expenses.ts:328](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/expenses.ts#L328) | Staff or Admin | — | 404 | `cashOperations, cashBoxes` |
| `GET` | `/api/finance/family` | [finance_family.ts:157](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/finance_family.ts#L157) | Verified Tenant Org | — | 200 | `familyGroups, patients` |
| `POST` | `/api/finance/family` | [finance_family.ts:294](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/finance_family.ts#L294) | Staff or Admin | `Inline Zod safeParse` | 400, 403 | `patients` |
| `GET` | `/api/finance/family/:familyGroupId` | [finance_family.ts:248](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/finance_family.ts#L248) | Staff or Admin | `Inline Zod safeParse` | 400, 404 | — |
| `PUT` | `/api/finance/family/:id` | [finance_family.ts:395](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/finance_family.ts#L395) | Staff or Admin | `Inline Zod safeParse` | 400, 403, 409 | `patients, familyGroups` |
| `DELETE` | `/api/finance/family/:id` | [finance_family.ts:496](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/finance_family.ts#L496) | Staff or Admin | — | 200 | — |
| `GET` | `/api/finance/family/patient/:patientId` | [finance_family.ts:206](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/finance_family.ts#L206) | Verified Tenant Org | — | 404 | `patients` |
| `POST` | `/api/finance/family/pay` | [finance_family.ts:565](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/finance_family.ts#L565) | Staff or Admin | `familyPaymentSchema` | 400 | — |
| `POST` | `/api/finance/family/topup` | [finance_family.ts:633](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/finance_family.ts#L633) | Staff or Admin | `familyTopupSchema` | 400 | — |
| `POST` | `/api/finance/payments` | [billing.ts:789](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/billing.ts#L789) | Clinical Mutation Secret | `Inline z.object` | 200 | — |
| `GET` | `/api/fiscal/devices/status` | [fiscalReceiptRoutes.ts:545](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts#L545) | Clinical Mutation Secret | `Inline Zod safeParse` | 200, 400 | — |
| `POST` | `/api/fiscal/devices/test-connection` | [fiscalReceiptRoutes.ts:560](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts#L560) | Clinical Mutation Secret | `createFiscalReceiptPayloadSchema` | 200, 400 | — |
| `GET` | `/api/fiscal/queue` | [fiscalReceiptRoutes.ts:1097](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts#L1097) | Clinical Mutation Secret | `querySchema` | 200, 400 | `fiscalReceiptQueue` |
| `POST` | `/api/fiscal/queue/:id/retry` | [fiscalReceiptRoutes.ts:1153](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts#L1153) | Clinical Mutation Secret | `paramsSchema` | 200, 400, 404 | `fiscalReceiptQueue` |
| `POST` | `/api/fiscal/queue/auto-retry/start` | [fiscalReceiptRoutes.ts:1248](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts#L1248) | Clinical Mutation Secret | — | 200 | — |
| `POST` | `/api/fiscal/queue/auto-retry/stop` | [fiscalReceiptRoutes.ts:1264](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts#L1264) | Clinical Mutation Secret | — | 200 | — |
| `POST` | `/api/fiscal/queue/retry-all` | [fiscalReceiptRoutes.ts:1228](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts#L1228) | Clinical Mutation Secret | — | 200 | — |
| `POST` | `/api/fiscal/receipts` | [fiscalReceiptRoutes.ts:596](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts#L596) | Clinical Mutation Secret | `createFiscalReceiptPayloadSchema` | 400 | `serviceCatalogItems` |
| `POST` | `/api/fiscal/refund` | [fiscalReceiptRoutes.ts:863](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts#L863) | Clinical Mutation Secret | `fiscalRefundPayloadSchema` | 200, 400 | `fiscalReceiptQueue` |
| `POST` | `/api/fiscal/validate` | [fiscalReceiptRoutes.ts:445](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts#L445) | Clinical Read Secret | `createFiscalReceiptPayloadSchema` | 400 | `serviceCatalogItems` |
| `POST` | `/api/installment-payments/:id/pay` | [cashInstallmentsRoutes.ts:332](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashInstallmentsRoutes.ts#L332) | Verified Tenant Org | `querySchema` | 200 | `installmentContracts` |
| `POST` | `/api/installments` | [cashInstallmentsRoutes.ts:37](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashInstallmentsRoutes.ts#L37) | Staff or Admin | `bodySchema` | 400 | `patients` |
| `GET` | `/api/installments` | [cashInstallmentsRoutes.ts:338](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashInstallmentsRoutes.ts#L338) | Verified Tenant Org | `querySchema` | 200 | `installmentContracts` |
| `GET` | `/api/installments/:id` | [cashInstallmentsRoutes.ts:379](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashInstallmentsRoutes.ts#L379) | Verified Tenant Org | — | 404 | `installmentContracts, installmentTranches` |
| `POST` | `/api/installments/tranches/:id/pay` | [cashInstallmentsRoutes.ts:331](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashInstallmentsRoutes.ts#L331) | Verified Tenant Org | `querySchema` | 200 | `installmentContracts` |
| `GET` | `/api/invoices` | [invoices.ts:751](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/invoices.ts#L751) | Clinical Read Secret | `querySchema` | 200, 400 | `treatmentItems` |
| `POST` | `/api/invoices/generate-from-plan` | [invoices.ts:193](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/invoices.ts#L193) | Clinical Mutation Secret | `generateInvoiceFromPlanSchema` | 400, 404 | `patients` |
| `POST` | `/api/invoices/validate-plan` | [invoices.ts:116](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/invoices.ts#L116) | Clinical Read Secret | `validatePlanBodySchema` | 400 | — |
| `POST` | `/api/lab-orders/:id/mark-installed` | [cashLabPaymentRoutes.ts:187](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashLabPaymentRoutes.ts#L187) | Staff or Admin | `bodySchema` | 200 | `labOrders` |
| `POST` | `/api/lab-orders/:id/pay` | [cashLabPaymentRoutes.ts:37](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashLabPaymentRoutes.ts#L37) | Staff or Admin | `bodySchema` | 200 | `labOrders, cashBoxes` |
| `POST` | `/api/payments/sberbank/pos/initiate` | [sberPosWebhookRoute.ts:253](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/payments/sberPosWebhookRoute.ts#L253) | Verified Tenant Org | `initiateSberPosPaymentSchema` | 200, 400, 404 | `patients, sberbankTransactions` |
| `POST` | `/api/payments/sberbank/pos/reconcile-rrn` | [sberPosWebhookRoute.ts:798](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/payments/sberPosWebhookRoute.ts#L798) | Verified Tenant Org | — | 200, 400 | `sberbankTransactions` |
| `POST` | `/api/payments/sberbank/pos/reversal` | [sberPosWebhookRoute.ts:928](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/payments/sberPosWebhookRoute.ts#L928) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/payments/sberbank/pos/status/:orderId` | [sberPosWebhookRoute.ts:358](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/payments/sberPosWebhookRoute.ts#L358) | Verified Tenant Org | — | 200, 400, 404, 503 | `sberbankTransactions` |
| `POST` | `/api/payments/sberbank/pos/void` | [sberPosWebhookRoute.ts:855](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/payments/sberPosWebhookRoute.ts#L855) | Verified Tenant Org | — | 200, 400 | `sberbankTransactions, payments` |
| `POST` | `/api/payments/sberbank/pos/webhook` | [sberPosWebhookRoute.ts:937](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/payments/sberPosWebhookRoute.ts#L937) | Public / OTP / Webhook | — | 200 | — |
| `POST` | `/api/payments/sberbank/qr/webhook` | [sberPosWebhookRoute.ts:938](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/payments/sberPosWebhookRoute.ts#L938) | Public / OTP / Webhook | — | 200 | — |
| `POST` | `/api/payments/sberpos/webhook` | [sberPosWebhookRoute.ts:939](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/payments/sberPosWebhookRoute.ts#L939) | Public / OTP / Webhook | — | 200 | — |
| `GET` | `/api/public/estimates/:token` | [publicEstimates.ts:105](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicEstimates.ts#L105) | Public / OTP / Webhook | `acceptBodySchema` | 400, 401 | — |
| `POST` | `/api/public/estimates/:token/accept` | [publicEstimates.ts:149](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicEstimates.ts#L149) | Public / OTP / Webhook | `acceptBodySchema` | 400 | — |
| `GET` | `/api/public/estimates/:token/meta` | [publicEstimates.ts:34](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicEstimates.ts#L34) | Public / OTP / Webhook | `verifyBodySchema` | 400, 404 | — |
| `GET` | `/api/public/estimates/:token/pdf/signed` | [publicEstimates.ts:235](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicEstimates.ts#L235) | Public / OTP / Webhook | — | 400, 404 | — |
| `POST` | `/api/public/estimates/:token/reject` | [publicEstimates.ts:202](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicEstimates.ts#L202) | Public / OTP / Webhook | `rejectBodySchema` | 400, 404 | — |
| `POST` | `/api/public/estimates/:token/verify` | [publicEstimates.ts:54](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicEstimates.ts#L54) | Public / OTP / Webhook | `verifyBodySchema` | 400 | — |
| `GET` | `/api/reports/pnl` | [financialPnl.ts:45](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/financialPnl.ts#L45) | Verified Tenant Org | `pnlQuerySchema` | 400 | `clinics, payments, treatmentItems` |
| `POST` | `/api/sberbank/cancel-or-reconcile` | [sberbank.ts:396](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sberbank.ts#L396) | Verified Tenant Org | — | 404, 501 | `sberbankTransactions, payments` |
| `POST` | `/api/sberbank/pay` | [sberbank.ts:151](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sberbank.ts#L151) | Verified Tenant Org | — | 500, 501 | — |
| `GET` | `/api/sberbank/status/:orderId` | [sberbank.ts:231](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sberbank.ts#L231) | Verified Tenant Org | — | 404, 501 | `sberbankTransactions, payments` |
| `POST` | `/api/sberbank/webhook` | [sberbank.ts:575](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sberbank.ts#L575) | Public / OTP / Webhook | — | 400, 401, 503 | — |
| `POST` | `/api/sbp/webhook` | [sbpQr.ts:1196](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sbpQr.ts#L1196) | Public / OTP / Webhook | — | 200 | — |
| `POST` | `/api/sync/gateway` | [index.ts:23](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sync/index.ts#L23) | Clinical Mutation Secret | `syncPushBatchRequestSchema` | 200, 400 | — |
| `GET` | `/api/sync/pull` | [index.ts:107](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sync/index.ts#L107) | Clinical Read Secret | `syncPullQuerySchema` | 200 | — |
| `POST` | `/api/sync/pull` | [index.ts:132](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sync/index.ts#L132) | Clinical Read Secret | — | 200 | — |
| `POST` | `/api/sync/push` | [index.ts:65](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sync/index.ts#L65) | Clinical Mutation Secret | `syncPushBatchRequestSchema` | 200, 400 | — |
| `GET` | `/api/v1/expenses` | [expenses.ts:172](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/expenses.ts#L172) | Staff or Admin | `createExpenseBodySchema` | 400 | `cashExpenseReasons, cashBoxes` |
| `POST` | `/api/v1/expenses` | [expenses.ts:276](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/expenses.ts#L276) | Staff or Admin | `summaryQuerySchema` | 400 | `cashOperations` |
| `DELETE` | `/api/v1/expenses/:id` | [expenses.ts:389](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/expenses.ts#L389) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/v1/expenses/summary` | [expenses.ts:327](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/expenses.ts#L327) | Staff or Admin | — | 404 | `cashOperations, cashBoxes` |

---

## <a id="integrations-data-sync"></a>📁 Integrations & Data Sync (47 эндпоинтов)

> Внешние интеграции: 1С CommerceML 2.09, Flexbe лид-формы, синхронизация с Yandex Календарём, офлайн-синхронизация CRDT и перенос баз конкурентов (IDENT, DentalPRO, iStom).

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/commerceml/check-double-posting` | [commerceMl.ts:281](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L281) | Verified Tenant Org | `exportQuerySchema` | 200 | — |
| `GET` | `/api/commerceml/export` | [commerceMl.ts:175](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L175) | Verified Tenant Org | `exportQuerySchema` | 400 | — |
| `POST` | `/api/commerceml/export` | [commerceMl.ts:180](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L180) | Verified Tenant Org | `oneCSyncPayloadSchema` | 400 | — |
| `POST` | `/api/commerceml/sync` | [commerceMl.ts:219](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L219) | Verified Tenant Org | — | 400 | — |
| `POST` | `/api/commerceml/validate` | [commerceMl.ts:244](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L244) | Verified Tenant Org | `exportQuerySchema` | 400 | — |
| `GET` | `/api/export/leads` | [export.ts:125](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/export.ts#L125) | Verified Tenant Org | — | 200, 500 | `crmLeads` |
| `GET` | `/api/export/patients` | [export.ts:46](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/export.ts#L46) | Verified Tenant Org | — | 200, 403 | — |
| `POST` | `/api/imports/patients/commit` | [imports.ts:431](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imports.ts#L431) | Clinical Mutation Secret | — | 400 | — |
| `POST` | `/api/imports/patients/intake` | [imports.ts:395](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imports.ts#L395) | Clinical Mutation Secret | — | 400 | — |
| `POST` | `/api/imports/patients/preview` | [imports.ts:413](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imports.ts#L413) | Clinical Mutation Secret | — | 400 | — |
| `POST` | `/api/imports/smart/clinic-public-lookup` | [smartImports.ts:8120](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts#L8120) | Clinical Read Secret | — | 400, 500 | — |
| `POST` | `/api/imports/smart/commit` | [smartImports.ts:8224](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts#L8224) | Clinical Mutation Secret | `smartImportCommitResponseSchema` | 400, 500 | — |
| `POST` | `/api/imports/smart/local-source-discovery` | [smartImports.ts:7960](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts#L7960) | Clinical Read Secret | — | 400, 500 | — |
| `POST` | `/api/imports/smart/local-source-probe` | [smartImports.ts:8016](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts#L8016) | Clinical Read Secret | — | 400, 500 | — |
| `POST` | `/api/imports/smart/local-source-workup` | [smartImports.ts:7988](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts#L7988) | Clinical Read Secret | — | 400, 500 | — |
| `POST` | `/api/imports/smart/migration-autopilot` | [smartImports.ts:8044](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts#L8044) | Clinical Read Secret | — | 400, 500 | — |
| `POST` | `/api/imports/smart/migration-autopilot/report.csv` | [smartImports.ts:8078](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts#L8078) | Clinical Read Secret | — | 400, 500 | — |
| `POST` | `/api/imports/smart/preview` | [smartImports.ts:7930](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts#L7930) | Clinical Read Secret | — | 400, 500 | — |
| `POST` | `/api/imports/smart/report.csv` | [smartImports.ts:8148](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts#L8148) | Clinical Read Secret | — | 400, 500 | — |
| `POST` | `/api/imports/smart/report.safe.csv` | [smartImports.ts:8186](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts#L8186) | Clinical Mutation Secret | — | 400, 500 | — |
| `POST` | `/api/ingestion/extract` | [ingestion.ts:30](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/ingestion.ts#L30) | Clinical Mutation Secret | `documentIngestionResponseSchema` | 400 | — |
| `POST` | `/api/integrations/flexbe/webhook` | [flexbe.ts:22](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/integrations/flexbe.ts#L22) | Public / OTP / Webhook | `querySchema` | 400 | — |
| `GET` | `/api/migration/:runId` | [migrationRuns.ts:675](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migrationRuns.ts#L675) | Clinical Read Secret | — | 200 | `migrationReconciliations` |
| `POST` | `/api/migration/:runId/execute` | [migrationRuns.ts:581](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migrationRuns.ts#L581) | Clinical Mutation Secret | `executeRequestSchema` | 202 | — |
| `POST` | `/api/migration/:runId/map` | [migrationRuns.ts:477](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migrationRuns.ts#L477) | Clinical Mutation Secret | `mapRequestSchema` | 200 | — |
| `GET` | `/api/migration/:runId/reconciliation` | [migrationRuns.ts:704](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migrationRuns.ts#L704) | Clinical Read Secret | — | 200 | `migrationReconciliations` |
| `GET` | `/api/migration/:runId/reconciliation.csv` | [migrationRuns.ts:766](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migrationRuns.ts#L766) | Clinical Read Secret | — | 200 | `migrationReconciliations` |
| `POST` | `/api/migration/:runId/stage` | [migrationRuns.ts:539](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migrationRuns.ts#L539) | Clinical Mutation Secret | `executeRequestSchema` | 200 | — |
| `POST` | `/api/migration/analyze` | [migration.ts:182](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migration.ts#L182) | Clinical Mutation Secret | `migrationAnalyzeResponseSchema` | 400, 422 | — |
| `POST` | `/api/migration/dicom/inspect` | [migrationRuns.ts:942](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migrationRuns.ts#L942) | Clinical Mutation Secret | `dicomInspectSchema` | 200 | — |
| `POST` | `/api/migration/discover` | [migrationRuns.ts:856](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migrationRuns.ts#L856) | Clinical Mutation Secret | `discoverRequestSchema` | 200 | — |
| `POST` | `/api/migration/rollback` | [migration.ts:449](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migration.ts#L449) | Clinical Mutation Secret | `migrationRollbackResponseSchema` | 400, 422 | — |
| `POST` | `/api/migration/run` | [migration.ts:227](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migration.ts#L227) | Clinical Mutation Secret | `migrationRunResponseSchema` | 400, 404, 422 | `migrationRuns, migrationReconciliations` |
| `GET` | `/api/migration/runs` | [migration.ts:269](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migration.ts#L269) | Clinical Read Secret | — | 404 | `migrationRuns, migrationReconciliations` |
| `GET` | `/api/migration/runs/:runId` | [migration.ts:280](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migration.ts#L280) | Clinical Read Secret | — | 404 | `migrationRuns, migrationReconciliations` |
| `GET` | `/api/migration/runs/:runId/quarantine` | [migration.ts:355](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migration.ts#L355) | Clinical Read Secret | — | 404 | `migrationRuns, migrationReconciliations` |
| `GET` | `/api/migration/runs/:runId/reconciliation.csv` | [migration.ts:385](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migration.ts#L385) | Clinical Mutation Secret | — | 404 | `migrationRuns, migrationReconciliations` |
| `POST` | `/api/migration/upload` | [migrationRuns.ts:343](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migrationRuns.ts#L343) | Clinical Mutation Secret | — | 200 | — |
| `GET` | `/api/migration/worker/status` | [migrationRuns.ts:831](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migrationRuns.ts#L831) | Clinical Mutation Secret | `discoverRequestSchema` | 200 | — |
| `GET` | `/api/v1/integrations/1c/commerceml/acts` | [commerceMl.ts:323](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L323) | Verified Tenant Org | `exportQuerySchema` | 200 | — |
| `POST` | `/api/v1/integrations/1c/commerceml/check-double-posting` | [commerceMl.ts:277](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L277) | Verified Tenant Org | `exportQuerySchema` | 200 | — |
| `GET` | `/api/v1/integrations/1c/commerceml/export` | [commerceMl.ts:161](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L161) | Verified Tenant Org | `exportQuerySchema` | 200 | — |
| `POST` | `/api/v1/integrations/1c/commerceml/export` | [commerceMl.ts:166](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L166) | Verified Tenant Org | `exportQuerySchema` | 200 | — |
| `GET` | `/api/v1/integrations/1c/commerceml/materials` | [commerceMl.ts:350](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L350) | Verified Tenant Org | `exportQuerySchema` | 200 | — |
| `GET` | `/api/v1/integrations/1c/commerceml/shifts` | [commerceMl.ts:288](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L288) | Verified Tenant Org | `exportQuerySchema` | 200 | — |
| `POST` | `/api/v1/integrations/1c/commerceml/sync` | [commerceMl.ts:218](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L218) | Verified Tenant Org | — | 400 | — |
| `POST` | `/api/v1/integrations/1c/commerceml/validate` | [commerceMl.ts:243](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts#L243) | Verified Tenant Org | `exportQuerySchema` | 400 | — |

---

## <a id="telephony-messaging"></a>📁 Telephony & Messaging (89 эндпоинтов)

> Интеграция АТС (UIS/Comagic, Mango, Zadarma), входящие капсулы звонков, софтфон, рассылки в WhatsApp Cloud API (WABA), Telegram, VK, MAX и обработка квитанций доставки.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/communications/campaigns` | [communicationsOutbox.ts:1060](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L1060) | Clinical Mutation Secret | `campaignCreateSchema` | 200 | `communicationCampaigns` |
| `POST` | `/api/communications/campaigns` | [communicationsOutbox.ts:1094](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L1094) | Clinical Mutation Secret | `campaignCreateSchema` | 201 | — |
| `POST` | `/api/communications/campaigns/:campaignId/cancel` | [communicationsOutbox.ts:1202](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L1202) | Clinical Mutation Secret | — | 404 | — |
| `POST` | `/api/communications/campaigns/:campaignId/launch` | [communicationsOutbox.ts:1168](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L1168) | Clinical Mutation Secret | — | 404 | — |
| `GET` | `/api/communications/campaigns/:campaignId/preview` | [communicationsOutbox.ts:1140](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L1140) | Clinical Mutation Secret | — | 404 | — |
| `GET` | `/api/communications/campaigns/:campaignId/progress` | [communicationsOutbox.ts:1231](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L1231) | Clinical Read Secret | — | 404 | `communicationOutbox` |
| `GET` | `/api/communications/catalogs/templates` | [communications.ts:769](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L769) | Clinical Mutation Secret | `createTemplateRouteSchema` | 201, 400, 422 | — |
| `POST` | `/api/communications/catalogs/templates` | [communications.ts:800](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L800) | Clinical Mutation Secret | `createTemplateRouteSchema` | 201, 400, 422 | — |
| `POST` | `/api/communications/chats/:chatId/heartbeat` | [communications.ts:585](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L585) | Clinical Mutation Secret | `chatIdParamSchema` | 200, 400, 409 | — |
| `POST` | `/api/communications/chats/:chatId/lock` | [communications.ts:516](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L516) | Clinical Mutation Secret | `chatIdParamSchema` | 200, 400, 409 | — |
| `GET` | `/api/communications/chats/:chatId/lock-status` | [communications.ts:725](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L725) | Clinical Read Secret | `chatIdParamSchema` | 200, 400 | — |
| `POST` | `/api/communications/chats/:chatId/unlock` | [communications.ts:657](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L657) | Clinical Mutation Secret | `chatIdParamSchema` | 200, 400, 409 | — |
| `GET` | `/api/communications/consents/:patientId` | [communicationsOutbox.ts:621](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L621) | Clinical Mutation Secret | `consentUpdateSchema` | 200 | `patientCommunicationConsents, patients` |
| `PUT` | `/api/communications/consents/:patientId` | [communicationsOutbox.ts:663](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L663) | Clinical Mutation Secret | `consentUpdateSchema` | 404 | `patients` |
| `GET` | `/api/communications/gateway-status` | [communicationsOutbox.ts:1301](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L1301) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/communications/inbox` | [communications.ts:292](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L292) | Clinical Read Secret | — | 403 | — |
| `GET` | `/api/communications/inbox/:patientId` | [communications.ts:342](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L342) | Clinical Read Secret | — | 403, 404 | `patients` |
| `POST` | `/api/communications/inbox/:patientId/send` | [communications.ts:423](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L423) | Clinical Mutation Secret | — | 400, 403, 404, 422 | `patients` |
| `GET` | `/api/communications/outbox` | [communicationsOutbox.ts:736](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L736) | Clinical Read Secret | `outboxQuerySchema` | 200 | `communicationOutbox` |
| `POST` | `/api/communications/outbox` | [communicationsOutbox.ts:802](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L802) | Clinical Mutation Secret | `enqueueSchema` | 400, 404, 422 | `communicationTemplates` |
| `POST` | `/api/communications/outbox/:outboxId/cancel` | [communicationsOutbox.ts:909](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L909) | Clinical Mutation Secret | — | 409 | `communicationOutbox` |
| `POST` | `/api/communications/outbox/:outboxId/retry` | [communicationsOutbox.ts:955](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L955) | Clinical Mutation Secret | `dispatchBodySchema` | 409 | `communicationOutbox` |
| `POST` | `/api/communications/outbox/dispatch` | [communicationsOutbox.ts:1011](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L1011) | Clinical Mutation Secret | `dispatchBodySchema` | 200 | `communicationCampaigns` |
| `GET` | `/api/communications/patients/search` | [communications.ts:268](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L268) | Clinical Read Secret | — | 403 | `patients` |
| `GET` | `/api/communications/receipts/smsc` | [communicationReceipts.ts:130](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationReceipts.ts#L130) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/communications/receipts/smsc` | [communicationReceipts.ts:131](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationReceipts.ts#L131) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/communications/receipts/smsru` | [communicationReceipts.ts:94](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationReceipts.ts#L94) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/communications/recordings/:id` | [communications.ts:203](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L203) | Clinical Read Secret | — | 404 | `communicationEvents` |
| `GET` | `/api/communications/recordings/:id/stream` | [communications.ts:238](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L238) | Clinical Read Secret | — | 403, 404 | `communicationEvents, patients` |
| `POST` | `/api/communications/reminders/run` | [communicationsOutbox.ts:1040](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L1040) | Clinical Mutation Secret | `campaignCreateSchema` | 200 | `communicationCampaigns` |
| `GET` | `/api/communications/settings` | [communicationsOutbox.ts:511](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L511) | Clinical Mutation Secret | `settingsSchema` | 200 | — |
| `PUT` | `/api/communications/settings` | [communicationsOutbox.ts:525](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L525) | Clinical Mutation Secret | `settingsSchema` | 200 | — |
| `POST` | `/api/communications/tasks/complete` | [communications.ts:60](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L60) | Clinical Mutation Secret | `completeCommunicationTaskSchema` | 400 | `organizations` |
| `GET` | `/api/communications/templates` | [communicationsOutbox.ts:264](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L264) | Clinical Mutation Secret | `templateCreateSchema` | 422 | `communicationTemplates` |
| `POST` | `/api/communications/templates` | [communicationsOutbox.ts:295](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L295) | Clinical Mutation Secret | `templateCreateSchema` | 201, 422 | — |
| `PATCH` | `/api/communications/templates/:templateId` | [communicationsOutbox.ts:352](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L352) | Clinical Mutation Secret | `templateUpdateSchema` | 404, 422 | `communicationTemplates` |
| `POST` | `/api/communications/templates/preview` | [communicationsOutbox.ts:447](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L447) | Clinical Read Secret | `previewSchema` | 400, 403 | — |
| `POST` | `/api/communications/templates/render` | [communications.ts:845](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts#L845) | Clinical Read Secret | `renderTemplateRouteSchema` | 400, 422 | — |
| `GET` | `/api/communications/variables` | [communicationsOutbox.ts:250](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts#L250) | Clinical Mutation Secret | `templateCreateSchema` | 200 | `communicationTemplates` |
| `POST` | `/api/max/send` | [max.ts:392](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/max.ts#L392) | Verified Tenant Org | `bodySchema` | 400, 404 | `patients, denteMaxBotConfigs` |
| `GET` | `/api/max/settings` | [max.ts:100](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/max.ts#L100) | Staff or Admin | `updateMaxConfigSchema` | 400, 404 | `denteMaxBotConfigs` |
| `PUT` | `/api/max/settings` | [max.ts:141](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/max.ts#L141) | Staff or Admin | `updateMaxConfigSchema` | 200, 400 | `denteMaxBotConfigs` |
| `GET` | `/api/max/status` | [max.ts:209](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/max.ts#L209) | Verified Tenant Org | — | 200 | `denteMaxBotConfigs` |
| `POST` | `/api/max/webhook` | [max.ts:254](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/max.ts#L254) | Public / OTP / Webhook | — | 200 | — |
| `POST` | `/api/public/:organizationId/vk/webhook` | [vk.ts:26](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/vk.ts#L26) | Public / OTP / Webhook | — | 200, 503 | — |
| `GET` | `/api/settings/message-templates` | [messageTemplates.ts:64](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/messageTemplates.ts#L64) | Clinical Mutation Secret | `templateQuerySchema` | 201, 400, 404 | — |
| `POST` | `/api/settings/message-templates` | [messageTemplates.ts:136](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/messageTemplates.ts#L136) | Clinical Mutation Secret | `createMessageTemplateSchema` | 400, 404 | — |
| `PUT` | `/api/settings/message-templates/:id` | [messageTemplates.ts:207](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/messageTemplates.ts#L207) | Clinical Mutation Secret | `updateMessageTemplateSchema` | 400, 404 | — |
| `DELETE` | `/api/settings/message-templates/:id` | [messageTemplates.ts:274](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/messageTemplates.ts#L274) | Clinical Mutation Secret | `renderMessageTemplateInputSchema` | 400, 404 | — |
| `GET` | `/api/settings/telegram` | [telegram.ts:3780](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telegram.ts#L3780) | Verified Tenant Org | `updateDenteTelegramBotSettingsSchema` | 400 | — |
| `PUT` | `/api/settings/telegram` | [telegram.ts:3786](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telegram.ts#L3786) | Verified Tenant Org | `updateDenteTelegramBotSettingsSchema` | 400 | — |
| `GET` | `/api/telegram/feature-plan` | [telegram.ts:3822](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telegram.ts#L3822) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/telegram/link-codes` | [telegram.ts:3940](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telegram.ts#L3940) | Verified Tenant Org | — | 409 | — |
| `GET` | `/api/telegram/status` | [telegram.ts:3729](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telegram.ts#L3729) | Verified Tenant Org | `updateDenteTelegramBotSettingsSchema` | 400 | — |
| `GET` | `/api/telegram/status/:organizationId` | [telegram.ts:3735](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telegram.ts#L3735) | Verified Tenant Org | `updateDenteTelegramBotSettingsSchema` | 400 | — |
| `GET` | `/api/telegram/status/:organizationId/:botConfigId` | [telegram.ts:3752](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telegram.ts#L3752) | Verified Tenant Org | `updateDenteTelegramBotSettingsSchema` | 400 | — |
| `POST` | `/api/telegram/webhook` | [telegram.ts:3714](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telegram.ts#L3714) | Public / OTP / Webhook | — | 200 | — |
| `POST` | `/api/telegram/webhook/:organizationId` | [telegram.ts:3720](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telegram.ts#L3720) | Public / OTP / Webhook | — | 200 | — |
| `POST` | `/api/telegram/webhook/:organizationId/:botConfigId` | [telegram.ts:3715](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telegram.ts#L3715) | Public / OTP / Webhook | — | 200 | — |
| `POST` | `/api/telephony/:organizationId/asterisk/ami-event` | [telephony.ts:1267](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L1267) | Clinical Read Secret | — | 200, 400 | — |
| `POST` | `/api/telephony/:organizationId/sip/credentials` | [telephony.ts:1176](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L1176) | Clinical Read Secret | — | 200 | — |
| `POST` | `/api/telephony/:organizationId/sip/failover` | [telephony.ts:1240](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L1240) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/telephony/:organizationId/sip/status` | [telephony.ts:1205](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L1205) | Clinical Read Secret | — | 200 | — |
| `POST` | `/api/telephony/:organizationId/sip/transfer` | [telephony.ts:1316](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L1316) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/telephony/:organizationId/sms/webhook` | [telephony.ts:962](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L962) | Clinical Read Secret | — | 400, 404 | `communicationEvents` |
| `POST` | `/api/telephony/:organizationId/webhook` | [telephony.ts:775](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L775) | Public / OTP / Webhook | `telephonySmsWebhookPayloadSchema` | 400 | `clinics` |
| `POST` | `/api/telephony/asterisk/ami-event` | [telephony.ts:1271](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L1271) | Clinical Read Secret | — | 200, 400 | — |
| `GET` | `/api/telephony/recordings/:eventId/stream` | [telephony.ts:974](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L974) | Clinical Read Secret | — | 400, 403, 404 | `communicationEvents` |
| `POST` | `/api/telephony/sip/credentials` | [telephony.ts:1180](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L1180) | Clinical Read Secret | — | 200 | — |
| `POST` | `/api/telephony/sip/failover` | [telephony.ts:1244](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L1244) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/telephony/sip/status` | [telephony.ts:1209](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L1209) | Clinical Read Secret | — | 200 | — |
| `POST` | `/api/telephony/sip/transfer` | [telephony.ts:1321](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L1321) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/telephony/sms/webhook` | [telephony.ts:966](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L966) | Clinical Read Secret | — | 400, 404 | `communicationEvents` |
| `POST` | `/api/telephony/webhook` | [telephony.ts:779](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts#L779) | Public / OTP / Webhook | `telephonySmsWebhookPayloadSchema` | 400 | `clinics` |
| `GET` | `/api/v1/message-templates` | [messageTemplates.ts:38](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/messageTemplates.ts#L38) | Clinical Mutation Secret | `templateQuerySchema` | 404 | — |
| `POST` | `/api/v1/message-templates` | [messageTemplates.ts:108](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/messageTemplates.ts#L108) | Clinical Mutation Secret | `createMessageTemplateSchema` | 201, 400 | — |
| `GET` | `/api/v1/message-templates/:id` | [messageTemplates.ts:79](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/messageTemplates.ts#L79) | Clinical Mutation Secret | `createMessageTemplateSchema` | 201, 400, 404 | — |
| `PUT` | `/api/v1/message-templates/:id` | [messageTemplates.ts:164](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/messageTemplates.ts#L164) | Clinical Mutation Secret | `updateMessageTemplateSchema` | 400, 404 | — |
| `DELETE` | `/api/v1/message-templates/:id` | [messageTemplates.ts:244](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/messageTemplates.ts#L244) | Clinical Mutation Secret | `renderMessageTemplateInputSchema` | 400, 404 | — |
| `POST` | `/api/v1/message-templates/render` | [messageTemplates.ts:299](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/messageTemplates.ts#L299) | Clinical Mutation Secret | `renderMessageTemplateInputSchema` | 400 | — |
| `POST` | `/api/v1/message-templates/seed` | [messageTemplates.ts:330](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/messageTemplates.ts#L330) | Clinical Mutation Secret | — | 200 | — |
| `GET` | `/api/v1/webhooks/whatsapp` | [whatsappWebhook.ts:525](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/whatsappWebhook.ts#L525) | Public / OTP / Webhook | — | 200, 403 | `denteWhatsappBotConfigs` |
| `POST` | `/api/v1/webhooks/whatsapp` | [whatsappWebhook.ts:575](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/whatsappWebhook.ts#L575) | Public / OTP / Webhook | — | 200 | `denteWhatsappBotConfigs` |
| `POST` | `/api/whatsapp/send` | [whatsapp.ts:684](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/whatsapp.ts#L684) | Verified Tenant Org | `bodySchema` | 400, 404 | `patients, denteWhatsappBotConfigs` |
| `GET` | `/api/whatsapp/settings` | [whatsapp.ts:172](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/whatsapp.ts#L172) | Staff or Admin | `updateWhatsappConfigSchema` | 400, 404 | `denteWhatsappBotConfigs` |
| `PUT` | `/api/whatsapp/settings` | [whatsapp.ts:220](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/whatsapp.ts#L220) | Staff or Admin | `updateWhatsappConfigSchema` | 400 | `denteWhatsappBotConfigs` |
| `GET` | `/api/whatsapp/status` | [whatsapp.ts:290](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/whatsapp.ts#L290) | Verified Tenant Org | — | 400, 403 | `denteWhatsappBotConfigs` |
| `POST` | `/api/whatsapp/templates/sync` | [whatsapp.ts:814](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/whatsapp.ts#L814) | Verified Tenant Org | — | 200 | `denteWhatsappBotConfigs` |
| `GET` | `/api/whatsapp/webhook` | [whatsapp.ts:325](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/whatsapp.ts#L325) | Public / OTP / Webhook | — | 200, 400, 403 | `denteWhatsappBotConfigs` |

---

## <a id="patients-crm"></a>📁 Patients & CRM (55 эндпоинтов)

> Управление картотекой пациентов, анамнез, аллергостатус, родственные связи, детекция дублей, возврат потерянных (CRM Churn 210 дней) и программы лояльности.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/crm/leak-detector` | [crmLeakDetector.ts:45](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/crmLeakDetector.ts#L45) | Verified Tenant Org | `querySchema` | 400 | — |
| `POST` | `/api/crm/leak-detector/:id/cancel-lead` | [crmLeakDetector.ts:398](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/crmLeakDetector.ts#L398) | Verified Tenant Org | `cancelSchema` | 404 | `crmLeakDetectorLeads` |
| `POST` | `/api/crm/leak-detector/:id/create-task` | [crmLeakDetector.ts:449](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/crmLeakDetector.ts#L449) | Verified Tenant Org | — | 404 | `crmLeakDetectorLeads` |
| `POST` | `/api/crm/leak-detector/:id/process-lead` | [crmLeakDetector.ts:358](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/crmLeakDetector.ts#L358) | Verified Tenant Org | `processSchema` | 404 | `crmLeakDetectorLeads` |
| `POST` | `/api/crm/leak-detector/:id/start-lead` | [crmLeakDetector.ts:318](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/crmLeakDetector.ts#L318) | Verified Tenant Org | `processSchema` | 404 | `crmLeakDetectorLeads` |
| `POST` | `/api/crm/leak-detector/sync` | [crmLeakDetector.ts:130](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/crmLeakDetector.ts#L130) | Verified Tenant Org | — | 200 | `clinics` |
| `GET` | `/api/funnels/leak-detector` | [crmLeakDetector.ts:431](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/crmLeakDetector.ts#L431) | Verified Tenant Org | — | 404 | `crmLeakDetectorLeads` |
| `GET` | `/api/leads` | [leads.ts:30](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/leads.ts#L30) | Staff or Admin | `leadSchema` | 400, 404 | `crmLeads` |
| `POST` | `/api/leads` | [leads.ts:45](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/leads.ts#L45) | Staff or Admin | `leadSchema` | 400, 404 | `crmLeads` |
| `PUT` | `/api/leads/:id` | [leads.ts:117](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/leads.ts#L117) | Staff or Admin | `leadSchema` | 400, 404 | `crmLeads` |
| `DELETE` | `/api/leads/:id` | [leads.ts:150](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/leads.ts#L150) | Staff or Admin | `convertLeadSchema` | 400, 404 | `crmLeads, users, clinicChairs` |
| `POST` | `/api/leads/:id/convert` | [leads.ts:174](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/leads.ts#L174) | Staff or Admin | `convertLeadSchema` | 400 | `crmLeads, users, clinicChairs` |
| `POST` | `/api/leads/:id/create-patient` | [leads.ts:308](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/leads.ts#L308) | Staff or Admin | — | 200, 404, 500 | `crmLeads, patients` |
| `PATCH` | `/api/leads/:id/status` | [leads.ts:73](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/leads.ts#L73) | Staff or Admin | `leadSchema` | 400, 404 | `crmLeads` |
| `POST` | `/api/loyalty/accrue` | [loyalty.ts:132](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/loyalty.ts#L132) | Verified Tenant Org | `manualAccrueBodySchema` | 400 | `patients, patientBonusBalances` |
| `GET` | `/api/loyalty/balance/:patientId` | [loyalty.ts:38](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/loyalty.ts#L38) | Verified Tenant Org | — | 404 | `patients, patientBonusBalances, bonusTransactions` |
| `POST` | `/api/loyalty/redeem` | [loyalty.ts:244](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/loyalty.ts#L244) | Verified Tenant Org | `redeemPointsBodySchema` | 400 | `patients, patientBonusBalances, patientInvoices` |
| `GET` | `/api/loyalty/transactions/:patientId` | [loyalty.ts:92](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/loyalty.ts#L92) | Verified Tenant Org | `manualAccrueBodySchema` | 400 | `bonusTransactions, patients` |
| `GET` | `/api/patients` | [patients.ts:586](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L586) | Verified Tenant Org | `patientSchema` | 403 | — |
| `POST` | `/api/patients` | [patients.ts:790](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L790) | Verified Tenant Org | — | 400, 422 | — |
| `GET` | `/api/patients/:patientId` | [patients.ts:658](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L658) | Verified Tenant Org | — | 200 | — |
| `PUT` | `/api/patients/:patientId` | [patients.ts:871](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L871) | Verified Tenant Org | — | 400, 422 | — |
| `PUT` | `/api/patients/:patientId/administrative-profile` | [patients.ts:957](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L957) | Verified Tenant Org | — | 400 | — |
| `POST` | `/api/patients/:patientId/archive` | [patients.ts:1933](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1933) | Verified Tenant Org | `patientArchiveBodySchema` | 400, 401, 403 | — |
| `GET` | `/api/patients/:patientId/archive-status` | [patients.ts:1798](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1798) | Verified Tenant Org | `patientArchiveStatusBodySchema` | 200, 500 | — |
| `POST` | `/api/patients/:patientId/archive-status` | [patients.ts:1838](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1838) | Verified Tenant Org | `patientArchiveStatusBodySchema` | 200, 400 | — |
| `GET` | `/api/patients/:patientId/communication-timelines` | [patients.ts:1206](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1206) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/patients/:patientId/consents` | [patients.ts:1067](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1067) | Verified Tenant Org | — | 400 | — |
| `GET` | `/api/patients/:patientId/consents` | [patients.ts:1159](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1159) | Verified Tenant Org | — | 200, 500 | — |
| `GET` | `/api/patients/:patientId/duplicates` | [patientDuplicates.ts:98](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientDuplicates.ts#L98) | Clinical Mutation Secret | `mergeSchema` | 404, 409 | — |
| `GET` | `/api/patients/:patientId/reclamations` | [patients.ts:1280](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1280) | Verified Tenant Org | — | 200, 403, 500 | — |
| `POST` | `/api/patients/:patientId/reclamations` | [patients.ts:1331](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1331) | Verified Tenant Org | `patientReclamationCreateBodySchema` | 201, 400 | — |
| `PUT` | `/api/patients/:patientId/reclamations/:reclamationId` | [patients.ts:1406](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1406) | Verified Tenant Org | `patientReclamationStatusBodySchema` | 200, 400, 404 | — |
| `DELETE` | `/api/patients/:patientId/reclamations/:reclamationId` | [patients.ts:1483](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1483) | Verified Tenant Org | — | 200, 404, 500 | — |
| `GET` | `/api/patients/:patientId/tickets` | [patients.ts:1546](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1546) | Verified Tenant Org | `patientTaskTicketCreateBodySchema` | 200, 400, 500 | — |
| `POST` | `/api/patients/:patientId/tickets` | [patients.ts:1581](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1581) | Verified Tenant Org | `patientTaskTicketCreateBodySchema` | 400 | — |
| `PUT` | `/api/patients/:patientId/tickets/:ticketId` | [patients.ts:1669](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1669) | Verified Tenant Org | `patientTaskTicketStatusBodySchema` | 200, 400, 404, 500 | — |
| `DELETE` | `/api/patients/:patientId/tickets/:ticketId` | [patients.ts:1746](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L1746) | Verified Tenant Org | — | 200, 404, 500 | — |
| `POST` | `/api/patients/:patientId/unarchive` | [patients.ts:2045](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L2045) | Verified Tenant Org | — | 401, 403 | — |
| `GET` | `/api/patients/archive-reasons` | [patients.ts:2030](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts#L2030) | Verified Tenant Org | — | 401, 403 | — |
| `GET` | `/api/patients/duplicates` | [patientDuplicates.ts:72](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientDuplicates.ts#L72) | Clinical Mutation Secret | `listQuerySchema` | 404 | — |
| `POST` | `/api/patients/duplicates/dismiss` | [patientDuplicates.ts:180](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientDuplicates.ts#L180) | Clinical Mutation Secret | `dismissSchema` | 200 | — |
| `POST` | `/api/patients/duplicates/merge` | [patientDuplicates.ts:130](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientDuplicates.ts#L130) | Clinical Mutation Secret | `mergeSchema` | 409 | — |
| `GET` | `/api/patients/recall-candidates` | [patientRecall.ts:50](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientRecall.ts#L50) | Clinical Mutation Secret | `listQuerySchema` | 404 | — |
| `POST` | `/api/patients/recall-candidates/invite` | [patientRecall.ts:88](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientRecall.ts#L88) | Clinical Mutation Secret | `inviteSchema` | 404 | — |
| `POST` | `/api/referrals/attribute` | [referrals.ts:112](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/referrals.ts#L112) | Verified Tenant Org | `attributeReferralBodySchema` | 400, 404, 409 | `patientReferralCodes, patientReferrals` |
| `GET` | `/api/referrals/my-code/:patientId` | [referrals.ts:44](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/referrals.ts#L44) | Verified Tenant Org | — | 404 | `patients, patientReferralCodes` |
| `POST` | `/api/referrals/reward-first-visit` | [referrals.ts:214](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/referrals.ts#L214) | Verified Tenant Org | `rewardFirstVisitBodySchema` | 200, 400, 404 | `patientReferrals, payments` |
| `GET` | `/api/v1/patients/:id/relationships` | [patientRelationships.ts:38](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientRelationships.ts#L38) | Verified Tenant Org | `patientIdParamsSchema` | 200, 400, 404 | `patients, patientRelationships` |
| `POST` | `/api/v1/patients/:id/relationships` | [patientRelationships.ts:188](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientRelationships.ts#L188) | Verified Tenant Org | `patientIdParamsSchema` | 400 | `patients, patientRelationships` |
| `DELETE` | `/api/v1/patients/:id/relationships/:relationId` | [patientRelationships.ts:325](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientRelationships.ts#L325) | Verified Tenant Org | `relationDeleteParamsSchema` | 200, 400, 404 | `patientRelationships` |
| `POST` | `/api/v1/recalls/book` | [recalls.ts:136](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/recalls.ts#L136) | Verified Tenant Org | `bookBodySchema` | 400 | — |
| `POST` | `/api/v1/recalls/dispatch` | [recalls.ts:66](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/recalls.ts#L66) | Verified Tenant Org | `dispatchBodySchema` | 400 | — |
| `GET` | `/api/v1/recalls/due` | [recalls.ts:43](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/recalls.ts#L43) | Verified Tenant Org | `dispatchBodySchema` | 400 | — |
| `POST` | `/api/v1/recalls/snooze` | [recalls.ts:101](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/recalls.ts#L101) | Verified Tenant Org | `snoozeBodySchema` | 400 | — |

---

## <a id="schedule-booking"></a>📁 Schedule & Booking (32 эндпоинтов)

> Управление расписанием кресел, приёмы, утренний обзвон (Day Confirmations), лист ожидания с автоподбором окон, онлайн-запись и 1-клик подтверждение по SMS/мессенджерам.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/appointments` | [schedule.ts:727](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/schedule.ts#L727) | Verified Tenant Org | — | 201, 400 | — |
| `PATCH` | `/api/appointments/:appointmentId` | [schedule.ts:925](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/schedule.ts#L925) | Verified Tenant Org | — | 200 | `scheduleClipboardItems` |
| `GET` | `/api/appointments/:appointmentId/waitlist-matches` | [waitlistMatches.ts:155](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/waitlistMatches.ts#L155) | Clinical Read Secret | — | 404 | `appointments, clinics` |
| `GET` | `/api/integrations/yandex-calendar-syncs` | [yandexCalendar.ts:321](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/yandexCalendar.ts#L321) | Staff Identity | — | 400, 500 | `yandexCalendarSyncs, users` |
| `GET` | `/api/integrations/yandex-calendar/auth` | [yandexCalendar.ts:271](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/yandexCalendar.ts#L271) | Staff Identity | `SettingsSchema` | 400, 500 | `users` |
| `GET` | `/api/integrations/yandex-calendar/feed-url` | [yandexCalendar.ts:420](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/yandexCalendar.ts#L420) | Staff Identity | — | 403 | `users` |
| `POST` | `/api/integrations/yandex-calendar/settings` | [yandexCalendar.ts:291](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/yandexCalendar.ts#L291) | Staff Identity | `SettingsSchema` | 400, 500 | `users, yandexCalendarSyncs` |
| `POST` | `/api/integrations/yandex-calendar/sync` | [yandexCalendar.ts:350](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/yandexCalendar.ts#L350) | Staff Identity | — | 400, 500 | `users, yandexCalendarSyncs` |
| `GET` | `/api/p/:code` | [publicAppointmentActions.ts:426](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicAppointmentActions.ts#L426) | Public / OTP / Webhook | — | 200 | — |
| `GET` | `/api/public/booking/` | [publicBooking.ts:353](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicBooking.ts#L353) | Public / OTP / Webhook | `organizationIdSchema` | 404, 429, 503 | `organizations, users` |
| `POST` | `/api/public/booking/:organizationId/book` | [publicBooking.ts:664](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicBooking.ts#L664) | Public / OTP / Webhook | `organizationIdSchema` | 400, 404, 429 | — |
| `GET` | `/api/public/booking/:organizationId/doctors` | [publicBooking.ts:358](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicBooking.ts#L358) | Public / OTP / Webhook | `organizationIdSchema` | 404, 429, 503 | `organizations, users` |
| `GET` | `/api/public/booking/:organizationId/slots` | [publicBooking.ts:616](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicBooking.ts#L616) | Public / OTP / Webhook | `optionalDoctorIdSchema` | 400, 429 | — |
| `GET` | `/api/public/booking/:organizationId/slots/:doctorId` | [publicBooking.ts:643](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicBooking.ts#L643) | Public / OTP / Webhook | `organizationIdSchema` | 400, 404, 429 | — |
| `PUT` | `/api/schedule/appointments/:appointmentId` | [schedule.ts:926](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/schedule.ts#L926) | Verified Tenant Org | — | 200 | `scheduleClipboardItems` |
| `GET` | `/api/schedule/clipboard-items` | [schedule.ts:945](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/schedule.ts#L945) | Verified Tenant Org | — | 400 | `scheduleClipboardItems, appointments` |
| `POST` | `/api/schedule/clipboard-items` | [schedule.ts:979](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/schedule.ts#L979) | Verified Tenant Org | — | 400, 404 | `appointments` |
| `DELETE` | `/api/schedule/clipboard-items/:id` | [schedule.ts:1083](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/schedule.ts#L1083) | Verified Tenant Org | — | 200, 400, 404 | `scheduleClipboardItems` |
| `POST` | `/api/schedule/clipboard-items/:id/paste` | [schedule.ts:1123](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/schedule.ts#L1123) | Verified Tenant Org | — | 400, 404 | `scheduleClipboardItems` |
| `GET` | `/api/schedule/day-confirmations` | [dayConfirmations.ts:180](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/dayConfirmations.ts#L180) | Clinical Read Secret | `querySchema` | 200 | `clinics, appointments` |
| `GET` | `/api/schedule/freed-slots` | [waitlistMatches.ts:45](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/waitlistMatches.ts#L45) | Clinical Read Secret | — | 200 | `clinics, appointments` |
| `GET` | `/api/schedule/ical/:token` | [yandexCalendar.ts:623](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/yandexCalendar.ts#L623) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/schedule/ical/doctor/:doctorId/feed-url` | [yandexCalendar.ts:460](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/yandexCalendar.ts#L460) | Staff Identity | — | 403, 404 | `users` |
| `POST` | `/api/schedule/ical/doctor/:doctorId/rotate` | [yandexCalendar.ts:523](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/yandexCalendar.ts#L523) | Staff Identity | — | 403, 404 | `users` |
| `GET` | `/api/schedule/ical/doctor/:token` | [yandexCalendar.ts:620](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/yandexCalendar.ts#L620) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/schedule/ical/rotate` | [yandexCalendar.ts:609](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/yandexCalendar.ts#L609) | Staff Identity | — | 200 | — |
| `GET` | `/api/schedule/urgent-schedule-requests` | [schedule.ts:1304](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/schedule.ts#L1304) | Verified Tenant Org | — | 200 | `urgentScheduleRequests` |
| `PATCH` | `/api/schedule/urgent-schedule-requests/:id/resolve` | [schedule.ts:1322](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/schedule.ts#L1322) | Verified Tenant Org | — | 200 | `urgentScheduleRequests` |
| `GET` | `/api/waitlist` | [waitlist.ts:33](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/waitlist.ts#L33) | Staff or Admin | `waitlistSchema` | 400, 500 | `appointmentWaitlists` |
| `POST` | `/api/waitlist` | [waitlist.ts:81](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/waitlist.ts#L81) | Staff or Admin | `waitlistSchema` | 400, 404, 500 | `patients, users` |
| `PUT` | `/api/waitlist/:id` | [waitlist.ts:188](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/waitlist.ts#L188) | Staff or Admin | `updateSchema` | 400, 404, 500 | `appointmentWaitlists` |
| `DELETE` | `/api/waitlist/:id` | [waitlist.ts:265](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/waitlist.ts#L265) | Staff or Admin | — | 404, 500 | — |

---

## <a id="dental-lab-зтл-"></a>📁 Dental Lab (ЗТЛ) (17 эндпоинтов)

> Наряды в зуботехническую лабораторию, статусы изготовления коронок/протезов, этапы примерок, фиксация installed и списание стоимости работ.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/clinical/dental-lab/check-plan-continuity` | [dentalLab.ts:207](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/dentalLab.ts#L207) | Staff or Admin | `checkPlanContinuitySchema` | 200, 400, 403 | — |
| `POST` | `/api/clinical/dental-lab/express-order` | [dentalLab.ts:245](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/dentalLab.ts#L245) | Staff or Admin | `expressLabOrderSchema` | 400, 403 | — |
| `GET` | `/api/clinical/dental-lab/presets` | [dentalLab.ts:189](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/dentalLab.ts#L189) | Verified Tenant Org | `checkPlanContinuitySchema` | 200, 400 | — |
| `GET` | `/api/clinical/lab-orders` | [lab.ts:106](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L106) | Verified Tenant Org | `querySchema` | 400, 403 | — |
| `POST` | `/api/clinical/lab-orders` | [lab.ts:192](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L192) | Staff or Admin | `createLabOrderSchema` | 400, 403 | `patients, users` |
| `PUT` | `/api/clinical/lab-orders/:id` | [lab.ts:324](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L324) | Staff or Admin | `updateSchema` | 400, 403 | `labOrders` |
| `PATCH` | `/api/clinical/lab-orders/:id` | [lab.ts:781](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L781) | Staff or Admin | — | 403, 404, 409 | `labOrders` |
| `DELETE` | `/api/clinical/lab-orders/:id` | [lab.ts:787](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L787) | Staff or Admin | — | 403, 404, 409 | `labOrders` |
| `GET` | `/api/clinical/lab-orders/:id/events` | [lab.ts:1176](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L1176) | Verified Tenant Org | `Inline z.object` | 403 | `labOrderEvents` |
| `POST` | `/api/clinical/lab-orders/:id/events` | [lab.ts:1227](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L1227) | Verified Tenant Org | `createLabOrderEventSchema` | 201, 400, 403 | — |
| `GET` | `/api/clinical/lab-orders/:id/items` | [lab.ts:1006](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L1006) | Verified Tenant Org | `Inline z.object` | 403 | `labItems` |
| `POST` | `/api/clinical/lab-orders/:id/items` | [lab.ts:1087](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L1087) | Staff or Admin | `createLabItemSchema` | 400, 403, 404 | `labOrders` |
| `POST` | `/api/clinical/lab-orders/:id/pipeline-stage` | [labOrders.ts:128](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/labOrders.ts#L128) | Staff or Admin | `bodySchema` | 400, 403 | `labOrders` |
| `GET` | `/api/clinical/lab-orders/:id/warranty-passport` | [labOrders.ts:39](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/labOrders.ts#L39) | Verified Tenant Org | — | 403, 404 | `labOrders` |
| `PATCH` | `/api/lab/orders/:id` | [lab.ts:780](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L780) | Staff or Admin | — | 403, 404, 409 | `labOrders` |
| `GET` | `/api/portal/lab-order/:token` | [lab.ts:873](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L873) | Verified Tenant Org | `Inline Zod safeParse` | 400, 404, 500 | — |
| `POST` | `/api/portal/lab-order/:token/status` | [lab.ts:912](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts#L912) | Verified Tenant Org | `Inline Zod safeParse` | 400, 404, 409 | `labOrders` |

---

## <a id="radiology-dicom"></a>📁 Radiology & DICOM (42 эндпоинтов)

> Прямой захват визиографа (RVG) <50мс, загрузка DICOM КТ/ОПТГ, DICOMweb (WADO-RS / QIDO-RS), 3D-планирование имплантации и интеграция с ИИ Diagnocat.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/dicomweb/studies` | [dicomweb.ts:347](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/dicomweb.ts#L347) | Clinical Read Secret | — | 403 | — |
| `GET` | `/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid` | [dicomweb.ts:484](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/dicomweb.ts#L484) | Clinical Read Secret | — | 403 | — |
| `GET` | `/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frame` | [dicomweb.ts:616](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/dicomweb.ts#L616) | Clinical Read Secret | — | 400, 403 | — |
| `POST` | `/api/imaging/dicom/first-frame-preview` | [imaging.ts:9066](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9066) | Clinical Mutation Secret | — | 400 | — |
| `POST` | `/api/imaging/dicom/folder-series-preview` | [imaging.ts:9040](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9040) | Clinical Read Secret | — | 400 | — |
| `POST` | `/api/imaging/dicom/folder-workup-plan` | [imaging.ts:9087](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9087) | Clinical Mutation Secret | — | 400 | — |
| `POST` | `/api/imaging/dicom/local-folder-discovery` | [imaging.ts:8992](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L8992) | Clinical Read Secret | — | 400 | — |
| `POST` | `/api/imaging/dicom/render-cache-plan` | [imaging.ts:8866](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L8866) | Clinical Mutation Secret | — | 400 | — |
| `POST` | `/api/imaging/dicom/series-preview` | [imaging.ts:8792](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L8792) | Clinical Read Secret | — | 400 | — |
| `POST` | `/api/imaging/dicom/viewer-launch-manifest` | [imaging.ts:8825](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L8825) | Clinical Read Secret | — | 400 | — |
| `POST` | `/api/imaging/dicom/viewer-tool-state` | [imaging.ts:8847](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L8847) | Clinical Read Secret | — | 400 | — |
| `POST` | `/api/imaging/dicom/viewer-workbench-manifest` | [imaging.ts:8907](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L8907) | Clinical Mutation Secret | `dicomWorkbenchBundleResponseSchema` | 201, 400 | — |
| `POST` | `/api/imaging/dicom/workbench-bundles` | [imaging.ts:8929](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L8929) | Clinical Mutation Secret | `dicomWorkbenchBundleResponseSchema` | 201, 400 | — |
| `GET` | `/api/imaging/dicom/workbench-bundles` | [imaging.ts:8960](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L8960) | Clinical Read Secret | `dicomWorkbenchBundleListResponseSchema` | 400 | — |
| `POST` | `/api/imaging/dicom/workstation-readiness` | [imaging.ts:8885](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L8885) | Clinical Mutation Secret | — | 400 | — |
| `POST` | `/api/imaging/dicomweb/check` | [imaging.ts:8813](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L8813) | Clinical Read Secret | — | 400 | — |
| `POST` | `/api/imaging/folders/scan-preview` | [imaging.ts:9135](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9135) | Clinical Read Secret | `imagingFolderScanResponseSchema` | 400 | — |
| `POST` | `/api/imaging/imports/commit` | [imaging.ts:9110](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9110) | Clinical Mutation Secret | — | 400 | — |
| `POST` | `/api/imaging/imports/preview` | [imaging.ts:8767](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L8767) | Clinical Read Secret | — | 400 | — |
| `POST` | `/api/imaging/local-offline/register` | [imaging.ts:9608](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9608) | Clinical Mutation Secret | — | 200 | — |
| `GET` | `/api/imaging/local-offline/studies/:studyId` | [imaging.ts:9671](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9671) | Clinical Mutation Secret | — | 200, 400, 404 | — |
| `POST` | `/api/imaging/local-offline/sync-queue` | [imaging.ts:9701](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9701) | Clinical Mutation Secret | — | 200, 400 | — |
| `GET` | `/api/imaging/local-offline/sync-status` | [imaging.ts:9727](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9727) | Clinical Read Secret | — | 200 | — |
| `POST` | `/api/imaging/local-organizer/scan-preview` | [imaging.ts:9016](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9016) | Clinical Read Secret | — | 400 | — |
| `GET` | `/api/imaging/planning/load` | [imaging_planning.ts:289](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging_planning.ts#L289) | Verified Tenant Org | `loadPlanningQuerySchema` | 400, 401, 404, 500 | `patients, patientCtPlannings` |
| `POST` | `/api/imaging/planning/save` | [imaging_planning.ts:174](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging_planning.ts#L174) | Verified Tenant Org | `savePlanningSchema` | 400, 401, 404 | `patients, patientCtPlannings` |
| `GET` | `/api/imaging/studies` | [imaging.ts:9187](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9187) | Clinical Read Secret | `querySchema` | 400, 403 | — |
| `POST` | `/api/imaging/studies` | [imaging.ts:9307](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9307) | Clinical Mutation Secret | — | 400 | — |
| `POST` | `/api/imaging/studies/:id/analyze` | [imaging.ts:9379](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9379) | Clinical Mutation Secret | — | 422 | — |
| `GET` | `/api/imaging/studies/:id/file` | [imaging.ts:9518](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9518) | Clinical Read Secret | — | 400, 404, 415 | — |
| `GET` | `/api/imaging/studies/:id/preview.svg` | [imaging.ts:9482](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9482) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/imaging/studies/:id/viewer-session` | [imaging.ts:9231](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9231) | Clinical Mutation Secret | `imagingViewerSessionResponseSchema` | 403 | — |
| `PUT` | `/api/imaging/studies/:id/viewer-session` | [imaging.ts:9273](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L9273) | Clinical Mutation Secret | `imagingViewerSessionResponseSchema` | 200, 400 | — |
| `POST` | `/api/imaging/visiograph-ai` | [imaging.ts:8726](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts#L8726) | Clinical Read Secret | `Inline Zod safeParse` | 400, 500 | — |
| `GET` | `/api/integrations/diagnocat/reports/:patientId` | [diagnocat.ts:37](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/integrations/diagnocat.ts#L37) | Verified Tenant Org | — | 403 | `patients, diagnocatReports` |
| `POST` | `/api/integrations/diagnocat/webhook` | [diagnocat.ts:11](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/integrations/diagnocat.ts#L11) | Public / OTP / Webhook | — | 400, 403 | `patients` |
| `POST` | `/api/xray/scans` | [xray.ts:357](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/xray.ts#L357) | Clinical Mutation Secret | `createXrayScanSchema` | 201, 400, 500 | — |
| `GET` | `/api/xray/scans` | [xray.ts:513](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/xray.ts#L513) | Clinical Read Secret | `querySchema` | 400, 403 | `xrayScans` |
| `GET` | `/api/xray/scans/:id` | [xray.ts:574](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/xray.ts#L574) | Clinical Read Secret | — | 403, 404 | `xrayScans` |
| `PUT` | `/api/xray/scans/:id` | [xray.ts:648](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/xray.ts#L648) | Clinical Mutation Secret | `updateXrayScanSchema` | 400, 403 | — |
| `DELETE` | `/api/xray/scans/:id` | [xray.ts:736](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/xray.ts#L736) | Clinical Mutation Secret | — | 204, 403, 404 | — |
| `POST` | `/api/xray/scans/:id/analyze` | [xray.ts:426](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/xray.ts#L426) | Clinical Read Secret | — | 400, 404, 409 | `xrayScans` |

---

## <a id="documents-legal"></a>📁 Documents & Legal (40 эндпоинтов)

> Генерация медицинских документов (043/у, ИДС, договоры, акты), headless PDF-рендер, справки 13% НДФЛ для ФНС (КНД 1151156), XML-выгрузка, подписание УКЭП КриптоПро и интеграция с РЭМД ЕГИСЗ.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/billing/tax-deduction` | [ndflCalculator.ts:185](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/ndflCalculator.ts#L185) | Clinical Read Secret | `ndflQuerySchema` | 400 | — |
| `GET` | `/api/billing/tax-deduction/:patientId` | [ndflCalculator.ts:180](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/ndflCalculator.ts#L180) | Clinical Read Secret | `ndflQuerySchema` | 400 | — |
| `GET` | `/api/billing/tax-deduction/preview/:patientId` | [ndflCalculator.ts:179](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/ndflCalculator.ts#L179) | Clinical Read Secret | `ndflQuerySchema` | 400 | — |
| `POST` | `/api/billing/tax-deduction/xml` | [ndflCalculator.ts:184](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/ndflCalculator.ts#L184) | Clinical Read Secret | `ndflQuerySchema` | 400 | — |
| `GET` | `/api/clinical/egisz/integration-status` | [egisz.ts:116](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L116) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/clinical/egisz/outbox` | [egisz.ts:1446](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L1446) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/clinical/egisz/outbox/:outboxId/receipt` | [egisz.ts:1507](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L1507) | Clinical Read Secret | `Inline Zod safeParse` | 200, 400, 404 | — |
| `POST` | `/api/clinical/egisz/outbox/dispatch` | [egisz.ts:1365](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L1365) | Clinical Mutation Secret | — | 200 | — |
| `GET` | `/api/clinical/egisz/outbox/status` | [egisz.ts:1419](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L1419) | Clinical Read Secret | — | 200 | — |
| `POST` | `/api/clinical/egisz/outbox/sync-status` | [egisz.ts:1392](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L1392) | Clinical Mutation Secret | — | 200 | — |
| `POST` | `/api/clinical/egisz/validate-doctor-snils` | [egisz.ts:168](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L168) | Clinical Read Secret | `validateDoctorSnilsBodySchema` | 200, 400 | — |
| `GET` | `/api/clinical/egisz/visits/:visitId/receipt` | [egisz.ts:1551](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L1551) | Clinical Read Secret | `Inline Zod safeParse` | 200, 400, 404 | — |
| `GET` | `/api/document-templates` | [documentTemplates.ts:171](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documentTemplates.ts#L171) | Verified Tenant Org | — | 200 | `documentTemplateCategories, documentTemplates` |
| `GET` | `/api/document-templates/:id` | [documentTemplates.ts:268](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documentTemplates.ts#L268) | Verified Tenant Org | — | 400, 404 | `documentTemplates, documentTemplateCategories` |
| `POST` | `/api/document-templates/:id/render` | [documentTemplates.ts:356](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documentTemplates.ts#L356) | Verified Tenant Org | `renderDocumentBodySchema` | 400 | `documentTemplates` |
| `GET` | `/api/document-templates/variables` | [documentTemplates.ts:129](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documentTemplates.ts#L129) | Verified Tenant Org | — | 200 | `documentTemplateVariables, documentTemplateCategories` |
| `POST` | `/api/documents` | [create.ts:39](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/create.ts#L39) | Clinical Mutation Secret | `createDocumentSchema` | 400, 403 | — |
| `GET` | `/api/documents` | [query.ts:77](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/query.ts#L77) | Verified Tenant Org | — | 403 | `generatedDocuments` |
| `GET` | `/api/documents/:id` | [query.ts:191](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/query.ts#L191) | Verified Tenant Org | — | 400, 403, 404 | — |
| `GET` | `/api/documents/:id/audit-facts` | [auditFacts.ts:9](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/auditFacts.ts#L9) | Clinical Read Secret | — | 404 | — |
| `GET` | `/api/documents/:id/html` | [html.ts:24](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/html.ts#L24) | Clinical Read Secret | — | 400, 403, 404, 409 | — |
| `POST` | `/api/documents/:id/issue` | [issue.ts:44](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/issue.ts#L44) | Clinical Mutation Secret | `issueDocumentSchema` | 400, 403, 404, 409 | — |
| `GET` | `/api/documents/:id/pdf` | [pdf.ts:40](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/pdf.ts#L40) | Clinical Read Secret | — | 403, 404, 409 | — |
| `POST` | `/api/documents/:id/sign-ukep` | [signUkep.ts:48](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/signUkep.ts#L48) | Staff or Admin | `documentUkepSignParamsSchema` | 400, 403, 404 | `generatedDocuments` |
| `GET` | `/api/documents/:id/tax-xml` | [taxXml.ts:32](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/taxXml.ts#L32) | Clinical Read Secret | — | 404, 409 | — |
| `GET` | `/api/documents/:id/treatment-plan-pdf` | [pdf.ts:158](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/pdf.ts#L158) | Clinical Read Secret | — | 403, 404, 409 | — |
| `POST` | `/api/documents/:id/void` | [void.ts:25](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/void.ts#L25) | Clinical Mutation Secret | `voidDocumentSchema` | 400, 403, 404, 409 | — |
| `GET` | `/api/documents/ndfl-calculator` | [ndflCalculator.ts:188](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/ndflCalculator.ts#L188) | Clinical Read Secret | `ndflQuerySchema` | 400 | — |
| `GET` | `/api/documents/tax-deduction/preview/:patientId` | [ndflCalculator.ts:69](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/ndflCalculator.ts#L69) | Clinical Read Secret | `fnsTaxPayloadSchema` | 400, 422 | — |
| `POST` | `/api/documents/tax-deduction/xml` | [ndflCalculator.ts:183](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/ndflCalculator.ts#L183) | Clinical Read Secret | `ndflQuerySchema` | 400 | — |
| `GET` | `/api/documents/templates` | [query.ts:256](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/query.ts#L256) | Verified Tenant Org | `documentKindSchema` | 403, 404 | — |
| `GET` | `/api/documents/templates/:kind` | [query.ts:296](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/query.ts#L296) | Verified Tenant Org | `documentKindSchema` | 403, 404 | — |
| `GET` | `/api/egisz/logs/:patientId` | [egisz.ts:1058](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L1058) | Clinical Mutation Secret | `egiszLogsParamsSchema` | 200, 400, 500 | — |
| `GET` | `/api/egisz/multiple-diagnoses` | [egisz.ts:259](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L259) | Clinical Read Secret | `visitCdaParamsSchema` | 400, 403 | — |
| `POST` | `/api/egisz/packages` | [egisz.ts:1213](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L1213) | Clinical Mutation Secret | `egiszRemdPackageSchema` | 200 | — |
| `POST` | `/api/egisz/send` | [egisz.ts:1114](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L1114) | Clinical Mutation Secret | `egiszSendBodySchema` | 400, 404, 500 | — |
| `GET` | `/api/egisz/visits/:visitId/cda` | [egisz.ts:288](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L288) | Clinical Read Secret | `visitCdaParamsSchema` | 400, 403, 404 | — |
| `GET` | `/api/integrations/egisz-blank-permissions` | [egisz.ts:223](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts#L223) | Clinical Read Secret | — | 200 | — |
| `GET` | `/api/v1/documents/tax-deduction/preview/:patientId` | [ndflCalculator.ts:68](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/ndflCalculator.ts#L68) | Clinical Read Secret | `fnsTaxPayloadSchema` | 400, 422 | — |
| `POST` | `/api/v1/documents/tax-deduction/xml` | [ndflCalculator.ts:182](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/ndflCalculator.ts#L182) | Clinical Read Secret | `ndflQuerySchema` | 400 | — |

---

## <a id="warehouse-sanpin"></a>📁 Warehouse & SanPiN (98 эндпоинтов)

> Склад материалов, 1-клик списание карпул медсестрой (СанПиН 3.3686-21), мягкий овердрафт при задержке накладных, журналы ПСО (азопирам), стерилизация, автоклавы, отходы Б/В, микроклимат и МДЛП Честный Знак.

| Метод | Маршрут | Файл обработчика | Доступ / RBAC | Валидация Zod | Статусы | Связанные таблицы |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/inventory/:organizationId` | [inventory.ts:126](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L126) | Verified Tenant Org | — | 403 | `inventoryItems` |
| `POST` | `/api/inventory/:organizationId` | [inventory.ts:227](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L227) | Staff or Admin | `inventoryCreateBodySchema` | 400, 403 | — |
| `PUT` | `/api/inventory/:organizationId/:itemId` | [inventory.ts:452](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L452) | Staff or Admin | `inventoryUpdateBodySchema` | 400, 403 | — |
| `DELETE` | `/api/inventory/:organizationId/:itemId` | [inventory.ts:563](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L563) | Staff or Admin | — | 403, 404 | `inventoryItems` |
| `PATCH` | `/api/inventory/:organizationId/:itemId/stock` | [inventory.ts:317](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L317) | Staff or Admin | `inventoryStockBodySchema` | 400, 403 | `inventoryItems` |
| `GET` | `/api/inventory/:organizationId/alerts` | [inventory.ts:152](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L152) | Verified Tenant Org | — | 403 | `inventoryItems` |
| `POST` | `/api/inventory/:organizationId/quick-writeoff-carpules` | [inventory.ts:983](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L983) | Staff or Admin | — | 403 | — |
| `POST` | `/api/inventory/:organizationId/quick-writeoff-shift-bundle` | [inventory.ts:1018](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L1018) | Staff or Admin | — | 403 | — |
| `POST` | `/api/inventory/:organizationId/quick-writeoff-standard-kit` | [inventory.ts:950](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L950) | Staff or Admin | — | 403 | — |
| `GET` | `/api/inventory/:organizationId/rules` | [inventory.ts:607](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L607) | Verified Tenant Org | — | 403 | `procedureMaterialRules` |
| `POST` | `/api/inventory/:organizationId/rules` | [inventory.ts:753](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L753) | Staff or Admin | `inventoryRuleBodySchema` | 400, 403, 404 | `serviceCatalogItems, inventoryItems, procedureMaterialRules` |
| `DELETE` | `/api/inventory/:organizationId/rules/:ruleId` | [inventory.ts:871](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L871) | Staff or Admin | — | 403, 404 | `procedureMaterialRules` |
| `GET` | `/api/inventory/:organizationId/rules/:serviceId` | [inventory.ts:693](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L693) | Verified Tenant Org | — | 403, 404 | `serviceCatalogItems, procedureMaterialRules` |
| `POST` | `/api/inventory/:organizationId/rules/seed-defaults` | [inventory.ts:668](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L668) | Staff or Admin | — | 403, 404 | `serviceCatalogItems` |
| `DELETE` | `/api/inventory/:organizationId/rules/service/:serviceId` | [inventory.ts:919](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts#L919) | Staff or Admin | — | 403 | — |
| `GET` | `/api/mdlp/catalog/anesthetics` | [mdlp.ts:375](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L375) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/mdlp/disposal-act` | [mdlp.ts:376](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L376) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/mdlp/dispose` | [mdlp.ts:369](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L369) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/mdlp/dispose-batch` | [mdlp.ts:370](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L370) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/mdlp/items` | [mdlp.ts:377](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L377) | Verified Tenant Org | — | 200 | — |
| `GET` | `/api/mdlp/queue` | [mdlp.ts:371](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L371) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/mdlp/queue/add` | [mdlp.ts:372](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L372) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/mdlp/queue/clear` | [mdlp.ts:374](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L374) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/mdlp/queue/remove` | [mdlp.ts:373](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L373) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/mdlp/scan` | [mdlp.ts:368](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L368) | Verified Tenant Org | — | 200 | — |
| `POST` | `/api/registers/autofill-shift` | [sanpin.ts:2075](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L2075) | Staff or Admin | — | 200 | — |
| `POST` | `/api/registers/autofill-shift` | [sterilization.ts:703](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sterilization.ts#L703) | Clinical Mutation Secret | — | 500 | `visitDiaries` |
| `POST` | `/api/registers/bactericidal/close-evening-shift` | [sanpin.ts:1331](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1331) | Staff or Admin | — | 400 | `bactericidalEquipments` |
| `GET` | `/api/registers/bactericidal/equipments` | [sanpin.ts:836](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L836) | Staff or Admin | `createBactericidalEquipmentDtoSchema` | 400 | `bactericidalEquipments` |
| `POST` | `/api/registers/bactericidal/equipments` | [sanpin.ts:869](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L869) | Staff or Admin | `createBactericidalEquipmentDtoSchema` | 201, 400 | `bactericidalEquipments` |
| `PUT` | `/api/registers/bactericidal/equipments/:id` | [sanpin.ts:910](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L910) | Staff or Admin | — | 200 | `bactericidalEquipments` |
| `DELETE` | `/api/registers/bactericidal/equipments/:id` | [sanpin.ts:970](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L970) | Staff or Admin | — | 200 | `bactericidalIrradiatorLogs` |
| `GET` | `/api/registers/bactericidal/logs` | [sanpin.ts:990](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L990) | Staff or Admin | — | 200 | `bactericidalIrradiatorLogs` |
| `POST` | `/api/registers/bactericidal/logs` | [sanpin.ts:1033](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1033) | Staff or Admin | `createBactericidalLogEntryDtoSchema` | 400, 404 | `bactericidalEquipments` |
| `POST` | `/api/registers/bactericidal/open-morning-shift` | [sanpin.ts:1229](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1229) | Staff or Admin | — | 400 | `bactericidalEquipments` |
| `POST` | `/api/registers/bactericidal/shift-autopilot` | [sanpin.ts:1126](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1126) | Staff or Admin | — | 400 | `bactericidalEquipments` |
| `GET` | `/api/registers/cabinet-readiness` | [sanpin.ts:2409](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L2409) | Staff or Admin | — | 200 | — |
| `POST` | `/api/registers/cabinet-readiness` | [sanpin.ts:2423](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L2423) | Staff or Admin | — | 200 | — |
| `GET` | `/api/registers/cleaning` | [sanpin.ts:1447](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1447) | Staff or Admin | — | 200 | `generalCleaningLogs` |
| `POST` | `/api/registers/cleaning` | [sanpin.ts:1490](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1490) | Staff or Admin | `createGeneralCleaningLogDtoSchema` | 201, 400 | `generalCleaningLogs` |
| `PUT` | `/api/registers/cleaning/:id/verify` | [sanpin.ts:1538](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1538) | Staff or Admin | — | 200 | `generalCleaningLogs` |
| `POST` | `/api/registers/cleaning/autopilot-month` | [sanpin.ts:1563](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1563) | Staff or Admin | — | 200 | — |
| `GET` | `/api/registers/emergency-biohazard` | [sanpin.ts:1799](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1799) | Staff or Admin | `createEmergencyBiohazardLogDtoSchema` | 400 | `emergencyBiohazardLogs` |
| `POST` | `/api/registers/emergency-biohazard` | [sanpin.ts:1816](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1816) | Staff or Admin | `createEmergencyBiohazardLogDtoSchema` | 400 | — |
| `GET` | `/api/registers/medical-waste` | [sanpin.ts:1643](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1643) | Staff or Admin | `createMedicalWasteLogDtoSchema` | 400 | `medicalWasteLogs` |
| `POST` | `/api/registers/medical-waste` | [sanpin.ts:1685](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1685) | Staff or Admin | `createMedicalWasteLogDtoSchema` | 201, 400 | — |
| `POST` | `/api/registers/medical-waste/quick-shift-bundle` | [sanpin.ts:1732](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1732) | Staff or Admin | — | 200 | — |
| `GET` | `/api/registers/pso` | [sanpin.ts:194](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L194) | Staff or Admin | `createPsoCleaningLogDtoSchema` | 400 | `preSterilizationCleaningLogs` |
| `POST` | `/api/registers/pso` | [sanpin.ts:229](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L229) | Staff or Admin | `createPsoCleaningLogDtoSchema` | 201, 400 | — |
| `DELETE` | `/api/registers/pso/:id` | [sanpin.ts:344](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L344) | Staff or Admin | — | 404 | — |
| `POST` | `/api/registers/pso/quick-norm` | [sanpin.ts:285](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L285) | Staff or Admin | — | 201 | — |
| `GET` | `/api/registers/sterilization` | [sanpin.ts:373](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L373) | Staff or Admin | `createSterilizationLogDtoSchema` | 400 | `sterilizationLogs` |
| `POST` | `/api/registers/sterilization` | [sanpin.ts:412](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L412) | Staff or Admin | `createSterilizationLogDtoSchema` | 400 | — |
| `POST` | `/api/registers/sterilization/shift-batch` | [sanpin.ts:478](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L478) | Staff or Admin | — | 200 | `sterilizationLogs` |
| `GET` | `/api/registers/sterilizer/equipments` | [sanpin.ts:600](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L600) | Staff or Admin | `createSterilizerEquipmentDtoSchema` | 201, 400, 500 | — |
| `POST` | `/api/registers/sterilizer/equipments` | [sanpin.ts:655](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L655) | Staff or Admin | `updateSterilizerEquipmentDtoSchema` | 400, 404 | `sterilizerEquipments` |
| `PUT` | `/api/registers/sterilizer/equipments/:id` | [sanpin.ts:806](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L806) | Staff or Admin | — | 200 | `bactericidalEquipments` |
| `DELETE` | `/api/registers/sterilizer/equipments/:id` | [sanpin.ts:830](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L830) | Staff or Admin | `createBactericidalEquipmentDtoSchema` | 400 | `bactericidalEquipments` |
| `GET` | `/api/registers/sterilizers/equipments` | [sanpin.ts:599](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L599) | Staff or Admin | `createSterilizerEquipmentDtoSchema` | 201, 400, 500 | — |
| `POST` | `/api/registers/sterilizers/equipments` | [sanpin.ts:654](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L654) | Staff or Admin | `updateSterilizerEquipmentDtoSchema` | 400, 404 | `sterilizerEquipments` |
| `PUT` | `/api/registers/sterilizers/equipments/:id` | [sanpin.ts:805](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L805) | Staff or Admin | — | 200 | `bactericidalEquipments` |
| `DELETE` | `/api/registers/sterilizers/equipments/:id` | [sanpin.ts:829](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L829) | Staff or Admin | `createBactericidalEquipmentDtoSchema` | 400 | `bactericidalEquipments` |
| `GET` | `/api/registers/summary` | [sanpin.ts:47](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L47) | Staff or Admin | — | 200 | `preSterilizationCleaningLogs, sterilizationLogs, sterilizerEquipments` |
| `GET` | `/api/registers/temperature-humidity/equipments` | [sanpin.ts:1889](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1889) | Staff or Admin | `createTemperatureHumidityEquipmentDtoSchema` | 400 | `temperatureHumidityEquipments` |
| `POST` | `/api/registers/temperature-humidity/equipments` | [sanpin.ts:1912](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1912) | Staff or Admin | `createTemperatureHumidityEquipmentDtoSchema` | 201, 400 | — |
| `GET` | `/api/registers/temperature-humidity/logs` | [sanpin.ts:1950](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1950) | Staff or Admin | — | 200 | `temperatureHumidityLogs` |
| `POST` | `/api/registers/temperature-humidity/logs` | [sanpin.ts:1998](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L1998) | Staff or Admin | `createTemperatureHumidityLogDtoSchema` | 400, 404 | `temperatureHumidityEquipments` |
| `POST` | `/api/registers/temperature-humidity/shift-autopilot` | [sanpin.ts:2269](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L2269) | Staff or Admin | — | 200 | `temperatureHumidityEquipments` |
| `POST` | `/api/sterilization/chair-readiness` | [sanpin.ts:2368](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts#L2368) | Staff or Admin | — | 200 | — |
| `POST` | `/api/sterilization/daily-tests` | [sterilization.ts:561](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sterilization.ts#L561) | Staff or Admin | `createAutoclaveDailyTestSchema` | 201, 400 | — |
| `GET` | `/api/sterilization/daily-tests` | [sterilization.ts:610](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sterilization.ts#L610) | Staff or Admin | `bodySchema` | 400 | `autoclaveDailyTests` |
| `POST` | `/api/sterilization/generate-barcode` | [sterilization.ts:649](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sterilization.ts#L649) | Staff or Admin | `bodySchema` | 400 | — |
| `POST` | `/api/sterilization/link` | [sterilization.ts:249](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sterilization.ts#L249) | Clinical Mutation Secret | `Inline Zod safeParse` | 400 | `sterilizationLogs` |
| `GET` | `/api/sterilization/logs` | [sterilization.ts:118](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sterilization.ts#L118) | Staff or Admin | `scanSchema` | 200 | `sterilizationLogs` |
| `POST` | `/api/sterilization/pso-tests` | [sterilization.ts:410](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sterilization.ts#L410) | Staff or Admin | `createPsoCleaningLogSchema` | 201, 400 | — |
| `GET` | `/api/sterilization/pso-tests` | [sterilization.ts:519](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sterilization.ts#L519) | Staff or Admin | `createAutoclaveDailyTestSchema` | 400 | `preSterilizationCleaningLogs` |
| `POST` | `/api/sterilization/pso/quick-norm` | [sterilization.ts:464](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sterilization.ts#L464) | Staff or Admin | — | 201 | — |
| `POST` | `/api/sterilization/scan` | [sterilization.ts:163](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sterilization.ts#L163) | Staff or Admin | `scanSchema` | 400 | `users` |
| `GET` | `/api/treatment-consumables/:organizationId/alerts` | [treatmentConsumables.ts:518](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/treatmentConsumables.ts#L518) | Staff or Admin | `alertsQuerySchema` | 403 | — |
| `POST` | `/api/treatment-consumables/:organizationId/deduct/tooth-treatment` | [treatmentConsumables.ts:392](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/treatmentConsumables.ts#L392) | Staff or Admin | `toothTreatmentStockDeductionRequestSchema` | 400, 403 | — |
| `GET` | `/api/treatment-consumables/:organizationId/links` | [treatmentConsumables.ts:45](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/treatmentConsumables.ts#L45) | Staff or Admin | `listLinksQuerySchema` | 403, 404 | — |
| `POST` | `/api/treatment-consumables/:organizationId/links` | [treatmentConsumables.ts:108](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/treatmentConsumables.ts#L108) | Staff or Admin | `consumableLinkCreateSchema` | 201, 400, 403 | — |
| `GET` | `/api/treatment-consumables/:organizationId/links/:linkId` | [treatmentConsumables.ts:78](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/treatmentConsumables.ts#L78) | Staff or Admin | `consumableLinkCreateSchema` | 201, 400, 403, 404 | — |
| `PUT` | `/api/treatment-consumables/:organizationId/links/:linkId` | [treatmentConsumables.ts:156](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/treatmentConsumables.ts#L156) | Staff or Admin | `consumableLinkUpdateSchema` | 400, 403 | — |
| `DELETE` | `/api/treatment-consumables/:organizationId/links/:linkId` | [treatmentConsumables.ts:203](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/treatmentConsumables.ts#L203) | Staff or Admin | — | 403 | — |
| `GET` | `/api/treatment-consumables/:organizationId/options` | [treatmentConsumables.ts:271](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/treatmentConsumables.ts#L271) | Staff or Admin | `linkOptionsQuerySchema` | 400, 403 | — |
| `POST` | `/api/treatment-consumables/:organizationId/quick-writeoff-carpules` | [treatmentConsumables.ts:647](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/treatmentConsumables.ts#L647) | Staff or Admin | — | 403 | — |
| `GET` | `/api/treatment-consumables/:organizationId/service/:serviceId` | [treatmentConsumables.ts:237](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/treatmentConsumables.ts#L237) | Verified Tenant Org | `linkOptionsQuerySchema` | 403 | — |
| `GET` | `/catalog/anesthetics` | [mdlp.ts:387](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L387) | Verified Tenant Org | — | 200 | — |
| `POST` | `/disposal-act` | [mdlp.ts:388](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L388) | Verified Tenant Org | — | 200 | — |
| `POST` | `/dispose` | [mdlp.ts:381](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L381) | Verified Tenant Org | — | 200 | — |
| `POST` | `/dispose-batch` | [mdlp.ts:382](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L382) | Verified Tenant Org | — | 200 | — |
| `GET` | `/items` | [mdlp.ts:389](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L389) | Verified Tenant Org | — | 200 | — |
| `GET` | `/queue` | [mdlp.ts:383](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L383) | Verified Tenant Org | — | 200 | — |
| `POST` | `/queue/add` | [mdlp.ts:384](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L384) | Verified Tenant Org | — | 200 | — |
| `POST` | `/queue/clear` | [mdlp.ts:386](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L386) | Verified Tenant Org | — | 200 | — |
| `POST` | `/queue/remove` | [mdlp.ts:385](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L385) | Verified Tenant Org | — | 200 | — |
| `POST` | `/scan` | [mdlp.ts:380](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts#L380) | Verified Tenant Org | — | 200 | — |
