ALTER TABLE "communication_tasks" ADD COLUMN IF NOT EXISTS "last_error_message" text;
ALTER TABLE "uis_sms_chat_quotas" ADD COLUMN IF NOT EXISTS "cost_kopecks" bigint DEFAULT 0;
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'uis_sms_chat_quotas_org_month_unique'
	) THEN
		ALTER TABLE "uis_sms_chat_quotas" ADD CONSTRAINT "uis_sms_chat_quotas_org_month_unique" UNIQUE ("organization_id", "month_year");
	END IF;
END $$;
