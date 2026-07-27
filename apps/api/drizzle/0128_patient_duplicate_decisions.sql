-- 0128 — решения по дублям пациентов и след слияния.
--
-- ЗАЧЕМ НОВАЯ ТАБЛИЦА, А НЕ СУЩЕСТВУЮЩАЯ patient_duplicate_merge_queues
-- Та таблица собрана из двух поколений колонок: в живой базе одновременно есть
-- primary_patient_name / duplicate_patient_name / match_confidence_percent /
-- merge_status (их ждёт виджет) и source_patient_id / target_patient_id /
-- match_score / status (их объявляет ORM). Виджет читает первые, код пишет
-- вторые, маршрута между ними нет вовсе — проверено запросом, 404. Дописывать
-- третье поколение в ту же таблицу значит закрепить путаницу.
--
-- Здесь хранится ровно то, что имеет смысл хранить: РЕШЕНИЕ человека. Сам поиск
-- дублей идёт по текущим данным и в очереди не нуждается — очередь устаревает,
-- а список, посчитанный на месте, всегда точен.

CREATE TABLE IF NOT EXISTS "patient_duplicate_decisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  -- Пара хранится в устойчивом порядке (меньший идентификатор слева), чтобы
  -- одно и то же решение не записалось дважды в обратном порядке.
  "left_patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "right_patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  -- dismissed — «это разные люди, больше не предлагать»
  -- merged    — карточки объединены
  "decision" text NOT NULL,
  /* Кто и когда решил: слияние медицинских карт должно быть объяснимо. */
  "decided_by_user_id" uuid REFERENCES "users"("id"),
  "decided_at" timestamptz NOT NULL DEFAULT now(),
  "reason" text,
  /* Что именно перенесено при слиянии: таблица -> число строк. */
  "moved_rows_json" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "patient_duplicate_decisions_pair_unique"
  ON "patient_duplicate_decisions" ("organization_id", "left_patient_id", "right_patient_id");

CREATE INDEX IF NOT EXISTS "patient_duplicate_decisions_org_idx"
  ON "patient_duplicate_decisions" ("organization_id", "decided_at" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patient_duplicate_decisions_known'
  ) THEN
    ALTER TABLE "patient_duplicate_decisions"
      ADD CONSTRAINT "patient_duplicate_decisions_known"
      CHECK ("decision" IN ('dismissed', 'merged'));
  END IF;

  -- Пара из одного и того же пациента бессмысленна.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patient_duplicate_decisions_distinct'
  ) THEN
    ALTER TABLE "patient_duplicate_decisions"
      ADD CONSTRAINT "patient_duplicate_decisions_distinct"
      CHECK ("left_patient_id" <> "right_patient_id");
  END IF;
END $$;

-- След слияния в самой карточке: куда объединена. Нужен, чтобы открытая по
-- старой ссылке карточка объясняла, что произошло, а не выглядела опустевшей.
ALTER TABLE "patients"
  ADD COLUMN IF NOT EXISTS "merged_into_patient_id" uuid REFERENCES "patients"("id");

CREATE INDEX IF NOT EXISTS "patients_merged_into_idx"
  ON "patients" ("merged_into_patient_id")
  WHERE "merged_into_patient_id" IS NOT NULL;
