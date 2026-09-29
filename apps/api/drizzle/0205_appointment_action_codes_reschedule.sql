-- 0205 — расширение допустимых действий для ссылок в напоминаниях: подтверждение, отмена и перенос приёма (Mandate 8b Complete Migrations Law).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointment_action_codes_action_known'
  ) THEN
    ALTER TABLE "appointment_action_codes"
      DROP CONSTRAINT "appointment_action_codes_action_known";
  END IF;

  ALTER TABLE "appointment_action_codes"
    ADD CONSTRAINT "appointment_action_codes_action_known"
    CHECK ("action" IN ('confirm', 'cancel', 'reschedule'));
END $$;
