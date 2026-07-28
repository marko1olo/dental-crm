-- 0141 — у горячего пути не было ни одного индекса кроме первичных ключей.
--
-- ЧТО БЫЛО СЛОМАНО. В public 212 индексов, из них 145 — *_pkey. У таблиц, из
-- которых собирается каждый экран клиники, не-pkey индексов не было вообще:
-- appointments, treatment_items, generated_documents, communication_tasks,
-- communication_events, imaging_studies, audit_events. У patients был только
-- частичный индекс по merged_into_patient_id (в горячем пути не применим), у
-- visits и payments — только UNIQUE-индексы под ограничения, ни один из которых
-- не начинается с пары «клиника + дата». То есть любое чтение вида «данные этой
-- клиники за такой-то период» или «данные этой клиники по такому-то пациенту»
-- было последовательным чтением всей таблицы.
--
-- ХУЖЕ ТОГО: ЧЕТЫРЕ ИНДЕКСА БЫЛИ ОБЪЯВЛЕНЫ И НЕ СУЩЕСТВОВАЛИ. schema.ts
-- объявляет idx_patients_org_created (:366), idx_appointments_org_time (:394),
-- idx_payments_org_paid_at (:554) и idx_audit_org_created (:839) через index(...)
-- в третьем аргументе pgTable. В живой базе их нет ни одного:
-- select indexname from pg_indexes where indexname in (эти четыре) -> пусто.
-- Причина известна и записана в .agents/DATABASE.md:65-70 — drizzle.config.ts
-- всё ещё указывает на драйвер pglite, db:generate в этом репозитории мёртв, а
-- миграции пишутся руками. Значит объявление в schema.ts не создаёт DDL, оно
-- декорация. Пишущий это читает как «индекс есть» и не проверяет план.
--
-- ЧЕМ ИЗМЕРЕНО, ЧТО ЭТО НЕ ТЕОРИЯ. pg_stat_user_tables живой базы (stats_reset
-- пустой, счётчики копятся с создания базы), при 27 живых приёмах и 17
-- пациентах:
--   appointments   seq_scan 109343, seq_tup_read 1462738, idx_scan 3394
--   patients       seq_scan 254904, seq_tup_read 5944566
--   audit_events   seq_scan   4315, seq_tup_read 3362991, idx_scan 0
-- У журнала 152-ФЗ за всю историю базы НИ ОДНОГО индексного сканирования, потому
-- что индексироваться было нечем.
--
-- ЗАМЕР ВЫИГРЫША НА ФОРМЕ ЗАПРОСА /api/audit/logs (routes/audit.ts:56-61,
-- WHERE organization_id ORDER BY created_at DESC LIMIT 50), 1005 строк журнала:
--   без индекса: Limit cost=377.47, Sort по created_at DESC, Seq Scan
--     cost=0.00..347.20, Rows Removed by Filter 1005, Buffers shared hit=337
--   с индексом:  Limit cost=0.28..41.16, Index Scan Backward using
--     idx_audit_org_created, Index Cond: (organization_id = ...), Sort в плане
--     ОТСУТСТВУЕТ
-- Пропадает не только чтение таблицы, но и сортировка: LIMIT 50 берёт первые 50
-- записей индекса и останавливается, а не сортирует всё, что накопил закон.
--
-- ЧТО ЭТИМ ФАЙЛОМ НЕ ДОКАЗАНО. Абсолютные миллисекунды на боевом объёме. В
-- разработческой базе десятки строк, и там Seq Scan честно быстрее любого
-- индекса — планировщик выбирает его правильно. Доказана ПРИМЕНИМОСТЬ каждого
-- индекса к своей форме запроса: при enable_seqscan = off и enable_bitmapscan =
-- off каждый предикат ниже уходит в Index Cond, а не остаётся в Filter. Это и
-- есть то, что от индекса требуется; выигрыш в миллисекундах появляется вместе с
-- данными, и появляется он линейно по размеру таблицы.
--
-- ПОЧЕМУ НЕ CONCURRENTLY. Свой мигратор (apps/api/src/scripts/migrate.ts:178)
-- выполняет файл целиком в ОДНОЙ транзакции, а CREATE INDEX CONCURRENTLY внутри
-- транзакции Postgres запрещает. Таблицы сейчас маленькие, обычного CREATE INDEX
-- достаточно. Когда клиника вырастет настолько, что блокировка записи на время
-- построения станет недопустимой, недостающие индексы надо будет создавать
-- отдельной операцией вне мигратора — не переписывая этот файл.
--
-- ПОЧЕМУ IF NOT EXISTS. Часть боевых баз наполнялась рантайм-DDL (см. шапку
-- migrate.ts), и там отдельные индексы могли появиться руками. Повторный
-- CREATE INDEX без IF NOT EXISTS уронил бы весь файл в транзакции, то есть не
-- создал бы и остальные двенадцать.
--
-- ПОЧЕМУ ИМЕНА ЧЕТЫРЁХ ИНДЕКСОВ ВЗЯТЫ ИЗ schema.ts. Чтобы объявление перестало
-- быть декорацией: после этой миграции index("idx_audit_org_created") в
-- schema.ts описывает индекс, который в базе есть, с той же парой колонок и в том
-- же порядке. schema.ts в этот момент правит другой исполнитель, поэтому файл
-- самодостаточен и ничего в schema.ts не требует.
--
-- КАЖДЫЙ ИНДЕКС — ПОД НАЗВАННЫЙ ЗАПРОС, а не «на всякий случай». Индекс, который
-- никто не использует, это плата за каждую запись и ничего взамен.

-- 1. patients (organization_id, created_at)
--    Объявлен в schema.ts:366. Формы запросов: routes/analytics.ts:179 (когорты
--    LTV, gte(patients.createdAt, ltvStartDate) вместе с организацией) и :223
--    (withDate по паре organization_id + created_at).
CREATE INDEX IF NOT EXISTS "idx_patients_org_created"
  ON "patients" ("organization_id", "created_at");

-- 2. appointments (organization_id, starts_at, ends_at)
--    Объявлен в schema.ts:394. Это индекс проверки занятости слота —
--    db/appointmentsQuery.ts:85-106, самый дорогой запрос в системе, потому что
--    он выполняется ВНУТРИ транзакции, уже взявшей FOR UPDATE на кресло, врача и
--    пациента (:31-60). Пока идёт последовательное чтение таблицы, блокировки
--    держатся, и все параллельные попытки записать того же врача стоят столько
--    же. Проверено EXPLAIN на живой базе с полным реальным предикатом (включая
--    OR по кресло/врач/пациент): Index Cond забирает organization_id, starts_at
--    и ends_at, в Filter остаются только status и OR по ресурсам.
--    Тот же индекс обслуживает окно дня: routes/dayConfirmations.ts:131-137,
--    services/communications/appointmentReminders.ts:250, routes/publicBooking.ts:352,
--    services/reports/managerReports.ts:198, :334, :401, :542, :659, :940.
CREATE INDEX IF NOT EXISTS "idx_appointments_org_time"
  ON "appointments" ("organization_id", "starts_at", "ends_at");

-- 3. appointments (organization_id, patient_id, starts_at)
--    Отдельная форма, которую индекс №2 не покрывает: «есть ли у ЭТОГО пациента
--    запись после такого-то момента». db/lostPatientsFiltersQuery.ts (виджет
--    потерянных пациентов) и services/communications/audience.ts:186. Без него
--    каждый такой вопрос читает таблицу приёмов целиком.
CREATE INDEX IF NOT EXISTS "appointments_org_patient_starts_idx"
  ON "appointments" ("organization_id", "patient_id", "starts_at");

-- 4. payments (organization_id, paid_at)
--    Объявлен в schema.ts:554. services/reports/managerReports.ts:100-106 и
--    :175-181 — выручка за период руководителю.
--    ОГОВОРКА: на живой базе с 8 платежами планировщик выбирает не его, а
--    payments_org_client_mutation_unique — обе индексных ветки начинаются с
--    organization_id и на восьми строках их оценки совпадают до сотых. Что
--    предикат по второй колонке уходит в Index Cond, доказано на такой же по
--    форме паре в индексе №1 (patients: organization_id + created_at >= ...).
CREATE INDEX IF NOT EXISTS "idx_payments_org_paid_at"
  ON "payments" ("organization_id", "paid_at");

-- 5. payments (organization_id, patient_id)
--    Платежи одного пациента: db/billingQuery.ts:132 (карточка пациента и
--    семейный кошелёк), migration/engine.ts:823 (inArray по пациентам).
CREATE INDEX IF NOT EXISTS "payments_org_patient_idx"
  ON "payments" ("organization_id", "patient_id");

-- 6. audit_events (organization_id, created_at)
--    Объявлен в schema.ts:839. routes/audit.ts:56-61. Замер выше: пропадает и
--    Seq Scan, и Sort. Это журнал 152-ФЗ, он только растёт и никогда не
--    чистится — единственная таблица, где отсутствие индекса гарантированно
--    становится отказом, а не замедлением.
CREATE INDEX IF NOT EXISTS "idx_audit_org_created"
  ON "audit_events" ("organization_id", "created_at");

-- 7. treatment_items (organization_id, patient_id)
--    План лечения пациента: db/clinicalQuery.ts:221. Плюс агрегаты по пациентам
--    в services/communications/audience.ts:216-218 и
--    services/reports/managerReports.ts:826-829 (GROUP BY patient_id).
CREATE INDEX IF NOT EXISTS "treatment_items_org_patient_idx"
  ON "treatment_items" ("organization_id", "patient_id");

-- 8. treatment_items (organization_id, visit_id)
--    Позиции одного приёма: routes/diary.ts:204-208, путь подписания дневника.
--    Он выполняется в транзакции, поэтому лишнее чтение таблицы здесь держит
--    блокировки приёма.
CREATE INDEX IF NOT EXISTS "treatment_items_org_visit_idx"
  ON "treatment_items" ("organization_id", "visit_id");

-- 9. visits (organization_id, patient_id)
--    db/domainStateHydration.ts:866 (приёмы пациента) и migration/engine.ts:817.
--    Существующий visits_id_patient_organization_unique начинается с id и для
--    этой формы бесполезен: id в предикате нет.
CREATE INDEX IF NOT EXISTS "visits_org_patient_idx"
  ON "visits" ("organization_id", "patient_id");

-- 10. generated_documents (organization_id, patient_id)
--     Документы пациента: db/documentQuery.ts:86-92. Таблица широкая (снимки
--     XML, PKCS7-подписи, jsonb-протоколы), поэтому последовательное чтение по
--     ней дороже, чем по любой другой в этом списке.
CREATE INDEX IF NOT EXISTS "generated_documents_org_patient_idx"
  ON "generated_documents" ("organization_id", "patient_id");

-- 11. imaging_studies (organization_id, patient_id)
--     Снимки пациента: db/imagingQuery.ts:79-83.
CREATE INDEX IF NOT EXISTS "imaging_studies_org_patient_idx"
  ON "imaging_studies" ("organization_id", "patient_id");

-- 12. communication_events (organization_id, patient_id, created_at DESC)
--     Лента переписки в карточке пациента: db/patientCommunicationTimelinesQuery.ts:65-73
--     и services/patients/patientCommunicationLog.ts:139-145 — обе с
--     ORDER BY created_at DESC. Порядок в индексе задан DESC, чтобы совпасть с
--     порядком чтения; второй ключ сортировки (id) в индекс не вошёл — он
--     упорядочивает единицы строк одного пациента, а не выборку.
CREATE INDEX IF NOT EXISTS "communication_events_org_patient_created_idx"
  ON "communication_events" ("organization_id", "patient_id", "created_at" DESC);

-- 13. communication_tasks (organization_id, channel, status)
--     Очередь отправки Telegram: telegram/outbox.ts:31-38 (organization_id +
--     channel + status IN (queued, scheduled)). Проверено: все три условия
--     уходят в Index Cond, включая IN по перечислению.
CREATE INDEX IF NOT EXISTS "communication_tasks_org_channel_status_idx"
  ON "communication_tasks" ("organization_id", "channel", "status");

-- ЧЕГО ЗДЕСЬ СОЗНАТЕЛЬНО НЕТ.
--   • Индекса на appointment_action_codes (organization_id, appointment_id).
--     Разведка его требовала, живая база говорит, что он не нужен: у таблицы уже
--     есть appointment_action_codes_appointment_action_unique (appointment_id,
--     action), и выборка по набору приёмов уходит в Index Cond по нему
--     (organization_id остаётся в Filter — на строках одной клиники это
--     бесплатно). Второй индекс с тем же смыслом — плата за каждую запись без
--     выигрыша.
--   • Индексов по одному organization_id на справочниках (users, clinics,
--     chairs, service_catalog_items, clinical_rules, protocol_templates). Их
--     читают целиком, всю таблицу организации, без второго условия и без
--     сортировки. Индекс на такой форме не даёт ничего: планировщик всё равно
--     возьмёт Seq Scan, потому что нужны все строки.
--   • Индекса под гидратацию дашборда (db/domainStateHydration.ts:237-337). Там
--     16 выборок SELECT * по всей организации без LIMIT — это не проблема
--     индексов, а проблема того, что весь архив клиники читается ради одного
--     экрана. Индексом это не лечится, только переписыванием запроса.
