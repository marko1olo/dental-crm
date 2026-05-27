ALTER TABLE "dente_telegram_bot_configs"
  ADD COLUMN IF NOT EXISTS "review_request_delay_hours" integer DEFAULT 2 NOT NULL;
