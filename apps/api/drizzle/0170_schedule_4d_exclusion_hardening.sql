-- 1. Подключение расширения btree_gist для возможности использовать = с типами UUID
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Очистка исторических пересечений в расписании (если есть) перед навешиванием констрейнтов
UPDATE "appointments" a
SET "status" = 'cancelled'
WHERE a."status" NOT IN ('cancelled', 'no_show')
  AND a."patient_id" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "appointments" b
    WHERE b."patient_id" = a."patient_id"
      AND b."id" != a."id"
      AND b."status" NOT IN ('cancelled', 'no_show')
      AND a."starts_at" < b."ends_at"
      AND a."ends_at" > b."starts_at"
      AND a."id" > b."id"
  );

UPDATE "appointments" a
SET "status" = 'cancelled'
WHERE a."status" NOT IN ('cancelled', 'no_show')
  AND a."assistant_user_id" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "appointments" b
    WHERE b."assistant_user_id" = a."assistant_user_id"
      AND b."id" != a."id"
      AND b."status" NOT IN ('cancelled', 'no_show')
      AND a."starts_at" < b."ends_at"
      AND a."ends_at" > b."starts_at"
      AND a."id" > b."id"
  );

-- 3. Защита расписания ассистентов от оверлэпов
ALTER TABLE "appointments"
DROP CONSTRAINT IF EXISTS "appointments_assistant_overlap_excl";

ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_assistant_overlap_excl"
EXCLUDE USING gist (
  "assistant_user_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
)
WHERE ("assistant_user_id" IS NOT NULL AND "status" NOT IN ('cancelled'::appointment_status, 'no_show'::appointment_status));

-- 4. Защита расписания пациентов от оверлэпов
ALTER TABLE "appointments"
DROP CONSTRAINT IF EXISTS "appointments_patient_overlap_excl";

ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_patient_overlap_excl"
EXCLUDE USING gist (
  "patient_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
)
WHERE ("patient_id" IS NOT NULL AND "status" NOT IN ('cancelled'::appointment_status, 'no_show'::appointment_status));

-- 5. Защита расписания врачей от оверлэпов (усиление с исключением cancelled и no_show)
ALTER TABLE "appointments"
DROP CONSTRAINT IF EXISTS "appointments_doctor_overlap_excl";

ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_doctor_overlap_excl"
EXCLUDE USING gist (
  "doctor_user_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
)
WHERE ("doctor_user_id" IS NOT NULL AND "status" NOT IN ('cancelled'::appointment_status, 'no_show'::appointment_status));

-- 6. Защита расписания кресел от оверлэпов (усиление с исключением cancelled и no_show)
ALTER TABLE "appointments"
DROP CONSTRAINT IF EXISTS "appointments_chair_overlap_excl";

ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_chair_overlap_excl"
EXCLUDE USING gist (
  "chair_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
)
WHERE ("chair_id" IS NOT NULL AND "status" NOT IN ('cancelled'::appointment_status, 'no_show'::appointment_status));
