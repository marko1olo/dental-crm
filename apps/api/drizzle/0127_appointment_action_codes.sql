-- 0127 — короткие коды для ссылок «подтвердить» и «отменить» приём.
--
-- ЗАЧЕМ КОД, А НЕ ПОДПИСАННЫЙ ТОКЕН В АДРЕСЕ
-- Первая версия ссылки несла HMAC-токен с полезной нагрузкой. Две причины
-- отказаться от него, обе выяснились на проверке:
--
-- 1. Токен получался 300 символов. Fastify не сопоставляет параметр маршрута
--    длиннее 100 знаков (maxParamLength по умолчанию), поэтому такая ссылка
--    отвечала 404 у КАЖДОГО пациента.
--
-- 2. Даже если поднять предел, 300 символов в SMS — это пять лишних сегментов
--    сверх текста. Кириллица даёт 70 знаков на сегмент, и клиника платила бы за
--    напоминание в шесть раз больше.
--
-- Короткий код решает и то, и то: адрес вида /api/p/Ab3xK9mQ2T укладывается в
-- сегмент вместе с текстом. Взамен появляется таблица — но она же даёт то, чего
-- у самодостаточного токена нет: возможность отозвать ссылку и увидеть, когда
-- по ней перешли.

CREATE TABLE IF NOT EXISTS "appointment_action_codes" (
  -- Код из алфавита без похожих знаков (без 0/O/1/l/I): пациент иногда
  -- перенабирает ссылку с экрана вручную.
  "code" text PRIMARY KEY,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "appointment_id" uuid NOT NULL REFERENCES "appointments"("id") ON DELETE CASCADE,
  -- confirm | cancel — действие зашито в код, а не в адрес: так ссылка короче и
  -- одну нельзя подменить другой.
  "action" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  -- Время перехода. Одноразовость не требуется: пациент открывает ссылку дважды
  -- и должен увидеть понятный ответ, а не «ссылка недействительна».
  "used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Выдача кода для приёма и действия: один активный код на пару, чтобы прошлые
-- напоминания не расходились с текущим.
CREATE UNIQUE INDEX IF NOT EXISTS "appointment_action_codes_appointment_action_unique"
  ON "appointment_action_codes" ("appointment_id", "action");

CREATE INDEX IF NOT EXISTS "appointment_action_codes_expiry_idx"
  ON "appointment_action_codes" ("expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointment_action_codes_action_known'
  ) THEN
    ALTER TABLE "appointment_action_codes"
      ADD CONSTRAINT "appointment_action_codes_action_known"
      CHECK ("action" IN ('confirm', 'cancel'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointment_action_codes_code_shape'
  ) THEN
    ALTER TABLE "appointment_action_codes"
      ADD CONSTRAINT "appointment_action_codes_code_shape"
      CHECK (char_length("code") BETWEEN 8 AND 32);
  END IF;
END $$;
