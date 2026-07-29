# MM6 — 134 колонки живой базы без объявления в Drizzle

Дата: 2026-07-29. База: нативный PostgreSQL 18 на 127.0.0.1:5432, схема `public`,
только `select` по `information_schema`. Инструмент переписи —
`scripts/smoke-schema-missing-declarations.mjs` (второй такой не писался).

## Итог пакета

| | до | после |
|---|---|---|
| незаявленных колонок | 134 | **129** |
| таблиц-записей в реестре колонок | 34 | 33 |
| незаявленных таблиц | 19 | 19 |
| код выхода стража | 0 | 0 |

Объявлены пять колонок, разница ровно пять. Миграций не добавлено и не требуется:
все пять колонок в базе уже есть, добавлено только объявление.

## Первое, что нужно знать ведущему: два критерия ранжирования из брифа пусты

Бриф предлагал сортировать вред по трём признакам. Замер по всем 134 колонкам:

**(а) «NOT NULL без значения по умолчанию — вставка через Drizzle упадёт или уже
падает» — таких колонок НОЛЬ.** NOT NULL среди 134 ровно 81, и у всех 81 есть
`DEFAULT`. Ни одна вставка через Drizzle из-за этих колонок упасть не могла и не
падала: база подставляет значение сама. Признак (а) не отбирает ничего.

**(б) «участвует в уникальном ограничении или внешнем ключе» — таких колонок
ОДНА.** `patients.insurance_contract_id`, внешний ключ
`patients_insurance_contract_id_insurance_contracts_id_fk` на
`insurance_contracts.id`. Уникальных ограничений нет ни у одной из 134.

Значит, ранжировать по вреду можно было только признаком (в) — деньги, персональные
данные, согласие — и тем, чего в брифе не было: **живым потребителем в коде**.
Именно он и отобрал пятёрку ниже. Колонка, которую никто не читает и не пишет,
опасна одинаково слабо во всех 34 таблицах; колонка, которую УЖЕ читает отчёт или
УЖЕ показывает виджет, опасна конкретно и проверяемо.

**Данных за незаявленными колонками сегодня нет.** `patient_invoices`, `crm_leads`,
`egisz_blank_permissions`, `ndfl_tax_calculators`, `treatment_plan_items_new` — 0
строк; у 7 пользователей оба права `false`, у 17 пациентов номер полиса и договор
ДМС не заполнены. То есть вред структурный и наступит на первой реальной записи;
уже случившейся потери денег нет, и утверждать её было бы враньём.

## Пять худших: ранг и обоснование

### 1. `patient_invoices.total_amount_rub` — деньги, единственный отчёт уже читает её
`numeric(12,2) DEFAULT '0' NOT NULL`, миграция `0000_freezing_randall_flagg.sql`,
строка 841.

В исходной схеме это **единственная** сумма счёта: `total_rub`, который объявлен в
`schema.ts`, в миграции 0000 отсутствует вовсе — его дописала в базу миграция
`0118_align_tables_with_schema.sql`, строка 206, под уже написанное объявление.
Выравнивание пошло не в ту сторону: вместо объявления живой колонки в базе завели
денежный дубль, и теперь у счёта две суммы.

Вред измеряется потребителем: `apps/api/src/scripts/cronAnalyticsWorker.ts`
складывает сырым SQL именно `total_amount_rub` — в двух местах, выручка когорт LTV
(строки 110, 118-119) и выручка по врачам (строка 201). А всё, что пишет счёт через
Drizzle, заполняет `total_rub`. Незаявленная колонка остаётся на своём `DEFAULT 0`,
и оба отчёта суммируют нули. Ранг 1: деньги плюс единственный в пятёрке уже
работающий читатель.

### 2. `users.can_manage_money` — право распоряжаться деньгами
### 3. `users.can_sign_medical_records` — право подписывать медицинские записи
Обе `boolean DEFAULT false NOT NULL`, миграция 0000, строки 1078-1079.

База хранит эти права пофамильно, но прочитать их нечем, и потребители подставили
своё:

- `apps/api/src/db/settingsQuery.ts`, строки 124-125 — **константа `true` каждому
  сотруднику**: `canSignMedicalRecords: true`, `canManageMoney: true`;
- `apps/api/src/db/domainStateHydration.ts`, строки 461-462 — вывод из роли:
  подписывать может `doctor` или `owner`, деньгами распоряжается `owner` или
  `administrator`.

То есть право на легально значимую подпись медицинской записи и право на деньги
выдавались не тем значением, которое хранит база, а константой и догадкой по роли,
причём две реализации расходятся между собой. Ранг 2-3: разрешительный класс,
рядом с деньгами и медицинской подписью, и оба уже неверно подменены в коде.

### 4. `egisz_blank_permissions.patient_opt_out_respect` — согласие пациента
`boolean DEFAULT true NOT NULL`, миграция `0103_add_egisz_blank_permissions.sql`,
строка 7.

Не служебный признак, а согласие: флаг решает, будет ли учтён отказ пациента при
выгрузке его медицинских данных в государственный реестр ЕГИСЗ. Виджет
`apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx` уже
показывает его словами «учитывается» / «не учитывается» (строка 203) и ждёт в строке
ещё три незаявленные колонки — `formCode`, `fieldName`, `isExportAllowed`. При этом
серверного маршрута к таблице `egisz_blank_permissions` нет НИ ОДНОГО: во всём
`apps/api/src` она встречается единственный раз — в самом объявлении схемы. Через
Drizzle колонка была недостижима, показывать виджету было нечего. Ранг 4: согласие
и юридический контур, но реального читателя на сервере пока нет — поэтому ниже
денег и прав.

### 5. `crm_leads.expected_revenue` — деньги, которые маршрут принимал и терял
`numeric(12,2)`, nullable, миграция 0000, строка 293.

`POST /api/leads` принимает `expectedRevenue` в схеме разбора
(`apps/api/src/routes/leads.ts`, строка 23, `z.string().optional()`) и пишет лид
через `db.insert(crmLeads).values({ ...data, organizationId })` (строки 59-62).
Ключа, которого нет в форме таблицы, Drizzle в запрос не переносит: сумма,
введённая администратором, до базы не доходила. Прочитать её тоже было нечем —
`GET /api/leads` делает `select()` по тем же объявлениям. Канбан лидов
(`apps/web/src/components/leads/LeadsKanbanView.tsx`) показывал поле, которое нечем
заполнить. Ранг 5: деньги и живой путь записи, но лид — прогноз, а не проведённая
сумма, поэтому ниже счёта и прав.

### Почему не вошли колонки, названные в брифе
`patients.insurance_policy_number` (персональные данные) и
`patients.insurance_contract_id` (единственный внешний ключ переписи) — ранги 6-7.
Уступили потому, что у обеих есть работающий обходной путь: номер полиса продукт
уже хранит и показывает через `patients.administrative_profile` (jsonb) —
`PatientAdministrativeForm.tsx`, `renderDocument.ts`, — так что данные не теряются,
теряется только вторая, дублирующая колонка. `appointments.is_synced`,
`appointments.version` и `chairs.status` — служебные признаки офлайн-синхронизации и
состояние кресла, без денег, персональных данных и согласия.

## Чем подтверждён тип каждого объявления

Тип, nullable и default взяты из `information_schema.columns` живой базы, а не из
догадки; провенанс сверен с DDL миграции.

| колонка | база | объявлено |
|---|---|---|
| `patient_invoices.total_amount_rub` | `numeric(12,2)` NOT NULL DEFAULT `'0'` | `numeric("total_amount_rub", { precision: 12, scale: 2, mode: "number" }).notNull().default(0)` |
| `users.can_sign_medical_records` | `boolean` NOT NULL DEFAULT `false` | `boolean("can_sign_medical_records").notNull().default(false)` |
| `users.can_manage_money` | `boolean` NOT NULL DEFAULT `false` | `boolean("can_manage_money").notNull().default(false)` |
| `egisz_blank_permissions.patient_opt_out_respect` | `boolean` NOT NULL DEFAULT `true` | `boolean("patient_opt_out_respect").notNull().default(true)` |
| `crm_leads.expected_revenue` | `numeric(12,2)`, nullable, без default | `numeric("expected_revenue", { precision: 12, scale: 2 })` |

Три решения, которые не были механическими:

- **`.default()` у всех NOT NULL обязателен.** Без него Drizzle требует поле в
  каждом `insert`, а вставок в `users` в маршрутах и тестах десятки — объявление без
  default сломало бы сборку, ничего не починив.
- **`mode: "number"` у `total_amount_rub`.** `registerMoneyTypeParsers()`
  (`apps/api/src/db/moneyTypeParsers.ts`) ставит разбор `numeric` на весь процесс до
  создания пула, поэтому драйвер отдаёт здесь число. Объявление без `mode` обещало
  бы строку — ровно тот денежный дрейф типа, против которого написан
  `scripts/check-schema-type-drift.mjs`. Шаблон
  `numeric(..., { mode: "number" }).notNull().default(0)` в этом файле уже
  используется шесть раз, так что он проверен сборкой до меня.
- **`expected_revenue` объявлена БЕЗ `mode`.** Маршрут разбирает поле как
  `z.string()`; строковый тип Drizzle совпадает с его контрактом, а `mode: "number"`
  дал бы `string` против `number` в том самом `insert` — то есть красный
  typecheck на ровном месте.

Снятие пяти записей из реестра исключений стража — часть той же правки, а не
самодеятельность: страж валит прогон на записи, которая исключает уже объявленную
колонку («колонки уже объявлены … удалите их из записи», строки 578-583). У
`crm_leads` запись была одноколоночной, поэтому удалена целиком — отсюда 34 → 33.

## Замеры

Все команды запущены без конвейера, код выхода истинный.

| команда | код выхода |
|---|---|
| `node scripts/smoke-schema-missing-declarations.mjs --json` (до) | 0, `undeclaredColumns: 134` |
| `node scripts/smoke-schema-missing-declarations.mjs --json` (после) | 0, `undeclaredColumns: 129`, `failures: []` |
| `node --import tsx --test scripts/smoke-schema-missing-declarations.test.mjs` | 0, проверок 5 из 5 |
| `node scripts/check-schema-type-drift.mjs --money-only` | 0, денежных расхождений по типу 0 |
| импорт `apps/api/src/db/schema.ts` под tsx | 0; имена и флаги всех пяти колонок совпали с базой |

Общие гейты (`typecheck`, `build`, полный `test`, миграции, сиды) не запускались —
они за ведущим.

## Найдено попутно, в очередь

1. **`scripts/smoke-schema-column-parity.mjs` сейчас КРАСНЫЙ, код выхода 1** — 19
   таблиц с жалобой «в schema.ts объявлены колонки, которых нет в DDL»
   (`migration_runs`, `migration_staging_records`, `portal_otp_codes`,
   `patient_task_tickets` и далее). К MM6 отношения не имеет: правка MM6 только
   добавляет объявления, и ни одна из 19 таблиц ею не затронута. Но страж, который
   стоит красным, перестаёт быть стражем.
2. **67 колонок объявлены `.notNull()`, а в базе они NULLABLE** (замер по всем
   объявлениям `schema.ts` против `information_schema`). Среди них
   `patient_invoices.total_rub`, `crm_leads.organization_id`,
   `visit_diaries.organization_id`, `inventory_items.current_qty`,
   `egisz_blank_permissions.is_allowed`. Это отдельный класс, которого не видит ни
   один страж: `check-schema-type-drift.mjs` сверяет только `data_type`, паритет
   колонок — только наличие. Первый же `NULL` в такой колонке отдаётся коду,
   уверенному, что `null` невозможен.
3. **`organizations` — 29 незаявленных колонок**, вся матрица включения модулей и
   брендирования: `has_*` (13 флагов), `ai_enable_*` (3), `workspace_preset`,
   `working_hours`, `specializations`, `logo_url`, `stamp_url`, `theme_color`,
   `currency`, `marketing_data`. Продукт гейтит модули и рисует бренд по данным,
   которые не может прочитать. Самая крупная таблица переписи и, вероятно, следующий
   по вреду пакет после MM6.
4. **`patient_invoices` — денежный раскол не закрыт до конца.** Остались
   незаявленными `items_json` (строки счёта, NOT NULL DEFAULT `'[]'`),
   `patient_amount_rub` и `insurance_amount_rub` (разделение оплаты между пациентом и
   страховой), `updated_at`. И нужно решение ведущего: какая из двух сумм —
   `total_rub` или `total_amount_rub` — каноническая, потому что сейчас пишут в одну,
   а считают по другой.
5. **`egisz_blank_permissions` — пустотелый модуль.** Виджет ждёт четыре поля, из
   которых после MM6 три ещё незаявлены (`form_code`, `field_name`,
   `is_export_allowed`), и серверного маршрута к таблице нет ни одного.
6. **Офлайн-синхронизация объявлена наполовину.** `is_synced` и `version` живут в
   базе у `appointments`, `clinics`, `generated_documents`, `payments`,
   `treatment_items`, `treatment_scenarios`, `visits`, `organizations`, `users` и
   нигде не объявлены. Пока их нет в модели, обновление с проверкой версии
   (оптимистичная блокировка) написать нельзя ни в одном из этих мест.
7. **`users` — остаток той же записи:** `can_manage_imports`, `color`, `snils`
   (персональные данные, СНИЛС), `updated_at`, `version`. `settingsQuery.ts` так же
   жёстко отдаёт `canManageImports: true` и `color: "#000000"`.

## Все 134 колонки переписи (34 таблицы)

Состояние ДО правки MM6. Тип, nullable и default — из `information_schema.columns`.
Пять объявленных пакетом MM6 отмечены `[MM6]`.

- **appointments** (2): `is_synced` boolean NOT NULL DEFAULT false; `version` integer NOT NULL DEFAULT 1
- **bulk_image_operation_logs** (3): `assigned_tooth_number` integer; `patient_name` text; `selected_images_count` integer NOT NULL DEFAULT 1
- **chairs** (2): `created_at` timestamptz NOT NULL DEFAULT now(); `status` text NOT NULL DEFAULT active
- **chat_message_dispatch_statuses** (3): `can_retry` boolean NOT NULL DEFAULT false; `dispatch_timestamp` timestamptz NOT NULL DEFAULT now(); `recipient_name` text
- **clinics** (4): `is_synced` boolean NOT NULL DEFAULT false; `marketing_settings` jsonb; `reporting_settings` jsonb; `version` integer NOT NULL DEFAULT 1
- **collaborative_chat_processing_states** (4): `assigned_agent_name` text; `has_agent_replied` boolean NOT NULL DEFAULT false; `is_archived` boolean NOT NULL DEFAULT false; `updated_at` timestamptz NOT NULL DEFAULT now()
- **communication_events** (1): `read_at` timestamptz
- **crm_leads** (1): `expected_revenue` numeric(12,2) **[MM6]**
- **diagnocat_ai_findings** (6): `ai_confidence_score` numeric(4,2) NOT NULL DEFAULT 0.95; `detected_pathologies_json` text; `imported_at` timestamptz; `imported_to_odontogram` boolean NOT NULL DEFAULT false; `patient_name` text; `study_type` text NOT NULL DEFAULT CBCT
- **doctor_commissions** (1): `effective_to` timestamptz
- **egisz_blank_permissions** (5): `field_name` text; `form_code` text; `is_export_allowed` boolean NOT NULL DEFAULT true; `patient_opt_out_respect` boolean NOT NULL DEFAULT true **[MM6]**; `updated_at` timestamptz NOT NULL DEFAULT now()
- **generated_documents** (2): `is_synced` boolean NOT NULL DEFAULT false; `version` integer NOT NULL DEFAULT 1
- **message_template_catalogs** (5): `body_text` text; `channel_type` text NOT NULL DEFAULT sms; `dynamic_tags` text; `is_default` boolean NOT NULL DEFAULT true; `template_name` text
- **messenger_file_attachments** (4): `delivery_status` text NOT NULL DEFAULT sent; `file_name` text; `patient_name` text; `target_messenger` text NOT NULL DEFAULT telegram
- **mkb10_auto_directories** (5): `auto_updated` boolean NOT NULL DEFAULT true; `bound_template_package` text; `last_version_date` text NOT NULL DEFAULT 2026-01-01; `mkb_code` text; `mkb_title` text
- **ndfl_tax_calculators** (4): `has_anomaly_warning` boolean NOT NULL DEFAULT false; `patient_name` text; `tax_code` text NOT NULL DEFAULT code_1; `total_eligible_rub` numeric(12,2)
- **organizations** (29): `ai_enable_documents` boolean NOT NULL DEFAULT true; `ai_enable_recommendations` boolean NOT NULL DEFAULT true; `ai_enable_treatment_plan` boolean NOT NULL DEFAULT true; `currency` text DEFAULT ₽; `has_analytics_module` boolean NOT NULL DEFAULT true; `has_assistants` boolean NOT NULL DEFAULT true; `has_dental_lab` boolean NOT NULL DEFAULT true; `has_installments` boolean NOT NULL DEFAULT true; `has_insurance_co_pay` boolean NOT NULL DEFAULT true; `has_inventory_module` boolean NOT NULL DEFAULT true; `has_marketing_module` boolean NOT NULL DEFAULT true; `has_multiple_chairs` boolean NOT NULL DEFAULT true; `has_orthodontics` boolean NOT NULL DEFAULT true; `has_payroll_module` boolean NOT NULL DEFAULT true; `has_pediatric_mode` boolean NOT NULL DEFAULT false; `has_reclamations` boolean NOT NULL DEFAULT true; `has_tasks` boolean NOT NULL DEFAULT true; `is_omni_role` boolean NOT NULL DEFAULT false; `is_synced` boolean NOT NULL DEFAULT false; `logo_url` text; `marketing_data` jsonb; `onboarding_completed` boolean NOT NULL DEFAULT false; `requires_migration` boolean NOT NULL DEFAULT false; `specializations` jsonb; `stamp_url` text; `theme_color` text DEFAULT teal; `version` integer NOT NULL DEFAULT 1; `working_hours` jsonb; `workspace_preset` text NOT NULL DEFAULT enterprise
- **patient_duplicate_merge_queues** (4): `duplicate_patient_name` text; `match_confidence_percent` integer NOT NULL DEFAULT 95; `merge_status` text NOT NULL DEFAULT pending; `primary_patient_name` text
- **patient_invoices** (5): `insurance_amount_rub` numeric(12,2) DEFAULT 0; `items_json` jsonb NOT NULL DEFAULT []; `patient_amount_rub` numeric(12,2) NOT NULL DEFAULT 0; `total_amount_rub` numeric(12,2) NOT NULL DEFAULT 0 **[MM6]**; `updated_at` timestamptz NOT NULL DEFAULT now()
- **patients** (2): `insurance_contract_id` uuid (внешний ключ на insurance_contracts.id); `insurance_policy_number` text
- **payments** (2): `is_synced` boolean NOT NULL DEFAULT false; `version` integer NOT NULL DEFAULT 1
- **previous_chat_dialog_histories** (5): `closed_at` timestamptz NOT NULL DEFAULT now(); `dialog_session_id` text; `message_count` integer NOT NULL DEFAULT 0; `patient_name` text; `summary_note` text
- **system_ram_watchdogs** (4): `client_host_name` text; `total_ram_mb` integer; `used_ram_mb` integer; `warning_level` text NOT NULL DEFAULT normal
- **treatment_items** (2): `is_synced` boolean NOT NULL DEFAULT false; `version` integer NOT NULL DEFAULT 1
- **treatment_plan_items_new** (1): `commission_amount` numeric(12,2) NOT NULL DEFAULT 0
- **treatment_scenarios** (2): `is_synced` boolean NOT NULL DEFAULT false; `version` integer NOT NULL DEFAULT 1
- **uis_call_speech_transcripts** (5): `call_session_id` text; `key_timestamps_json` text; `patient_name` text; `sentiment_score` text NOT NULL DEFAULT positive; `transcript_text` text
- **uis_sms_chat_quotas** (4): `daily_quota_limit` integer NOT NULL DEFAULT 300; `is_quota_exceeded` boolean NOT NULL DEFAULT false; `sent_today_count` integer NOT NULL DEFAULT 0; `updated_at` timestamptz NOT NULL DEFAULT now()
- **users** (8): `can_manage_imports` boolean NOT NULL DEFAULT false; `can_manage_money` boolean NOT NULL DEFAULT false **[MM6]**; `can_sign_medical_records` boolean NOT NULL DEFAULT false **[MM6]**; `color` text NOT NULL DEFAULT gray; `is_synced` boolean NOT NULL DEFAULT false; `snils` text; `updated_at` timestamptz NOT NULL DEFAULT now(); `version` integer NOT NULL DEFAULT 1
- **visit_diaries** (1): `diagnosis_text` text
- **visit_diary_revisions** (2): `previous_diagnosis_tooth` character varying; `revision_reason` text
- **visit_examination_photo_links** (2): `examination_form_id` text; `patient_name` text
- **visits** (2): `is_synced` boolean NOT NULL DEFAULT false; `version` integer NOT NULL DEFAULT 1
- **yandex_calendar_syncs** (2): `doctor_name` text; `last_synced_at` timestamptz NOT NULL DEFAULT now()

Сумма по таблицам: 134. Значения `DEFAULT` в списке приведены без приведения типа
(`::text`, `::numeric`) и без кавычек — для читаемости; дословный вид у каждой
колонки берётся из `information_schema.columns.column_default`.
