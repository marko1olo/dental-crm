CREATE TYPE "public"."invoice_status" AS ENUM('unpaid', 'partially_paid', 'paid');--> statement-breakpoint
CREATE TYPE "public"."ledger_payment_method" AS ENUM('cash', 'card', 'dms', 'installment_balance');--> statement-breakpoint
CREATE TABLE "bi_analytics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"snapshot_date" timestamp with time zone NOT NULL,
	"cohort_ltv_json" jsonb DEFAULT '{}' NOT NULL,
	"plan_funnel_json" jsonb DEFAULT '{}' NOT NULL,
	"chair_utilization_json" jsonb DEFAULT '{}' NOT NULL,
	"doctor_profitability_json" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"payment_method" "ledger_payment_method" NOT NULL,
	"amount_rub" numeric(12, 2) NOT NULL,
	"operator_id" uuid,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid,
	"items_json" jsonb DEFAULT '[]' NOT NULL,
	"total_amount_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "invoice_status" DEFAULT 'unpaid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_diary_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diary_id" uuid NOT NULL,
	"previous_anamnesis" text,
	"previous_status_localis" text,
	"previous_diagnosis_icd10" varchar(50),
	"previous_treatment_description" text,
	"revised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revised_by_user_id" uuid
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_items" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "patient_signature" text;--> statement-breakpoint
ALTER TABLE "treatment_scenarios" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_scenarios" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD COLUMN "diagnosis_tooth" varchar(10);--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD COLUMN "locked_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD COLUMN "draft_author_id" uuid;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD COLUMN "co_signed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD COLUMN "diary_hash" text;--> statement-breakpoint
ALTER TABLE "visit_templates" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "bi_analytics_snapshots" ADD CONSTRAINT "bi_analytics_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_ledger" ADD CONSTRAINT "cash_ledger_invoice_id_patient_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."patient_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_ledger" ADD CONSTRAINT "cash_ledger_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD CONSTRAINT "patient_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD CONSTRAINT "patient_invoices_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD CONSTRAINT "patient_invoices_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD CONSTRAINT "visit_diary_revisions_diary_id_visit_diaries_id_fk" FOREIGN KEY ("diary_id") REFERENCES "public"."visit_diaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diary_revisions" ADD CONSTRAINT "visit_diary_revisions_revised_by_user_id_users_id_fk" FOREIGN KEY ("revised_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_locked_by_user_id_users_id_fk" FOREIGN KEY ("locked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_draft_author_id_users_id_fk" FOREIGN KEY ("draft_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD CONSTRAINT "visit_diaries_co_signed_by_user_id_users_id_fk" FOREIGN KEY ("co_signed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_templates" ADD CONSTRAINT "visit_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;