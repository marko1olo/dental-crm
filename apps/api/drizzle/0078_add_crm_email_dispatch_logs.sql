CREATE TABLE IF NOT EXISTS "crm_email_dispatch_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"patient_name" text NOT NULL,
	"recipient_email" text NOT NULL,
	"document_type" text NOT NULL, -- 'treatment_plan' | 'invoice'
	"document_title" text NOT NULL,
	"dispatch_status" text DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
