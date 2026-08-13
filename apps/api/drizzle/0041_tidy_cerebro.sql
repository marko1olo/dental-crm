CREATE TYPE "public"."clinical_task_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "clinical_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"treatment_plan_id" uuid,
	"assigned_doctor_id" uuid,
	"task_type" text NOT NULL,
	"status" "clinical_task_status" DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patients" DROP CONSTRAINT "patients_curator_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "clinical_tasks" ADD CONSTRAINT "clinical_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_tasks" ADD CONSTRAINT "clinical_tasks_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_tasks" ADD CONSTRAINT "clinical_tasks_treatment_plan_id_treatment_plans_id_fk" FOREIGN KEY ("treatment_plan_id") REFERENCES "public"."treatment_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_tasks" ADD CONSTRAINT "clinical_tasks_assigned_doctor_id_users_id_fk" FOREIGN KEY ("assigned_doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinical_tasks_organizationId_idx" ON "clinical_tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "clinical_tasks_patientId_idx" ON "clinical_tasks" USING btree ("patient_id");--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "source";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "patient_creation_rules";--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN "curator_id";--> statement-breakpoint
DROP TYPE "public"."appointment_source";