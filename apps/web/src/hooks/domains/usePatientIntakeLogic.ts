import type {
	Appointment,
	ClinicalToothRow,
	Dashboard,
	DentalMedicalCard043uPayload,
	OutpatientMedicalCard025uPayload,
	Patient,
} from "@dental/shared";
import { useEffect, useMemo, useRef } from "react";
import type {
	ClinicProfileDraft,
	MedicalRecordExtractDocumentDraftFields,
	Outpatient025uDocumentDraftFields,
	VisitNoteForm,
} from "../../AppHelpers";
import {
	compactDocumentText,
	confirmedDocumentLiteral,
	documentPayloadDraftKey,
	documentTextLines,
	emptyMedicalRecordExtractDocumentDraftFields,
	emptyOutpatient025uDocumentDraftFields,
	loadMedicalRecordExtractDocumentDraft,
	loadOutpatient025uDocumentDraft,
	saveMedicalRecordExtractDocumentDraft,
	saveOutpatient025uDocumentDraft,
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

		// Outpatient 025/u fields
		outpatient025uMedicalCardNumber,
		setOutpatient025uMedicalCardNumber,
		outpatient025uOpenedAt,
		setOutpatient025uOpenedAt,
		outpatient025uPatientSexCode,
		setOutpatient025uPatientSexCode,
		outpatient025uCitizenship,
		setOutpatient025uCitizenship,
		outpatient025uRegistrationUrbanRuralCode,
		setOutpatient025uRegistrationUrbanRuralCode,
		outpatient025uStayUrbanRuralCode,
		setOutpatient025uStayUrbanRuralCode,
		outpatient025uOmsIssuedAt,
		setOutpatient025uOmsIssuedAt,
		outpatient025uInsurerName,
		setOutpatient025uInsurerName,
		outpatient025uSocialSupportCode,
		setOutpatient025uSocialSupportCode,
		outpatient025uHealthStatusDisclosureContact,
		setOutpatient025uHealthStatusDisclosureContact,
		outpatient025uEmploymentCode,
		setOutpatient025uEmploymentCode,
		outpatient025uDisabilityGroup,
		setOutpatient025uDisabilityGroup,
		outpatient025uWorkOrStudyPlace,
		setOutpatient025uWorkOrStudyPlace,
		outpatient025uPalliativeCareNeedCode,
		setOutpatient025uPalliativeCareNeedCode,
		outpatient025uBloodGroup,
		setOutpatient025uBloodGroup,
		outpatient025uRhFactor,
		setOutpatient025uRhFactor,
		outpatient025uKellK1,
		setOutpatient025uKellK1,
		outpatient025uOtherBloodData,
		setOutpatient025uOtherBloodData,
		outpatient025uAllergyHistory,
		setOutpatient025uAllergyHistory,
		outpatient025uFinalEpicrisis,
		setOutpatient025uFinalEpicrisis,
		outpatient025uOfficialForm274nChecked,
		setOutpatient025uOfficialForm274nChecked,
		outpatient025uThirdPartyDataChecked,
		setOutpatient025uThirdPartyDataChecked,
	} = useDocumentStore();

	const outpatient025uDraftHydratedKeyRef = useRef<string | null>(null);
	const medicalRecordExtractDraftHydratedKeyRef = useRef<string | null>(null);

	const outpatient025uDraftVisitId = documentPatientMatchesActiveVisit
		? (dashboard?.activeVisit?.id ?? null)
		: null;
	const medicalRecordExtractDraftVisitId = documentPatientMatchesActiveVisit
		? (dashboard?.activeVisit?.id ?? null)
		: null;

	const outpatient025uDraftPersistenceKey = useMemo(
		() =>
			documentPayloadDraftKey(
				"outpatient_medical_card_025u",
				documentLocalPersistenceOrganizationId,
				documentPatient?.id ?? null,
				outpatient025uDraftVisitId,
			),
		[
			documentLocalPersistenceOrganizationId,
			documentPatient?.id,
			outpatient025uDraftVisitId,
		],
	);

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

	function currentOutpatient025uDocumentDraftFields(): Outpatient025uDocumentDraftFields {
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
			recordExtractPreparedFromSignedRecords,
			outpatient025uMedicalCardNumber,
			outpatient025uOpenedAt,
			outpatient025uPatientSexCode,
			outpatient025uCitizenship,
			outpatient025uRegistrationUrbanRuralCode,
			outpatient025uStayUrbanRuralCode,
			outpatient025uOmsIssuedAt,
			outpatient025uInsurerName,
			outpatient025uSocialSupportCode,
			outpatient025uHealthStatusDisclosureContact,
			outpatient025uEmploymentCode,
			outpatient025uDisabilityGroup,
			outpatient025uWorkOrStudyPlace,
			outpatient025uPalliativeCareNeedCode,
			outpatient025uBloodGroup,
			outpatient025uRhFactor,
			outpatient025uKellK1,
			outpatient025uOtherBloodData,
			outpatient025uAllergyHistory,
			outpatient025uFinalEpicrisis,
			outpatient025uOfficialForm274nChecked,
			outpatient025uThirdPartyDataChecked,
		};
	}

	function applyOutpatient025uDocumentDraftFields(
		fields: Outpatient025uDocumentDraftFields,
	): void {
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
		setRecordExtractPreparedFromSignedRecords(
			fields.recordExtractPreparedFromSignedRecords,
		);
		setOutpatient025uMedicalCardNumber(fields.outpatient025uMedicalCardNumber);
		setOutpatient025uOpenedAt(fields.outpatient025uOpenedAt);
		setOutpatient025uPatientSexCode(fields.outpatient025uPatientSexCode);
		setOutpatient025uCitizenship(fields.outpatient025uCitizenship);
		setOutpatient025uRegistrationUrbanRuralCode(
			fields.outpatient025uRegistrationUrbanRuralCode,
		);
		setOutpatient025uStayUrbanRuralCode(
			fields.outpatient025uStayUrbanRuralCode,
		);
		setOutpatient025uOmsIssuedAt(fields.outpatient025uOmsIssuedAt);
		setOutpatient025uInsurerName(fields.outpatient025uInsurerName);
		setOutpatient025uSocialSupportCode(fields.outpatient025uSocialSupportCode);
		setOutpatient025uHealthStatusDisclosureContact(
			fields.outpatient025uHealthStatusDisclosureContact,
		);
		setOutpatient025uEmploymentCode(fields.outpatient025uEmploymentCode);
		setOutpatient025uDisabilityGroup(fields.outpatient025uDisabilityGroup);
		setOutpatient025uWorkOrStudyPlace(fields.outpatient025uWorkOrStudyPlace);
		setOutpatient025uPalliativeCareNeedCode(
			fields.outpatient025uPalliativeCareNeedCode,
		);
		setOutpatient025uBloodGroup(fields.outpatient025uBloodGroup);
		setOutpatient025uRhFactor(fields.outpatient025uRhFactor);
		setOutpatient025uKellK1(fields.outpatient025uKellK1);
		setOutpatient025uOtherBloodData(fields.outpatient025uOtherBloodData);
		setOutpatient025uAllergyHistory(fields.outpatient025uAllergyHistory);
		setOutpatient025uFinalEpicrisis(fields.outpatient025uFinalEpicrisis);
		setOutpatient025uOfficialForm274nChecked(
			fields.outpatient025uOfficialForm274nChecked,
		);
		setOutpatient025uThirdPartyDataChecked(
			fields.outpatient025uThirdPartyDataChecked,
		);
	}

	function currentMedicalRecordExtractDocumentDraftFields(): MedicalRecordExtractDocumentDraftFields {
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
	}

	function applyMedicalRecordExtractDocumentDraftFields(
		fields: MedicalRecordExtractDocumentDraftFields,
	): void {
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
		setRecordExtractRecipientAuthority(fields.recordExtractRecipientAuthority);
		setRecordExtractIssuedAt(fields.recordExtractIssuedAt);
		setRecordExtractPreparedFromSignedRecords(
			fields.recordExtractPreparedFromSignedRecords,
		);
		setRecordExtractThirdPartyDataChecked(
			fields.recordExtractThirdPartyDataChecked,
		);
	}

	useEffect(() => {
		if (
			selectedDocumentKind !== "outpatient_medical_card_025u" ||
			!outpatient025uDraftPersistenceKey
		) {
			outpatient025uDraftHydratedKeyRef.current = null;
			return;
		}
		const storedDraft = loadOutpatient025uDocumentDraft(
			documentLocalPersistenceOrganizationId,
			outpatient025uDraftPersistenceKey,
		);
		applyOutpatient025uDocumentDraftFields(
			storedDraft ?? emptyOutpatient025uDocumentDraftFields(),
		);
		outpatient025uDraftHydratedKeyRef.current =
			outpatient025uDraftPersistenceKey;
	}, [
		documentLocalPersistenceOrganizationId,
		outpatient025uDraftPersistenceKey,
		selectedDocumentKind,
		applyOutpatient025uDocumentDraftFields,
	]);

	useEffect(() => {
		if (
			selectedDocumentKind !== "outpatient_medical_card_025u" ||
			!documentPatient?.id ||
			!outpatient025uDraftPersistenceKey
		)
			return;
		if (
			outpatient025uDraftHydratedKeyRef.current !==
			outpatient025uDraftPersistenceKey
		)
			return;
		saveOutpatient025uDocumentDraft(
			documentLocalPersistenceOrganizationId,
			outpatient025uDraftPersistenceKey,
			documentPatient.id,
			outpatient025uDraftVisitId,
			currentOutpatient025uDocumentDraftFields(),
		);
	}, [
		documentPatient?.id,
		documentLocalPersistenceOrganizationId,
		outpatient025uDraftPersistenceKey,
		outpatient025uDraftVisitId,
		selectedDocumentKind,
		currentOutpatient025uDocumentDraftFields,
	]);

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

	function outpatient025uMedicalCardNumberValue(): string {
		const explicitNumber = outpatient025uMedicalCardNumber.trim();
		if (explicitNumber) return explicitNumber;
		const patientToken =
			documentPatient?.id.slice(0, 8).toUpperCase() ?? "PATIENT";
		return `DENTE-${new Date().getFullYear()}-${patientToken}`;
	}

	function outpatient025uSourceVisitIdsValue(): string[] {
		const sourceVisitIds = documentTextLines(recordExtractSourceVisitIds);
		if (sourceVisitIds.length) return sourceVisitIds;
		return dashboard?.activeVisit?.id ? [dashboard?.activeVisit?.id] : [];
	}

	function outpatient025uLicenseValue(): string | null {
		const value = compactDocumentText(
			clinicProfileDraft.medicalLicenseNumber,
			clinicProfileDraft.medicalLicenseIssuedAt,
			clinicProfileDraft.medicalLicenseIssuer,
		);
		return value || null;
	}

	function outpatient025uDoctorValue(): {
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

	function outpatient025uVisitDateValue(): string {
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
		const doctor = outpatient025uDoctorValue();
		const visitDate = outpatient025uVisitDateValue();
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
		const sexRaw = (outpatient025uPatientSexCode ?? "")
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
				medicalCardNumber: outpatient025uMedicalCardNumberValue() || null,
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

	function outpatient025uPayloadValue(): OutpatientMedicalCard025uPayload {
		const validationError = validateMedicalCardPayload();
		if (validationError) {
			throw new Error(validationError);
		}
		const patientProfile = documentPatient?.administrativeProfile;
		const doctor = outpatient025uDoctorValue();
		const sourceVisitIds = outpatient025uSourceVisitIdsValue();
		const visitDate = outpatient025uVisitDateValue();
		const complaintsAndAnamnesis = recordExtractComplaintAndAnamnesisValue();
		const treatmentProvided = recordExtractTreatmentProvidedValue();
		return {
			formNumber: "025/у",
			sourceOrderReference: "Приказ Минздрава России от 13.05.2025 N 274н",
			medicalOrganizationName:
				clinicProfileDraft.legalName.trim() ||
				clinicProfileDraft.clinicName.trim(),
			medicalOrganizationAddress: clinicProfileDraft.address.trim() || null,
			medicalOrganizationOgrnOrOgrnip: clinicProfileDraft.ogrn.trim() || null,
			medicalOrganizationLicense: outpatient025uLicenseValue(),
			medicalCardNumber: outpatient025uMedicalCardNumberValue(),
			openedAt: outpatient025uOpenedAt.trim(),
			periodStart: recordExtractPeriodStart.trim(),
			periodEnd: recordExtractPeriodEnd.trim(),
			sourceVisitIds,
			patientFullName: documentPatient?.fullName ?? "",
			patientBirthDate: toDateInputValue(documentPatient?.birthDate) || null,
			patientSexCode: outpatient025uPatientSexCode,
			citizenship: outpatient025uCitizenship.trim() || null,
			identityDocument: patientProfile?.identityDocument?.trim() || null,
			identityDocumentSeries: null,
			identityDocumentNumber: null,
			patientPhone: documentPatient?.phone?.trim() || null,
			patientEmail: documentPatient?.email?.trim() || null,
			registrationAddress: patientProfile?.registrationAddress?.trim() || null,
			registrationUrbanRuralCode: outpatient025uRegistrationUrbanRuralCode,
			stayAddress: patientProfile?.residentialAddress?.trim() || null,
			stayUrbanRuralCode: outpatient025uStayUrbanRuralCode,
			omsPolicy: patientProfile?.insurancePolicyNumber?.trim() || null,
			omsIssuedAt: outpatient025uOmsIssuedAt.trim() || null,
			insurerName: outpatient025uInsurerName.trim() || null,
			snils: patientProfile?.snils?.trim() || null,
			socialSupportCode: outpatient025uSocialSupportCode.trim() || null,
			healthStatusDisclosureContact:
				outpatient025uHealthStatusDisclosureContact.trim() || null,
			employmentCode: outpatient025uEmploymentCode.trim() || null,
			disabilityGroup: outpatient025uDisabilityGroup.trim() || null,
			workOrStudyPlace: outpatient025uWorkOrStudyPlace.trim() || null,
			palliativeCareNeedCode:
				outpatient025uPalliativeCareNeedCode.trim() || null,
			bloodGroup: outpatient025uBloodGroup.trim() || null,
			rhFactor: outpatient025uRhFactor.trim() || null,
			kellK1: outpatient025uKellK1.trim() || null,
			otherBloodData: outpatient025uOtherBloodData.trim() || null,
			allergyHistory: outpatient025uAllergyHistory.trim() || null,
			chronicDispensaryRegister: [],
			finalDiagnoses: [
				{
					date: visitDate,
					diagnosis: recordExtractDiagnosisValue(),
					icd10Code: null,
					firstOrRepeat: "unknown",
					doctorFullName: doctor.fullName,
					doctorPosition: doctor.position,
					doctorSpecialty: doctor.specialty,
				},
			],
			specialistVisitRecords: [
				{
					sourceVisitId: sourceVisitIds[0] ?? "",
					visitDate,
					location: clinicProfileDraft.clinicName.trim() || null,
					doctorFullName: doctor.fullName,
					doctorPosition: doctor.position,
					doctorSpecialty: doctor.specialty,
					firstOrRepeat: "unknown",
					complaints: complaintsAndAnamnesis,
					anamnesis: complaintsAndAnamnesis,
					objectiveData: recordExtractObjectiveStatusValue(),
					primaryDiagnosis: recordExtractDiagnosisValue(),
					primaryDiagnosisIcd10: null,
					complications: null,
					comorbidities: null,
					externalCause: null,
					healthGroup: null,
					dispensaryObservation: null,
					orders: recordExtractRecommendations.trim() || treatmentProvided,
					treatmentProvided,
					medicinesAndPhysiotherapy: null,
					sickLeaveOrCertificate: null,
					preferentialPrescriptions: null,
					informedConsentOrRefusal:
						"согласия и отказы проверены по подписанной медицинской записи клиники",
					clinicalToothRows: clinicalToothRowsValue(),
				},
			],
			dynamicObservationRecords: [],
			stageEpicrisisRecords: [],
			departmentHeadConsultations: [],
			medicalCommissionRecords: [],
			dispensaryObservationEntries: [],
			hospitalizationRows: [],
			ambulatorySurgeryRows: [],
			xrayDoseRows: [],
			functionalResults: [],
			laboratoryResults: [],
			finalEpicrisis: outpatient025uFinalEpicrisis.trim() || null,
			preparedFromSignedMedicalRecords: confirmedDocumentLiteral(
				recordExtractPreparedFromSignedRecords,
				"карта 025/у собрана из подписанных медицинских записей",
			),
			officialForm274nChecked: confirmedDocumentLiteral(
				outpatient025uOfficialForm274nChecked,
				"структура карты 025/у сверена с приказом Минздрава N 274н",
			),
			thirdPartyDataChecked: confirmedDocumentLiteral(
				outpatient025uThirdPartyDataChecked,
				"данные третьих лиц для карты 025/у проверены",
			),
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

		outpatient025uMedicalCardNumber,
		setOutpatient025uMedicalCardNumber,
		outpatient025uOpenedAt,
		setOutpatient025uOpenedAt,
		outpatient025uPatientSexCode,
		setOutpatient025uPatientSexCode,
		outpatient025uCitizenship,
		setOutpatient025uCitizenship,
		outpatient025uRegistrationUrbanRuralCode,
		setOutpatient025uRegistrationUrbanRuralCode,
		outpatient025uStayUrbanRuralCode,
		setOutpatient025uStayUrbanRuralCode,
		outpatient025uOmsIssuedAt,
		setOutpatient025uOmsIssuedAt,
		outpatient025uInsurerName,
		setOutpatient025uInsurerName,
		outpatient025uSocialSupportCode,
		setOutpatient025uSocialSupportCode,
		outpatient025uHealthStatusDisclosureContact,
		setOutpatient025uHealthStatusDisclosureContact,
		outpatient025uEmploymentCode,
		setOutpatient025uEmploymentCode,
		outpatient025uDisabilityGroup,
		setOutpatient025uDisabilityGroup,
		outpatient025uWorkOrStudyPlace,
		setOutpatient025uWorkOrStudyPlace,
		outpatient025uPalliativeCareNeedCode,
		setOutpatient025uPalliativeCareNeedCode,
		outpatient025uBloodGroup,
		setOutpatient025uBloodGroup,
		outpatient025uRhFactor,
		setOutpatient025uRhFactor,
		outpatient025uKellK1,
		setOutpatient025uKellK1,
		outpatient025uOtherBloodData,
		setOutpatient025uOtherBloodData,
		outpatient025uAllergyHistory,
		setOutpatient025uAllergyHistory,
		outpatient025uFinalEpicrisis,
		setOutpatient025uFinalEpicrisis,
		outpatient025uOfficialForm274nChecked,
		setOutpatient025uOfficialForm274nChecked,
		outpatient025uThirdPartyDataChecked,
		setOutpatient025uThirdPartyDataChecked,

		currentOutpatient025uDocumentDraftFields,
		applyOutpatient025uDocumentDraftFields,
		currentMedicalRecordExtractDocumentDraftFields,
		applyMedicalRecordExtractDocumentDraftFields,

		recordExtractComplaintAndAnamnesisValue,
		recordExtractObjectiveStatusValue,
		recordExtractDiagnosisValue,
		recordExtractTreatmentProvidedValue,

		outpatient025uMedicalCardNumberValue,
		outpatient025uSourceVisitIdsValue,
		outpatient025uLicenseValue,
		outpatient025uDoctorValue,
		outpatient025uVisitDateValue,
		validateMedicalCardPayload,
		dentalMedicalCard043uPayloadValue,
		outpatient025uPayloadValue,
	};
}
