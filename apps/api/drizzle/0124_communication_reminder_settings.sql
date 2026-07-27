-- 0124 — настройки автоматических напоминаний о приёме.
--
-- ЗАЧЕМ
-- Напоминание за сутки — то, ради чего клиника вообще заводит рассылку: оно
-- напрямую уменьшает неявки. В проекте его не было. Ближайшее, что
-- существовало, — поле appointment_reminder_lead_times_hours_json в
-- dente_telegram_bot_configs, привязанное к одному каналу и не читаемое ничем,
-- кроме сборки списка Telegram-outbox.
--
-- Здесь настройка общая для всех каналов и живёт рядом с остальными правилами
-- рассылки. Выключена по умолчанию: включать автоматическую отправку пациентам
-- без ведома клиники нельзя.

ALTER TABLE "communication_settings"
  ADD COLUMN IF NOT EXISTS "appointment_reminder_enabled" boolean NOT NULL DEFAULT false;

-- Часы до приёма, когда отправлять. Несколько значений — несколько напоминаний
-- (например, за сутки и за два часа).
ALTER TABLE "communication_settings"
  ADD COLUMN IF NOT EXISTS "appointment_reminder_lead_hours_json" text NOT NULL DEFAULT '[24]';

-- Окно поиска: приёмы, у которых момент напоминания попал в последние N минут.
-- Без окна перезапуск планировщика через сутки разослал бы напоминания о
-- вчерашних приёмах.
ALTER TABLE "communication_settings"
  ADD COLUMN IF NOT EXISTS "appointment_reminder_window_minutes" integer NOT NULL DEFAULT 90;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'communication_settings_reminder_window_sane'
  ) THEN
    ALTER TABLE "communication_settings"
      ADD CONSTRAINT "communication_settings_reminder_window_sane"
      CHECK ("appointment_reminder_window_minutes" BETWEEN 5 AND 1440);
  END IF;
END $$;
