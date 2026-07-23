CREATE TABLE IF NOT EXISTS "extended_odontogram_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"patient_name" text NOT NULL,
	"tooth_number" integer NOT NULL,
	"is_primary_pediatric" boolean DEFAULT false NOT NULL,
	"secondary_caries_under_filling" boolean DEFAULT false NOT NULL, -- 'ПС' status
	"mobility_degree" integer DEFAULT 0 NOT NULL, -- 0..3
	"pediatric_crown_present" boolean DEFAULT false NOT NULL,
	"notes" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
