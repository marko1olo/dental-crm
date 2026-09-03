CREATE TABLE IF NOT EXISTS "crm_leak_detector_leads" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
	"days_since_last_visit" integer NOT NULL,
	"last_visit_date" timestamp with time zone,
	"last_doctor_id" uuid REFERENCES "users"("id"),
	"last_doctor_name" text,
	"last_specialty" text,
	"uncompleted_plan_sum_rub" numeric(12, 2) DEFAULT 0 NOT NULL,
	"has_uncompleted_plan" boolean DEFAULT false NOT NULL,
	"clinical_risk_reason" text NOT NULL,
	"lead_status" text DEFAULT 'new' NOT NULL,
	"assigned_admin_user_id" uuid REFERENCES "users"("id"),
	"assigned_admin_name" text,
	"contact_attempts_count" integer DEFAULT 0 NOT NULL,
	"last_contact_at" timestamp with time zone,
	"last_contact_channel" text,
	"last_contact_notes" text,
	"rebooked_appointment_id" uuid REFERENCES "appointments"("id"),
	"rebooked_date" timestamp with time zone,
	"decline_reason" text,
	"decline_comment" text,
	"ai_reactivation_suggestion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_leak_leads_org_status" ON "crm_leak_detector_leads" ("organization_id", "lead_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_leak_leads_org_patient" ON "crm_leak_detector_leads" ("organization_id", "patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_leak_leads_org_days" ON "crm_leak_detector_leads" ("organization_id", "days_since_last_visit");
