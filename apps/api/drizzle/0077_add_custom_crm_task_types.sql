CREATE TABLE IF NOT EXISTS "custom_crm_task_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"type_code" text NOT NULL,
	"type_label" text NOT NULL,
	"color_hex" text DEFAULT '#3b82f6' NOT NULL,
	"requires_patient_binding" boolean DEFAULT false NOT NULL,
	"default_sla_hours" integer DEFAULT 24 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
