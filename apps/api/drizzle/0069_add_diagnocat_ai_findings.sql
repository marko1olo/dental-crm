CREATE TABLE IF NOT EXISTS "diagnocat_ai_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"patient_name" text NOT NULL,
	"study_type" text DEFAULT 'CBCT' NOT NULL,
	"ai_confidence_score" numeric(4, 2) DEFAULT '0.95' NOT NULL,
	"detected_pathologies_json" text NOT NULL,
	"imported_to_odontogram" boolean DEFAULT false NOT NULL,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
