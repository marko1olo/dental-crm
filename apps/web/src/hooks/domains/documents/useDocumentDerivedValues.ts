import type {
	Appointment,
	Dashboard,
	GeneratedDocument,
	Patient,
	Payment,
	StaffMember,
	TreatmentPlanItem,
} from "@dental/shared";
import { type ClinicProfileDraft, type VisitNoteForm } from "../../../AppConstants";
import { createDocumentFinancialCalculations } from "./documentFinancialCalculations";
import { useDocumentClinicalAreaValues } from "./derived/useDocumentClinicalAreaValues";
import { useDocumentClinicalRuleValues } from "./derived/useDocumentClinicalRuleValues";
import { useDocumentCommunicationTaskValues } from "./derived/useDocumentCommunicationTaskValues";
import { useDocumentMedicalCardValues } from "./derived/useDocumentMedicalCardValues";
import { useDocumentPostVisitCareValues } from "./derived/useDocumentPostVisitCareValues";
import { useDocumentRepresentativeWarrantyValues } from "./derived/useDocumentRepresentativeWarrantyValues";

export interface UseDocumentDerivedValuesProps {
	dashboard: Dashboard | null;
	activeDoctor: StaffMember | null;
	activePayments: Payment[];
	activeTreatmentPlanItems: TreatmentPlanItem[];
	documentPatient: Patient | null;
	activeAppointment: Appointment | null;
	visitNoteForm: VisitNoteForm;
	clinicProfileDraft: ClinicProfileDraft;
	documentState: any;
	activeUsableDocuments: GeneratedDocument[];
	selectedPaymentReceiptPayments: Payment[];
	setCurrentView: (view: any) => void;
	setError: (err: string | null) => void;
}

export function useDocumentDerivedValues(props: UseDocumentDerivedValuesProps) {
	const {
		dashboard, activeDoctor, activePayments, activeTreatmentPlanItems,
		documentPatient, activeAppointment, visitNoteForm, clinicProfileDraft,
		documentState, activeUsableDocuments, selectedPaymentReceiptPayments,
		setCurrentView, setError,
	} = props;

	const clinicalRules = useDocumentClinicalRuleValues({ dashboard, documentPatient });
	const postVisit = useDocumentPostVisitCareValues({ documentState });
	const comms = useDocumentCommunicationTaskValues({
		dashboard, documentState, changePostVisitCareTopic: postVisit.changePostVisitCareTopic,
		setCurrentView, setError,
	});

	// Lazy recursive references for clinical area and medical card
	const recordExtractDiagnosisValue = () =>
		documentState.recordExtractDiagnosis.trim() || dashboard?.activeVisit?.diagnosis?.trim() || "";
	const recordExtractComplaintAndAnamnesisValue = () =>
		documentState.recordExtractComplaintAndAnamnesis.trim() ||
		dashboard?.activeVisit?.complaint?.trim() || "";

	const area = useDocumentClinicalAreaValues({
		activeTreatmentPlanItems, dashboard, documentState,
		recordExtractDiagnosisValue, recordExtractComplaintAndAnamnesisValue,
	});

	const medicalCard = useDocumentMedicalCardValues({
		dashboard, documentPatient, activeAppointment, activeDoctor,
		visitNoteForm, clinicProfileDraft, documentState,
		clinicalToothRowsValue: area.clinicalToothRowsValue,
	});

	const repWarranty = useDocumentRepresentativeWarrantyValues({
		dashboard, documentPatient, documentState, activeUsableDocuments,
		inferredTreatmentArea: area.inferredTreatmentArea,
	});

	const financial = createDocumentFinancialCalculations({
		activeTreatmentPlanItems, dashboard, activePayments, documentState,
		documentPatient, activeDoctor, selectedPaymentReceiptPayments,
		activeUsableDocuments, treatmentAcceptancePlannedTotalRub: area.treatmentAcceptancePlannedTotalRub,
	});

	return {
		...clinicalRules,
		...postVisit,
		...comms,
		...area,
		...medicalCard,
		...repWarranty,
		...financial,
	};
}
