# 🛣️ Полная Карта Бэкенд-Маршрутов API Dental CRM (Fastify 5.3+)

> **Архитектурная матрица и глубокая карта всех 14 канонических категорий HTTP & WebSocket маршрутов сервера Fastify 5.3+ ([`apps/api/src/server.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/server.ts)).**  
> Каждый эндпоинт выверен по живой кодовой базе (119 файлов маршрутов, 867 эндпоинтов), подключен к боевым таблицам PostgreSQL 18.4 (208 таблиц схемы Drizzle ORM) и снабжен строгой Zod-валидацией, контекстом безопасности `withTenantCtx` (RLS) и защитой автономии врача (Мандат 8e).

---

## 🧭 Навигация и перекрестные ссылки

* 🗺️ **[Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Центральная навигационная матрица ИИ-агентов.
* 🛣️ **[Исчерпывающий Каталог маршрутов (.agents/API_ROUTES_CATALOG.md)](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** — Реестр маршрутов с детальными Zod-схемами, RBAC и привязкой к таблицам.
* 📚 **[Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)** — Центральный каталог спецификаций и нормативных актов РФ.
* 🗄️ **[Реестр Базы Данных (.agents/DATABASE.md)](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — PostgreSQL 18.4 TCP, 208 таблиц схемы в 22 модулях, RLS изоляция.
* 🗄️ **[Глубокая Карта Базы Данных (DATABASE_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/DATABASE_DEEP_MAP.md)** — Модульная схема, перечисления и реестр сущностей.
* 🖥️ **[Глубокая Карта Фронтенда (FRONTEND_COMPONENTS_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md)** — Реестр компонентов React 19 по 3-уровневой доктрине.
* 🧮 **[Алгоритмы и Общий Пакет (ALGORITHMS_AND_SHARED_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ALGORITHMS_AND_SHARED_DEEP_MAP.md)** — Ядро `@dental/shared`, валидаторы, расчеты.
* 🧪 **[Справочник Скриптов и Гейтов (SCRIPTS_AND_CLI_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md)** — Прекоммит-гейты качества и тестовые раннеры.
* 🚀 **[Руководство по API-серверу (apps/api/README.md)](file:///C:/Clinic_MVP/dental-crm/apps/api/README.md)** — Стек Fastify 5.3+, WebSocket-шлюз, мигратор и тесты.
* 📋 **[Главная Конституция (.agents/AGENTS.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Абсолютные стандарты качества, Мандат 8e (автономия врача), запрет моков.

---

## 🌟 Архитектурные принципы шлюза Fastify 5.3+

1. **Строгая типизация и Zod-контракты**: Все входящие `body`, `querystring` и `params` валидируются на границе контроллера. Схемы синхронизированы с фронтендом через пакет [`packages/shared/src/`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/).
2. **Изоляция арендаторов через RLS**: Каждый входящий запрос проходит через плагин идентификации [`getRequestIdentity`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/security/identity.ts) и оборачивается в транзакционный контекст `withTenantCtx`, выставляющий параметр `app.current_tenant = organizationId` в сессии PostgreSQL 18.
3. **Защита автономии врача (Мандат 8e)**:
   - Эндпоинты сохранения визита, дневника 043/у и добавления услуг никогда не возвращают `403/422` из-за незаполненных второстепенных полей.
   - Истечение 30 дней с момента создания плана лечения не блокирует выставление счетов, нарядов ЗТЛ или проведение оплат.
   - Врач имеет право на скидки до 100% без согласований начмеда.
4. **Копеечная точность расчётов (Мандат 8b)**: Все финансовые поля маршрутов биллинга оперируют целочисленными копейками (1 рубль = 100 копеек, `Kopecks = number`).
5. **Асинхронные очереди и отказоустойчивость**: Тяжелые операции (выгрузка в РЭМД ЕГИСЗ HL7 CDA R3, фискализация чеков 54-ФЗ, фоновый импорт баз сторонних МИС, обработка 3D DICOM) вынесены в очереди задач с автоматическими повторами.

---

## 📊 Сводный реестр доменов API (119 файлов, 867 эндпоинтов)

| # | Доменная область | Обработчики в `apps/api/src/routes/` | Эндпоинтов | Ключевые таблицы PostgreSQL |
|---|---|---|:---:|---|
| 1 | **Пациенты, Картотека и Семейный баланс** | `patients.ts`, `leads.ts`, `finance_family.ts`, `crmLeakDetector.ts`, `loyalty.ts`, `patientDuplicates.ts`, `patientRelationships.ts`, `patientRecall.ts`, `referrals.ts` | 64 | `patients`, `crm_leads`, `family_groups`, `patient_bonus_balances`, `patient_drug_allergies` |
| 2 | **Расписание, Приёмы и Дневник смен** | `schedule.ts`, `diary.ts`, `dayConfirmations.ts`, `waitlist.ts`, `waitlistMatches.ts`, `yandexCalendar.ts`, `clinicWorkflows.ts` | 47 | `appointments`, `chairs`, `appointment_waitlists`, `yandex_calendar_syncs`, `clinic_workflows` |
| 3 | **Клинический контур, ЭМК 043/у, Одонтограмма и Пародонтограмма** | `visits.ts`, `clinical.ts`, `clinicalImplants.ts`, `surgery/index.ts`, `odontogram.ts`, `periodontogram.ts`, `orthodontics.ts`, `toothHistory.ts`, `treatmentConsumables.ts`, `outpatient.ts`, `prescriptions.ts`, `pharmacology.ts`, `anesthesia.ts`, `copilot.ts` | 135 | `visits`, `visit_diaries`, `clinical_teeth_catalog`, `patient_tooth_defects`, `periodontogram_snapshots`, `anesthesia_logs` |
| 4 | **Голосовой ввод, Speech Gateway & AI Copilot** | `speech.ts`, `speechLive.ts`, `ai.ts` | 19 | `copilot_sessions`, `copilot_messages`, `ai_prompt_logs` |
| 5 | **3D DICOM MPR Viewer, Рентгенология & Diagnocat AI** | `imaging.ts`, `dicomweb.ts`, `imaging_planning.ts`, `xray.ts`, `integrations/diagnocat.ts` | 44 | `imaging_studies`, `imaging_series`, `imaging_instances`, `patient_ct_plannings`, `diagnocat_reports` |
| 6 | **Финансы, Касса 54-ФЗ, СБП QR, Эквайринг и Зарплата Т-13/Т-51** | `billing.ts`, `cashbox.ts`, `cashInstallmentsRoutes.ts`, `cashLabPaymentRoutes.ts`, `expenses.ts`, `financialPnl.ts`, `invoices.ts`, `sbpQr.ts`, `sberbank.ts`, `payments/sberPosWebhookRoute.ts`, `fiscal/fiscalReceiptRoutes.ts`, `fiscal/index.ts`, `fiscal.ts` | 78 | `payments`, `patient_invoices`, `cash_boxes`, `cash_shifts`, `fiscal_receipt_queue`, `doctor_payroll_statements` |
| 7 | **Склад, СанПиН 3.3686-21, Стерилизация и МДЛП Честный ЗНАК** | `inventory.ts`, `warehouse.ts`, `sanpin.ts`, `sterilization.ts`, `mdlp.ts` | 97 | `inventory_items`, `warehouses`, `stock_batches`, `sterilizer_equipments`, `sterilization_logs`, `mdlp_items` |
| 8 | **Зуботехническая лаборатория (ЗТЛ), Ортопедия и VITA Shade** | `lab.ts` | 17 | `dental_lab_orders`, `lab_items`, `lab_order_events` |
| 9 | **Юридический документооборот, УКЭП КриптоПро, Справки НДФЛ и ЕГИСЗ** | `documents.ts`, `documentTemplates.ts`, `documents/*.ts` (create, issue, pdf, html, query, signUkep, taxXml, ndflCalculator, auditFacts, void), `cryptoProNativeRoutes.ts`, `egisz.ts`, `egisz/n3HealthRoutes.ts`, `files.ts`, `templates.ts` | 59 | `documents`, `document_templates`, `document_template_variables`, `signed_outpatient_cards`, `egisz_outbox` |
| 10 | **Омниканальные коммуникации, Чаты, Боты (Telegram, WhatsApp, VK) и АТС** | `communications.ts`, `communicationsOutbox.ts`, `communicationReceipts.ts`, `messageTemplates.ts`, `chat.ts`, `telegram.ts`, `whatsapp.ts`, `whatsappWebhook.ts`, `vk.ts`, `telephony.ts` | 86 | `communication_events`, `communication_tasks`, `message_templates`, `outbound_message_queue`, `chat_messages` |
| 11 | **Пациентский портал, PWA Кабинет, Онлайн-запись и Self-Checkin** | `patientPortal.ts`, `portal.ts`, `portalBudgetRoutes.ts`, `publicBooking.ts`, `publicAppointmentActions.ts`, `publicEstimates.ts` | 37 | `portal_otp_codes`, `treatment_plans`, `appointments`, `patient_consents` |
| 12 | **Аналитика, Отчеты, Персонал и Настройки** | `analytics.ts`, `dashboard.ts`, `reports.ts`, `staff.ts`, `settings.ts`, `workspaceProfile.ts`, `pricelist.ts`, `marketing.ts` | 63 | `users`, `clinics`, `service_catalog_items`, `bi_analytics_snapshots` |
| 13 | **Интеграции, Умные импорты (Smart Imports) и Репликация** | `smartImports.ts`, `migration.ts`, `migrationRuns.ts`, `imports.ts`, `ingestion.ts`, `commerceMl.ts`, `integrations/flexbe.ts`, `integrations/prodoctorov.ts`, `integrations/index.ts`, `sync/index.ts`, `export.ts` | 58 | `migration_runs`, `migration_staging_records`, `sync_idempotency_records`, `import_batches` |
| 14 | **Системное ядро, WebSocket, Безопасность и Фоновые задачи** | `system.ts`, `tasks.ts`, `audit.ts`, `health.ts`, `auth.ts`, `websocket.ts`, `insurance.ts`, `max.ts`, `mobileOta.ts` | 63 | `audit_events`, `system_settings`, `system_background_jobs`, `system_ram_watchdogs` |

---

## 1. Пациенты, Картотека и Семейный баланс

> **Обработчики:** [`apps/api/src/routes/patients.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patients.ts), [`leads.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/leads.ts), [`finance_family.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/finance_family.ts), [`crmLeakDetector.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/crmLeakDetector.ts), [`loyalty.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/loyalty.ts), [`patientDuplicates.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientDuplicates.ts), [`patientRelationships.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientRelationships.ts), [`patientRecall.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientRecall.ts), [`referrals.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/referrals.ts).  
> **Таблицы БД:** `patients`, `crm_leads`, `family_groups`, `patient_bonus_balances`, `patient_drug_allergies`, `patient_relationships`, `patient_duplicate_merge_queues`, `crm_leak_detector_leads`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/patients` | Реестр пациентов с фильтрацией по ФИО, телефону, полису, статусу | Клиника / Сотрудник | `query: { search?, status?, limit?, offset?, tag? }` |
| `POST` | `/api/patients` | Быстрая регистрация пациента (соло-врач / 1 клик) | Клиника / Регистратор | `body: { firstName, lastName, phone, birthDate? }` |
| `GET` | `/api/patients/:id` | Полная электронная карта: паспорт, баланс, согласия, аллергостатус | Клиника / Сотрудник | `params: { id }` |
| `PATCH`| `/api/patients/:id` | Обновление контактных и паспортных данных пациента | Клиника / Регистратор | `params: { id }, body: PatientUpdateSchema` |
| `POST` | `/api/patients/:id/archive` | Безопасная архивация с фиксацией причины (без удаления истории) | Клиника / Управляющий | `params: { id }, body: { reasonId, comment? }` |
| `GET` | `/api/leads` | Воронка лидов первичных обращений с сайтов и коллтрекинга | Клиника / Регистратор | `query: { status?, source?, dateFrom?, dateTo? }` |
| `POST` | `/api/leads` | Создание лида через вебхуки внешних сайтов / Flexbe | Публичный / API-Key | `body: { name, phone, channel, note? }` |
| `POST` | `/api/finance-family/link` | Объединение пациентов в семейную группу с общим депозитом | Клиника / Регистратор | `body: { primaryPatientId, memberPatientIds[] }` |
| `GET` | `/api/finance-family/:familyId/wallet` | Баланс и история распределения семейного депозита | Клиника / Сотрудник | `params: { familyId }` |
| `POST` | `/api/finance-family/:familyId/deposit` | Пополнение общего семейного депозита | Клиника / Кассир | `body: { amountKopecks, paymentMethod }` |
| `GET` | `/api/loyalty/patient/:id` | Бонусный баланс, уровень кэшбэка, реферальные начисления | Клиника / Сотрудник | `params: { id }` |
| `POST` | `/api/patient-duplicates/candidates` | Автопоиск дубликатов по нормализованному ФИО и телефону | Клиника / Администратор | `query: { threshold? }` |
| `POST` | `/api/patient-duplicates/merge` | Бесшовное объединение двух карт без потери визитов и оплат | Клиника / Администратор | `body: { primaryId, duplicateId }` |
| `GET` | `/api/patient-recall/queue` | Очередь диспансерных пациентов на профилактику (гигиена 6 мес) | Клиника / Регистратор | `query: { cadenceMonths?, status? }` |

---

## 2. Расписание, Приёмы и Дневник смен

> **Обработчики:** [`apps/api/src/routes/schedule.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/schedule.ts), [`diary.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/diary.ts), [`dayConfirmations.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/dayConfirmations.ts), [`waitlist.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/waitlist.ts), [`waitlistMatches.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/waitlistMatches.ts), [`yandexCalendar.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/yandexCalendar.ts), [`clinicWorkflows.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinicWorkflows.ts).  
> **Таблицы БД:** `appointments`, `chairs`, `clinic_chairs`, `appointment_waitlists`, `yandex_calendar_syncs`, `clinic_workflows`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/schedule/appointments` | Выборка визитов по филиалу, дате, врачу и креслу | Клиника / Сотрудник | `query: { clinicId, dateFrom, dateTo, doctorId? }` |
| `POST` | `/api/schedule/appointments` | Быстрая запись на приём (ассистент опционален — Мандат 8e) | Клиника / Регистратор | `body: AppointmentCreateSchema` |
| `PATCH`| `/api/schedule/appointments/:id` | Перемещение визита (Drag & Drop), смена статуса/длительности | Клиника / Сотрудник | `params: { id }, body: AppointmentPatchSchema` |
| `POST` | `/api/schedule/appointments/:id/cancel` | Двухэтапная отмена записи с фиксацией клинической причины | Клиника / Регистратор | `params: { id }, body: { reasonId, note? }` |
| `GET` | `/api/diary/shifts` | Табель смен врачей и ассистентов по кабинетам и креслам | Клиника / Сотрудник | `query: { clinicId, month, year }` |
| `POST` | `/api/diary/shifts` | Назначение индивидуального графика смен медперсонала | Клиника / Управляющий | `body: { staffId, clinicId, chairId, startTime, endTime }` |
| `GET` | `/api/waitlist` | Лист ожидания пациентов с фильтрацией по специализации | Клиника / Регистратор | `query: { specialty?, priority?, status? }` |
| `POST` | `/api/waitlist/auto-match` | Автоматический подбор пациента из листа в освободившееся окно | Клиника / Регистратор | `body: { appointmentSlotId, clinicId }` |
| `POST` | `/api/day-confirmations/bulk` | Массовая отправка подтверждений на завтра через WhatsApp/SMS | Клиника / Регистратор | `body: { date, channel }` |
| `POST` | `/api/schedule/yandex-sync` | Синхронизация расписания с личным календарем врача Yandex/Google | Клиника / Врач | `body: { calendarId, enableSync }` |

---

## 3. Клинический контур, ЭМК 043/у, Одонтограмма и Пародонтограмма

> **Обработчики:** [`apps/api/src/routes/visits.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/visits.ts), [`clinical.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinical.ts), [`clinicalImplants.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/clinicalImplants.ts), [`surgery/index.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/surgery/index.ts), [`odontogram.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/odontogram.ts), [`periodontogram.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/periodontogram.ts), [`orthodontics.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/orthodontics.ts), [`toothHistory.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/toothHistory.ts), [`treatmentConsumables.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/treatmentConsumables.ts), [`outpatient.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/outpatient.ts), [`prescriptions.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/prescriptions.ts), [`pharmacology.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/pharmacology.ts), [`anesthesia.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/anesthesia.ts), [`copilot.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/copilot.ts).  
> **Таблицы БД:** `visits`, `visit_diaries`, `clinical_teeth_catalog`, `patient_tooth_defects`, `periodontogram_snapshots`, `periodontogram_teeth`, `periodontogram_sites`, `anesthesia_logs`, `treatment_consumables`, `treatment_plans`, `treatment_plan_stages`, `treatment_plan_items_new`, `patient_implant_installations`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/visits` | Журнал амбулаторных приемов клиники с фильтрами | Клиника / Сотрудник | `query: { patientId?, doctorId?, dateFrom?, dateTo? }` |
| `POST` | `/api/visits` | Открытие амбулаторного приема у кресла | Клиника / Врач | `body: { appointmentId, patientId, doctorId }` |
| `GET` | `/api/visits/:id` | Полная электронная карта приёма по Форме 043/у | Клиника / Врач | `params: { id }` |
| `PATCH`| `/api/visits/:id/draft/autosave` | Фоновое автосохранение черновика дневника 043/у (защита данных) | Клиника / Врач | `params: { id }, body: { draftContent, diagnosisMkb10? }` |
| `POST` | `/api/visits/:id/accept` | Закрытие визита врачом (печать доступна со штампом «Подписано») | Клиника / Врач | `params: { id }, body: { finalSummary, servicesCompleted[] }` |
| `GET` | `/api/odontogram/patient/:patientId` | Интерактивная формула FDI (11–48 постоянные + 51–85 молочные) | Клиника / Сотрудник | `params: { patientId }` |
| `POST` | `/api/odontogram/tooth-state` | Изменение клинического статуса зуба (кариес, пульпит, пломба) | Клиника / Врач | `body: { patientId, toothNumber, condition, surfaces? }` |
| `GET` | `/api/periodontogram/:patientId/snapshot` | Пародонтограмма: 6-точечные замеры глубины карманов, BOP, рецессия | Клиника / Врач | `params: { patientId }` |
| `POST` | `/api/periodontogram/save` | Сохранение полного среза пародонтологического обследования | Клиника / Врач | `body: PeriodontogramSavePayloadSchema` |
| `POST` | `/api/anesthesia/log` | Журнал анестезии: расчет макс. дозы по весу, аспирационная проба | Клиника / Врач | `body: { patientId, drugName, volumeMl, aspirationResult }` |
| `POST` | `/api/clinical/treatment-plans` | Составление 3-уровневого плана лечения (Эконом / Оптимум / Премиум) | Клиника / Врач | `body: TreatmentPlanPayloadSchema` |
| `POST` | `/api/clinical-implants/install` | Фиксация протокола установки импланта, ISQ стабильность, паспорт | Клиника / Хирург | `body: { patientId, toothNumber, implantBrand, isqValue }` |
| `POST` | `/api/prescriptions/issue` | Выписка электронного рецепта 107-1/у с проверкой аллергий и DDI | Клиника / Врач | `body: { patientId, drugs: [{ name, dosage, form, course }] }` |
| `POST` | `/api/emergency/rescue-786n` | Протокол экстренной помощи 786н (анафилаксия, коллапс, укладка) | Клиника / Врач | `body: { patientId, emergencyType, drugAdministered }` |

---

## 4. Голосовой ввод, Speech Gateway & AI Copilot

> **Обработчики:** [`apps/api/src/routes/speech.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speech.ts), [`speechLive.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/speechLive.ts), [`ai.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/ai.ts).  
> **Таблицы БД:** `copilot_sessions`, `copilot_messages`, `copilot_pending_actions`, `ai_prompt_logs`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/speech/transcribe-chunk` | Потоковое распознавание врачебной диктовки (Yandex/Groq/Whisper) | Клиника / Врач | `multipart/form-data: audio/webm; codec=opus` |
| `GET` | `/api/speech/status` | Мониторинг провайдеров распознавания речи и состояния прокси | Клиника / Администратор | — |
| `POST` | `/api/speech/normalize-clinical` | Преобразование речи в JSON зубов и диагнозов («кариес 46 окклюзионная») | Клиника / Врач | `body: { rawTranscript: string }` |
| `GET` | `/api/speech/live` | WebSocket-шлюз синхронной передачи аудиокадров низкой задержки | Клиника / Врач | WebSocket Upgrade, аудио чанки Opus / PCM 16kHz |
| `POST` | `/api/ai/copilot/consult` | Ассистент врача: анализ клинического случая, проверка рекомендаций СтАР | Клиника / Врач | `body: { toothNumber, symptoms, proposedServices }` |

---

## 5. 3D DICOM MPR Viewer, Рентгенология & Diagnocat AI

> **Обработчики:** [`apps/api/src/routes/imaging.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging.ts), [`dicomweb.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/dicomweb.ts), [`imaging_planning.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imaging_planning.ts), [`xray.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/xray.ts), [`integrations/diagnocat.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/integrations/diagnocat.ts).  
> **Таблицы БД:** `imaging_studies`, `imaging_series`, `imaging_instances`, `patient_ct_plannings`, `diagnocat_reports`, `xray_scans`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/imaging/patient/:patientId` | Реестр радиологических исследований (КТ, ОПТГ, визиография) | Клиника / Сотрудник | `params: { patientId }` |
| `POST` | `/api/imaging/upload` | Загрузка DICOM-архива (.dcm / .zip) или снимка визиографа | Клиника / Сотрудник | `multipart/form-data: { file, patientId, modality }` |
| `GET` | `/api/xray/fast-preview/:id` | Мгновенная отдача 16-битного снимка визиографа **< 50 мс** | Клиника / Врач | `params: { id }, query: { windowWidth?, windowCenter? }` |
| `GET` | `/api/imaging/dicom-web/studies/:studyInstanceUid/series` | DICOMweb QIDO-RS интерфейс серий для Cornerstone 3D | Клиника / Врач | `params: { studyInstanceUid }` |
| `GET` | `/api/imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frame` | DICOMweb WADO-RS получение срезов КЛКТ для MPR реконструкции | Клиника / Врач | `params: { studyUid, seriesUid, instanceUid, frame }` |
| `POST` | `/api/imaging/planning/implant` | 3D позиционирование дентального импланта (координаты, ось, нерв) | Клиника / Хирург | `body: { patientId, toothNumber, implantModel, coords3D }` |
| `POST` | `/api/integrations/diagnocat/upload` | Запуск ИИ-диагностики Diagnocat строго по отдельной кнопке врача | Клиника / Врач | `body: { studyId, callbackUrl? }` |
| `GET` | `/api/integrations/diagnocat/report/:studyId` | Получение отчёта нейросети с патологиями (без перезаписи формулы) | Клиника / Врач | `params: { studyId }` |

---

## 6. Финансы, Касса 54-ФЗ, СБП QR, Эквайринг и Зарплата Т-13/Т-51

> **Обработчики:** [`apps/api/src/routes/billing.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/billing.ts), [`cashbox.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashbox.ts), [`cashInstallmentsRoutes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashInstallmentsRoutes.ts), [`cashLabPaymentRoutes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cashLabPaymentRoutes.ts), [`expenses.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/expenses.ts), [`financialPnl.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/financialPnl.ts), [`invoices.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/invoices.ts), [`sbpQr.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sbpQr.ts), [`sberbank.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sberbank.ts), [`payments/sberPosWebhookRoute.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/payments/sberPosWebhookRoute.ts), [`fiscal/fiscalReceiptRoutes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts), [`fiscal/index.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/fiscal/index.ts).  
> **Таблицы БД:** `payments`, `patient_invoices`, `cash_boxes`, `cash_shifts`, `fiscal_receipt_queue`, `doctor_payroll_statements`, `sberbank_transactions`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/billing/ledger` | Главная финансовая книга проводок клиники (все суммы в копейках) | Клиника / Бухгалтер | `query: { clinicId, dateFrom, dateTo, method? }` |
| `POST` | `/api/billing/payments` | Прием оплаты с UUIDv7 ключом идемпотентности (нал/карта/депозит) | Клиника / Кассир | `body: { invoiceId, amountKopecks, method, idempotencyKey }` |
| `POST` | `/api/fiscal/receipts` | Фискализация чека 54-ФЗ (ФФД 1.2, теги 1212/2108, комбинир. оплата) | Клиника / Кассир | `body: FiscalReceiptPayloadSchema` |
| `POST` | `/api/fiscal/refund` | Формирование чека возврата прихода (полный или частичный возврат) | Клиника / Кассир | `body: { originalReceiptId, refundAmountKopecks, reason }` |
| `POST` | `/api/sbp/generate-qr` | Генерация динамического QR-кода Системы Быстрых Платежей (СБП) | Клиника / Кассир | `body: { invoiceId, amountKopecks }` |
| `POST` | `/api/payments/sber-pos/webhook` | Входящий вебхук эквайрингового терминала Сбербанк POS | Внешний вебхук Сбера | `body: SberPosTransactionWebhookSchema` |
| `POST` | `/api/cashbox/shift/open` | Открытие кассовой смены с фиксацией разменного фонда | Клиника / Кассир | `body: { cashboxId, openingBalanceKopecks }` |
| `POST` | `/api/cashbox/shift/close` | Закрытие смены, снятие Z-отчёта и сверка расхождений | Клиника / Кассир | `body: { cashboxId, actualCashKopecks }` |
| `GET` | `/api/payroll/calculate` | Расчет зарплаты врачей Т-51 Net Revenue за вычетом BOM и ЗТЛ | Клиника / Бухгалтер | `query: { doctorId, month, year }` |
| `GET` | `/api/payroll/t13-timesheet` | Табель учета рабочего времени Т-13 (часы, смены, праздничные) | Клиника / Кадры | `query: { month, year, clinicId? }` |
| `GET` | `/api/financial-pnl/report` | Отчёт о прибылях и убытках (P&L) с детализацией прямых затрат | Клиника / Владелец | `query: { clinicId, period }` |

---

## 7. Склад, СанПиН 3.3686-21, Стерилизация и МДЛП Честный ЗНАК

> **Обработчики:** [`apps/api/src/routes/inventory.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/inventory.ts), [`warehouse.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/warehouse.ts), [`sanpin.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sanpin.ts), [`sterilization.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sterilization.ts), [`mdlp.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mdlp.ts).  
> **Таблицы БД:** `inventory_items`, `warehouses`, `stock_batches`, `inventory_transactions`, `sterilizer_equipments`, `sterilization_logs`, `bactericidal_irradiator_logs`, `mdlp_items`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/inventory/items` | Складской каталог материалов с текущими остатками по филиалам | Клиника / Сотрудник | `query: { warehouseId?, category?, lowStockOnly? }` |
| `POST` | `/api/warehouse/:orgId/quick-carpule-disposal` | **1-клик списание пустых карпул анестетиков** медсестрой без комиссии | Клиника / Медсестра | `params: { orgId }, body: { carpuleCount, anestheticItemId }` |
| `POST` | `/api/warehouse/:orgId/soft-overdraft-deduct` | **Мягкий овердрафт склада**: списание материалов при задержке накладной | Клиника / Врач | `params: { orgId }, body: { itemsToDeduct[] }` (200 OK) |
| `POST` | `/api/inventory/write-off` | Списание расходников на визит по технологической карте услуги 804н | Клиника / Ассистент | `body: { visitId, serviceCatalogId }` |
| `POST` | `/api/sanpin/bactericidal/log` | Журнал учета работы бактерицидных облучателей и рециркуляторов | Клиника / Медсестра | `body: { equipmentId, hoursOperated, date }` |
| `POST` | `/api/sanpin/general-cleaning/log` | Журнал проведения генеральных уборок по графику СанПиН 3.3686-21 | Клиника / Медсестра | `body: { roomName, disinfectantUsed, concentrationPercent }` |
| `POST` | `/api/sterilization/pso/quick-norm` | Фиксация предстерилизационной очистки (азопирам — норма в 1 клик) | Клиника / Медсестра | `body: { batchNumber, instrumentsCount }` |
| `POST` | `/api/sterilization/daily-tests` | Журнал контроля работы автоклавов (Бови-Дик, вакуум-тест, тест-полоски) | Клиника / Медсестра | `body: { autoclaveId, testType, result }` |
| `POST` | `/api/sterilization/link` | Привязка простерилизованного крафт-пакета по штрихкоду к карте 043/у | Клиника / Ассистент | `body: { barcode, visitId }` |
| `POST` | `/api/mdlp/scan-and-verify` | Проверка 2D DataMatrix кода препарата через шлюз Честный ЗНАК | Клиника / Медсестра | `body: { sgtinBarcode }` |

---

## 8. Зуботехническая лаборатория (ЗТЛ), Ортопедия и VITA Shade

> **Обработчики:** [`apps/api/src/routes/lab.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/lab.ts).  
> **Таблицы БД:** `dental_lab_orders`, `lab_items`, `lab_order_events`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/lab/orders` | Реестр заказ-нарядов в ЗТЛ (коронки, протезы, виниры, каппы) | Клиника / Сотрудник | `query: { clinicId?, status?, patientId?, labId? }` |
| `POST` | `/api/lab/orders` | Создание наряда в ЗТЛ с зубами FDI, оттенком VITA и датой примерки | Клиника / Ортопед | `body: LabOrderCreateSchema (teeth[], vitaShade, deadline)` |
| `GET` | `/api/lab/orders/:id` | Детальный наряд ЗТЛ с историей этапов и прикрепленными STL/фото | Клиника / Сотрудник | `params: { id }` |
| `PATCH`| `/api/lab/orders/:id/status` | Перевод статуса готовности работы (отправлен / примерка / сдан) | Клиника / Сотрудник | `params: { id }, body: { newStatus, trackingNotes? }` |
| `POST` | `/api/lab/orders/:id/qr-label` | Генерация этикетки со штрихкодом/QR для физического лотка с работой | Клиника / Ассистент | `params: { id }` |

---

## 9. Юридический документооборот, УКЭП КриптоПро, Справки НДФЛ и ЕГИСЗ

> **Обработчики:** [`apps/api/src/routes/documents.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts), [`documentTemplates.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documentTemplates.ts), [`documents/*.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/), [`cryptoProNativeRoutes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/cryptoProNativeRoutes.ts), [`egisz.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz.ts), [`egisz/n3HealthRoutes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/egisz/n3HealthRoutes.ts), [`files.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/files.ts).  
> **Таблицы БД:** `documents`, `document_templates`, `document_template_variables`, `signed_outpatient_cards`, `egisz_outbox`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/documents/patient/:patientId` | Реестр подписанных договоров, актов, ИДС и смет пациента | Клиника / Сотрудник | `params: { patientId }` |
| `POST` | `/api/documents/issue` | Генерация PDF-документа из 31 канонического вида бланков РФ | Клиника / Сотрудник | `body: { kind, patientId, visitId?, templateData }` |
| `GET` | `/api/documents/:id/pdf` | Скачивание PDF со штампом («Черновик» / «Подписано УКЭП») | Клиника / Сотрудник | `params: { id }` |
| `POST` | `/api/documents/blank-contract` | Печать чистого договора с 0 ₽ и строками `_______` без 403-ошибок | Клиника / Регистратор | `body: { patientId }` |
| `POST` | `/api/documents/ndfl/xml` | Генерация XML-справки для налогового вычета 13% (ФНС КНД 1151156) | Клиника / Бухгалтер | `body: { patientId, taxYear, payerInn, amountKopecks }` |
| `POST` | `/api/documents/sign-ukep` | Подписание документа открепленной подписью CMS/PKCS#7 (КриптоПро) | Клиника / Врач | `body: { documentId, detachedSignatureBase64, certInfo }` |
| `POST` | `/api/egisz/export-cda` | Формирование СЭМД документа HL7 CDA R3 (Форма 043/у, консультация) | Клиника / Начмед | `body: { visitId, documentKind }` |
| `POST` | `/api/egisz/n3-health/send` | Прямая отправка СЭМД в федеральный шлюз РЭМД ЕГИСЗ (N3.Health) | Клиника / Начмед | `body: { cdaXml, signatureDoctor, signatureClinic }` |
| `GET` | `/api/egisz/status/:taskId` | Статус проверки и регистрации СЭМД в РЭМД ЕГИСЗ | Клиника / Администратор | `params: { taskId }` |

---

## 10. Омниканальные коммуникации, Чаты, Боты (Telegram, WhatsApp, VK) и АТС

> **Обработчики:** [`apps/api/src/routes/communications.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communications.ts), [`communicationsOutbox.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationsOutbox.ts), [`communicationReceipts.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/communicationReceipts.ts), [`messageTemplates.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/messageTemplates.ts), [`chat.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/chat.ts), [`telegram.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telegram.ts), [`whatsapp.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/whatsapp.ts), [`whatsappWebhook.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/whatsappWebhook.ts), [`vk.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/vk.ts), [`telephony.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/telephony.ts).  
> **Таблицы БД:** `communication_events`, `communication_tasks`, `message_templates`, `outbound_message_queue`, `chat_dialogs`, `chat_messages`, `telegram_bot_configs`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/communications/timeline/:patientId` | Хронологическая омниканальная лента звонков, SMS и чатов | Клиника / Сотрудник | `params: { patientId }` |
| `POST` | `/api/communications/send` | Отправка сообщения в WhatsApp, Telegram, SMS или VK | Клиника / Сотрудник | `body: { patientId, channel, text, templateId? }` |
| `POST` | `/api/telegram/webhook` | Входящий вебхук бота клиники Telegram Bot API | Внешний вебхук TG | `body: TelegramUpdateObject` |
| `POST` | `/api/telegram/link-code` | Генерация одноразового кода для безопасной привязки Telegram | Клиника / Регистратор | `body: { patientId, ttlMinutes? }` |
| `POST` | `/api/whatsapp/webhook` | Входящий вебхук WhatsApp Cloud API (сообщения и квитанции DLR) | Внешний вебхук WA | `body: WhatsAppWebhookPayload` |
| `POST` | `/api/vk/webhook` | Входящий вебхук ВКонтакте (VK MAX Callback API) | Внешний вебхук VK | `body: VkCallbackPayload` |
| `POST` | `/api/telephony/webhook` | Входящий вебхук АТС (Mango, UIS, Zadarma) о звонке | Внешний вебхук АТС | `body: TelephonyEventPayload` |
| `POST` | `/api/telephony/originate` | Инициация исходящего звонка кликом по номеру (Click-to-Call) | Клиника / Сотрудник | `body: { destinationPhone, staffExtension }` |

---

## 11. Пациентский портал, PWA Кабинет, Онлайн-запись и Self-Checkin

> **Обработчики:** [`apps/api/src/routes/patientPortal.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/patientPortal.ts), [`portal.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portal.ts), [`portalBudgetRoutes.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/portalBudgetRoutes.ts), [`publicBooking.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicBooking.ts), [`publicAppointmentActions.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicAppointmentActions.ts), [`publicEstimates.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/publicEstimates.ts).  
> **Таблицы БД:** `portal_otp_codes`, `treatment_plans`, `appointments`, `patient_consents`.

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/portal/otp/request` | Запрос 4-значного СМС-кода для входа в кабинет пациента | Публичный эндпоинт | `body: { phone }` |
| `POST` | `/api/portal/otp/verify` | Валидация OTP-кода и выдача изолированного сессионного токена | Публичный эндпоинт | `body: { phone, otpCode }` |
| `GET` | `/api/portal/cabinet/summary` | Сводка пациента: будущие визиты, долг/депозит, активный план | Пациент (Сессия) | Header: `X-Patient-Token` |
| `GET` | `/api/portal/cabinet/treatment-plan` | Интерактивный план лечения с этапами и возможностью выбора опций | Пациент (Сессия) | Header: `X-Patient-Token` |
| `POST` | `/api/portal/budget/sign` | Электронное подписание сметы и плана лечения со смартфона | Пациент (Сессия) | `body: { planId, stageId, signatureSvg }` |
| `POST` | `/api/portal/self-checkin/confirm` | Быстрый Check-In на стойке по QR-коду («Я пришёл в клинику») | Пациент (Сессия) | `body: { appointmentId, clinicId }` |
| `POST` | `/api/public-booking/book` | Оформление онлайн-записи с виджета сайта клиники | Публичный эндпоинт | `body: { slotId, phone, patientName, otpCode }` |
| `GET` | `/api/public-estimates/:token` | Публичный защищенный просмотр 3-уровневой сметы для пациента | Публичный по токену | `params: { token }` |

---

## 12. Аналитика, Отчеты, Персонал и Настройки

> **Обработчики:** [`apps/api/src/routes/analytics.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/analytics.ts), [`dashboard.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/dashboard.ts), [`reports.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/reports.ts), [`staff.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/staff.ts), [`settings.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/settings.ts), [`workspaceProfile.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/workspaceProfile.ts), [`pricelist.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/pricelist.ts), [`marketing.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/marketing.ts).

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics/dashboard` | Сводный дашборд руководителя: выручка, загрузка кресел, LTV/CAC | Клиника / Владелец | `query: { period, clinicId? }` |
| `GET` | `/api/reports/chair-occupancy` | Процент утилизации стоматологических установок по часам | Клиника / Управляющий | `query: { dateFrom, dateTo, clinicId }` |
| `GET` | `/api/staff` | Список сотрудников, роли RBAC, графики работы и специализации | Клиника / Администратор | `query: { activeOnly?, role? }` |
| `POST` | `/api/staff` | Создание карточки сотрудника и генерация инвайта | Клиника / Администратор | `body: StaffCreateSchema` |
| `GET` | `/api/pricelist/services` | Справочник медицинских услуг прейскуранта с привязкой к 804н | Клиника / Сотрудник | `query: { categoryId?, search? }` |
| `PATCH`| `/api/pricelist/services/:id` | Редактирование стоимости услуги и коэффициента сдельной оплаты | Клиника / Управляющий | `params: { id }, body: PriceServiceUpdateSchema` |

---

## 13. Интеграции, Умные импорты (Smart Imports) и Репликация

> **Обработчики:** [`apps/api/src/routes/smartImports.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/smartImports.ts), [`migration.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migration.ts), [`migrationRuns.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/migrationRuns.ts), [`imports.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/imports.ts), [`ingestion.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/ingestion.ts), [`commerceMl.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/commerceMl.ts), [`integrations/flexbe.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/integrations/flexbe.ts), [`integrations/prodoctorov.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/integrations/prodoctorov.ts), [`sync/index.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/sync/index.ts), [`export.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/export.ts).

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/smart-imports/preview` | Быстрый парсинг выгрузки IDENT, DentalPRO, Инфоклиника, 1С | Клиника / Управляющий | `multipart/form-data: { file, sourceSystem }` |
| `POST` | `/api/smart-imports/commit` | Фоновая транзакционная миграция сущностей с проверкой дублей | Клиника / Управляющий | `body: { previewSessionId, mappingConfig }` |
| `GET` | `/api/migration-runs` | Журнал сессий миграции с процентом прогресса и логом коллизий | Клиника / Администратор | `query: { limit?, offset? }` |
| `POST` | `/api/migration-runs/:id/rollback` | Полный безопасный откат загруженных данных при выявлении брака | Клиника / Управляющий | `params: { id }` |
| `POST` | `/api/sync/push` | Синхронизация офлайн-клиента (CRDT векторные часы репликации) | Клиника / Система | `body: { lastSyncVersion, mutations[] }` |
| `GET` | `/api/commerceml/catalog` | Экспорт каталога услуг и материалов в формате CommerceML 2.0 | Клиника / 1С-Бухгалтер | `query: { type: 'catalog', mode: 'checkauth' }` |

---

## 14. Системное ядро, WebSocket, Безопасность и Фоновые задачи

> **Обработчики:** [`apps/api/src/routes/system.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/system.ts), [`tasks.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/tasks.ts), [`audit.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/audit.ts), [`health.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/health.ts), [`auth.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/auth.ts), [`websocket.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/websocket.ts), [`mobileOta.ts`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/mobileOta.ts).

| Метод | Эндпоинт | Назначение | RBAC / Доступ | Ключевые параметры и схемы |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Вход по логину/паролю с выдачей JWT и установкой cookie | Публичный эндпоинт | `body: { login, password }` |
| `GET` | `/api/health` | Проверка жизнеспособности сервера (PostgreSQL, Redis, RAM) | Публичный мониторинг | Возвращает `{ status: 'ok', uptime, db: true }` |
| `GET` | `/api/system/ram-watchdog` | Мониторинг потребления памяти Node.js и защиты от утечек V8 | Клиника / Администратор | Пороги: Warning 1536MB, Ceiling 2048MB |
| `GET` | `/api/audit/logs` | Неизменяемый журнал аудита всех действий пользователей (152-ФЗ) | Клиника / ИБ-Офицер | `query: { entityType?, userId?, dateFrom? }` |
| `GET` | `/api/mobile-ota/manifest` | Манифест обновлений Over-The-Air для мобильных клиентов клиники | Мобильный клиент | `query: { currentVersion, platform }` |

---

## 🌐 WebSocket Маршруты реального времени

### 1. Шлюз оперативных событий расписания и телефонии: `GET /api/ws/schedule`
```
[WebSocket Client]  ---> CONNECT ws://127.0.0.1:3000/api/ws/schedule
[WebSocket Server]  <--- ACCEPT (Connection open, 10s Auth Timeout started)
[WebSocket Client]  ---> SEND {"type": "AUTH", "clinicToken": "...", "staffToken": "..."}
[WebSocket Server]  <--- VERIFY TOKENS (binds client to organizationId)
[WebSocket Server]  ---> SEND {"type": "AUTH_OK", "organizationId": "..."}
[wsBroker Broadcast]---> PUSH {"type": "SCHEDULE_APPOINTMENT_CHANGE", "appointmentId": "..."}
[wsBroker Broadcast]---> PUSH {"type": "TELEPHONY_INCOMING_CALL", "callerPhone": "+7999..."}
```

### 2. Шлюз непрерывного речевого ввода низкой задержки: `GET /api/speech/live`
```
[Audio Stream Client]---> CONNECT ws://127.0.0.1:3000/api/speech/live
[Speech Server]      <--- ACCEPT (Opus 48kHz / PCM 16-bit 16kHz stream)
[Audio Stream Client]---> BINARY CHUNKS (AudioWorklet live frame stream)
[Speech Gateway]     ---> PIPELINE (Whisper / Yandex SpeechKit streaming)
[Speech Server]      ---> JSON {"type": "PARTIAL", "text": "кариес сорок шестого..."}
[Speech Server]      ---> JSON {"type": "FINAL", "normalized": {"tooth": 46, "pathology": "caries"}}
```

---

> Для получения подробных TypeScript интерфейсов, схем Zod и параметров каждого из 867 эндпоинтов обращайтесь к **[`API_ROUTES_CATALOG.md`](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)**.
