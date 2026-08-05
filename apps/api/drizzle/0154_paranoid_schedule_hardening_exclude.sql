-- 1. Подключение расширения btree_gist для возможности использовать = с типами UUID
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Защита расписания врачей от оверлэпов
ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_doctor_overlap_excl"
EXCLUDE USING gist (
  "doctor_user_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
)
WHERE ("status" != 'cancelled'::appointment_status);

-- 3. Защита расписания кресел от оверлэпов
ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_chair_overlap_excl"
EXCLUDE USING gist (
  "chair_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
)
WHERE ("status" != 'cancelled'::appointment_status);
