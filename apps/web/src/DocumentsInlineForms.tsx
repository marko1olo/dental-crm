// DocumentsInlineForms.tsx — thin re-export barrel
// All forms extracted into domain-specific files in components/documents/forms/

export {
	PaidMedicalServicesContractForm,
	CompletedWorksActForm,
	TreatmentCostEstimateForm,
	PaymentInvoiceForm,
	PaymentReceiptForm,
	InstallmentPaymentScheduleForm,
	PaymentRefundCorrectionRequestForm,
} from "./components/documents/forms/DocumentsPaymentForms";

export {
	MinorLegalRepresentativeConsentForm,
	PatientIntakeQuestionnaireForm,
} from "./components/documents/forms/DocumentsConsentForms";

export {
	TreatmentPlanForm,
	TreatmentPlanAcceptanceForm,
	PostVisitRecommendationsForm,
	PrescriptionMedicationOrderForm,
	LabWorkOrderForm,
	XrayCbctReferralForm,
	WarrantyServiceMemoForm,
} from "./components/documents/forms/DocumentsClinicalForms";

export {
	OutpatientMedicalCard025uForm,
	MedicalRecordExtractForm,
	MedicalRecordCopyRequestForm,
} from "./components/documents/forms/DocumentsMedicalRecordForms";

export {
	VisitAttendanceCertificateForm,
	MedicalDocumentReleaseReceiptForm,
} from "./components/documents/forms/DocumentsAdminForms";
