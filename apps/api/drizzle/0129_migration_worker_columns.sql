-- 0129 — асинхронное выполнение переноса: владелец, признак жизни, прогресс.
--
-- ЗАЧЕМ
-- Маршрут /api/migration/run делал всё в одном HTTP-запросе: разбор, стейджинг,
-- загрузку и сверку. На выгрузке в сто тысяч строк это запрос длиной в минуты,
-- который обрывается по таймауту обратного прокси, — и оператор не знает,
-- перенеслось ли что-нибудь.
--
-- Теперь фазы разделены: заливка файла, сопоставление, выполнение. Выполнение
-- ставится в очередь и идёт в фоне, а клиент опрашивает состояние прогона.
--
-- ГЛАВНОЕ ЗДЕСЬ — ВОЗОБНОВЛЕНИЕ ПОСЛЕ ПАДЕНИЯ.
-- Если процесс умер посреди загрузки, прогон остаётся в статусе loading, и
-- никто уже не двигает его дальше. Три колонки решают это без внешней очереди:
--
--   worker_id    — кто взял прогон в работу (хост и pid);
--   heartbeat_at — когда владелец последний раз подтверждал, что жив;
--   phase        — на чём именно он стоял, для внятного показа оператору.
--
-- При старте процесса воркер ищет прогоны в статусе loading, у которых
-- heartbeat_at старше окна живучести, и подбирает их. Продолжить с нужного места
-- он может потому, что состояние каждой строки лежит в migration_staging_records:
-- уже загруженные помечены loaded, оставшиеся — ready. Дублей это не создаёт
-- благодаря уникальности в migration_entity_links.

ALTER TABLE "migration_runs"
  -- Человекочитаемая фаза: «Укладка строк», «Загрузка платежей». Статуса
  -- недостаточно: loading длится минуты, и всё это время интерфейс обязан
  -- показывать, что именно происходит.
  ADD COLUMN IF NOT EXISTS "phase" text,
  ADD COLUMN IF NOT EXISTS "worker_id" text,
  ADD COLUMN IF NOT EXISTS "heartbeat_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "queued_at" timestamptz,
  -- Путь к временному файлу источника: фазы сопоставления и стейджинга не
  -- должны требовать повторной заливки файла с клиента.
  ADD COLUMN IF NOT EXISTS "upload_path" text,
  -- Имя файла, как его назвал оператор. Отдельно от source_name: тот участвует
  -- в отчётах, а это — для сопоставления с тем, что лежит на диске.
  ADD COLUMN IF NOT EXISTS "upload_file_name" text,
  -- Прогресс считается по стейджингу, а не по счётчикам в памяти воркера: после
  -- перезапуска процесс обязан показать верный процент, а не начать с нуля.
  ADD COLUMN IF NOT EXISTS "progress_total" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "progress_done" integer NOT NULL DEFAULT 0,
  -- Число подборов осиротевшего прогона. Больше трёх — признак того, что прогон
  -- роняет процесс, а не что процессу не везёт.
  ADD COLUMN IF NOT EXISTS "resume_count" integer NOT NULL DEFAULT 0;

-- Выборка воркера: что взять следующим. Частичный индекс, потому что интересует
-- один статус из десяти, а таблица растёт с каждой выгрузкой.
CREATE INDEX IF NOT EXISTS "migration_runs_queue_idx"
  ON "migration_runs" ("queued_at")
  WHERE "status" = 'queued';

-- Поиск осиротевших: в работе, но владелец давно не отмечался.
CREATE INDEX IF NOT EXISTS "migration_runs_stale_idx"
  ON "migration_runs" ("heartbeat_at")
  WHERE "status" = 'loading';

-- Воркер берёт строки по порядку следования в источнике, чтобы прогресс двигался
-- предсказуемо и оператор видел, до какой строки дошли.
CREATE INDEX IF NOT EXISTS "migration_staging_worker_pick_idx"
  ON "migration_staging_records" ("run_id", "status", "source_table", "source_row_number");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'migration_runs_progress_sane'
  ) THEN
    ALTER TABLE "migration_runs"
      ADD CONSTRAINT "migration_runs_progress_sane"
      CHECK (
        "progress_total" >= 0
        AND "progress_done" >= 0
        AND "progress_done" <= "progress_total"
        AND "resume_count" >= 0
      );
  END IF;
END $$;
