-- 0217 — Добавление target_audience и intercom_acks в staff_chat_messages для интеркома
ALTER TABLE "staff_chat_messages" ADD COLUMN IF NOT EXISTS "target_audience" text;
ALTER TABLE "staff_chat_messages" ADD COLUMN IF NOT EXISTS "intercom_acks" jsonb NOT NULL DEFAULT '[]'::jsonb;
