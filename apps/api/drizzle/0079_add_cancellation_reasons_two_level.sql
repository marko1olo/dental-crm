CREATE TABLE IF NOT EXISTS "cancellation_reasons_two_level" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"category" text NOT NULL, -- 'clinic' | 'patient'
	"reason_code" text NOT NULL,
	"reason_title" text NOT NULL,
	"requires_note" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
