-- 0123 — очередь исходящих сообщений, согласия пациентов и настройки рассылки.
--
-- ЗАЧЕМ
-- Отправлять сообщения было некуда складывать. Единственная очередь —
-- outgoing_notifications — состоит из полей (type, payload jsonb, status text)
-- и не знает ни канала, ни адреса получателя, ни числа попыток, ни причины
-- отказа. Обработчик к ней (services/notificationWorker.ts) умел только
-- Telegram, не повторял отправку и печатал результат в консоль; при этом он
-- ниоткуда не вызывался, как и scheduleNotification, — очередь не наполнялась
-- и не разбиралась.
--
-- Три таблицы:
--   communication_outbox            — что, кому, каким каналом и с каким итогом;
--   patient_communication_consents  — согласия по каналам, раздельно на
--                                     сервисные и рекламные сообщения;
--   communication_settings          — тихие часы, суточный лимит, окно повторов.
--
-- Согласия разделены не для красоты: ФЗ «О рекламе» ст. 18 ч. 1 требует
-- предварительного согласия именно на рекламные сообщения по сетям
-- электросвязи, тогда как напоминание о приёме — сервисное сообщение в рамках
-- договора. Одним флагом «можно писать» это не выражается, а штраф выписывают
-- за одно сообщение.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_outbox_status') THEN
    CREATE TYPE "communication_outbox_status" AS ENUM (
      'queued',      -- ждёт отправки
      'sending',     -- захвачено обработчиком
      'sent',        -- шлюз принял
      'delivered',   -- шлюз подтвердил доставку
      'failed',      -- попытки исчерпаны либо отказ, который не лечится повтором
      'cancelled',   -- отменено сотрудником
      'suppressed'   -- не отправлено: нет согласия, нет адреса, тихие часы истекли
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_consent_scope') THEN
    CREATE TYPE "communication_consent_scope" AS ENUM ('service', 'marketing');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_consent_state') THEN
    CREATE TYPE "communication_consent_state" AS ENUM ('granted', 'revoked');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "communication_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "patient_id" uuid REFERENCES "patients"("id"),
  "task_id" uuid REFERENCES "communication_tasks"("id"),
  "template_id" uuid REFERENCES "communication_templates"("id"),
  -- Идентификатор рассылки. Внешний ключ появится вместе с таблицей кампаний;
  -- пока это метка для группировки в журнале.
  "campaign_id" uuid,
  "channel" "communication_channel" NOT NULL,
  "intent" "communication_intent" NOT NULL,
  "scope" "communication_consent_scope" NOT NULL DEFAULT 'service',
  -- Номер, адрес почты или идентификатор чата — приведённый к формату канала.
  "recipient_address" text NOT NULL,
  "subject" text,
  "body" text NOT NULL,
  "status" "communication_outbox_status" NOT NULL DEFAULT 'queued',
  "attempts" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 5,
  "scheduled_at" timestamptz NOT NULL DEFAULT now(),
  "next_attempt_at" timestamptz NOT NULL DEFAULT now(),
  -- Захват строки обработчиком. locked_at нужен, чтобы вернуть в очередь то,
  -- что зависло из-за падения процесса посреди отправки.
  "locked_at" timestamptz,
  "locked_by" text,
  "sent_at" timestamptz,
  "last_error_class" text,
  "last_error_message" text,
  "provider_message_id" text,
  "segments" integer,
  -- Ключ, по которому одно и то же напоминание не ставится в очередь дважды.
  "dedupe_key" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Повторная постановка того же напоминания — это лишние деньги за SMS и
-- раздражённый пациент. Уникальность в пределах организации, а не глобально.
CREATE UNIQUE INDEX IF NOT EXISTS "communication_outbox_org_dedupe_unique"
  ON "communication_outbox" ("organization_id", "dedupe_key");

-- Основная выборка обработчика: что готово к отправке прямо сейчас.
CREATE INDEX IF NOT EXISTS "communication_outbox_due_idx"
  ON "communication_outbox" ("next_attempt_at")
  WHERE "status" = 'queued';

-- Журнал рассылки в интерфейсе: по организации и времени.
CREATE INDEX IF NOT EXISTS "communication_outbox_org_created_idx"
  ON "communication_outbox" ("organization_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "communication_outbox_patient_idx"
  ON "communication_outbox" ("organization_id", "patient_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "communication_outbox_campaign_idx"
  ON "communication_outbox" ("campaign_id")
  WHERE "campaign_id" IS NOT NULL;

-- Зависшие захваты: строка в статусе sending дольше окна возвращается в очередь.
CREATE INDEX IF NOT EXISTS "communication_outbox_stuck_idx"
  ON "communication_outbox" ("locked_at")
  WHERE "status" = 'sending';

CREATE TABLE IF NOT EXISTS "patient_communication_consents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "channel" "communication_channel" NOT NULL,
  "scope" "communication_consent_scope" NOT NULL,
  "state" "communication_consent_state" NOT NULL,
  -- Откуда взялось решение: договор, портал пациента, слова администратора,
  -- ответ «СТОП» во входящем сообщении. Без источника согласие не доказуемо.
  "source" text NOT NULL,
  "evidence" text,
  "decided_at" timestamptz NOT NULL DEFAULT now(),
  "decided_by_user_id" uuid REFERENCES "users"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "patient_communication_consents_unique"
  ON "patient_communication_consents" ("organization_id", "patient_id", "channel", "scope");

CREATE TABLE IF NOT EXISTS "communication_settings" (
  "organization_id" uuid PRIMARY KEY REFERENCES "organizations"("id"),
  -- Часовой пояс, в котором считаются тихие часы. Пациент в Самаре не должен
  -- получать напоминание по московскому расписанию.
  "timezone" text NOT NULL DEFAULT 'Europe/Moscow',
  -- Минуты от полуночи. По умолчанию 21:00–09:00 — ночью не пишем.
  "quiet_hours_start_minute" integer NOT NULL DEFAULT 1260,
  "quiet_hours_end_minute" integer NOT NULL DEFAULT 540,
  -- Сервисные сообщения в тихие часы откладываются до утра, а не отменяются:
  -- напоминание о завтрашнем приёме нужно доставить.
  "defer_service_in_quiet_hours" boolean NOT NULL DEFAULT true,
  -- Рекламные в тихие часы не уходят вовсе.
  "block_marketing_in_quiet_hours" boolean NOT NULL DEFAULT true,
  "daily_limit_per_patient" integer NOT NULL DEFAULT 3,
  "max_attempts" integer NOT NULL DEFAULT 5,
  "retry_base_seconds" integer NOT NULL DEFAULT 60,
  "retry_max_seconds" integer NOT NULL DEFAULT 3600,
  -- Порядок каналов при отправке «любым доступным»: первый, где есть контакт
  -- и согласие. JSON-массив кодов канала.
  "channel_fallback_json" text NOT NULL DEFAULT '["telegram","whatsapp","sms","email"]',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'communication_settings_quiet_hours_range'
  ) THEN
    ALTER TABLE "communication_settings"
      ADD CONSTRAINT "communication_settings_quiet_hours_range"
      CHECK (
        "quiet_hours_start_minute" BETWEEN 0 AND 1439
        AND "quiet_hours_end_minute" BETWEEN 0 AND 1439
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'communication_outbox_attempts_sane'
  ) THEN
    ALTER TABLE "communication_outbox"
      ADD CONSTRAINT "communication_outbox_attempts_sane"
      CHECK ("attempts" >= 0 AND "max_attempts" >= 1 AND "max_attempts" <= 20);
  END IF;
END $$;
