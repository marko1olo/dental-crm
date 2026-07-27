-- Переводит tooth_states."surfaces" из text[] в jsonb.
--
-- ЗАЧЕМ: колонка создана как text[] в 0001, но db/schema.ts объявляет её
-- jsonb("surfaces"). Drizzle подставляет значение в JSON-виде, а PostgreSQL
-- ждёт литерал массива, и КАЖДОЕ сохранение зуба с поверхностями падало:
--
--   insert into "tooth_states" (... "surfaces" ...) values (..., '["O","M"]', ...)
--   error: malformed array literal: "["O","M"]"
--
-- То есть выбор поверхностей — кариес на жевательной и медиальной — не
-- сохранялся вообще, маршрут отвечал 500. Проверено запросом к живому API.
--
-- Приводим базу к модели, а не наоборот, по двум причинам: так объявлено в
-- schema.ts, и так уже устроена таблица истории — tooth_state_history
-- .previous_surfaces / .new_surfaces объявлены jsonb и в 0117, и в модели.
-- После этой миграции поверхности хранятся одинаково и в текущем состоянии, и
-- в истории.
--
-- to_jsonb() сохраняет существующие значения: text[] {O,M} становится
-- json-массивом ["O","M"]. NULL остаётся NULL.
ALTER TABLE "tooth_states"
	ALTER COLUMN "surfaces" SET DATA TYPE jsonb
	USING CASE WHEN "surfaces" IS NULL THEN NULL ELSE to_jsonb("surfaces") END;
