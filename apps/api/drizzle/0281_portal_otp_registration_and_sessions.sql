ALTER TABLE "portal_otp_codes" ALTER COLUMN "patient_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "portal_otp_codes" ADD COLUMN IF NOT EXISTS "phone" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_otp_codes_phone_idx" ON "portal_otp_codes" ("organization_id", "phone", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_revoked_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"token_hash" text NOT NULL UNIQUE,
	"patient_id" uuid REFERENCES "patients"("id"),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"revoked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_revoked_tokens_expires_idx" ON "portal_revoked_tokens" ("expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_revoked_tokens_patient_idx" ON "portal_revoked_tokens" ("organization_id", "patient_id");
