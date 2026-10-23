import type { DocumentKind } from "@dental/shared";
import type { DocumentCategoryTab } from "./navTabs/types";

export type { DocumentCategoryTab, DocumentNavTabsProps } from "./navTabs";
export { DocumentNavTabs } from "./navTabs";

export const DOCUMENT_CATEGORY_KINDS: Record<
	Exclude<DocumentCategoryTab, "all">,
	ReadonlySet<DocumentKind>
> = {
	intake: new Set<DocumentKind>([
		"paid_medical_services_contract",
		"informed_consent",
		"personal_data_processing_consent",
		"patient_intake_questionnaire",
		"minor_legal_representative_consent",
		"photo_video_consent",
		"medical_intervention_refusal",
	]),
	clinical: new Set<DocumentKind>([
		"dental_medical_card_043u",
		"orthodontic_medical_card_043_1u",
		"treatment_plan",
		"treatment_plan_acceptance",
		"treatment_cost_estimate",
		"procedure_specific_consent_packet",
		"anesthesia_consent_log",
		"post_visit_recommendations",
		"prescription_medication_order",
		"daily_dentist_diary_037u",
		"summary_dentist_statement_039u",
		"medical_record_extract",
	]),
	finance_tax: new Set<DocumentKind>([
		"payment_invoice",
		"payment_receipt",
		"completed_works_act",
		"installment_payment_schedule",
		"tax_deduction_certificate",
		"tax_deduction_application",
		"legacy_tax_deduction_certificate",
		"tax_deduction_registry",
		"payment_refund_correction_request",
	]),
	certificates_sanpin: new Set<DocumentKind>([
		"visit_attendance_certificate",
		"radiation_dose_sheet",
		"xray_cbct_referral",
		"lab_work_order",
		"warranty_service_memo",
		"medical_record_copy_request",
		"medical_document_release_receipt",
	]),
};
