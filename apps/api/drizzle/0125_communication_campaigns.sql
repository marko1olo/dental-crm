-- 0125 — рассылки: кампания, отбор получателей, снимок аудитории.
--
-- ЗАЧЕМ
-- Колонка communication_outbox.campaign_id появилась в 0123 как метка для
-- группировки, но самой кампании не существовало: отправить сообщение группе
-- пациентов было нельзя, и «Рассылки» из перечня возможностей конкурентов
-- закрывались виджетами, читавшими пустые таблицы.
--
-- Ключевое решение: снимок аудитории сохраняется в момент запуска
-- (audience_snapshot_json). Пересчитать «кому мы это отправляли» через месяц
-- невозможно — пациенты успеют прийти на приём, оплатить долг и отозвать
-- согласие, и выборка даст другой ответ. Для разбора жалобы в ФАС нужен ответ
-- на момент отправки, а не на момент вопроса.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_campaign_status') THEN
    CREATE TYPE "communication_campaign_status" AS ENUM (
      'draft',      -- составляется, получатели не зафиксированы
      'scheduled',  -- запуск отложен на время
      'running',    -- получатели поставлены в очередь
      'completed',  -- очередь по кампании разобрана
      'cancelled'   -- отменена; неотправленное снято с очереди
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "communication_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "clinic_id" uuid REFERENCES "clinics"("id"),
  "title" text NOT NULL,
  "template_id" uuid REFERENCES "communication_templates"("id"),
  "channel" "communication_channel" NOT NULL,
  -- По умолчанию рекламная: рассылка «приходите на чистку со скидкой» —
  -- реклама, и без согласия пациента она не уйдёт (ФЗ «О рекламе» ст. 18 ч. 1).
  "scope" "communication_consent_scope" NOT NULL DEFAULT 'marketing',
  "status" "communication_campaign_status" NOT NULL DEFAULT 'draft',
  -- Условия отбора получателей: закрытый набор признаков, не произвольный SQL.
  "audience_json" text NOT NULL DEFAULT '{}',
  -- Кто попал в рассылку и кто отсеян, с причинами, на момент запуска.
  "audience_snapshot_json" text,
  "scheduled_at" timestamptz,
  "launched_at" timestamptz,
  "completed_at" timestamptz,
  "created_by_user_id" uuid REFERENCES "users"("id"),
  "launched_by_user_id" uuid REFERENCES "users"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "communication_campaigns_org_created_idx"
  ON "communication_campaigns" ("organization_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "communication_campaigns_due_idx"
  ON "communication_campaigns" ("scheduled_at")
  WHERE "status" = 'scheduled';

-- Теперь, когда таблица существует, метку в очереди можно превратить в
-- настоящую ссылку. Осиротевшие значения сначала обнуляются: кампаний до этой
-- миграции не было, но строка с campaign_id могла появиться из ручной вставки.
UPDATE "communication_outbox" o
   SET "campaign_id" = NULL
 WHERE o."campaign_id" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "communication_campaigns" c WHERE c."id" = o."campaign_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'communication_outbox_campaign_id_fkey'
  ) THEN
    ALTER TABLE "communication_outbox"
      ADD CONSTRAINT "communication_outbox_campaign_id_fkey"
      FOREIGN KEY ("campaign_id") REFERENCES "communication_campaigns"("id");
  END IF;
END $$;
