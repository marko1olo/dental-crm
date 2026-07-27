-- 0130 — решение по дублям исчезает вместе с пациентом, а не держит его.
--
-- КАК НАШЛОСЬ. Не чтением схемы, а живым прогоном: после первого объединения
-- карточек демонстрационные данные перестали пересеиваться —
--   update or delete on table "patients" violates foreign key constraint
--   "patient_duplicate_decisions_left_patient_id_fkey"
-- Ссылки объявлены без ON DELETE, то есть по умолчанию NO ACTION: пока в
-- patient_duplicate_decisions есть строка, пациента нельзя удалить вообще
-- ничем — ни очисткой тестовых данных, ни удалением по требованию субъекта
-- персональных данных (152-ФЗ ст. 14), ни откатом ошибочного импорта.
--
-- ПОЧЕМУ CASCADE, А НЕ SET NULL. Запись здесь — это решение о ПАРЕ: «эти двое
-- разные люди» или «эти двое объединены». Без одной из сторон утверждение не
-- имеет смысла: пара из одного пациента запрещена отдельным CHECK
-- (patient_duplicate_decisions_distinct), так что SET NULL дал бы строку,
-- нарушающую собственные ограничения таблицы. Медицинские данные при этом не
-- страдают: здесь не хранится ни приёмов, ни оплат, ни снимков — только след
-- разбора картотеки, который восстанавливается повторным разбором.
--
-- След в самой карточке (patients.merged_into_patient_id) переводится в
-- SET NULL, а не CASCADE: удаление основной карточки не должно тянуть за собой
-- удаление архивной. Карточка останется, просто перестанет ссылаться.

ALTER TABLE "patient_duplicate_decisions"
  DROP CONSTRAINT IF EXISTS "patient_duplicate_decisions_left_patient_id_fkey";
ALTER TABLE "patient_duplicate_decisions"
  ADD CONSTRAINT "patient_duplicate_decisions_left_patient_id_fkey"
  FOREIGN KEY ("left_patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;

ALTER TABLE "patient_duplicate_decisions"
  DROP CONSTRAINT IF EXISTS "patient_duplicate_decisions_right_patient_id_fkey";
ALTER TABLE "patient_duplicate_decisions"
  ADD CONSTRAINT "patient_duplicate_decisions_right_patient_id_fkey"
  FOREIGN KEY ("right_patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;

ALTER TABLE "patients"
  DROP CONSTRAINT IF EXISTS "patients_merged_into_patient_id_fkey";
ALTER TABLE "patients"
  ADD CONSTRAINT "patients_merged_into_patient_id_fkey"
  FOREIGN KEY ("merged_into_patient_id") REFERENCES "patients"("id") ON DELETE SET NULL;
