-- 0124 — движок переноса данных из чужих систем: стейджинг, карантин, происхождение, сверка.
--
-- ЗАЧЕМ
-- Перенос базы из старой CRM был устроен так: routes/imports.ts читал CSV и
-- строкой за строкой вставлял пациентов прямо в боевую таблицу. Ни промежуточного
-- слоя, ни карантина, ни следа о том, откуда взялось поле. Последствия конкретные:
--
--   1. Повторный запуск того же файла создавал вторые копии пациентов: сравнение
--      шло с уже загруженными по телефону, но результатом было предупреждение,
--      а строка со статусом «warning» просто не импортировалась вовсе. То есть
--      пациент без телефона молча терялся, а дубль молча пропускался — и то и
--      другое без единой записи о том, что произошло.
--   2. Одна кривая строка в середине выгрузки роняла транзакцию целиком.
--   3. Никто не мог доказать, что перенеслось всё. Таблица import_batches
--      хранила четыре счётчика и не хранила ни одной исходной строки.
--
-- Пять таблиц закрывают это:
--
--   migration_runs            — один запуск переноса: источник, фаза, счётчики.
--   migration_staging_records — КАЖДАЯ исходная строка дословно + что из неё
--                               получилось. Это и есть слой, отделяющий чужие
--                               данные от боевых: сначала сюда, в бой — потом.
--   migration_quarantine_records — аномалии, изолированные без остановки переноса.
--   migration_entity_links    — соответствие «ключ в старой системе → наш uuid».
--                               Сердце идемпотентности и восстановления связей.
--   migration_reconciliations — арифметическая сверка: сходится ли приход с расходом.
--
-- Идемпотентность обеспечивается НЕ запретом повторного запуска (оператору часто
-- нужно догрузить исправленную выгрузку), а уникальностью в migration_entity_links:
-- одна и та же сущность старой системы всегда указывает на один наш uuid. Второй
-- прогон того же файла обновляет, а не плодит.

DO $$
BEGIN
  -- Фазы прогона. Порядок значим: перенос двигается только вперёд, кроме
  -- rolled_back, куда можно попасть из любого состояния после загрузки.
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'migration_run_status') THEN
    CREATE TYPE "migration_run_status" AS ENUM (
      'draft',            -- создан, источник ещё не прочитан
      'staging',          -- исходные строки укладываются в стейджинг
      'mapping',          -- определяется соответствие колонок нашим полям
      'validated',        -- стейджинг проверен, готов к загрузке (сухой прогон закончен)
      'loading',          -- идёт запись в боевые таблицы
      'completed',        -- загрузка закончена, сверка сошлась
      'completed_with_quarantine', -- загрузка закончена, часть строк в карантине
      'failed',           -- прогон прерван ошибкой, боевые данные не тронуты либо откачены
      'rolled_back'       -- загрузка отменена, созданные сущности удалены
    );
  END IF;

  -- Откуда приехали данные. Влияет на выбор парсера и на предупреждения оператору.
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'migration_source_kind') THEN
    CREATE TYPE "migration_source_kind" AS ENUM (
      'delimited',        -- CSV/TSV/выгрузка с разделителем
      'spreadsheet',      -- XLSX/ODS
      'json',             -- JSON-массив либо JSONL
      'xml',              -- XML-выгрузка
      'dbf',              -- dBASE/FoxPro — основной формат российских legacy-систем
      'sql_dump',         -- текстовый дамп базы
      'clipboard',        -- вставка из буфера обмена
      'free_text',        -- неструктурированный текст, журнал администратора
      'api'               -- выгрузка через API чужой системы
    );
  END IF;

  -- Что именно переносим. Порядок загрузки задаётся кодом, а не типом.
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'migration_entity_kind') THEN
    CREATE TYPE "migration_entity_kind" AS ENUM (
      'patient',
      'doctor',
      'service',
      'appointment',
      'visit',
      'payment',
      'treatment_plan',
      'tooth_state',
      'document',
      'unknown'          -- строку не удалось отнести к сущности; уходит в карантин
    );
  END IF;

  -- Состояние отдельной исходной строки. duplicate и quarantined — это НЕ потеря:
  -- строка лежит в стейджинге целиком и доступна для повторной обработки.
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'migration_staging_status') THEN
    CREATE TYPE "migration_staging_status" AS ENUM (
      'pending',          -- уложена, ещё не разобрана
      'normalized',       -- значения приведены к нашим форматам
      'mapped',           -- колонки сопоставлены полям
      'ready',            -- прошла валидацию, ждёт загрузки
      'loaded',           -- записана в боевую таблицу (создана)
      'updated',          -- существующая сущность обновлена данными строки
      'duplicate',        -- повтор внутри источника либо уже перенесённая сущность
      'quarantined',      -- изолирована, см. migration_quarantine_records
      'skipped'           -- оператор исключил строку вручную
    );
  END IF;

  -- Классификация аномалии. Код машинный, текст для человека лежит рядом.
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'migration_quarantine_reason') THEN
    CREATE TYPE "migration_quarantine_reason" AS ENUM (
      'missing_required_field',  -- нет обязательного поля (например, ФИО пациента)
      'unparsable_value',        -- значение не разобралось (дата «31.02.2019»)
      'encoding_damage',         -- текст повреждён кодировкой без возможности восстановления
      'broken_reference',        -- ссылка на сущность, которой нет в источнике
      'duplicate_conflict',      -- совпадение с существующей записью с расхождением данных
      'validation_failed',       -- нарушено доменное правило (отрицательная сумма)
      'ambiguous_mapping',       -- не удалось однозначно определить целевое поле
      'low_confidence',          -- разбор ниже порога доверия, нужен человек
      'target_write_failed',     -- боевая вставка отклонена базой
      'row_too_large'            -- строка превышает безопасный лимит
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'migration_quarantine_resolution') THEN
    CREATE TYPE "migration_quarantine_resolution" AS ENUM (
      'open',              -- ждёт разбора
      'resolved_imported', -- исправлено и загружено
      'resolved_merged',   -- признано дублем, слито с существующей записью
      'discarded'          -- оператор сознательно отказался переносить
    );
  END IF;

  -- Кто принял решение по полю. Нужно, чтобы отделить машинную догадку от факта:
  -- значение, поставленное нейросетью, должно быть видно как таковое.
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'migration_decision_source') THEN
    CREATE TYPE "migration_decision_source" AS ENUM (
      'vendor_profile',   -- сработал профиль известной системы
      'deterministic',    -- сработало правило/словарь заголовков
      'llm',              -- сопоставление предложила языковая модель
      'manual',           -- указал оператор
      'inferred'          -- выведено из содержимого колонки
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "migration_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  -- Человеческое имя источника: «Выгрузка из IDENT 12.03», «patients.dbf».
  "source_name" text NOT NULL,
  "source_kind" "migration_source_kind" NOT NULL,
  -- sha256 исходных байт. Позволяет узнать тот же файл и предупредить оператора,
  -- что он уже загружался, не запрещая повтор.
  "source_fingerprint" text,
  "source_bytes" integer,
  -- Определённая кодировка исходника и то, насколько уверенно (0..1).
  "detected_encoding" text,
  "encoding_confidence" real,
  -- Опознанная чужая система: 'ident', 'dentalpro', 'infodent', 'opendental'…
  "vendor_profile" text,
  "status" "migration_run_status" NOT NULL DEFAULT 'draft',
  -- Сухой прогон доходит до validated и не пишет в боевые таблицы.
  "dry_run" boolean NOT NULL DEFAULT true,
  -- Счётчики. Инвариант сверки: source_rows = loaded + updated + duplicate +
  -- quarantined + skipped. Расхождение означает потерю и валит сверку.
  "source_rows" integer NOT NULL DEFAULT 0,
  "staged_rows" integer NOT NULL DEFAULT 0,
  "loaded_rows" integer NOT NULL DEFAULT 0,
  "updated_rows" integer NOT NULL DEFAULT 0,
  "duplicate_rows" integer NOT NULL DEFAULT 0,
  "quarantined_rows" integer NOT NULL DEFAULT 0,
  "skipped_rows" integer NOT NULL DEFAULT 0,
  -- Итоговая карта соответствия колонок с указанием, кто её решил.
  "mapping_json" jsonb,
  -- Сколько раз спросили языковую модель и сколько её ответов отвергнуто
  -- проверкой. Второе число — прямая мера галлюцинаций на этом источнике.
  "llm_calls" integer NOT NULL DEFAULT 0,
  "llm_rejected_suggestions" integer NOT NULL DEFAULT 0,
  "started_by_user_id" uuid REFERENCES "users"("id"),
  "started_at" timestamptz,
  "finished_at" timestamptz,
  "error_class" text,
  "error_message" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "migration_runs_org_created_idx"
  ON "migration_runs" ("organization_id", "created_at" DESC);

-- Поиск «этот файл уже грузили?» — предупреждение оператору до запуска.
CREATE INDEX IF NOT EXISTS "migration_runs_fingerprint_idx"
  ON "migration_runs" ("organization_id", "source_fingerprint")
  WHERE "source_fingerprint" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "migration_staging_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id" uuid NOT NULL REFERENCES "migration_runs"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "entity_kind" "migration_entity_kind" NOT NULL DEFAULT 'unknown',
  -- Имя таблицы/листа/файла внутри источника. У DBF-папки это patients.dbf,
  -- у книги Excel — имя листа. Пусто для одиночного CSV.
  "source_table" text NOT NULL DEFAULT '',
  "source_row_number" integer NOT NULL,
  -- Исходная строка ДОСЛОВНО, как пришла: {колонка: значение}. Ничего не
  -- выброшено, ничего не переименовано. Это единственный способ впоследствии
  -- доказать, что именно было в старой системе.
  "raw_json" jsonb NOT NULL,
  -- sha256 канонизированного raw_json. Ловит буквальные повторы внутри выгрузки.
  "raw_hash" text NOT NULL,
  -- Бизнес-ключ сущности: ключ старой системы либо свёртка телефон+ДР+ФИО.
  -- По нему строка узнаётся между разными прогонами и разными файлами.
  "natural_key" text,
  -- Значения после нормализации и сопоставления полям.
  "normalized_json" jsonb,
  -- Происхождение каждого поля: из какой колонки, каким преобразованием,
  -- с чьего решения и с какой уверенностью. Массив объектов.
  "lineage_json" jsonb,
  "status" "migration_staging_status" NOT NULL DEFAULT 'pending',
  -- Что получилось в боевой базе. NULL, пока строка не загружена.
  "target_entity_id" uuid,
  -- Наименьшая уверенность среди полей строки. Порог отправки в карантин.
  "confidence" real NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Одна исходная строка укладывается ровно один раз за прогон. Защищает от
-- повторного вызова стейджинга при обрыве связи и повторной отправке запроса.
CREATE UNIQUE INDEX IF NOT EXISTS "migration_staging_row_unique"
  ON "migration_staging_records" ("run_id", "source_table", "source_row_number");

CREATE INDEX IF NOT EXISTS "migration_staging_run_status_idx"
  ON "migration_staging_records" ("run_id", "status");

-- Поиск повторов внутри прогона по дословному содержимому строки.
CREATE INDEX IF NOT EXISTS "migration_staging_hash_idx"
  ON "migration_staging_records" ("run_id", "raw_hash");

-- Поиск «эту сущность уже переносили» между прогонами.
CREATE INDEX IF NOT EXISTS "migration_staging_natural_key_idx"
  ON "migration_staging_records" ("organization_id", "entity_kind", "natural_key")
  WHERE "natural_key" IS NOT NULL;

-- Обратный путь: от боевой записи к строке источника, из которой она возникла.
CREATE INDEX IF NOT EXISTS "migration_staging_target_idx"
  ON "migration_staging_records" ("target_entity_id")
  WHERE "target_entity_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "migration_quarantine_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id" uuid NOT NULL REFERENCES "migration_runs"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  -- Строка стейджинга, из-за которой возникла аномалия. NULL, если сломался
  -- сам разбор источника и строки в стейджинге ещё нет.
  "staging_record_id" uuid REFERENCES "migration_staging_records"("id") ON DELETE CASCADE,
  "entity_kind" "migration_entity_kind" NOT NULL DEFAULT 'unknown',
  "reason" "migration_quarantine_reason" NOT NULL,
  -- true — строку нельзя загрузить как есть; false — загрузить можно,
  -- но оператор должен знать. Второе не блокирует перенос.
  "blocking" boolean NOT NULL DEFAULT true,
  -- Поле, на котором споткнулись: 'phone', 'birthDate', 'patientRef'.
  "field_path" text,
  -- Объяснение для человека на русском. Без сырых персональных данных —
  -- они лежат в стейджинге, куда доступ по отдельному праву.
  "message" text NOT NULL,
  -- Что предлагается сделать. Заполняется правилом либо моделью.
  "suggested_fix" text,
  "resolution" "migration_quarantine_resolution" NOT NULL DEFAULT 'open',
  "resolved_at" timestamptz,
  "resolved_by_user_id" uuid REFERENCES "users"("id"),
  "retry_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "migration_quarantine_run_idx"
  ON "migration_quarantine_records" ("run_id", "resolution", "reason");

CREATE INDEX IF NOT EXISTS "migration_quarantine_org_open_idx"
  ON "migration_quarantine_records" ("organization_id", "created_at" DESC)
  WHERE "resolution" = 'open';

-- Одна и та же причина по одной и той же строке не размножается при повторных
-- прогонах разбора: карантин — это состояние, а не журнал попыток.
CREATE UNIQUE INDEX IF NOT EXISTS "migration_quarantine_unique"
  ON "migration_quarantine_records" ("staging_record_id", "reason", "field_path")
  WHERE "staging_record_id" IS NOT NULL AND "field_path" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "migration_entity_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "entity_kind" "migration_entity_kind" NOT NULL,
  -- Код чужой системы: 'ident', 'dentalpro', 'csv:patients_2019'. Разные
  -- системы могут иметь пациента с id 1 — они не должны склеиться.
  "source_system" text NOT NULL,
  -- Первичный ключ сущности в старой системе, как строка. Если ключа нет,
  -- сюда кладётся вычисленный natural_key с префиксом 'nk:'.
  "source_entity_id" text NOT NULL,
  "natural_key" text,
  -- Наш uuid. Внешнего ключа нет намеренно: ссылка указывает в разные таблицы
  -- в зависимости от entity_kind, а откат должен пережить удаление цели.
  "target_entity_id" uuid NOT NULL,
  "created_by_run_id" uuid REFERENCES "migration_runs"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Главный инвариант идемпотентности: сущность старой системы отображается
-- ровно в один наш uuid. Повторная загрузка того же файла попадёт сюда и
-- уйдёт по ветке обновления вместо создания второго пациента.
CREATE UNIQUE INDEX IF NOT EXISTS "migration_entity_links_source_unique"
  ON "migration_entity_links" ("organization_id", "entity_kind", "source_system", "source_entity_id");

-- Восстановление связей: приёмы ссылаются на пациента ключом старой системы,
-- и загрузчику нужно быстро получить наш uuid.
CREATE INDEX IF NOT EXISTS "migration_entity_links_target_idx"
  ON "migration_entity_links" ("target_entity_id");

CREATE INDEX IF NOT EXISTS "migration_entity_links_run_idx"
  ON "migration_entity_links" ("created_by_run_id");

CREATE TABLE IF NOT EXISTS "migration_reconciliations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id" uuid NOT NULL REFERENCES "migration_runs"("id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "generated_at" timestamptz NOT NULL DEFAULT now(),
  -- Свод сошёлся: все проверки пройдены. Если false — перенос НЕЛЬЗЯ считать
  -- завершённым, и интерфейс обязан показать это красным.
  "balanced" boolean NOT NULL,
  -- Массив проверок [{code, title, expected, actual, passed, detail}].
  -- Хранится целиком, потому что доказательство переноса должно быть
  -- воспроизводимым спустя год, а не пересчитываться на лету.
  "checks_json" jsonb NOT NULL,
  -- Разбивка по сущностям: сколько создано, обновлено, отклонено.
  "entity_breakdown_json" jsonb NOT NULL,
  -- Контроль денег отдельно от строк: сумма платежей источника обязана
  -- совпасть до копейки с суммой загруженного плюс отложенного в карантин.
  "source_money_total_rub" integer,
  "loaded_money_total_rub" integer,
  "quarantined_money_total_rub" integer,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "migration_reconciliations_run_idx"
  ON "migration_reconciliations" ("run_id", "generated_at" DESC);

DO $$
BEGIN
  -- Счётчики не бывают отрицательными: отрицательное значение означает ошибку
  -- в арифметике движка, и лучше узнать о ней от базы, чем из отчёта клиенту.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'migration_runs_counters_nonnegative'
  ) THEN
    ALTER TABLE "migration_runs"
      ADD CONSTRAINT "migration_runs_counters_nonnegative"
      CHECK (
        "source_rows" >= 0 AND "staged_rows" >= 0 AND "loaded_rows" >= 0
        AND "updated_rows" >= 0 AND "duplicate_rows" >= 0
        AND "quarantined_rows" >= 0 AND "skipped_rows" >= 0
        AND "llm_calls" >= 0 AND "llm_rejected_suggestions" >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'migration_staging_confidence_range'
  ) THEN
    ALTER TABLE "migration_staging_records"
      ADD CONSTRAINT "migration_staging_confidence_range"
      CHECK ("confidence" >= 0 AND "confidence" <= 1);
  END IF;

  -- Загруженная строка обязана указывать на созданную сущность. Без этого
  -- откат не сможет её удалить, а происхождение — доказать.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'migration_staging_loaded_has_target'
  ) THEN
    ALTER TABLE "migration_staging_records"
      ADD CONSTRAINT "migration_staging_loaded_has_target"
      CHECK (
        ("status" IN ('loaded', 'updated') AND "target_entity_id" IS NOT NULL)
        OR "status" NOT IN ('loaded', 'updated')
      );
  END IF;
END $$;
