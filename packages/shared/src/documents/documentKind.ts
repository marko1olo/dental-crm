/**
 * packages/shared/src/documents/documentKind.ts
 * Canonical Statutory & Clinical Medical Document Kinds in DENTE Dental CRM.
 */

import { z } from "zod";

export const documentKindSchema = z.enum([
	"paid_medical_services_contract",
	"completed_works_act",
	"tax_deduction_certificate",
	"informed_consent",
	"procedure_specific_consent_packet",
	"treatment_plan",
	"treatment_plan_acceptance",
	"anesthesia_consent_log",
	"prescription_medication_order",
	"personal_data_processing_consent",
	"minor_legal_representative_consent",
	"photo_video_consent",
	"medical_intervention_refusal",
	"treatment_cost_estimate",
	"payment_invoice",
	"payment_receipt",
	"installment_payment_schedule",
	"post_visit_recommendations",
	"outpatient_medical_card_025u",
	"dental_medical_card_043u",
	"orthodontic_medical_card_043_1u",
	"daily_dentist_diary_037u",
	"summary_dentist_statement_039u",
	"medical_record_extract",
	"medical_record_copy_request",
	"medical_document_release_receipt",
	"xray_cbct_referral",
	"radiation_dose_sheet",
	"lab_work_order",
	"visit_attendance_certificate",
	"warranty_service_memo",
	"payment_refund_correction_request",
	"tax_deduction_application",
	"legacy_tax_deduction_certificate",
	"tax_deduction_registry",
	"patient_intake_questionnaire",
]);

export type DocumentKind = z.infer<typeof documentKindSchema>;

export const legacyTaxDeductionCertificateMinYear = 2021;
export const legacyTaxDeductionCertificateMaxYear = 2023;
export const taxDeductionCertificateMinYear = 2024;
