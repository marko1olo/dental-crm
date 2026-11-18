ALTER TABLE "patient_reclamations" ADD COLUMN IF NOT EXISTS "tooth_number" integer;--> statement-breakpoint
ALTER TABLE "patient_reclamations" ADD COLUMN IF NOT EXISTS "warranty_certificate_id" uuid;--> statement-breakpoint
ALTER TABLE "patient_reclamations" ADD COLUMN IF NOT EXISTS "defect_type" varchar(64);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_reclamations_warranty_certificate_id_idx" ON "patient_reclamations" ("warranty_certificate_id");
