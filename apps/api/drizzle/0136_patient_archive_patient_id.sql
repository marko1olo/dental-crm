-- 0136 — колонка пациента в архиве и чёрном списке.
--
-- ЧТО СЛОМАНО. GET /api/patients/:patientId/archive-status отвечает 500 —
-- проверено живым запросом. Причина: db/schema.ts объявляет у таблицы
-- patient_archive_reasons_and_blacklists колонку patient_id, а в базе её нет.
-- Исходная миграция 0109 создала таблицу без неё, а 0118, которая добивала
-- колонку patient_id десятку других таблиц (diagnocat_ai_findings,
-- ndfl_tax_calculators, patient_duplicate_merge_queues …), эту пропустила.
-- Запрос падает на этапе SELECT: «column patient_archive_reasons_and_blacklists
-- .patient_id does not exist».
--
-- ПОЧЕМУ ЭТО НЕ КОСМЕТИКА. Архив и чёрный список — это ответ на вопрос «можно
-- ли записывать этого человека». Пятисотая ошибка означает, что администратор
-- не получает ответа вовсе, а вызывающий виджет написан как
-- `response.ok ? json : []` — то есть на экране была не ошибка, а пустота,
-- читаемая как «пациент чист». Худший вид отказа: молчаливый и в безопасную
-- сторону.
--
-- ПОЧЕМУ ДОБАВЛЯЕМ КОЛОНКУ, А НЕ УБИРАЕМ ЕЁ ИЗ СХЕМЫ. Таблица привязана к
-- пациенту по СМЫСЛУ, и маршрут пер-пациентный: /api/patients/:patientId/
-- archive-status. Хранить связь по patient_name — значит потерять её при первом
-- же исправлении опечатки в фамилии. Колонка nullable: существующие строки
-- (если они есть) заполнить нечем, придумывать связь для них нельзя.
--
-- Внешнего ключа нет намеренно: строки этой таблицы должны переживать удаление
-- карточки — запись «в чёрном списке» имеет смысл и после того, как карточку
-- убрали, иначе повторное заведение пациента обнулит историю отказов.

ALTER TABLE "patient_archive_reasons_and_blacklists"
  ADD COLUMN IF NOT EXISTS "patient_id" uuid;

-- Выборка по пациенту — основной путь чтения этой таблицы.
CREATE INDEX IF NOT EXISTS "patient_archive_reasons_patient_idx"
  ON "patient_archive_reasons_and_blacklists" ("organization_id", "patient_id")
  WHERE "patient_id" IS NOT NULL;
