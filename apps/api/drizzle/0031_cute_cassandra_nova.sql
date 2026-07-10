ALTER TABLE "patient_invoices" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tooth_states" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tooth_states" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_diaries" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;