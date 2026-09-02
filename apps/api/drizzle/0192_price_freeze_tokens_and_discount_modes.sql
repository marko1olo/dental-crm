ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "active_price_freeze_token_id" uuid;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "price_freeze_policy" text DEFAULT 'standard_30_days';
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "price_frozen_until" timestamp with time zone;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "discount_mode" text NOT NULL DEFAULT 'plan_fixed';
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "plan_discount_percent" numeric(5, 2) DEFAULT 0;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "plan_discount_rub" numeric(12, 2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS "treatment_plan_price_freeze_tokens" (
    "id" uuid PRIMARY KEY DEFAULT uuidv7(),
    "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
    "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
    "plan_id" uuid NOT NULL REFERENCES "treatment_plans"("id"),
    "token" text NOT NULL,
    "policy_kind" text NOT NULL DEFAULT 'standard_30_days',
    "locked_at" timestamp with time zone NOT NULL DEFAULT now(),
    "valid_until" timestamp with time zone NOT NULL,
    "is_expired" boolean NOT NULL DEFAULT false,
    "inflation_threshold_percent" integer NOT NULL DEFAULT 10,
    "frozen_prices_json" jsonb NOT NULL,
    "status" text NOT NULL DEFAULT 'active',
    "issued_by_user_id" uuid REFERENCES "users"("id"),
    "notes" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "treatment_plans_price_freeze_token_idx" ON "treatment_plans" ("active_price_freeze_token_id");
CREATE INDEX IF NOT EXISTS "price_freeze_tokens_org_idx" ON "treatment_plan_price_freeze_tokens" ("organization_id");
CREATE INDEX IF NOT EXISTS "price_freeze_tokens_patient_idx" ON "treatment_plan_price_freeze_tokens" ("patient_id");
CREATE INDEX IF NOT EXISTS "price_freeze_tokens_plan_idx" ON "treatment_plan_price_freeze_tokens" ("plan_id");
CREATE INDEX IF NOT EXISTS "price_freeze_tokens_token_idx" ON "treatment_plan_price_freeze_tokens" ("token");
