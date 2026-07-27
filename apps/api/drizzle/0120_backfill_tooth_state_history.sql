-- ─────────────────────────────────────────────────────────────────────────────
-- Перенос текущих состояний зубов как стартовой точки истории.
--
-- ЗАЧЕМ ОТДЕЛЬНЫМ ФАЙЛОМ: перенос раньше стоял в конце
-- 0117_add_tooth_state_history.sql, но читает tooth_states."organization_id" —
-- колонку, которую создаёт только 0118_align_tables_with_schema.sql. На чистой
-- базе миграции падали на «column ts.organization_id does not exist» и схема
-- не разворачивалась дальше 0116. Здесь порядок соблюдён: 0117 создаёт
-- таблицу, 0118 выравнивает tooth_states, 0120 переносит данные.
--
-- ЗАЧЕМ ПЕРЕНОС ВООБЩЕ: без него у зубов, заведённых до включения истории,
-- вкладка «История зуба» начиналась бы с пустоты и выглядела так, будто зуб
-- никогда не лечили.
--
-- Выполняется один раз: повторный запуск ничего не задвоит благодаря NOT EXISTS.
-- ─────────────────────────────────────────────────────────────────────────────

-- tooth_states."surfaces" физически имеет тип text[], а
-- tooth_state_history."new_surfaces" объявлен как jsonb (db/schema.ts).
-- Без to_jsonb() вставка падает: неявного приведения text[] → jsonb нет.
--
-- Строки без organization_id пропускаются: колонка в истории NOT NULL, а
-- 0118 проставляет организацию только тем зубам, у которых нашёлся пациент.
INSERT INTO "tooth_state_history" (
    "organization_id", "patient_id", "tooth_number",
    "previous_state", "new_state", "new_surfaces",
    "reason", "changed_at"
)
SELECT
    ts."organization_id", ts."patient_id", ts."tooth_number",
    NULL, ts."state"::text, to_jsonb(ts."surfaces"),
    'Перенос текущего состояния при включении истории зуба',
    COALESCE(ts."updated_at", ts."created_at", now())
FROM "tooth_states" ts
WHERE ts."organization_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "tooth_state_history" h
    WHERE h."patient_id" = ts."patient_id"
      AND h."tooth_number" = ts."tooth_number"
);
