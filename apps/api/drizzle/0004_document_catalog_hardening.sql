ALTER TYPE "public"."ai_job_kind" ADD VALUE IF NOT EXISTS 'paper_ocr' AFTER 'document_draft';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'procedure_specific_consent_packet' AFTER 'informed_consent';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'treatment_plan_acceptance' AFTER 'treatment_plan';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'anesthesia_consent_log' AFTER 'treatment_plan_acceptance';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'prescription_medication_order' AFTER 'anesthesia_consent_log';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'personal_data_processing_consent' AFTER 'prescription_medication_order';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'minor_legal_representative_consent' AFTER 'personal_data_processing_consent';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'photo_video_consent' AFTER 'minor_legal_representative_consent';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'medical_intervention_refusal' AFTER 'photo_video_consent';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'treatment_cost_estimate' AFTER 'medical_intervention_refusal';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'payment_invoice' AFTER 'treatment_cost_estimate';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'payment_receipt' AFTER 'payment_invoice';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'installment_payment_schedule' AFTER 'payment_receipt';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'post_visit_recommendations' AFTER 'installment_payment_schedule';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'medical_record_extract' AFTER 'post_visit_recommendations';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'medical_record_copy_request' AFTER 'medical_record_extract';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'medical_document_release_receipt' AFTER 'medical_record_copy_request';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'xray_cbct_referral' AFTER 'medical_document_release_receipt';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'lab_work_order' AFTER 'xray_cbct_referral';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'visit_attendance_certificate' AFTER 'lab_work_order';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'warranty_service_memo' AFTER 'visit_attendance_certificate';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'payment_refund_correction_request' AFTER 'warranty_service_memo';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'tax_deduction_application' AFTER 'payment_refund_correction_request';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'legacy_tax_deduction_certificate' AFTER 'tax_deduction_application';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'tax_deduction_registry' AFTER 'tax_deduction_certificate';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE IF NOT EXISTS 'patient_intake_questionnaire' AFTER 'tax_deduction_registry';--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visits_id_patient_organization_unique'
  ) THEN
    ALTER TABLE "visits"
      ADD CONSTRAINT "visits_id_patient_organization_unique"
      UNIQUE ("id", "patient_id", "organization_id");
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generated_documents_visit_patient_organization_fk'
  ) THEN
    ALTER TABLE "generated_documents"
      ADD CONSTRAINT "generated_documents_visit_patient_organization_fk"
      FOREIGN KEY ("visit_id", "patient_id", "organization_id")
      REFERENCES "visits" ("id", "patient_id", "organization_id");
  END IF;
END $$;
