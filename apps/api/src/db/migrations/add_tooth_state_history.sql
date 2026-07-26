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

-- Перенос текущих состояний как стартовой точки истории: без этого у зубов,
-- заведённых до миграции, история начиналась бы с пустоты и выглядела так,
-- будто их никогда не лечили. Выполняется один раз — повторный запуск
-- ничего не задвоит благодаря NOT EXISTS.
INSERT INTO "tooth_state_history" (
    "organization_id", "patient_id", "tooth_number",
    "previous_state", "new_state", "new_surfaces",
    "reason", "changed_at"
)
SELECT
    ts."organization_id", ts."patient_id", ts."tooth_number",
    NULL, ts."state", ts."surfaces",
    'Перенос текущего состояния при включении истории зуба',
    COALESCE(ts."updated_at", ts."created_at")
FROM "tooth_states" ts
WHERE NOT EXISTS (
    SELECT 1 FROM "tooth_state_history" h
    WHERE h."patient_id" = ts."patient_id"
      AND h."tooth_number" = ts."tooth_number"
);
