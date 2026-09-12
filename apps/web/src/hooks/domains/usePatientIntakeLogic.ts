import type {
	Appointment,
	ClinicalToothRow,
	Dashboard,
	DentalMedicalCard043uPayload,
	Patient,
} from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
	ClinicProfileDraft,
	MedicalRecordExtractDocumentDraftFields,
	VisitNoteForm,
} from "../../AppConstants";
import {
	compactDocumentText,
	confirmedDocumentLiteral,
	documentPayloadDraftKey,
	documentTextLines,
	emptyMedicalRecordExtractDocumentDraftFields,
	loadMedicalRecordExtractDocumentDraft,
	saveMedicalRecordExtractDocumentDraft,
	toDateInputValue,
} from "../../AppHelpers";
import { useDocumentStore } from "../../store/documentStore";

export interface UsePatientIntakeLogicOptions {
	documentPatient: Patient | null;
	documentPatientMatchesActiveVisit: boolean;
	dashboard: Dashboard | null;
	documentLocalPersistenceOrganizationId: string;
	clinicProfileDraft: ClinicProfileDraft;
	activeDoctor: { fullName?: string; specialties?: string[] } | null;
	activeAppointment: Appointment | null;
	visitNoteForm: VisitNoteForm;
	clinicalToothRowsValue: () => ClinicalToothRow[];
	setError?: (error: string | null) => void;
}

export function usePatientIntakeLogic({
	documentPatient,
	documentPatientMatchesActiveVisit,
	dashboard,
	documentLocalPersistenceOrganizationId,
	clinicProfileDraft,
	activeDoctor,
	activeAppointment,
	visitNoteForm,
	clinicalToothRowsValue,
	setError,
}: UsePatientIntakeLogicOptions) {
	const {
		selectedDocumentKind,

		// Intake fields
		intakeChiefComplaint,
		setIntakeChiefComplaint,
		intakeAllergyStatus,
		setIntakeAllergyStatus,
		intakeCurrentMedications,
		setIntakeCurrentMedications,
		intakeChronicConditions,
		setIntakeChronicConditions,
		intakePregnancyStatus,
		setIntakePregnancyStatus,
		intakeAnticoagulants,
		setIntakeAnticoagulants,
		intakeInfectiousRiskNotes,
		setIntakeInfectiousRiskNotes,
		intakeCardioEndocrineNotes,
		setIntakeCardioEndocrineNotes,
		intakeEmergencyContact,
		setIntakeEmergencyContact,
		intakeAdditionalNotes,
		setIntakeAdditionalNotes,
		intakeAccuracyConfirmed,
		setIntakeAccuracyConfirmed,

		// Record extract fields
		recordExtractPeriodStart,
		setRecordExtractPeriodStart,
		recordExtractPeriodEnd,
		setRecordExtractPeriodEnd,
		recordExtractSourceVisitIds,
		setRecordExtractSourceVisitIds,
		recordExtractComplaintAndAnamnesis,
		setRecordExtractComplaintAndAnamnesis,
		recordExtractObjectiveStatus,
		setRecordExtractObjectiveStatus,
		recordExtractDiagnosis,
		setRecordExtractDiagnosis,
		recordExtractTreatmentProvided,
		setRecordExtractTreatmentProvided,
		recordExtractRecommendations,
		setRecordExtractRecommendations,
		recordExtractDoctorFullName,
		setRecordExtractDoctorFullName,
		recordExtractRecipientFullName,
		setRecordExtractRecipientFullName,
		recordExtractRecipientAuthority,
		setRecordExtractRecipientAuthority,
		recordExtractIssuedAt,
		setRecordExtractIssuedAt,
		recordExtractPreparedFromSignedRecords,
		setRecordExtractPreparedFromSignedRecords,
		recordExtractThirdPartyDataChecked,
		setRecordExtractThirdPartyDataChecked,
	} = useDocumentStore();

	const medicalRecordExtractDraftHydratedKeyRef = useRef<string | null>(null);

	const medicalRecordExtractDraftVisitId = documentPatientMatchesActiveVisit
		? (dashboard?.activeVisit?.id ?? null)
		: null;

	const medicalRecordExtractDraftPersistenceKey = useMemo(
		() =>
			documentPayloadDraftKey(
				"medical_record_extract",
				documentLocalPersistenceOrganizationId,
				documentPatient?.id ?? null,
				medicalRecordExtractDraftVisitId,
			),
		[
			documentLocalPersistenceOrganizationId,
			documentPatient?.id,
			medicalRecordExtractDraftVisitId,
		],
	);



	const currentMedicalRecordExtractDocumentDraftFields =
		useCallback((): MedicalRecordExtractDocumentDraftFields => {
			return {
				recordExtractPeriodStart,
				recordExtractPeriodEnd,
				recordExtractSourceVisitIds,
				recordExtractComplaintAndAnamnesis,
				recordExtractObjectiveStatus,
				recordExtractDiagnosis,
				recordExtractTreatmentProvided,
				recordExtractRecommendations,
				recordExtractDoctorFullName,
				recordExtractRecipientFullName,
				recordExtractRecipientAuthority,
				recordExtractIssuedAt,
				recordExtractPreparedFromSignedRecords,
				recordExtractThirdPartyDataChecked,
			};
		}, [
			recordExtractPeriodStart,
			recordExtractPeriodEnd,
			recordExtractSourceVisitIds,
			recordExtractComplaintAndAnamnesis,
			recordExtractObjectiveStatus,
			recordExtractDiagnosis,
			recordExtractTreatmentProvided,
			recordExtractRecommendations,
			recordExtractDoctorFullName,
			recordExtractRecipientFullName,
			recordExtractRecipientAuthority,
			recordExtractIssuedAt,
			recordExtractPreparedFromSignedRecords,
			recordExtractThirdPartyDataChecked,
		]);

	const applyMedicalRecordExtractDocumentDraftFields = useCallback(
		(fields: MedicalRecordExtractDocumentDraftFields): void => {
			setRecordExtractPeriodStart(fields.recordExtractPeriodStart);
			setRecordExtractPeriodEnd(fields.recordExtractPeriodEnd);
			setRecordExtractSourceVisitIds(fields.recordExtractSourceVisitIds);
			setRecordExtractComplaintAndAnamnesis(
				fields.recordExtractComplaintAndAnamnesis,
			);
			setRecordExtractObjectiveStatus(fields.recordExtractObjectiveStatus);
			setRecordExtractDiagnosis(fields.recordExtractDiagnosis);
			setRecordExtractTreatmentProvided(fields.recordExtractTreatmentProvided);
			setRecordExtractRecommendations(fields.recordExtractRecommendations);
			setRecordExtractDoctorFullName(fields.recordExtractDoctorFullName);
			setRecordExtractRecipientFullName(fields.recordExtractRecipientFullName);
			setRecordExtractRecipientAuthority(
				fields.recordExtractRecipientAuthority,
			);
			setRecordExtractIssuedAt(fields.recordExtractIssuedAt);
			setRecordExtractPreparedFromSignedRecords(
				fields.recordExtractPreparedFromSignedRecords,
			);
			setRecordExtractThirdPartyDataChecked(
				fields.recordExtractThirdPartyDataChecked,
			);
		},
		[
			setRecordExtractPeriodStart,
			setRecordExtractPeriodEnd,
			setRecordExtractSourceVisitIds,
			setRecordExtractComplaintAndAnamnesis,
			setRecordExtractObjectiveStatus,
			setRecordExtractDiagnosis,
			setRecordExtractTreatmentProvided,
			setRecordExtractRecommendations,
			setRecordExtractDoctorFullName,
			setRecordExtractRecipientFullName,
			setRecordExtractRecipientAuthority,
			setRecordExtractIssuedAt,
			setRecordExtractPreparedFromSignedRecords,
			setRecordExtractThirdPartyDataChecked,
		],
	);



	useEffect(() => {
		if (
			selectedDocumentKind !== "medical_record_extract" ||
			!medicalRecordExtractDraftPersistenceKey
		) {
			medicalRecordExtractDraftHydratedKeyRef.current = null;
			return;
		}
		const storedDraft = loadMedicalRecordExtractDocumentDraft(
			documentLocalPersistenceOrganizationId,
			medicalRecordExtractDraftPersistenceKey,
		);
		applyMedicalRecordExtractDocumentDraftFields(
			storedDraft ?? emptyMedicalRecordExtractDocumentDraftFields(),
		);
		medicalRecordExtractDraftHydratedKeyRef.current =
			medicalRecordExtractDraftPersistenceKey;
	}, [
		documentLocalPersistenceOrganizationId,
		medicalRecordExtractDraftPersistenceKey,
		selectedDocumentKind,
		applyMedicalRecordExtractDocumentDraftFields,
	]);

	useEffect(() => {
		if (
			selectedDocumentKind !== "medical_record_extract" ||
			!documentPatient?.id ||
			!medicalRecordExtractDraftPersistenceKey
		)
			return;
		if (
			medicalRecordExtractDraftHydratedKeyRef.current !==
			medicalRecordExtractDraftPersistenceKey
		)
			return;
		saveMedicalRecordExtractDocumentDraft(
			documentLocalPersistenceOrganizationId,
			medicalRecordExtractDraftPersistenceKey,
			documentPatient.id,
			medicalRecordExtractDraftVisitId,
			currentMedicalRecordExtractDocumentDraftFields(),
		);
	}, [
		documentPatient?.id,
		documentLocalPersistenceOrganizationId,
		medicalRecordExtractDraftPersistenceKey,
		medicalRecordExtractDraftVisitId,
		selectedDocumentKind,
		currentMedicalRecordExtractDocumentDraftFields,
	]);

	function recordExtractComplaintAndAnamnesisValue(): string {
		return (
			recordExtractComplaintAndAnamnesis.trim() ||
			compactDocumentText(
				dashboard?.activeVisit?.complaint,
				dashboard?.activeVisit?.anamnesis,
			)
		);
	}

	function recordExtractObjectiveStatusValue(): string {
		return (
			recordExtractObjectiveStatus.trim() ||
			dashboard?.activeVisit?.objectiveStatus?.trim() ||
			""
		);
	}

	function recordExtractDiagnosisValue(): string {
		return (
			recordExtractDiagnosis.trim() ||
			dashboard?.activeVisit?.diagnosis?.trim() ||
			""
		);
	}

	function recordExtractTreatmentProvidedValue(): string {
		return (
			recordExtractTreatmentProvided.trim() ||
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
				recordExtractDoctorFullName.trim() || activeDoctor?.fullName || "",
			position: "врач-стоматолог",
			specialty: activeDoctor?.specialties?.[0] ?? "стоматология",
		};
	}

	function dentalMedicalCardVisitDateValue(): string {
		return (
			recordExtractPeriodEnd.trim() ||
			toDateInputValue(activeAppointment?.startsAt) ||
			new Date().toISOString().slice(0, 10)
		);
	}

	function validateMedicalCardPayload(): string | null {
		if (!documentPatient?.fullName?.trim()) {
			const error = "Выберите пациента";
			setError?.(error);
			return error;
		}
		const doctorFullName =
			recordExtractDoctorFullName.trim() || activeDoctor?.fullName?.trim();
		if (!doctorFullName) {
			const error = "Не определён лечащий врач";
			setError?.(error);
			return error;
		}
		const clinicName =
			clinicProfileDraft?.legalName?.trim() ||
			clinicProfileDraft?.clinicName?.trim();
		if (!clinicName) {
			const error = "Не заполнено название клиники в настройках";
			setError?.(error);
			return error;
		}
		return null;
	}

	function dentalMedicalCard043uPayloadValue(): DentalMedicalCard043uPayload {
		const validationError = validateMedicalCardPayload();
		if (validationError) {
			throw new Error(validationError);
		}
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
		const sexRaw = ((documentPatient as any)?.sex ?? (documentPatient as any)?.administrativeProfile?.gender ?? (patientProfile as { sex?: string } | null | undefined)?.sex ?? "")
			.toString()
			.toLowerCase();
		const sex =
			sexRaw === "female" ||
			sexRaw === "f" ||
			sexRaw === "жен" ||
			sexRaw === "женский"
				? "женский"
				: sexRaw === "male" ||
						sexRaw === "m" ||
						sexRaw === "муж" ||
						sexRaw === "мужской"
					? "мужской"
					: null;
		const birthDate = toDateInputValue(documentPatient?.birthDate) || null;
		const orgFullName =
			clinicProfileDraft.legalName?.trim() ||
			clinicProfileDraft.clinicName?.trim() ||
			"Стоматологическая клиника";
		const identityDocument = patientProfile?.identityDocument?.trim() || null;

		return {
			formNumber: "043/у",
			organization: {
				fullName: orgFullName,
				shortName: clinicProfileDraft.clinicName?.trim() || null,
				address: clinicProfileDraft.address?.trim() || null,
				phone: clinicProfileDraft.phone?.trim() || null,
				ogrn: clinicProfileDraft.ogrn?.trim() || null,
				inn: clinicProfileDraft.inn?.trim() || null,
				licenseNumber: clinicProfileDraft.medicalLicenseNumber?.trim() || null,
				licenseIssueDate:
					clinicProfileDraft.medicalLicenseIssuedAt?.trim() || null,
				licenseAuthority:
					clinicProfileDraft.medicalLicenseIssuer?.trim() || null,
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
					(documentPatient as { medicalCardNumber?: string; cardNumber?: string } | null | undefined)?.medicalCardNumber?.trim() ||
					(documentPatient as { medicalCardNumber?: string; cardNumber?: string } | null | undefined)?.cardNumber?.trim() ||
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

	return {
		intakeChiefComplaint,
		setIntakeChiefComplaint,
		intakeAllergyStatus,
		setIntakeAllergyStatus,
		intakeCurrentMedications,
		setIntakeCurrentMedications,
		intakeChronicConditions,
		setIntakeChronicConditions,
		intakePregnancyStatus,
		setIntakePregnancyStatus,
		intakeAnticoagulants,
		setIntakeAnticoagulants,
		intakeInfectiousRiskNotes,
		setIntakeInfectiousRiskNotes,
		intakeCardioEndocrineNotes,
		setIntakeCardioEndocrineNotes,
		intakeEmergencyContact,
		setIntakeEmergencyContact,
		intakeAdditionalNotes,
		setIntakeAdditionalNotes,
		intakeAccuracyConfirmed,
		setIntakeAccuracyConfirmed,

		recordExtractPeriodStart,
		setRecordExtractPeriodStart,
		recordExtractPeriodEnd,
		setRecordExtractPeriodEnd,
		recordExtractSourceVisitIds,
		setRecordExtractSourceVisitIds,
		recordExtractComplaintAndAnamnesis,
		setRecordExtractComplaintAndAnamnesis,
		recordExtractObjectiveStatus,
		setRecordExtractObjectiveStatus,
		recordExtractDiagnosis,
		setRecordExtractDiagnosis,
		recordExtractTreatmentProvided,
		setRecordExtractTreatmentProvided,
		recordExtractRecommendations,
		setRecordExtractRecommendations,
		recordExtractDoctorFullName,
		setRecordExtractDoctorFullName,
		recordExtractRecipientFullName,
		setRecordExtractRecipientFullName,
		recordExtractRecipientAuthority,
		setRecordExtractRecipientAuthority,
		recordExtractIssuedAt,
		setRecordExtractIssuedAt,
		recordExtractPreparedFromSignedRecords,
		setRecordExtractPreparedFromSignedRecords,
		recordExtractThirdPartyDataChecked,
		setRecordExtractThirdPartyDataChecked,

		currentMedicalRecordExtractDocumentDraftFields,
		applyMedicalRecordExtractDocumentDraftFields,

		recordExtractComplaintAndAnamnesisValue,
		recordExtractObjectiveStatusValue,
		recordExtractDiagnosisValue,
		recordExtractTreatmentProvidedValue,

		dentalMedicalCardDoctorValue,
		dentalMedicalCardVisitDateValue,
		validateMedicalCardPayload,
		dentalMedicalCard043uPayloadValue,
	};
}
