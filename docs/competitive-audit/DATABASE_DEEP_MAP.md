# 🗄️ Полная Карта Базы Данных и Сущностей Dental CRM (PostgreSQL 18.4 / Drizzle ORM)

> **Глубокая архитектурная спецификация структуры базы данных DENTE Dental CRM.**  
> Отражает модульную схему Drizzle ORM (**22 файла**, **208 таблиц `pgTable`**, **48 перечислений `pgEnum`**, **18 связей `relations`** в [`apps/api/src/db/schema/`](file:///C:/Clinic_MVP/dental-crm/apps/api/src/db/schema/)), нативный сетевой движок **PostgreSQL 18.4 TCP (`127.0.0.1:5432`)**, политики **Row-Level Security (RLS)** и суверенитет стоматологического амбулаторного контекста (Форма 043/у).

---

## 🧭 Навигация и перекрестные ссылки

* 🗺️ **[Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Центральная навигационная карта проекта.
* 🗄️ **[Реестр Базы Данных (.agents/DATABASE.md)](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Системный документ СУБД, RLS политики, скрипты миграций и безопасность.
* 📚 **[Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)** — Центральный шлюз нормативной и технической документации.
* 🛣️ **[Исчерпывающий Каталог маршрутов (.agents/API_ROUTES_CATALOG.md)](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** — Привязка 867 эндпоинтов к таблицам базы данных.
* 🛣️ **[Глубокая Карта Маршрутов (API_ROUTES_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md)** — 14 канонических категорий Fastify 5.3+.
* 🖥️ **[Глубокая Карта Фронтенда (FRONTEND_COMPONENTS_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FRONTEND_COMPONENTS_DEEP_MAP.md)** — Реестр компонентов React 19 по 3-уровневой доктрине.
* 🧮 **[Алгоритмы и Общий Пакет (ALGORITHMS_AND_SHARED_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/ALGORITHMS_AND_SHARED_DEEP_MAP.md)** — Ядро `@dental/shared`, валидаторы, расчеты.
* 🧪 **[Справочник Скриптов и Гейтов (SCRIPTS_AND_CLI_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/SCRIPTS_AND_CLI_DEEP_MAP.md)** — Прекоммит-гейты качества и тестовые раннеры.
* 🚀 **[Руководство по API-серверу (apps/api/README.md)](file:///C:/Clinic_MVP/dental-crm/apps/api/README.md)** — Production-руководство по бэкенду.
* 📋 **[Главная Конституция (.agents/AGENTS.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Абсолютные стандарты, точность денег до копейки, Мандат 8i.

---

## ⚙️ Ядро СУБД и инфраструктура

| Параметр | Значение в кодовой базе | Примечание |
| :--- | :--- | :--- |
| **СУБД** | **PostgreSQL 18.4** (нативный сервер) | Работает строго по TCP через драйвер `node-postgres` (`pg.Pool`) |
| **Сетевой адрес** | `127.0.0.1:5432` | Доступ строго по сети; встраиваемый PGlite **полностью удалён** из проекта |
| **Имя базы данных** | `dental_crm` | Рабочая база многопользовательской стоматологической клиники |
| **Директория данных** | `.data/pg18` (в корне репозитория) | Автономный отказоустойчивый кластер |
| **Бинарные файлы** | `node_modules/@embedded-postgres/windows-x64/native/bin/` | Серверные исполняемые файлы `postgres.exe`, `initdb.exe`, `pg_ctl.exe` |
| **Клиент ORM** | `drizzle-orm: ^0.45.2` | Экземпляр `db` в `apps/api/src/db/client.ts` обёрнут в Proxy для транзакций ALS |
| **Парсинг валют** | `registerMoneyTypeParsers()` | Регистрация парсеров OID `numeric` до старта пула (защита от склеивания строк) |
| **Файлы схемы** | `apps/api/src/db/schema/*.ts` | 22 строго типизированных модуля (208 таблиц `pgTable`) |

---

## 🧩 Модульная архитектура схемы (`apps/api/src/db/schema/*.ts`)

Монолит разделен на **20 независимых предметных модулей** + общий модуль перечислений `_common.ts` + агрегатор `index.ts` (**всего 22 файла**), объявляющих **208 таблиц `pgTable`**:

```
apps/api/src/db/schema/
├── _common.ts               # 47 общих перечислений (pgEnum), мета-колонки тенанта и временные метки
├── auth.ts                  # 6 таблиц: организации, филиалы, пользователи, инвайты, OTP
├── patients.ts              # 20 таблиц: пациенты, ИДС, аллергии, семейные связи, лояльность
├── schedule.ts              # 16 таблиц: кресла, приёмы, лист ожидания, отмены, синхронизация
├── billing.ts               # 13 таблиц: платежи, счета, кассовая книга, СБП QR, очередь 54-ФЗ
├── clinical.ts              # 47 таблиц: диагнозы МКБ-10, планы, дневники 043/у, импланты, наряды ЗТЛ
├── periodontogram.ts        # 3 таблицы: срезы пародонтограммы, замеры по зубам, 6-точечные сайты
├── outpatientCore.ts        # 7 таблиц: формула FDI, дефекты зубов, шаблоны дневников 043/у
├── treatmentConsumables.ts  # 2 таблицы: расходные материалы процедур и их списания
├── imaging.ts               # 13 таблиц: DICOM исследования, серии, 3D планирование, Diagnocat
├── inventory.ts             # 13 таблиц: номенклатура склада, склады, партии FEFO, техкарты, МДЛП
├── sanpin.ts                # 8 таблиц: стерилизаторы, облучатели, медотходы, генеральные уборки
├── finance.ts               # 8 таблиц: кассы, смены, расходные ордера, рассрочки, зарплата
├── documents.ts             # 3 таблицы: шаблоны документов, категории, переменные подстановки
├── communications.ts        # 28 таблиц: омниканальная лента, задачи обзвона, бот Telegram, чаты
├── crm_leak_detector.ts     # 1 таблица: аудит утечки лидов и пропущенных звонков
├── sync.ts                  # 2 таблицы: векторы синхронизации, идемпотентность внешних систем
├── copilot.ts               # 4 таблицы: сессии Copilot, подсказки врача, клинические алерты
├── rag.ts                   # 1 таблица: векторные эмбеддинги базы знаний и стандартов СтАР
├── aiTelemetry.ts           # 1 таблица: аудит токенов LLM и задержек провайдеров ИИ
├── system.ts                # 12 таблиц: системный журнал аудита, настройки, воркеры, бэкапы
└── index.ts                 # Агрегатор схемы, реэкспортирующий все 208 сущностей
```

---

## 📋 Подробный реестр предметных модулей

### 1. `auth.ts` (6 таблиц, 3 relations)
* `organizations` — Учетные записи медицинских организаций / юрлиц (мультиарендность).
* `clinics` — Сеть филиалов, клиник и отдельных кабинетов с адресами и реквизитами.
* `users` — Аккаунты персонала клиники (врачи, медсестры, регистраторы, бухгалтеры, администраторы).
* `user_invitations` — Одноразовые токены приглашения новых сотрудников с преднастроенными ролями.
* `portal_otp_codes` — Хранилище временных одноразовых СМС/ТГ кодов авторизации пациентов.
* `clinic_workflows` — Конфигурация клинических пайплайнов, очередей и правил согласований.

### 2. `patients.ts` (20 таблиц, 1 relations)
* `patients` — Главная картотека пациентов: ФИО, телефон, СНИЛС, полис, дата рождения, баланс.
* `patient_consents` — Реестр подписанных информированных добровольных согласий (ИДС, 152-ФЗ, 323-ФЗ).
* `recent_patient_history` — Быстрый кэш недавно открытых карточек для мгновенного доступа врача.
* `patient_service_lineages` — Хронологическое дерево преемственности оказанных услуг.
* `lostPatientsFilters` (`lost_patients_filters`) — Сохраненные фильтры оттока и сегментации пациентов.
* `familyGroups` (`family_groups`) — Семейные кластеры с общим доступом к депозиту.
* `familyRecommendationSources` (`family_recommendation_sources`) — Источники рекомендаций и рефералы.
* `patientDuplicateMergeQueues` (`patient_duplicate_merge_queues`) — Очередь кандидатов на безопасное слияние дублей.
* `patientTaskTickets` (`patient_task_tickets`) — Сервисные тикеты и поручения регистратуре по пациенту.
* `patientReclamations` (`patient_reclamations`) — Журнал претензий, рекламаций и спорных клинических случаев.
* `patientArchiveReasons` (`patient_archive_reasons`) — Справочник причин отправки карты в архив.
* `patientArchiveReasonsAndBlacklists` (`patient_archive_reasons_and_blacklists`) — Черные списки и ограничения.
* `loyaltyPrograms` (`loyalty_programs`) — Правила начисления бонусов и кэшбэка клиники.
* `patientBonusBalances` (`patient_bonus_balances`) — Текущие бонусные счета пациентов.
* `bonusTransactions` (`bonus_transactions`) — Проводки начисления и списания бонусных рублей.
* `referralCampaigns` (`referral_campaigns`) — Маркетинговые реферальные программы («Приведи друга»).
* `patientReferralCodes` (`patient_referral_codes`) — Персональные промокоды пациентов.
* `patientReferrals` (`patient_referrals`) — Факты успешных переходов по реферальным ссылкам.
* `patientDrugAllergies` (`patient_drug_allergies`) — Аллергологический анамнез (пенициллины, анестетики, латекс).
* `patientRelationships` (`patient_relationships`) — Родственные связи между пациентами (родитель, опекун, супруг).

### 3. `schedule.ts` (16 таблиц, 2 relations)
* `chairs` — Стоматологические установки (кресла) в филиалах клиники.
* `appointments` — Записи на приём: время, кресло, пациент, врач, клинический статус, маркер явки.
* `cancellationReasonsTwoLevel` (`cancellation_reasons_two_level`) — Двухуровневый классификатор причин отмен визитов.
* `quickAppointmentConfirmations` (`quick_appointment_confirmations`) — Статусы быстрых подтверждений визитов через мессенджеры.
* `urgentScheduleRequests` (`urgent_schedule_requests`) — Запросы на срочный прием при острой боли.
* `confirmationPerformanceReports` (`confirmation_performance_reports`) — Статистика дозваниваемости регистраторов.
* `scheduleClipboardItems` (`schedule_clipboard_items`) — Буфер обмена визитов для быстрого переноса слотов.
* `scheduleTimeReservations` (`schedule_time_reservations`) — Временные брони слотов при оформлении онлайн-записи.
* `rebookingConversionRules` (`rebooking_conversion_rules`) — Правила автоматического предложения перезаписи.
* `singleSessionEnforcements` (`single_session_enforcements`) — Контроль пересечений приемов одного врача.
* `appointmentWaitlists` (`appointment_waitlists`) — Лист ожидания пациентов на освобождающиеся окна.
* `clinicChairs` (`clinic_chairs`) — Привязка кресел к помещениям и кабинетам по СанПиН.
* `appointmentChannelInheritances` (`appointment_channel_inheritances`) — Наследование рекламного канала первого визита.
* `externalScheduleActionLogs` (`external_schedule_action_logs`) — Логи обращений внешних виджетов записи.
* `yandexCalendarSyncs` (`yandex_calendar_syncs`) — Связки токенов синхронизации с Yandex/Google Calendar.
* `uisMassAppointmentConfirmations` (`uis_mass_appointment_confirmations`) — Задачи массового автообзвона через UIS.

### 4. `billing.ts` (13 таблиц)
* `payments` — Финансовые проводки платежей (нал, карта, СБП, депозит) с копеечной точностью.
* `fiscalReceiptQueue` (`fiscal_receipt_queue`) — Очередь фискализации чеков 54-ФЗ (ФФД 1.2, теги 1212/2108).
* `advanceDepositTaggings` (`advance_deposit_taggings`) — Тегирование авансов и предоплат за ортопедические конструкции.
* `digitalReceiptDispatches` (`digital_receipt_dispatches`) — Отправка электронных чеков по SMS и Email.
* `kkmItemQuantityUnits` (`kkm_item_quantity_units`) — Справочник единиц измерения для ККМ (штуки, процедуры, граммы).
* `pricelistDoctorPayrolls` (`pricelist_doctor_payrolls`) — Индивидуальные тарифные ставки врачей по прейскуранту.
* `patientInvoices` (`patient_invoices`) — Счета за оказанные стоматологические услуги.
* `doctorCommissions` (`doctor_commissions`) — Начисления комиссионных вознаграждений медперсоналу.
* `sberbankTransactions` (`sberbank_transactions`) — Логи эквайринговых операций и сверки с ОФД Сбербанка.
* `ndflTaxCalculators` (`ndfl_tax_calculators`) — Кэшированные расчеты сумм для справок 13% НДФЛ (КНД 1151156).
* `cashLedger` (`cash_ledger`) — Главная книга кассовых операций клиники.
* `cashShifts` (`cash_shifts`) — Кассовые смены (открытие, разменный фонд, закрытие, Z-отчет).
* `shiftDiscrepancyReports` (`shift_discrepancy_reports`) — Акты выявления кассовых расхождений и излишков.

### 5. `clinical.ts` (47 таблиц, 1 relations)
* `visits` — Амбулаторные визиты: привязка к расписанию, статус Формы 043/у.
* `service_catalog_items` — Номенклатура медицинских услуг по Приказу Минздрава России 804н.
* `treatment_items` — Оказанные в рамках визита манипуляции и начисления.
* `treatment_scenarios` — Клинические сценарии и типовые клинические протоколы СтАР.
* `clinical_tasks` — Задачи лечащего врача (контрольный осмотр, снятие швов, рентген-контроль).
* `clinical_rules` — Движок клинических правил: неблокирующие предупреждения по Мандату 8e.
* `generated_documents` — Сформированные PDF бланки (043/у, ИДС, акты, гарантийные талоны).
* `treatment_plan_lock_tokens` — Блокировки планов лечения при редактировании.
* `alternative_treatment_plans` — Альтернативные планы лечения (Эконом / Оптимум / Премиум).
* `custom_examination_form_catalogs` — Конструктор специализированных опросников и чеклистов.
* `egisz_multiple_diagnoses` — Множественные сопутствующие диагнозы по МКБ-10 для передачи в РЭМД ЕГИСЗ.
* `extended_odontogram_states` — Расширенные статусы зубов (имплант, культевая вкладка, ретенция).
* `non_dental_examination_forms` — Соматические карты общего здоровья (АД, аллергии, ЧСС, СД).
* `treatment_plan_print_odontograms` — Снимки одонтограммы для впечатывания в договор с пациентом.
* `treatment_plan_stages` — Этапы комплексного плана лечения (санация, хирургия, ортопедия).
* `lab_orders` — Заказ-наряды в зуботехническую лабораторию (ЗТЛ).
* `treatment_plans` — Комплексные планы лечения пациента.
* `treatment_plan_price_freeze_tokens` — Фиксация стоимости плана лечения на гарантийный срок.
* `treatment_plan_items_new` — Позиции услуг, привязанные к конкретным этапам и зубам FDI.
* `visit_templates` — Врачебные шаблоны заполнения протоколов осмотра.
* `visit_diaries` — Протоколы дневников визитов Формы 043/у (SOAP: жалобы, объективно, лечение).
* `visit_diary_revisions` — Неизменяемая история правок медицинских записей (Минздрав 834н).
* `visit_examination_photo_links` — Привязка клинических дентальных фотографий и шкалы VITA к визиту.
* `tooth_states` — Текущий клинический статус каждого зуба пациента (FDI 11–48 / 51–85).
* `tooth_state_history` — Хронологическая эволюция патологий зуба по каждому визиту.
* `insurance_contracts` — Договоры со страховыми компаниями по программам ДМС.
* `dms_guarantee_letters` — Гарантийные письма ДМС с лимитами страхового покрытия.
* `clinical_audit_logs` — Логи изменений клинических записей и врачебных назначений.
* `egisz_blank_permissions` — Разрешения на выпуск медицинских справок без ЭЦП.
* `egisz_logs` — Логи обмена пакетами HL7 CDA R3 с региональными сервисами ЕГИСЗ.
* `egisz_outbox` — Очередь исходящих документов для выгрузки в РЭМД ЕГИСЗ.
* `egisz_audit_logs` — Аудит криптографических подписей УКЭП врача и клиники.
* `mkb10_auto_directories` — Автоподбор диагнозов МКБ-10 стоматологического профиля (K00–K14).
* `services` — Внутренний прейскурант клиники.
* `protocol_templates` — Шаблоны клинических рекомендаций СтАР.
* `perio_charts` — Исторические пародонтологические карты.
* `anesthesia_logs` — Журнал местной анестезии: препарат, доза, аспирационная проба, ПКУ.
* `lab_items` — Справочник зуботехнических изделий (циркониевые коронки, элайнеры, бюгели).
* `lab_order_events` — Трекинг этапов выполнения заказ-наряда ЗТЛ.
* `implant_catalog_items` — Каталог дентальных имплантов (Nobel, Straumann, Osstem, Dentium).
* `patient_implant_installations` — Протокол хирургической установки импланта (торк N/cm, кость D1–D4).
* `implant_isq_measurements` — Динамика резонансно-частотного анализа стабильности импланта (ISQ).
* `drug_catalog` — Справочник лекарственных средств и анестетиков.
* `drug_interactions` — База опасных межлекарственных взаимодействий (DDI) и противопоказаний.
* `electronic_prescriptions` — Электронные рецептурные бланки Формы 107-1/у.
* `electronic_prescription_items` — Назначенные медикаменты с дозировкой и схемой приема.
* `clinical_quality_audits` — Акты внутреннего контроля качества медпомощи начмедом.

### 6. `periodontogram.ts` (3 таблицы, 3 relations)
* `periodontogramSnapshots` (`periodontogram_snapshots`) — Срезы пародонтологического обследования по визитам.
* `periodontogramTeeth` (`periodontogram_teeth`) — Статус подвижности зубов (степени I–III), фуркации, импланты.
* `periodontogramSites` (`periodontogram_sites`) — 6-точечные измерения глубины карманов (мм), рецессии десны, кровоточивости при зондировании (BOP) и зубного налета.

### 7. `treatmentConsumables.ts` (2 таблицы)
* `treatmentConsumables` (`treatment_consumables`) — Расходные материалы, зарезервированные под услугу.
* `treatmentConsumableDeductions` (`treatment_consumable_deductions`) — Фактические списания материалов со склада на визит по BOM.

### 8. `outpatientCore.ts` (7 таблиц, 6 relations)
* `clinicalTeethCatalog` (`clinical_teeth_catalog`) — Анатомический каталог постоянных и временных зубов FDI.
* `toothDefectsCatalog` (`tooth_defects_catalog`) — Классификатор стоматологических дефектов и поверхностей (MOD).
* `mkbCategories` (`mkb_categories`) — Иерархический рубрикатор МКБ-10.
* `patientToothDefects` (`patient_tooth_defects`) — Выявленные патологии конкретных поверхностей зуба.
* `outpatientTemplateCategories` (`outpatient_template_categories`) — Категории врачебных шаблонов 043/у.
* `outpatientTemplates` (`outpatient_templates`) — Шаблоны протоколов лечения (кариес, периодонтит, пульпит).
* `outpatientVerifications` (`outpatient_verifications`) — Аудит целостности протоколов лечения.

### 9. `imaging.ts` (13 таблиц)
* `attachments` — Бинарные файлы и прикрепленные документы.
* `imagingStudies` (`imaging_studies`) — Радиологические исследования (КТ, ОПТГ, прицельные снимки).
* `aiJobs` (`ai_jobs`) — Фоновые задачи обработки снимков нейросетями.
* `imagingSeries` (`imaging_series`) — Серии снимков и срезов КЛКТ томографа.
* `imagingInstances` (`imaging_instances`) — Отдельные DICOM файлы и кадры срезов.
* `imagingAnnotations` (`imaging_annotations`) — Врачебные графические разметки, стрелки и комментарии на снимке.
* `xrayScans` (`xray_scans`) — 16-битные снимки радиовизиографа (RVG).
* `imagingViewerSessions` (`imaging_viewer_sessions`) — Сессии веб-просмотрщика Cornerstone 3D.
* `dicomWorkbenchBundles` (`dicom_workbench_bundles`) — Подготовленные бандлы срезов для 3D MPR реконструкции.
* `patientCtPlannings` (`patient_ct_plannings`) — 3D планирование имплантации (ось, угол наклона, нижнечелюстной канал).
* `bulkImageOperationLogs` (`bulk_image_operation_logs`) — Логи массового импорта и экспорта снимков.
* `diagnocatAiFindings` (`diagnocat_ai_findings`) — Патологии, обнаруженные нейросетью Diagnocat на снимке.
* `diagnocatReports` (`diagnocat_reports`) — Итоговые PDF и JSON отчеты ИИ-диагностики.

### 10. `inventory.ts` (13 таблиц)
* `inventoryItems` (`inventory_items`) — Номенклатура склада медикаментов и стоматологических материалов.
* `warehouses` — Склады клиники (главный склад, склад кабинета №1, склад хирургии).
* `stockBatches` (`stock_batches`) — Партии поступления материалов со сроками годности (FEFO).
* `inventoryTransactions` (`inventory_transactions`) — Движения материалов (приход, расход, перемещение, списание).
* `procedureMaterialRules` (`procedure_material_rules`) — Нормативы расхода материалов на услугу.
* `procedureTechCards` (`procedure_tech_cards`) — Технологические карты (BOM — Bill of Materials).
* `procedureTechCardItems` (`procedure_tech_card_items`) — Строки материалов в технологической карте.
* `sterilizationLogs` (`sterilization_logs`) — Журнал стерилизации инструментов (автоклав B, температура, давление).
* `preSterilizationCleaningLogs` (`pre_sterilization_cleaning_logs`) — Журнал предстерилизационной очистки (азопирамовая проба).
* `autoclaveDailyTests` (`autoclave_daily_tests`) — Ежедневные тесты автоклавов (Бови-Дик, вакуум-тест, тест-полоски).
* `inventoryTransfers` (`inventory_transfers`) — Накладные внутренних перемещений между кабинетами.
* `inventoryTransferItems` (`inventory_transfer_items`) — Позиции накладной внутреннего перемещения.
* `mdlpItems` (`mdlp_items`) — Учет упаковок лекарственных средств в системе Честный ЗНАК (МДЛП, SGTIN).

### 11. `sanpin.ts` (8 таблиц)
* `sterilizerEquipments` (`sterilizer_equipments`) — Парк автоклавов и сухожаровых шкафов клиники.
* `bactericidalEquipments` (`bactericidal_equipments`) — Бактерицидные облучатели и рециркуляторы воздуха.
* `bactericidalIrradiatorLogs` (`bactericidal_irradiator_logs`) — Журнал наработки часов бактерицидных ламп.
* `generalCleaningLogs` (`general_cleaning_logs`) — Журнал проведения генеральных уборок помещений.
* `medicalWasteLogs` (`medical_waste_logs`) — Журнал учета образования и утилизации медицинских отходов класса Б.
* `emergencyBiohazardLogs` (`emergency_biohazard_logs`) — Журнал аварийных ситуаций при работе с кровью (СанПиН 3.3686-21).
* `temperatureHumidityEquipments` (`temperature_humidity_equipments`) — Приборы контроля микроклимата (гигрометры).
* `temperatureHumidityLogs` (`temperature_humidity_logs`) — Ежедневный журнал учета температуры и влажности в помещениях хранения.

### 12. `finance.ts` (8 таблиц)
* `cashBoxes` (`cash_boxes`) — Операционные кассы филиалов и терминалы.
* `cashBoxShifts` (`cash_box_shifts`) — Смены кассиров с фиксацией инкассации.
* `cashExpenseReasons` (`cash_expense_reasons`) — Статьи управленческих расходов (РКО).
* `cashOperations` (`cash_operations`) — Приходные (ПКО) и расходные (РКО) кассовые ордера.
* `installmentContracts` (`installment_contracts`) — Договоры беспроцентной рассрочки клиники.
* `installmentTranches` (`installment_tranches`) — График платежей и траншей по рассрочке.
* `doctorPaymentRewards` (`doctor_payment_rewards`) — Начисленные вознаграждения врачей за выполненные работы.
* `doctorPayrollStatements` (`doctor_payroll_statements`) — Итоговые ведомости начисления сдельной зарплаты по форме Т-51.

### 13. `documents.ts` (3 таблицы, 2 relations)
* `documentTemplateCategories` (`document_template_categories`) — Категории шаблонов (договоры, ИДС, акты, выписки).
* `documentTemplates` (`document_templates`) — Шаблоны типографских документов с версткой.
* `documentTemplateVariables` (`document_template_variables`) — Динамические подстановочные переменные (`{{patient.fio}}`).

### 14. `communications.ts` (28 таблиц)
* `communicationTemplates` (`communication_templates`) — Шаблоны сообщений в мессенджеры и СМС.
* `communicationTasks` (`communication_tasks`) — Задачи администраторам на звонок или отправку напоминания.
* `communicationEvents` (`communication_events`) — Омниканальная хроника контактов с пациентом.
* `denteTelegramBotConfigs` (`dente_telegram_bot_configs`) — Настройки Telegram-ботов филиалов.
* `denteTelegramLinkCodes` (`dente_telegram_link_codes`) — Одноразовые коды безопасной привязки Telegram без раскрытия персональных данных.
* `denteTelegramChatLinks` (`dente_telegram_chat_links`) — Привязанные Telegram аккаунты пациентов.
* `denteTelegramWebhookEvents` (`dente_telegram_webhook_events`) — Входящие вебхуки Telegram.
* `denteTelegramOutboxDeliveryReceipts` (`dente_telegram_outbox_delivery_receipts`) — Квитанции доставки сообщений в Telegram.
* `customCrmTaskTypes` (`custom_crm_task_types`) — Пользовательские типы сервисных задач.
* `crmEmailDispatchLogs` (`crm_email_dispatch_logs`) — Логи отправки почтовых уведомлений.
* `uisOmniMessengerQueues` (`uis_omni_messenger_queues`) — Очередь интеграции омниканальных диалогов UIS.
* `landingFieldMappings` (`landing_field_mappings`) — Маппинг полей внешних лид-форм.
* `crmLeads` (`crm_leads`) — Реестр первичных лидов воронки продаж.
* `chatMessageDispatchStatuses` (`chat_message_dispatch_statuses`) — Статусы отправки сообщений в каналы.
* `collaborativeChatProcessingStates` (`collaborative_chat_processing_states`) — Совместная работа операторов в чатах.
* `messageTemplateCatalogs` (`message_template_catalogs`) — Каталоги сервисных сообщений.
* `messengerFileAttachments` (`messenger_file_attachments`) — Вложения в чатах (фото, снимки, файлы).
* `messengerInboundEvents` (`messenger_inbound_events`) — Входящие события мессенджеров.
* `patientCommunicationTimelines` (`patient_communication_timelines`) — Таймлайн коммуникаций по пациенту.
* `previousChatDialogHistories` (`previous_chat_dialog_histories`) — Исторические диалоги из сторонних систем.
* `uisCallSpeechTranscripts` (`uis_call_speech_transcripts`) — Текстовые расшифровки аудиозаписей звонков АТС.
* `uisSmsChatQuotas` (`uis_sms_chat_quotas`) — Балансы и квоты СМС провайдеров.
* `denteMaxBotConfigs` (`dente_max_bot_configs`) — Конфигурация ботов VK MAX.
* `denteWhatsappBotConfigs` (`dente_whatsapp_bot_configs`) — Конфигурация шлюзов WhatsApp Business API.
* `outgoingNotifications` (`outgoing_notifications`) — Системные уведомления сотрудникам.
* `communicationOutbox` (`communication_outbox`) — Исходящая очередь отправки сообщений.
* `patientCommunicationConsents` (`patient_communication_consents`) — Согласия пациентов на рекламные и сервисные рассылки.
* `communicationSettings` (`communication_settings`) — Общеклинические параметры связи и телефонии.

### 15. `crm_leak_detector.ts` (1 таблица)
* `crmLeakDetectorLeads` (`crm_leak_detector_leads`) — Реестр упущенных лидов и нарушений времени реакции регистратуры.

### 16. `sync.ts` (2 таблицы)
* `syncIdempotencyRecords` (`sync_idempotency_records`) — Ключи идемпотентности внешних интеграций.
* `syncEntityVectors` (`sync_entity_vectors`) — Векторные часы распределенной синхронизации (CRDT).

### 17. `copilot.ts` (4 таблицы)
* `copilotSessions` (`copilot_sessions`) — Сессии работы врача с ИИ-ассистентом.
* `copilotMessages` (`copilot_messages`) — Сообщения диалога с клиническим ИИ.
* `copilotPendingActions` (`copilot_pending_actions`) — Предлагаемые ИИ действия, ожидающие подтверждения врача (HITL).
* `copilotHitlCards` (`copilot_hitl_cards`) — Интерактивные карточки решений (Human-in-the-Loop).

### 18. `rag.ts` (1 таблица)
* `clinicalKnowledgeEmbeddings` (`clinical_knowledge_embeddings`) — Векторные эмбеддинги базы клинических знаний СтАР и клинических рекомендаций Минздрава РФ.

### 19. `aiTelemetry.ts` (1 таблица)
* `aiPromptLogs` (`ai_prompt_logs`) — Аудит расхода токенов LLM, задержек генерации и безопасности персональных данных.

### 20. `system.ts` (12 таблиц)
* `importBatches` (`import_batches`) — Пакеты импорта данных из сторонних систем.
* `auditEvents` (`audit_events`) — Неизменяемый системный лог аудита действий пользователей (152-ФЗ).
* `prodoctorovSyncExports` (`prodoctorov_sync_exports`) — Логи синхронизации расписания с порталом ПроДокторов.
* `dadataGeocodedAddresses` (`dadata_geocoded_addresses`) — Кэш стандартизированных адресов КЛАДР/ФИАС через DaData.
* `systemRamWatchdogs` (`system_ram_watchdogs`) — Логи сторожевого таймера оперативной памяти Node.js.
* `biAnalyticsSnapshots` (`bi_analytics_snapshots`) — Агрегированные исторические финансовые снимки клиники.
* `migrationRuns` (`migration_runs`) — Сессии миграции баз данных конкурентов (IDENT, DentalPRO).
* `migrationStagingRecords` (`migration_staging_records`) — Промежуточные буферные строки миграции.
* `migrationQuarantineRecords` (`migration_quarantine_records`) — Карантин некорректных строк импорта.
* `migrationEntityLinks` (`migration_entity_links`) — Связки внешних ID сторонней системы с внутренними UUID.
* `migrationReconciliations` (`migration_reconciliations`) — Сверка контрольных сумм импортированных оплат и балансов.
* `systemBackgroundJobs` (`system_background_jobs`) — Очереди фоновых задач системы (бэкапы, отчеты, выгрузки).

### 21. `_common.ts` (47 перечислений `pgEnum`)
Базовые перечисления базы данных:
* `patientStatusEnum`, `appointmentStatusEnum`, `visitStatusEnum`, `paymentMethodEnum`
* `toothConditionEnum`, `treatmentPlanStageStatusEnum`, `labOrderStatusEnum`
* `sterilizationCycleTypeEnum`, `bactericidalLogTypeEnum`, `medicalWasteClassEnum`
* `currencyEnum`, `taxSystemEnum`, `genderEnum`, `roleEnum` и др.

---

## 🔒 Защита данных: Row-Level Security (RLS)

В соответствии с требованиями 152-ФЗ «О персональных данных» и нормами врачебной тайны 323-ФЗ в PostgreSQL активирована и принудительно включена политика **Row-Level Security**:

* **Покрытие**: 147 рабочих таблиц схемы имеют статус `rowsecurity = true` и `relforcerowsecurity = true`.
* **Принцип действия**:
  1. При каждом HTTP/WS запросе открывается сессионная транзакция:
     ```sql
     SET LOCAL app.current_tenant = '<organization_id>';
     ```
  2. Политика `tenant_isolation` гарантирует строгую изоляцию данных арендатора:
     ```sql
     CREATE POLICY tenant_isolation_policy ON <table>
     AS RESTRICTIVE
     USING (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
     ```
  3. Прямой доступ к чужим медицинским или финансовым записям на уровне ядра СУБД физически невозможен даже при программных ошибках в API.
