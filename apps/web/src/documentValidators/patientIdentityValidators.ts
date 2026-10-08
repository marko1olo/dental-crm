import { requiredDocumentField as defaultRequiredDocumentField } from "./regexRules";
import type { DocumentState, ValidationResult } from "./types";

export function validatePatientIntakeQuestionnaire(
	state: DocumentState,
): ValidationResult {
	const allowBlankForPrint = Boolean(state.allowBlankForPrint);
	if (allowBlankForPrint) {
		return null;
	}
	const {
		intakeChiefComplaint,
		intakeAllergyStatus,
		intakeCurrentMedications,
		intakeChronicConditions,
		intakeAnticoagulants,
		intakeInfectiousRiskNotes,
		intakeCardioEndocrineNotes,
		intakeAccuracyConfirmed,
		requiredDocumentField = defaultRequiredDocumentField,
		dashboard,
	} = state;
	const effectiveComplaint =
		(intakeChiefComplaint || "").trim() ||
		dashboard?.activeVisit?.complaint ||
		"Первичный осмотр и консультация (жалоб нет)";
	const effectiveAllergy =
		(intakeAllergyStatus || "").trim() || "Аллергии со слов пациента отрицает";
	const effectiveMedications =
		(intakeCurrentMedications || "").trim() || "Постоянные препараты не принимает";
	const effectiveChronic =
		(intakeChronicConditions || "").trim() || "Хронические заболевания отрицает";
	const effectiveAnticoagulants =
		(intakeAnticoagulants || "").trim() || "Антикоагулянты не принимает";
	const effectiveInfectious =
		(intakeInfectiousRiskNotes || "").trim() || "Инфекционные риски отрицает";
	const effectiveCardio =
		(intakeCardioEndocrineNotes || "").trim() || "Соматически здоров / патологий не заявлено";

	return (
		requiredDocumentField(
			effectiveComplaint,
			"анкета, жалоба или цель визита",
		) ??
		requiredDocumentField(effectiveAllergy, "анкета, аллергии") ??
		requiredDocumentField(
			effectiveMedications,
			"анкета, постоянные препараты",
		) ??
		requiredDocumentField(
			effectiveChronic,
			"анкета, хронические заболевания",
		) ??
		requiredDocumentField(effectiveAnticoagulants, "анкета, антикоагулянты") ??
		requiredDocumentField(
			effectiveInfectious,
			"анкета, инфекционные риски",
		) ??
		requiredDocumentField(
			effectiveCardio,
			"анкета, системные риски",
		)
	);
}

export function validateMinorLegalRepresentativeConsent(
	state: DocumentState,
): ValidationResult {
	const {
		documentTextLines,
		minorRepresentativeFullNameValue,
		minorRepresentativeRelationshipValue,
		minorRepresentativeIdentityDocumentValue,
		minorRepresentativeAuthorityDocument,
		minorConsentPatientFullNameValue,
		minorConsentPatientBirthDateValue,
		minorConsentInterventionScopeValue,
		minorConsentDiagnosisOrIndicationValue,
		minorConsentRisks,
		minorConsentAlternatives,
		minorConsentDoctorFullNameValue,
		minorConsentSignedAt,
		minorConsentIdentityVerified,
		minorConsentAuthorityVerified,
		minorConsentExplained,
		minorConsentStored,
		minorConsentAgeExplanation,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(
			minorRepresentativeFullNameValue(),
			"представитель, ФИО",
		) ??
		requiredDocumentField(
			minorRepresentativeRelationshipValue(),
			"представитель, родство или статус",
		) ??
		requiredDocumentField(
			minorRepresentativeIdentityDocumentValue(),
			"представитель, документ личности",
		) ??
		requiredDocumentField(
			minorRepresentativeAuthorityDocument,
			"представитель, основание полномочий",
		) ??
		requiredDocumentField(
			minorConsentPatientFullNameValue(),
			"несовершеннолетний, ФИО",
		) ??
		requiredDocumentField(
			minorConsentPatientBirthDateValue(),
			"несовершеннолетний, дата рождения",
		) ??
		requiredDocumentField(
			minorConsentInterventionScopeValue(),
			"согласие, вмешательство",
		) ??
		requiredDocumentField(
			minorConsentDiagnosisOrIndicationValue(),
			"согласие, диагноз или показание",
		) ??
		(documentTextLines(minorConsentRisks).length
			? null
			: "Добавьте разъясненные риски для представителя.") ??
		(documentTextLines(minorConsentAlternatives).length
			? null
			: "Добавьте альтернативы лечения для представителя.") ??
		requiredDocumentField(
			minorConsentDoctorFullNameValue(),
			"согласие, врач",
		) ??
		requiredDocumentField(minorConsentSignedAt, "согласие, дата и время") ??
		(minorConsentIdentityVerified
			? null
			: "Подтвердите проверку личности представителя.") ??
		(minorConsentAuthorityVerified
			? null
			: "Подтвердите полномочия представителя.") ??
		(minorConsentExplained
			? null
			: "Подтвердите разъяснение вмешательства, рисков и альтернатив.") ??
		(minorConsentStored ? null : "Подтвердите хранение согласия в медкарте.") ??
		(minorConsentAgeExplanation
			? null
			: "Подтвердите объяснение ребенку по возрасту и состоянию.")
	);
}

export function validatePersonalDataProcessingConsent(
	state: DocumentState,
): ValidationResult {
	const {
		documentTextLines,
		clinicProfileDraft,
		personalDataPurposes,
		personalDataCategories,
		personalDataActions,
		personalDataTransferRules,
		personalDataRetentionPeriod,
		personalDataRevocationChannel,
		personalDataConsentGivenAt,
		personalDataVoluntaryConsentConfirmed,
		personalDataMedicalProcessingAcknowledged,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	const operatorName =
		clinicProfileDraft?.legalName?.trim() ||
		clinicProfileDraft?.clinicName?.trim() ||
		"";
	const operatorInn = clinicProfileDraft?.inn?.replace(/[^\d]/g, "") || "";
	return (
		requiredDocumentField(operatorName, "ПДн, оператор клиники") ??
		(operatorInn.length === 10 || operatorInn.length === 12
			? null
			: "ИНН оператора ПДн должен содержать 10 или 12 цифр.") ??
		requiredDocumentField(
			clinicProfileDraft?.address,
			"ПДн, адрес оператора",
		) ??
		(documentTextLines(personalDataPurposes).length
			? null
			: "Добавьте цели обработки персональных данных.") ??
		(documentTextLines(personalDataCategories).length
			? null
			: "Добавьте категории персональных данных.") ??
		(documentTextLines(personalDataActions).length
			? null
			: "Добавьте действия с персональными данными.") ??
		requiredDocumentField(
			personalDataTransferRules,
			"ПДн, правила передачи третьим лицам",
		) ??
		requiredDocumentField(personalDataRetentionPeriod, "ПДн, срок хранения") ??
		requiredDocumentField(
			personalDataRevocationChannel,
			"ПДн, порядок отзыва",
		) ??
		requiredDocumentField(personalDataConsentGivenAt, "ПДн, дата согласия") ??
		(personalDataVoluntaryConsentConfirmed
			? null
			: "Подтвердите добровольное согласие пациента на обработку ПДн.") ??
		(personalDataMedicalProcessingAcknowledged
			? null
			: "Подтвердите, что пациент понимает обработку медицинских данных.")
	);
}

export function validateMedicalRecordCopyRequest(
	state: DocumentState,
): ValidationResult {
	const {
		documentTextLines,
		documentPatient,
		copyRequestDocumentTypes,
		copyRequestRecipientFullName,
		copyRequestRecipientIdentityDocument,
		copyRequestRecipientAuthority,
		copyRequestRequestedAt,
		copyRequestContactForDelivery,
		copyRequestIdentityVerified,
		copyRequestThirdPartyDataChecked,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		(documentTextLines(copyRequestDocumentTypes).length
			? null
			: "Добавьте состав запрошенных медицинских документов.") ??
		requiredDocumentField(
			copyRequestRecipientFullName.trim() || documentPatient?.fullName || "",
			"запрос копий, получатель",
		) ??
		requiredDocumentField(
			copyRequestRecipientIdentityDocument,
			"запрос копий, документ получателя",
		) ??
		requiredDocumentField(
			copyRequestRecipientAuthority,
			"запрос копий, основание полномочий",
		) ??
		requiredDocumentField(
			copyRequestRequestedAt,
			"запрос копий, дата запроса",
		) ??
		requiredDocumentField(
			copyRequestContactForDelivery,
			"запрос копий, контакт и канал выдачи",
		) ??
		(copyRequestIdentityVerified
			? null
			: "Подтвердите проверку личности получателя.") ??
		(copyRequestThirdPartyDataChecked
			? null
			: "Подтвердите, что лишние данные третьих лиц будут исключены.")
	);
}

export function validateMedicalDocumentReleaseReceipt(
	state: DocumentState,
): ValidationResult {
	const {
		documentTextLines,
		selectedReleaseSourceRequestDocumentId,
		releaseRecipientFullName,
		releaseRecipientIdentityDocument,
		releaseRecipientAuthority,
		releaseDocumentTypes,
		releaseDeliveredAt,
		releaseProtectionNote,
		releaseThirdPartyDataChecked,
		requiredDocumentField = defaultRequiredDocumentField,
	} = state;
	return (
		requiredDocumentField(
			selectedReleaseSourceRequestDocumentId,
			"выдача документов, выданный запрос на копии",
		) ??
		requiredDocumentField(
			releaseRecipientFullName,
			"выдача документов, получатель",
		) ??
		requiredDocumentField(
			releaseRecipientIdentityDocument,
			"выдача документов, документ получателя",
		) ??
		requiredDocumentField(
			releaseRecipientAuthority,
			"выдача документов, основание полномочий",
		) ??
		(documentTextLines(releaseDocumentTypes).length
			? null
			: "Добавьте состав выдаваемых медицинских документов.") ??
		requiredDocumentField(
			releaseDeliveredAt,
			"выдача документов, дата и время",
		) ??
		requiredDocumentField(
			releaseProtectionNote,
			"выдача документов, защита передачи",
		) ??
		(releaseThirdPartyDataChecked
			? null
			: "Подтвердите, что лишние данные третьих лиц исключены.")
	);
}
