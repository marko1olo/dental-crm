-- Объявлено в модели, не создавалось НИ ОДНОЙ миграцией. Замер 2026-08-07.
--
-- ЧЕМ ЭТО ЛОМАЕТСЯ У ЗАКАЗЧИКА. Drizzle перечисляет ВСЕ объявленные колонки в
-- каждом `select()`, поэтому одной недостающей хватает, чтобы запрос упал с
-- 42703 `column does not exist`. Голый `select().from(users)` стоит на ВХОДЕ В
-- СИСТЕМУ: `routes/auth.ts:648`, далее :1355, :1775, :1835. На любой базе,
-- поднятой из этого репозитория, вход мёртв. Локально не видно — в рабочую базу
-- колонки когда-то добавили руками, и репозиторий разошёлся с ней молча.
-- Компилятор молчит тоже: объявление в `schema.ts` синтаксически безупречно.
--
-- ПОЧЕМУ ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ ПРАВКА СУЩЕСТВУЮЩИХ. Во-первых, применённую
-- миграцию править бесполезно: раннер помнит её по имени и второй раз не
-- запускает. Во-вторых, `communication_events` создаётся ДВАЖДЫ —
-- `0000_freezing_randall_flagg.sql:236` (живое определение) и
-- `0013_communication_telegram_runtime_tables.sql:37` (мёртвый повтор, который
-- пропускается по `IF NOT EXISTS`). Дописать колонки во второй `CREATE TABLE`
-- значило бы получить зелёный поиск по тексту при неработающей базе. Поэтому
-- только `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Этот класс отказов теперь
-- ловит `scripts/smoke-schema-duplicate-ddl.mjs`.
--
-- ИДЕМПОТЕНТНОСТЬ ОБЯЗАТЕЛЬНА: часть колонок у заказчика уже добавлена вручную,
-- миграция не имеет права на этом падать.
--
-- ЛОВУШКА ИМЕНИ БЕЗ ТАБЛИЦЫ. Поиск по одному имени колонки даёт ложное «уже
-- есть»: `yandex_calendar_id` существует в `0095`, но на `yandex_calendar_syncs`,
-- а не на `users`; `duration_seconds` — в `0118:268` на
-- `uis_call_speech_transcripts`. Каждая позиция ниже проверена парой
-- таблица+колонка.

-- ─── users: три колонки, все nullable, без значений по умолчанию ─────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "current_session_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "yandex_calendar_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "yandex_calendar_token" jsonb;

-- ─── communication_events: запись разговора ──────────────────────────────────
-- `audio_format` объявлен со значением по умолчанию `audio/mpeg`
-- (`schema.ts:1151`); повторяем дословно, иначе прежние строки получат NULL там,
-- где код ждёт строку.
ALTER TABLE "communication_events" ADD COLUMN IF NOT EXISTS "recording_url" text;
ALTER TABLE "communication_events" ADD COLUMN IF NOT EXISTS "duration_seconds" integer;
ALTER TABLE "communication_events" ADD COLUMN IF NOT EXISTS "audio_format" text DEFAULT 'audio/mpeg';

-- ─── yandex_calendar_syncs: uuid, НЕ text ────────────────────────────────────
-- Имя совпадает с `users.current_session_id`, тип — нет (`schema.ts:3870`).
ALTER TABLE "yandex_calendar_syncs" ADD COLUMN IF NOT EXISTS "current_session_id" uuid;

-- ─── diagnocat_reports ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "diagnocat_reports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"patient_id" uuid NOT NULL,
	"report_url" text NOT NULL,
	"odontogram_data" jsonb,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "diagnocat_reports_organization_id_idx"
	ON "diagnocat_reports" USING btree ("organization_id");

-- ─── sberbank_transactions ───────────────────────────────────────────────────
-- `updated_at` nullable и БЕЗ `DEFAULT now()`, в отличие от `created_at`
-- (`schema.ts:3438`). Имя индекса объявлено в смешанном регистре
-- (`sberbank_transactions_organizationId_idx`, `schema.ts:3440`) — кавычки
-- обязательны, иначе PostgreSQL приведёт его к нижнему регистру и сверка имён
-- разойдётся.
CREATE TABLE IF NOT EXISTS "sberbank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"order_id" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "sberbank_transactions_organizationId_idx"
	ON "sberbank_transactions" USING btree ("organization_id");

-- ─── Изоляция арендаторов для двух новых таблиц ──────────────────────────────
-- Форма скопирована из `0159_rls_force_and_write_check.sql:630-635` дословно, и
-- каждая её часть обязательна:
--   * `FORCE` — иначе владелец таблиц (роль приложения) политику обходит;
--   * `WITH CHECK` — без него арендатор ЧИТАЕТ только своё, но ЗАПИСАТЬ может в
--     чужую организацию. Для платёжных строк и медицинских отчётов это утечка;
--   * `NULLIF(..., '')` — после транзакционного `set_config` параметр может
--     вернуться пустой строкой, и прямое приведение к uuid даёт 22P02 вместо
--     честного отказа доступа;
--   * `app.superuser_bypass` — тем же ключом пользуются фоновые задачи проекта.
-- `DROP POLICY IF EXISTS` перед созданием делает блок перезапускаемым.
ALTER TABLE "diagnocat_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "diagnocat_reports" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "diagnocat_reports";
CREATE POLICY tenant_isolation ON "diagnocat_reports"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER TABLE "sberbank_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sberbank_transactions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "sberbank_transactions";
CREATE POLICY tenant_isolation ON "sberbank_transactions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
