-- ─────────────────────────────────────────────────────────────────────────────
-- История изменений состояния зуба (append-only).
--
-- ЗАЧЕМ: таблица tooth_states хранит одну строку на зуб, а обновление в
-- routes/odontogram.ts выполнялось как DELETE + INSERT. История стиралась:
-- путь зуба «кариес → пломба → пульпит → коронка» схлопывался в одну текущую
-- запись, и вкладка «История зуба» показывала единственную строку с автором
-- «System». Восстановить, кто и когда лечил зуб, было невозможно.
--
-- Таблица только пополняется; существующие данные не изменяются.
-- Безопасна для повторного применения.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tooth_state_history" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "organization_id" uuid NOT NULL,
    "patient_id" uuid NOT NULL,
    "tooth_number" integer NOT NULL,
    -- Состояние до изменения; NULL — если зуб фиксируется впервые.
    "previous_state" text,
    "new_state" text NOT NULL,
    "previous_surfaces" jsonb,
    "new_surfaces" jsonb,
    -- Автор изменения. Раньше в истории всегда значился «System».
    "changed_by_user_id" uuid,
    -- Приём, в рамках которого внесено изменение (если известен).
    "visit_id" uuid,
    "reason" text,
    "changed_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Основной сценарий чтения: история конкретного зуба конкретного пациента
-- в хронологическом порядке.
CREATE INDEX IF NOT EXISTS "idx_tooth_state_history_patient_tooth"
    ON "tooth_state_history" ("patient_id", "tooth_number", "changed_at");

-- Выборка по клинике для отчётов и аудита.
CREATE INDEX IF NOT EXISTS "idx_tooth_state_history_org_changed"
    ON "tooth_state_history" ("organization_id", "changed_at");

-- Перенос текущих состояний как стартовой точки истории вынесен в отдельную
-- миграцию 0120_backfill_tooth_state_history.sql.
--
-- ПОЧЕМУ ОТДЕЛЬНО: перенос читает tooth_states."organization_id", а эту колонку
-- создаёт только 0118_align_tables_with_schema.sql. Пока перенос стоял здесь,
-- на чистой базе миграции падали на
-- «column ts.organization_id does not exist», и схема не разворачивалась
-- дальше 0116. Порядок важен: сначала выравнивание таблиц, потом перенос.
