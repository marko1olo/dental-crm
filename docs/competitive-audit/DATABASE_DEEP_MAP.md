# 🗄️ Полная Карта Базы Данных и Сущностей Dental CRM (PostgreSQL 18.4 / Drizzle ORM)

> **Глубокая архитектурная спецификация структуры базы данных DENTE Dental CRM.**  
> Отражает модульную схему Drizzle ORM (**20 файлов**, **203 таблицы `pgTable`** в `apps/api/src/db/schema/`), нативный движок **PostgreSQL 18.4 TCP**, политики **Row-Level Security (RLS)** и суверенитет стоматологического амбулаторного контекста (Форма 043/у).

---

## 🧭 Навигация и перекрестные ссылки

* 🗺️ **[Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Центральная навигационная карта проекта.
* 🗄️ **[Реестр Базы Данных (.agents/DATABASE.md)](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Системный документ СУБД, RLS политики, скрипты миграций и безопасность.
* 📚 **[Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)** — Центральный шлюз нормативной и технической документации.
* 🛣️ **[Исчерпывающий Каталог маршрутов (.agents/API_ROUTES_CATALOG.md)](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** — Привязка 771 эндпоинта к таблицам базы данных.
* 🛣️ **[Глубокая Карта Маршрутов (docs/competitive-audit/API_ROUTES_DEEP_MAP.md)](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/API_ROUTES_DEEP_MAP.md)** — 9 канонических категорий Fastify 5.3+.
* 🚀 **[Руководство по API-серверу (apps/api/README.md)](file:///C:/Clinic_MVP/dental-crm/apps/api/README.md)** — Production-руководство по бэкенду.
* 📋 **[Главная Конституция (.agents/AGENTS.md)](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Абсолютные стандарты, точность денег до копейки, Мандат 8i.

---

## ⚙️ Ядро СУБД и инфраструктура

| Параметр | Значение в кодовой базе | Примечание |
| :--- | :--- | :--- |
| **СУБД** | **PostgreSQL 18.4** (нативный сервер) | Работает строго по TCP через драйвер `node-postgres` (`pg.Pool`) |
| **Сетевой адрес** | `127.0.0.1:5432` | Доступ строго по сети; встраиваемый PGlite **полностью удалён** из проекта |
| **Имя базы данных** | `dental_crm` | Рабочая база многопользовательской стоматологической клиники |
| **Директория данных** | `.data/pg18` (в корне репозитория) | Каталог `apps/api/dente-db` — мёртвый артефакт PGlite с PID `-42` |
| **Бинарные файлы** | `node_modules/@embedded-postgres/windows-x64/native/bin/` | Серверные исполняемые файлы `postgres.exe`, `initdb.exe`, `pg_ctl.exe` |
| **Клиент ORM** | `drizzle-orm: ^0.45.2` | Экземпляр `db` в `apps/api/src/db/client.ts` обёрнут в Proxy для транзакций ALS |
| **Парсинг валют** | `registerMoneyTypeParsers()` | Регистрация парсеров OID `numeric` до старта пула (защита от склеивания строк) |

---

## 🧩 Модульная архитектура схемы (`apps/api/src/db/schema/*.ts`)

Монолит `apps/api/src/db/schema.ts` разделен на **18 независимых предметных модулей** + общий модуль `_common.ts` + агрегатор `index.ts` (**всего 20 файлов**), объявляющих **203 таблицы `pgTable`**:

```
apps/api/src/db/schema/
├── _common.ts            # Базовые перечисления (pgEnum), утилиты колонок и аудит-поля
├── auth.ts               # 6 таблиц: организации, филиалы, пользователи, инвайты, OTP
├── patients.ts           # 20 таблиц: пациенты, ИДС, аллергии, семейные связи, лояльность
├── schedule.ts           # 16 таблиц: кресла, приёмы, лист ожидания, отмены, синхронизация
├── billing.ts            # 13 таблиц: платежи, счета, кассовая книга, СБП QR, очередь 54-ФЗ
├── clinical.ts           # 47 таблиц: диагнозы МКБ-10, планы, дневники 043/у, наряды ЗТЛ
├── imaging.ts            # 13 таблиц: DICOM исследования, серии, 3D планирование, Diagnocat
├── inventory.ts          # 13 таблиц: номенклатура склада, склады, партии FEFO, техкарты, МДЛП
├── sanpin.ts             # 8 таблиц: стерилизаторы, облучатели, медотходы, генеральные уборки
├── finance_v2.ts         # 8 таблиц: кассы, смены, расходные ордера, рассрочки, зарплата
├── documents_v2.ts       # 3 таблицы: шаблоны документов, категории, переменные подстановки
├── outpatientCore.ts     # 7 таблиц: формула FDI, дефекты зубов, шаблоны дневников 043/у
├── communications.ts     # 28 таблиц: омниканальная лента, задачи обзвона, бот Telegram
├── crm_leak_detector.ts  # 1 таблица: аудит утечки лидов и пропущенных звонков
├── sync.ts               # 2 таблицы: векторы синхронизации, идемпотентность внешних систем
├── copilot.ts            # 4 таблицы: сессии Copilot, подсказки врача, клинические алерты
├── rag.ts                # 1 таблица: векторные эмбеддинги базы знаний и стандартов СтАР
├── aiTelemetry.ts        # 1 таблица: аудит токенов LLM и задержек провайдеров ИИ
├── system.ts             # 12 таблиц: системный журнал аудита, настройки, воркеры, бэкапы
└── index.ts              # Агрегатор схемы, реэкспортирующий все 203 сущности
```

### Подробный реестр предметных модулей

| Модуль | Таблиц | Ключевые таблицы `pgTable` | Предметная роль в клинике |
| :--- | :---: | :--- | :--- |
| **`auth.ts`** | **6** | `organizations`, `clinics`, `users`, `user_invitations`, `portal_otp_codes`, `clinic_workflows` | Мультиарендная архитектура, филиалы клиники, учетные записи врачей/админов, PIN-коды |
| **`patients.ts`** | **20** | `patients`, `patient_consents`, `family_groups`, `patient_bonus_balances`, `patient_drug_allergies`, `patient_relationships`, `patient_archive_reasons`, `patient_duplicate_merge_queues` | Картотека пациентов, семейные группы, согласия на обработку ПДн, аллергологический статус |
| **`schedule.ts`** | **16** | `chairs`, `appointments`, `appointment_waitlists`, `cancellation_reasons_two_level`, `schedule_time_reservations`, `clinic_chairs`, `yandex_calendar_syncs` | Расписание приёмов, стоматологические установки, лист ожидания, причины отмен, календарь |
| **`billing.ts`** | **13** | `payments`, `patient_invoices`, `invoice_items`, `cash_ledger`, `fiscal_receipt_queue`, `sbp_qr_transactions`, `payment_installments` | Биллинг, выставление счетов за услуги 804н, кассовые проводки, очередь чеков 54-ФЗ |
| **`clinical.ts`** | **47** | `treatment_plans`, `treatment_plan_stages`, `treatment_plan_items`, `visit_diaries`, `diagnoses`, `clinical_rules`, `anesthesia_logs`, `dental_lab_orders`, `implant_passports`, `prescriptions`, `orthodontic_cases` | Электронная медкарта 043/у, комплексные планы лечения, дневники визитов, наряды в зуботехническую лабораторию (ЗТЛ), анестезиологические карты |
| **`imaging.ts`** | **13** | `imaging_studies`, `imaging_series`, `imaging_instances`, `patient_ct_plannings`, `diagnocat_reports`, `bulk_image_operation_logs`, `xray_scans` | Хранение радиовизиографии (RVG), ОПТГ и КЛКТ 3D снимков, интеграция с Diagnocat AI |
| **`inventory.ts`** | **13** | `inventory_items`, `warehouses`, `stock_batches`, `inventory_transactions`, `procedure_material_rules`, `procedure_tech_cards`, `mdlp_items` | Управление складом материалов, списание по партиям (FEFO), списание карпул в 1 клик, Честный ЗНАК |
| **`sanpin.ts`** | **8** | `sterilizer_equipments`, `bactericidal_equipments`, `bactericidal_irradiator_logs`, `general_cleaning_logs`, `medical_waste_logs`, `temperature_humidity_logs` | Санитарный контроль СанПиН 3.3686-21: журналы бактерицидных ламп, отходов класса Б, уборки |
| **`finance_v2.ts`** | **8** | `cash_boxes`, `cash_box_shifts`, `cash_operations`, `installment_contracts`, `installment_tranches`, `doctor_payroll_statements` | Операционные кассы филиалов, инкассация, расходные ордера, расчет сдельной зарплаты врачей |
| **`documents_v2.ts`** | **3** | `document_templates`, `document_template_categories`, `document_template_variables` | Конструктор юридических документов стоматологии с динамическими переменными |
| **`outpatientCore.ts`**| **7** | `clinical_teeth_catalog`, `patient_tooth_defects`, `mkb_categories`, `outpatient_templates`, `outpatient_verifications` | Международная зубная формула FDI, патологии поверхностей зубов (MOD), аудит версий протоколов |
| **`communications.ts`**| **28**| `communication_events`, `communication_tasks`, `message_templates`, `outbound_message_queue`, `chat_dialogs`, `chat_messages`, `telegram_bot_configs`, `telegram_link_codes` | Омниканальный инбокс, маршрутизация WhatsApp/Telegram/VK, задачи администраторам |
| **`crm_leak_detector.ts`**| **1**| `crm_leak_detector_leads` | Реестр упущенных первичных лидов и анализ скорости реакции регистратуры |
| **`sync.ts`** | **2** | `sync_idempotency_records`, `sync_entity_vectors` | Идемпотентность распределенных обновлений и векторные часы репликации |
| **`copilot.ts`** | **4** | `copilot_sessions`, `copilot_messages`, `copilot_nudges`, `copilot_alerts` | Интеллектуальный ассистент врача, подсказки по клиническим рекомендациям СтАР |
| **`rag.ts`** | **1** | `clinical_knowledge_embeddings` | База клинических знаний и клинических протоколов стоматологии РФ |
| **`aiTelemetry.ts`** | **1** | `ai_prompt_logs` | Журнал использования ИИ, учет токенов и аудит безопасности медицинских данных |
| **`system.ts`** | **12** | `audit_events`, `system_settings`, `background_jobs`, `branch_offices`, `backup_ledger` | Аудит действий персонала, фоновые очереди задач, параметры филиалов, резервные копии |
| **`_common.ts`** | — | Перечисления: `patientStatusEnum`, `appointmentStatusEnum`, `visitStatusEnum`, `paymentMethodEnum` | Общие типы PostgreSQL (pgEnum), мета-столбцы арендатора и временные метки |
| **`index.ts`** | — | Экспорт всех 203 таблиц схемы базы данных | Единая точка входа для Drizzle ORM |

---

## 🔒 Защита данных: Row-Level Security (RLS)

В соответствии с высочайшими стандартами безопасности медицинских данных в PostgreSQL активирована и принудительно включена политика **Row-Level Security**:

* **Покрытие**: 147 рабочих таблиц схемы имеют статус `rowsecurity = true` и `relforcerowsecurity = true`.
* **Принцип действия**:
  1. При каждом HTTP/WS запросе открывается сессионная транзакция:
     ```sql
     SET LOCAL app.current_tenant = '<organization_id>';
     ```
  2. Политика `tenant_isolation` фильтрует выборку:
     ```sql
     USING (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
     WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
     ```
  3. **Принцип Fail-Closed**: Если запрос выполнен без установки контекста арендатора, `NULLIF` возвращает `NULL`, и запрос возвращает 0 строк, предотвращая любую межклиническую утечку.
  4. Единственная таблица вне периметра RLS — системная таблица версий миграций **`_dente_migrations`**, не содержащая данных пациентов.

---

## 📄 Реестр Видов Документов (`documentKind` — 31 канонический вид)

В Dental CRM встроен полноценный юридически значимый документооборот частной стоматологической клиники РФ, строго следующий **Мандату 8i** (стоматологический амбулаторный контекст по **Форме 043/у**, без госпитального стационарного балласта):

1. `paid_medical_services_contract` — Договор оказания платных стоматологических услуг
2. `completed_works_act` — Акт выполненных работ / оказанных услуг по номенклатуре 804н
3. `tax_deduction_certificate` — Справка об оплате медицинских услуг для налогового вычета (ФНС КНД 1151156)
4. `informed_consent` — Базовое информированное добровольное согласие на медицинское вмешательство (ИДС)
5. `procedure_specific_consent_packet` — Специализированный пакет ИДС (дентальная имплантация, синус-лифтинг, ортодонтия)
6. `treatment_plan` — Комплексный план стоматологического лечения (3 варианта)
7. `treatment_plan_acceptance` — Согласие пациента с выбранным планом лечения и финансовыми условиями
8. `anesthesia_consent_log` — Протокол и согласие на проведение местной/проводниковой анестезии
9. `prescription_medication_order` — Рецептурный бланк на лекарственные препараты (Форма 107-1/у)
10. `personal_data_processing_consent` — Согласие на обработку персональных данных (152-ФЗ)
11. `minor_legal_representative_consent` — Договор и согласия с законным представителем несовершеннолетнего
12. `photo_video_consent` — Согласие на дентальную фотофиксацию и ведение клинического архива
13. `medical_intervention_refusal` — Официальный отказ пациента от медицинского вмешательства
14. `treatment_cost_estimate` — Предварительная калькуляция и смета лечения
15. `payment_invoice` — Счет на оплату стоматологических услуг
16. `payment_receipt` — Кассовый чек / приходный кассовый ордер (54-ФЗ)
17. `installment_payment_schedule` — Договор и график беспроцентной рассрочки клиники
18. `post_visit_recommendations` — Памятка и назначения пациенту после стоматологического вмешательства
19. `outpatient_medical_card_043u` — **Медицинская карта стоматологического больного (Учётная форма № 043/у Минздрава РФ)**
20. `medical_record_extract` — Выписка из стоматологической карты 043/у
21. `medical_record_copy_request` — Заявление пациента на выдачу заверенной копии медицинской документации
22. `medical_document_release_receipt` — Журнал учета выдачи справок и медицинских документов
23. `xray_cbct_referral` — Направление на дентальную визиографию / ОПТГ / КЛКТ 3D
24. `lab_work_order` — Заказ-наряд в зуботехническую лабораторию (ЗТЛ) с формулой зубов FDI и шкалой VITA
25. `visit_attendance_certificate` — Справка о посещении стоматолога (для работодателя / учебного заведения)
26. `warranty_service_memo` — Гарантийный талон и условия поддержания гарантии на пломбы/импланты
27. `payment_refund_correction_request` — Заявление пациента на возврат денежных средств
28. `tax_deduction_application` — Заявление пациента на изготовление справки для налоговой инспекции
29. `legacy_tax_deduction_certificate` — Архивный реестр справок НДФЛ
30. `tax_deduction_registry` — Реестр выданных справок для налогового вычета
31. `patient_intake_questionnaire` — Амбулаторная анкета здоровья и соматического статуса перед приёмом

---

## 🚀 Система миграций и поддержка версионности

* Раннер миграций: `apps/api/src/scripts/migrate.ts`.
* Системный журнал: таблица `_dente_migrations` (колонки `id`, `name`, `applied_at`, `checksum_sha256`).
* Режимы запуска:
  - `npm run db:migrate` — накат новых `.sql` файлов по возрастанию номера.
  - `npm run db:migrate:check` — сухой прогон (dry-run).
  - `npm run db:migrate:baseline` — фиксация начального состояния без выполнения DDL.
  - `npm run db:migrate:strict` — проверка неизменности контрольных сумм в CI.
* Поддержка неблокирующего создания индексов: файлы с первой строкой `-- no-transaction` исполняются вне транзакции, что позволяет выполнять `CREATE INDEX CONCURRENTLY`.
