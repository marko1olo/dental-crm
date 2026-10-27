import type {
	Appointment,
	ClinicalToothRow,
	Dashboard,
	DentalMedicalCard043uPayload,
	Patient,
	PhotoVideoConsentMaterial,
	StaffMember,
} from "@dental/shared";
import { type ClinicProfileDraft, type VisitNoteForm } from "../../../../AppConstants";
import { toDateInputValue } from "../../../../AppHelpers";
import { compactDocumentText } from "../../../../utils/documentPayloadUtils";

export interface UseDocumentMedicalCardProps {
	dashboard: Dashboard | null;
	documentPatient: Patient | null;
	activeAppointment: Appointment | null;
	activeDoctor: StaffMember | null;
	visitNoteForm: VisitNoteForm;
	clinicProfileDraft: ClinicProfileDraft;
	documentState: any;
	clinicalToothRowsValue: () => ClinicalToothRow[];
}

export function useDocumentMedicalCardValues({
	dashboard,
	documentPatient,
	activeAppointment,
	activeDoctor,
	visitNoteForm,
	clinicProfileDraft,
	documentState,
	clinicalToothRowsValue,
}: UseDocumentMedicalCardProps) {
	function recordExtractComplaintAndAnamnesisValue(): string {
		return (
			documentState.recordExtractComplaintAndAnamnesis.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.complaint,
				dashboard?.activeVisit?.anamnesis,
			)
		);
	}

	function recordExtractObjectiveStatusValue(): string {
		return (
			documentState.recordExtractObjectiveStatus.trim() ||
			dashboard?.activeVisit?.objectiveStatus?.trim() ||
			""
		);
	}

	function recordExtractDiagnosisValue(): string {
		return (
			documentState.recordExtractDiagnosis.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			""
		);
	}

	function recordExtractTreatmentProvidedValue(): string {
		return (
			documentState.recordExtractTreatmentProvided.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.doctorSummary,
				dashboard?.activeVisit?.treatmentPlan,
			)
		);
	}

	function dentalMedicalCardDoctorValue(): {
		fullName: string;
		position: string;
		specialty: string;
	} {
		return {
			fullName:
				documentState.recordExtractDoctorFullName.trim() ||
				activeDoctor?.fullName ||
				"",
			position: "врач-стоматолог",
			specialty: activeDoctor?.specialties?.[0] ?? "стоматология",
		};
	}

	function dentalMedicalCardVisitDateValue(): string {
		return (
			documentState.recordExtractPeriodEnd.trim() ||
			toDateInputValue(activeAppointment?.startsAt) ||
			new Date().toISOString().slice(0, 10)
		);
	}

	function dentalMedicalCard043uPayloadValue(): DentalMedicalCard043uPayload {
		const doctor = dentalMedicalCardDoctorValue();
		const visitDate = dentalMedicalCardVisitDateValue();
		const patientProfile = documentPatient?.administrativeProfile;
		const complaintsAndAnamnesis = recordExtractComplaintAndAnamnesisValue();
		const complaintText =
			visitNoteForm.complaint.trim() ||
			complaintsAndAnamnesis.split(/\n{2,}/)[0]?.trim() ||
			"";
		const anamnesisText =
			visitNoteForm.anamnesis.trim() || complaintsAndAnamnesis || "";
		const objectiveText =
			visitNoteForm.objectiveStatus.trim() ||
			recordExtractObjectiveStatusValue() ||
			"";
		const diagnosisText =
			visitNoteForm.diagnosis.trim() || recordExtractDiagnosisValue() || "";
		const treatmentText =
			visitNoteForm.treatmentPlan.trim() ||
			recordExtractTreatmentProvidedValue() ||
			"";
		const sexRaw = (
			(documentPatient as any)?.gender ??
			(documentPatient?.administrativeProfile as any)?.gender ??
			(patientProfile as { sex?: string } | null | undefined)?.sex ??
			""
		).toString().toLowerCase();
		const sex =
			sexRaw === "female" || sexRaw === "f" || sexRaw === "жен" || sexRaw === "женский"
				? "женский"
				: sexRaw === "male" || sexRaw === "m" || sexRaw === "муж" || sexRaw === "мужской"
					? "мужской"
					: null;
		const birthDate = toDateInputValue(documentPatient?.birthDate) || null;
		const orgFullName =
			clinicProfileDraft?.legalName?.trim() ||
			clinicProfileDraft?.clinicName?.trim() ||
			"Стоматологическая клиника";
		const identityDocument = patientProfile?.identityDocument?.trim() || null;

		return {
			formNumber: "043/у",
			organization: {
				fullName: orgFullName,
				shortName: clinicProfileDraft?.clinicName?.trim() || null,
				address: clinicProfileDraft?.address?.trim() || null,
				phone: clinicProfileDraft?.phone?.trim() || null,
				ogrn: clinicProfileDraft?.ogrn?.trim() || null,
				inn: clinicProfileDraft?.inn?.trim() || null,
				licenseNumber: clinicProfileDraft?.medicalLicenseNumber?.trim() || null,
				licenseIssueDate: clinicProfileDraft?.medicalLicenseIssuedAt?.trim() || null,
				licenseAuthority: clinicProfileDraft?.medicalLicenseIssuer?.trim() || null,
			},
			patient: {
				fullName: documentPatient?.fullName?.trim() || "—",
				birthDate,
				sex,
				phone: documentPatient?.phone?.trim() || null,
				address:
					patientProfile?.registrationAddress?.trim() ||
					patientProfile?.residentialAddress?.trim() ||
					null,
				documentSeriesNumber: identityDocument,
				snils: patientProfile?.snils?.trim() || null,
				medicalCardNumber:
					(documentPatient as any)?.medicalCardNumber?.trim() ||
					(documentPatient as any)?.cardNumber?.trim() ||
					`043/у-${new Date().getFullYear()}-${documentPatient?.id?.slice(0, 8).toUpperCase() ?? "PATIENT"}`,
			},
			doctor: {
				fullName: doctor.fullName || activeDoctor?.fullName || "—",
				position: doctor.position || null,
				specialty: doctor.specialty || null,
			},
			visitDate,
			visitId: null,
			diaryId: null,
			complaint: complaintText || null,
			anamnesis: anamnesisText || null,
			structuredAnamnesis: null,
			statusLocalis: null,
			objectiveStatus: objectiveText || null,
			diagnosisIcd10: null,
			diagnosisTooth: null,
			diagnosisText: diagnosisText || null,
			treatmentDescription: treatmentText || null,
			treatmentPlan: treatmentText || null,
			complications: null,
			comorbidities: null,
			instrumentTrayBarcode: null,
			clinicalToothRows: clinicalToothRowsValue(),
			recommendations: null,
			nextVisitPlan: null,
			content: null,
			lockedAt: null,
			contentHash: null,
		};
	}

	function togglePhotoVideoMaterial(material: PhotoVideoConsentMaterial) {
		documentState.setPhotoVideoMaterials((current: PhotoVideoConsentMaterial[]) =>
			current.includes(material)
				? current.filter((item) => item !== material)
				: [...current, material],
		);
	}

	return {
		recordExtractComplaintAndAnamnesisValue,
		recordExtractObjectiveStatusValue,
		recordExtractDiagnosisValue,
		recordExtractTreatmentProvidedValue,
		dentalMedicalCardDoctorValue,
		dentalMedicalCardVisitDateValue,
		dentalMedicalCard043uPayloadValue,
		togglePhotoVideoMaterial,
	};
}
