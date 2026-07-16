CREATE TABLE "protocol_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"specialty" "dental_specialty" NOT NULL,
	"title" text NOT NULL,
	"visit_reason" text NOT NULL,
	"default_duration_minutes" integer DEFAULT 30 NOT NULL,
	"complaint_prompt" text DEFAULT '' NOT NULL,
	"objective_template" text DEFAULT '' NOT NULL,
	"diagnosis_hints" jsonb DEFAULT '[]' NOT NULL,
	"treatment_plan_template" text DEFAULT '' NOT NULL,
	"required_documents" jsonb DEFAULT '[]' NOT NULL,
	"suggested_imaging" jsonb DEFAULT '[]' NOT NULL,
	"safety_warnings" jsonb DEFAULT '[]' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "protocol_templates" ADD CONSTRAINT "protocol_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;