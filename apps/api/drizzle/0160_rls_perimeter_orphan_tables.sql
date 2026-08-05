-- 0160_rls_perimeter_orphan_tables.sql
--
-- ЗАКРЫТИЕ ПЕРИМЕТРА RLS: СЕМЬ ТАБЛИЦ БЕЗ СОБСТВЕННОЙ КОЛОНКИ organization_id
--
-- ============================================================================
-- ЧТО ИМЕННО БЫЛО СЛОМАНО
-- ============================================================================
--
-- Миграции 0157/0158/0159 закрыли 140 таблиц. Инвентаризация после 0159 читается
-- как безупречная: «таблиц с колонкой organization_id — 139, покрыто 139 из 139».
-- Именно эта формулировка и скрывала дыру. Она считает покрытие ТОЛЬКО среди
-- таблиц, у которых есть собственная колонка арендатора, поэтому таблицы, где
-- принадлежность выражена косвенно — внешним ключом на родителя, — в знаменатель
-- не попадали вообще и в отчёте выглядели как несуществующие.
--
-- Замер на живой базе (PostgreSQL 18.4) до этой миграции:
--   всего таблиц в public ............ 148
--   rowsecurity = true ............... 140
--   relforcerowsecurity = true ....... 140
--   политик .......................... 140
--   БЕЗ RLS вообще ....................  8
--
-- Восемь минус семь равно один, и этот один — служебная таблица учёта миграций
-- `_dente_migrations` (name, checksum, applied_at). Она не содержит данных
-- арендаторов, её пишет раскатчик `apps/api/src/scripts/migrate.ts` до и вне
-- всякого тенант-контекста, и политика на ней сломала бы сам раскатчик.
-- Поэтому целевое число покрытых таблиц — 147, а не 148.
--
-- Остальные семь — это данные, и данные худшей категории:
--   patient_anamnesis .......... аллергии и хронические болезни пациента
--   signed_outpatient_cards .... подписанные амбулаторные карты
--   cash_ledger ................ кассовая книга
--   payment_installments ....... рассрочки платежей
--   ztl_lab_orders ............. заказы зуботехнической лаборатории
--   doctor_assistants .......... привязка ассистентов к врачам
--   ingested_patients_mapping .. сопоставление импортированных пациентов
--
-- Утечка воспроизведена экспериментально, а не выведена из чтения схемы.
-- Матрица «7 таблиц x 3 действия» до этой миграции: 21 проверка, пройдено 0,
-- утечек 21. Строка арендатора A читалась из контекста арендатора B, читалась
-- с соединения вообще без тенант-контекста, и из контекста B успешно писалась
-- строка, привязанная к сущностям A.
--
-- ============================================================================
-- ПОЧЕМУ ПОЛИТИКА ЧЕРЕЗ EXISTS, А НЕ ДЕНОРМАЛИЗАЦИЯ organization_id
-- ============================================================================
--
-- Путь (а) — добавить колонку organization_id в каждую из семи таблиц, заполнить
-- из родителя и накрыть обычной политикой. Путь (б) — политика через EXISTS
-- к родителю. Выбран (б), для всех семи, по измеренным основаниям.
--
-- 1. НЕКОМУ ЗАПОЛНЯТЬ КОЛОНКУ. Замер по `apps/api/src`: ни один код приложения
--    не вставляет строки ни в одну из этих семи таблиц. Шесть из них вообще не
--    объявлены в схеме Drizzle, седьмая (cash_ledger) объявлена и никем не
--    используется. Единственный живой путь записи — динамический UPDATE в
--    `services/patients/patientMerge.ts`, который переносит patient_id при
--    слиянии карточек и обходит таблицы по системному каталогу.
--    Колонка NOT NULL без единого писателя — это отложенная ошибка 23502 при
--    первой же настоящей вставке. Колонка NULLable — это дыра: NULL не равен
--    ничему, строка выпадет из видимости, а «починка» через IS NOT DISTINCT FROM
--    сделала бы её видимой всем сразу.
--
-- 2. ДЕНОРМАЛИЗАЦИЯ РАСХОДИТСЯ С ИСТОЧНИКОМ. Ничто в схеме не удерживало бы
--    payment_installments.organization_id равным patients.organization_id.
--    Для этого нужен либо триггер, либо составной внешний ключ на пару
--    (patient_id, organization_id) — то есть больше механики, чем сама политика,
--    и каждая её единица может отказать молча. Расхождение денормализованного
--    значения с родителем — это ровно та же межарендная утечка, только через
--    полгода и без воспроизводимого опыта.
--
-- 3. У ТРЁХ ТАБЛИЦ ВНЕШНИХ КЛЮЧЕЙ НЕТ ВООБЩЕ. Замер по pg_constraint:
--    signed_outpatient_cards — 0 внешних ключей, ztl_lab_orders — 0,
--    payment_installments.treatment_plan_id — без ключа. Денормализованная
--    колонка в такой таблице не привязана вообще ни к чему.
--
-- 4. ЦЕНА ЗАПРОСА ИЗМЕРЕНА, А НЕ ОЦЕНЕНА. EXPLAIN на модели той же формы
--    показал, что подзапрос политики разрешается через Index Scan по
--    ПЕРВИЧНОМУ КЛЮЧУ родителя — один пробой индекса на строку-кандидата.
--    Первичные ключи всех шести родителей уже уникально проиндексированы.
--
-- 5. «ГОРЯЧИЕ ТАБЛИЦЫ» — НЕ ПОДТВЕРДИЛОСЬ ЗАМЕРОМ. Опасение, что кассовая книга
--    и рассрочки горячие, разумно априори, но счёт строк в живой базе даёт
--    0 строк в каждой из семи таблиц. Функция живёт в объявленных двойниках
--    (`payments`, `generated_documents` с kind = installment_payment_schedule),
--    а эти семь — брошенная линия. Поэтому у пути (а) нет и того единственного
--    преимущества, ради которого его обычно выбирают.
--
-- Стоячий недостаток выбранного пути назван прямо: цена подзапроса платится на
-- КАЖДОМ обращении, тогда как денормализованная колонка сравнивается один раз.
-- При появлении настоящей нагрузки этот выбор надо пересматривать замером плана,
-- а не памятью об этом комментарии.
--
-- ============================================================================
-- СЕМАНТИКА, ПРОВЕРЕННАЯ ОПЫТОМ, А НЕ ВЗЯТАЯ ИЗ ДОГАДКИ
-- ============================================================================
--
-- Три свойства решают, работает ли политика через подзапрос. Все три проверены
-- на модели той же формы внутри откаченной транзакции.
--
-- ПЕРВОЕ. Политики РОДИТЕЛЯ применяются ВНУТРИ подзапроса политики ребёнка.
-- Проверка: политика родителя временно заменена на USING (false) — ребёнок сразу
-- отдал 0 строк. Это значит, что изоляция здесь двойная: сначала родитель не
-- показывает чужую строку, потом наше собственное сравнение organization_id
-- отсекает её ещё раз. Второе сравнение оставлено намеренно: политика обязана
-- быть самодостаточной и не опираться на то, что политику родителя никто не
-- ослабит.
--
-- ВТОРОЕ. Взаимная ссылка политик (A ссылается на B, B ссылается на A) даёт
-- жёсткую ошибку 42P17 «infinite recursion detected in policy for relation»,
-- а не зависание. Замер по pg_policies: из 140 действующих политик подзапрос
-- не содержит НИ ОДНА, поэтому семь односторонних ссылок ниже цикла образовать
-- не могут. Это свойство надо перепроверять при добавлении любой новой политики
-- с подзапросом.
--
-- ТРЕТЬЕ. Ошибка 42501 прерывает транзакцию целиком, поэтому отказ записи здесь
-- ведёт себя как отказ, а не как тихо пропущенная строка.
--
-- ============================================================================
-- ФОРМА ПОЛИТИКИ И ПОЧЕМУ ОНА ИМЕННО ТАКАЯ
-- ============================================================================
--
-- USING      -> сохраняет disjunct обхода, как у всех 140 политик из 0159.
--               Без него withSuperuserBypass перестал бы читать эти семь таблиц,
--               и починка утечки превратилась бы в отказ в обслуживании.
-- WITH CHECK -> disjunct обхода НЕ содержит, как у 139 политик из 0159, часть 2.
--               Обход даёт право читать, но не право писать в чужого арендатора.
--
-- NULLIF(current_setting('app.current_tenant', true), '')::uuid — обязателен и не
-- подлежит упрощению до голого каста. Пользовательский GUC после первого
-- присвоения сбрасывается в ПУСТУЮ СТРОКУ, а не в NULL, и ''::uuid бросает 22P02
-- «invalid input syntax for type uuid». На переиспользованном соединении пула это
-- давало бы недетерминированные 500-е вместо честного отказа. Подробный разбор —
-- в шапке 0159, там же ссылки. NULL::uuid просто не равен ничему, и это ровно
-- нужное поведение: нет контекста — нет строк.
--
-- FORCE ROW LEVEL SECURITY обязателен и не является украшением. Роль приложения
-- `dental` ВЛАДЕЕТ всеми 148 таблицами, а владелец по умолчанию обходит RLS.
-- Контрольный опыт предыдущего агента: владелец без FORCE видит 2 строки из 2,
-- с FORCE — 1 из 2. Без FORCE все политики ниже не значат ничего.
--
-- ============================================================================
-- ПОЧЕМУ ЭТА МИГРАЦИЯ ТРАНЗАКЦИОННАЯ И БЕЗ ПАРАЛЛЕЛЬНОГО ПОСТРОЕНИЯ ИНДЕКСОВ
-- ============================================================================
--
-- ENABLE ROW LEVEL SECURITY без политики — это запрет всего. Если файл упадёт
-- на середине в режиме no-transaction, часть таблиц останется с включённым RLS
-- и без политики, то есть наглухо закрытой. Это отказ в обслуживании, который
-- хуже утечки, которую мы чиним. Поэтому файл идёт одной транзакцией: либо все
-- семь таблиц получают политику, либо не меняется ничего.
--
-- Транзакция запрещает построение индекса в параллельном режиме, и раскатчик
-- отдельно проверяет это по тексту файла, падая с диагностикой. Обычный
-- CREATE INDEX берёт тяжёлую блокировку, и на боевой таблице это было бы
-- недопустимо — но замер даёт 0 строк в каждой из семи таблиц, поэтому
-- блокировка мгновенная. ВНИМАНИЕ на будущее: проверка раскатчика ищет ключевое
-- слово во ВСЁМ тексте файла, включая комментарии, поэтому само это слово здесь
-- не пишется — упоминание в прозе сорвало бы применение миграции.
--
-- Маркер no-transaction здесь СОЗНАТЕЛЬНО не ставится. Это же снимает
-- зависимость от разбиения файла по точке с запятой: транзакционные файлы
-- раскатчик режет по маркеру drizzle-kit, а не по знаку конца оператора.
--
-- ============================================================================
-- ИНДЕКСЫ
-- ============================================================================
--
-- Подзапрос политики разрешается по первичному ключу родителя, который уже
-- уникально проиндексирован. Индексы ниже ставятся на ДОЧЕРНЕЙ стороне — на те
-- самые колонки, которые политика подставляет в условие соединения. Они нужны,
-- когда запрос приложения фильтрует по этой же колонке, и они же закрывают
-- давнюю дыру: 0155 добавляла индексы под внешние ключи, но эти семь таблиц не
-- объявлены в Drizzle и в её список не попали. Замер до миграции: из семи таблиц
-- индекс на колонке привязки есть только у patient_anamnesis, а у
-- doctor_assistants нет вообще ни одного индекса, включая первичный ключ.
--
-- ============================================================================
-- ИДЕМПОТЕНТНОСТЬ
-- ============================================================================
--
-- ENABLE и FORCE идемпотентны по природе. DROP POLICY IF EXISTS перед CREATE
-- POLICY делает переопределение политики повторяемым. CREATE INDEX IF NOT EXISTS
-- повторяем. Файл переживает повторный прогон целиком.

-- =============================================================================
-- 1. patient_anamnesis -- аллергии и хронические болезни
--
-- Привязка: patient_id NOT NULL, внешний ключ на patients ON DELETE CASCADE.
-- Это специальная категория персональных данных по 152-ФЗ (сведения о состоянии
-- здоровья), и именно на этой таблице утечка была воспроизведена первой.
-- Индекс не создаётся: patient_anamnesis_patient_id_unique уже уникален.
-- =============================================================================

ALTER TABLE "patient_anamnesis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_anamnesis" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "patient_anamnesis";
CREATE POLICY tenant_isolation ON "patient_anamnesis"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR EXISTS (
    SELECT 1 FROM "patients" p
     WHERE p.id = "patient_anamnesis".patient_id
       AND p.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "patients" p
     WHERE p.id = "patient_anamnesis".patient_id
       AND p.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid));

-- =============================================================================
-- 2. signed_outpatient_cards -- подписанные амбулаторные карты
--
-- Привязка: patient_id NOT NULL. Внешних ключей у таблицы нет ни одного, поэтому
-- целостность ссылки ничем не гарантирована и опора берётся на пациента как на
-- носителя медицинской карты. Колонки visit_id и doctor_id для привязки НЕ
-- используются: достаточно одного якоря, а лишние условия — это лишние способы
-- случайно спрятать легальную строку.
-- =============================================================================

ALTER TABLE "signed_outpatient_cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "signed_outpatient_cards" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "signed_outpatient_cards";
CREATE POLICY tenant_isolation ON "signed_outpatient_cards"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR EXISTS (
    SELECT 1 FROM "patients" p
     WHERE p.id = "signed_outpatient_cards".patient_id
       AND p.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "patients" p
     WHERE p.id = "signed_outpatient_cards".patient_id
       AND p.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid));
CREATE INDEX IF NOT EXISTS "idx_signed_outpatient_cards_patient_id" ON "signed_outpatient_cards" ("patient_id");

-- =============================================================================
-- 3. cash_ledger -- кассовая книга
--
-- Привязка: invoice_id NOT NULL, внешний ключ на patient_invoices, у которого
-- собственная колонка organization_id и политика из 0157. Колонка operator_id
-- на роль якоря не годится: она NULLable, и строка без оператора выпала бы из
-- видимости у всех арендаторов сразу.
-- =============================================================================

ALTER TABLE "cash_ledger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_ledger" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "cash_ledger";
CREATE POLICY tenant_isolation ON "cash_ledger"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR EXISTS (
    SELECT 1 FROM "patient_invoices" i
     WHERE i.id = "cash_ledger".invoice_id
       AND i.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "patient_invoices" i
     WHERE i.id = "cash_ledger".invoice_id
       AND i.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid));
CREATE INDEX IF NOT EXISTS "idx_cash_ledger_invoice_id" ON "cash_ledger" ("invoice_id");

-- =============================================================================
-- 4. payment_installments -- рассрочки платежей
--
-- Привязка: patient_id NOT NULL с внешним ключом на patients. Колонка
-- treatment_plan_id тоже NOT NULL, но внешнего ключа у неё нет, поэтому якорем
-- выбран пациент — ссылка, целостность которой хотя бы проверяется базой.
-- =============================================================================

ALTER TABLE "payment_installments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_installments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "payment_installments";
CREATE POLICY tenant_isolation ON "payment_installments"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR EXISTS (
    SELECT 1 FROM "patients" p
     WHERE p.id = "payment_installments".patient_id
       AND p.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "patients" p
     WHERE p.id = "payment_installments".patient_id
       AND p.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid));
CREATE INDEX IF NOT EXISTS "idx_payment_installments_patient_id" ON "payment_installments" ("patient_id");

-- =============================================================================
-- 5. ztl_lab_orders -- заказы зуботехнической лаборатории
--
-- Привязка: patient_id NOT NULL. Внешних ключей у таблицы нет ни одного —
-- то же положение, что и у signed_outpatient_cards, и то же решение.
-- =============================================================================

ALTER TABLE "ztl_lab_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ztl_lab_orders" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ztl_lab_orders";
CREATE POLICY tenant_isolation ON "ztl_lab_orders"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR EXISTS (
    SELECT 1 FROM "patients" p
     WHERE p.id = "ztl_lab_orders".patient_id
       AND p.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "patients" p
     WHERE p.id = "ztl_lab_orders".patient_id
       AND p.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid));
CREATE INDEX IF NOT EXISTS "idx_ztl_lab_orders_patient_id" ON "ztl_lab_orders" ("patient_id");

-- =============================================================================
-- 6. doctor_assistants -- привязка ассистентов к врачам
--
-- Привязка: обе колонки, doctor_id и assistant_id, NOT NULL и обе с внешним
-- ключом на users. Требуются ОБЕ, а не одна: строка, связывающая врача одного
-- арендатора с ассистентом другого, сама по себе есть межарендная связь, и
-- проверка только по врачу пропустила бы её. Ужесточение безопасно — замер даёт
-- 0 строк, то есть скрыть существующую легальную строку эта строгость не может.
--
-- Таблица не имеет НИ ОДНОГО индекса и даже первичного ключа. Первичный ключ
-- здесь не добавляется намеренно: это изменение формы данных, а не изоляции,
-- и оно требует отдельного решения о том, допустимы ли дубли пары.
-- =============================================================================

ALTER TABLE "doctor_assistants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "doctor_assistants" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "doctor_assistants";
CREATE POLICY tenant_isolation ON "doctor_assistants"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR (EXISTS (
    SELECT 1 FROM "users" u
     WHERE u.id = "doctor_assistants".doctor_id
       AND u.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
   AND EXISTS (
    SELECT 1 FROM "users" u
     WHERE u.id = "doctor_assistants".assistant_id
       AND u.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "users" u
     WHERE u.id = "doctor_assistants".doctor_id
       AND u.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
   AND EXISTS (
    SELECT 1 FROM "users" u
     WHERE u.id = "doctor_assistants".assistant_id
       AND u.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid));
CREATE INDEX IF NOT EXISTS "idx_doctor_assistants_doctor_id" ON "doctor_assistants" ("doctor_id");
CREATE INDEX IF NOT EXISTS "idx_doctor_assistants_assistant_id" ON "doctor_assistants" ("assistant_id");

-- =============================================================================
-- 7. ingested_patients_mapping -- сопоставление импортированных пациентов
--
-- Привязка: source_id NOT NULL, внешний ключ на ingestion_sources, у которого
-- есть organization_id и политика из 0159, часть 3.
--
-- Колонка local_patient_id якорем быть НЕ МОЖЕТ, и это не мелочь: она NULLable
-- по смыслу таблицы — строка с внешним идентификатором, которому ещё не нашли
-- локального пациента, и есть основной рабочий случай импорта. Опора на неё
-- сделала бы ровно эти строки невидимыми всем и сломала бы импорт, то есть
-- обменяла бы утечку на отказ в обслуживании.
-- =============================================================================

ALTER TABLE "ingested_patients_mapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ingested_patients_mapping" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ingested_patients_mapping";
CREATE POLICY tenant_isolation ON "ingested_patients_mapping"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR EXISTS (
    SELECT 1 FROM "ingestion_sources" s
     WHERE s.id = "ingested_patients_mapping".source_id
       AND s.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "ingestion_sources" s
     WHERE s.id = "ingested_patients_mapping".source_id
       AND s.organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid));
CREATE INDEX IF NOT EXISTS "idx_ingested_patients_mapping_source_id" ON "ingested_patients_mapping" ("source_id");
