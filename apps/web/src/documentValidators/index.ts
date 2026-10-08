import { confirmedDocumentLiteral } from "../AppHelpers";
import {
	validateDailyDentistDiary037U,
	validateDentalMedicalCard043U,
	validateLabWorkOrder,
	validateMedicalRecordExtract,
	validateOrthodonticMedicalCard043_1U,
	validatePostVisitRecommendations,
	validatePrescriptionMedicationOrder,
	validateRadiationDoseSheet,
	validateSummaryDentistStatement039U,
	validateTreatmentPlan,
	validateTreatmentPlanAcceptance,
	validateVisitAttendanceCertificate,
	validateXrayCbctReferral,
} from "./clinicalFormValidators";
import {
	validateAnesthesiaConsentLog,
	validateInformedConsent,
	validateMedicalInterventionRefusal,
	validatePaidMedicalServicesContract,
	validatePhotoVideoConsent,
	validateProcedureSpecificConsentPacket,
	validateWarrantyServiceMemo,
} from "./consentAndContractValidators";
import {
	validateCompletedWorksAct,
	validateInstallmentPaymentSchedule,
	validatePaymentInvoice,
	validatePaymentReceipt,
	validatePaymentRefundCorrectionRequest,
	validateTaxDeductionApplication,
	validateTreatmentCostEstimate,
} from "./financialDocValidators";
import {
	validateMedicalDocumentReleaseReceipt,
	validateMedicalRecordCopyRequest,
	validateMinorLegalRepresentativeConsent,
	validatePatientIntakeQuestionnaire,
	validatePersonalDataProcessingConsent,
} from "./patientIdentityValidators";
import { requiredDocumentField } from "./regexRules";
import type {
	DocumentState,
	DocumentValidationOutput,
	DocumentValidatorFn,
	ValidationResult,
} from "./types";

export type {
	DocumentState,
	ValidationResult,
	DocumentValidationOutput,
	DocumentValidatorFn,
};

export * from "./regexRules";
export * from "./patientIdentityValidators";
export * from "./consentAndContractValidators";
export * from "./clinicalFormValidators";
export * from "./financialDocValidators";

export const documentPayloadValidators: Record<
	string,
	(state: DocumentState) => string[] | string | null
> = {
	paid_medical_services_contract: validatePaidMedicalServicesContract,
	completed_works_act: validateCompletedWorksAct,
	treatment_cost_estimate: validateTreatmentCostEstimate,
	payment_invoice: validatePaymentInvoice,
	payment_receipt: validatePaymentReceipt,
	installment_payment_schedule: validateInstallmentPaymentSchedule,
	minor_legal_representative_consent: validateMinorLegalRepresentativeConsent,
	warranty_service_memo: validateWarrantyServiceMemo,
	patient_intake_questionnaire: validatePatientIntakeQuestionnaire,
	tax_deduction_application: validateTaxDeductionApplication,
	informed_consent: validateInformedConsent,
	procedure_specific_consent_packet: validateProcedureSpecificConsentPacket,
	treatment_plan: validateTreatmentPlan,
	treatment_plan_acceptance: validateTreatmentPlanAcceptance,
	post_visit_recommendations: validatePostVisitRecommendations,
	anesthesia_consent_log: validateAnesthesiaConsentLog,
	prescription_medication_order: validatePrescriptionMedicationOrder,
	lab_work_order: validateLabWorkOrder,
	photo_video_consent: validatePhotoVideoConsent,
	xray_cbct_referral: validateXrayCbctReferral,
	dental_medical_card_043u: validateDentalMedicalCard043U,
	orthodontic_medical_card_043_1u: validateOrthodonticMedicalCard043_1U,
	daily_dentist_diary_037u: validateDailyDentistDiary037U,
	summary_dentist_statement_039u: validateSummaryDentistStatement039U,
	radiation_dose_sheet: validateRadiationDoseSheet,
	medical_record_extract: validateMedicalRecordExtract,
	medical_record_copy_request: validateMedicalRecordCopyRequest,
	visit_attendance_certificate: validateVisitAttendanceCertificate,
	medical_document_release_receipt: validateMedicalDocumentReleaseReceipt,
	payment_refund_correction_request: validatePaymentRefundCorrectionRequest,
	personal_data_processing_consent: validatePersonalDataProcessingConsent,
	medical_intervention_refusal: validateMedicalInterventionRefusal,
};

// biome-ignore lint/suspicious/noExplicitAny: generic state from document context
export function validateDocumentPayloadForKind(
	kind: string,
	state: any,
): DocumentValidationOutput {
	const validator = documentPayloadValidators[kind];
	if (!validator) {
		return { valid: true };
	}
	const effectiveState = {
		requiredDocumentField,
		confirmedDocumentLiteral,
		...(state || {}),
	};
	const result = validator(effectiveState);
	if (!result) return { valid: true };
	if (Array.isArray(result)) {
		if (result.length === 0) return { valid: true };
		return { valid: false, error: result.join(", ") };
	}
	if (typeof result === "string" && result.trim().length > 0) {
		return { valid: false, error: result };
	}
	return { valid: true };
}
