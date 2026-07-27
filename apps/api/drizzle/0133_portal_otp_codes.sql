-- 0133 — одноразовые коды входа в личный кабинет пациента.
--
-- ЧТО БЫЛО СЛОМАНО. routes/portal.ts выдавал сессию личного кабинета по одному
-- общему коду на всех: configuredPortalOtpCode() при NODE_ENV != "production"
-- возвращал «0000», а .env задаёт именно NODE_ENV=development. То есть любой
-- человек, знающий номер телефона пациента, вводил «0000» и читал его визиты,
-- планы лечения, счета и выданные документы. В production код был обязателен и
-- не короче шести символов, но оставался ОДНИМ статичным секретом для всех
-- пациентов навсегда, и отправить его было нечем: POST /auth/send-otp отвечал
-- { success: true, message: "OTP sent" } и не отправлял ничего.
--
-- ПОЧЕМУ НУЖНА ТАБЛИЦА, А НЕ ПАМЯТЬ ПРОЦЕССА. Код должен пережить перезапуск и
-- быть общим для всех воркеров: иначе пациент получает SMS, сервер
-- перезапускается, и код «неверный». Счётчик попыток в памяти к тому же
-- обнуляется рестартом — то есть перебор снимается перезапуском.
--
-- ПОЧЕМУ НЕ ПОДОШЛА dente_telegram_link_codes. Та таблица про привязку чата
-- Telegram к субъекту: свой bot_config_id, свой subject_type и уникальный
-- индекс по отпечатку кода в пределах бота. Лепить в неё вход по SMS означало
-- бы смешать два разных жизненных цикла в одной строке.
--
-- ЧЕГО ЗДЕСЬ НАМЕРЕННО НЕТ. Открытого кода — только PBKDF2-SHA512 (100k
-- итераций, соль на код) из utils/cryptoHelper.ts. И номера телефона: он уже
-- лежит в patients.phone, второй копии персональных данных здесь не нужно, а
-- ограничение частоты и так считается по patient_id — код выдаётся только
-- тогда, когда пациент однозначно найден.

CREATE TABLE IF NOT EXISTS "portal_otp_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  /* PBKDF2-SHA512, формат «соль:хеш». Открытый код не хранится нигде. */
  "code_hash" text NOT NULL,
  /* sms — реальная отправка через шлюз; developer_log — код только в журнале
     сервера, ветка возможна исключительно при NODE_ENV != 'production'. */
  "channel" text NOT NULL,
  /* pending выставляется ДО обращения к шлюзу: если процесс упадёт на отправке,
     строка не превратится молча в «отправлено». Проверяются только 'sent'. */
  "delivery_status" text NOT NULL DEFAULT 'pending',
  /* Классификация отказа шлюза (not_configured, insufficient_funds, ...) —
     чтобы администратор видел причину, а не «код не пришёл». */
  "delivery_error_class" text,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "expires_at" timestamptz NOT NULL,
  "consumed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Оба горячих запроса идут по (организация, пациент) и берут свежайшее:
-- поиск действующего кода при проверке и подсчёт выданных за окно при выдаче.
CREATE INDEX IF NOT EXISTS "portal_otp_codes_patient_idx"
  ON "portal_otp_codes" ("organization_id", "patient_id", "created_at" DESC);

-- Уборка просроченного мусора выполняется по этому индексу.
CREATE INDEX IF NOT EXISTS "portal_otp_codes_expires_idx"
  ON "portal_otp_codes" ("expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'portal_otp_codes_channel_known'
  ) THEN
    ALTER TABLE "portal_otp_codes"
      ADD CONSTRAINT "portal_otp_codes_channel_known"
      CHECK ("channel" IN ('sms', 'developer_log'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'portal_otp_codes_delivery_status_known'
  ) THEN
    ALTER TABLE "portal_otp_codes"
      ADD CONSTRAINT "portal_otp_codes_delivery_status_known"
      CHECK ("delivery_status" IN ('pending', 'sent', 'failed'));
  END IF;

  -- Открытый четырёхзначный код имел длину 4. Любое значение короче
  -- «соль:хеш» означало бы, что кто-то снова записал код открытым текстом.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'portal_otp_codes_hash_shape'
  ) THEN
    ALTER TABLE "portal_otp_codes"
      ADD CONSTRAINT "portal_otp_codes_hash_shape"
      CHECK ("code_hash" LIKE '%:%' AND length("code_hash") >= 96);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'portal_otp_codes_attempts_sane'
  ) THEN
    ALTER TABLE "portal_otp_codes"
      ADD CONSTRAINT "portal_otp_codes_attempts_sane"
      CHECK ("attempt_count" >= 0);
  END IF;
END $$;
