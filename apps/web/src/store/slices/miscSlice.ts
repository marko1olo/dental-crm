export type MedicalDocumentReleaseChannel =
	| "paper"
	| "pdf"
	| "dicom_archive"
	| "secure_link"
	| "physical_media"
	| "other";

import { postVisitCarePresets } from "../../postVisitCareData";
import { loadUiPreferences } from "../../utils/preferencesUtils";

const initialUiPreferences = loadUiPreferences();

/*
 * Памятка после приёма берётся из ТОЙ ЖЕ темы, что стоит в селекте.
 *
 * Тема бралась из сохранённых настроек оператора
 * (initialUiPreferences.postVisitCareTopic), а девять полей текста были жёстко
 * прибиты к пресету filling_restoration. Если в настройках сохранена другая тема
 * — удаление, имплантация, гигиена — врач получал памятку, где тема одна, а
 * текст от другого вмешательства: процедура «Пломба / композитная реставрация»,
 * ограничения, питание и тревожные признаки от пломбы. В документ уходит и тема
 * (careTopic), и текст, а весь блок памятки свёрнут в <details>, поэтому
 * расхождение не видно, пока его не раскроют.
 *
 * Единственный писатель этих девяти полей — applyPostVisitCarePreset в
 * useAppLogic.tsx, и он берёт ровно postVisitCarePresets[тема]. Начальное
 * состояние теперь делает то же самое: один источник правды.
 *
 * Индексация безопасна: loadUiPreferences проверяет тему по списку допустимых
 * значений и при мусоре возвращает filling_restoration, а postVisitCarePresets
 * объявлен как Record<PostVisitCareTopic, …>, то есть покрывает все темы.
 */
const _initialPostVisitCarePreset =
	postVisitCarePresets[initialUiPreferences.postVisitCareTopic];

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function createSetter(set: any, key: string) {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	return (val: any) =>
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		set((state: any) => ({
			[key]: typeof val === "function" ? val(state[key]) : val,
		}));
}

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export const createMiscSlice = (set: any) => ({
	minorRepresentativeFullName: "",
	setMinorRepresentativeFullName: createSetter(
		set,
		"minorRepresentativeFullName",
	),
	minorRepresentativeRelationship: "",
	setMinorRepresentativeRelationship: createSetter(
		set,
		"minorRepresentativeRelationship",
	),
	minorRepresentativeIdentityDocument: "",
	setMinorRepresentativeIdentityDocument: createSetter(
		set,
		"minorRepresentativeIdentityDocument",
	),
	minorRepresentativeAuthorityDocument: "",
	setMinorRepresentativeAuthorityDocument: createSetter(
		set,
		"minorRepresentativeAuthorityDocument",
	),
	minorRepresentativePhone: "",
	setMinorRepresentativePhone: createSetter(set, "minorRepresentativePhone"),
	minorConsentPatientFullName: "",
	setMinorConsentPatientFullName: createSetter(
		set,
		"minorConsentPatientFullName",
	),
	minorConsentPatientBirthDate: "",
	setMinorConsentPatientBirthDate: createSetter(
		set,
		"minorConsentPatientBirthDate",
	),
	minorConsentInterventionScope: "",
	setMinorConsentInterventionScope: createSetter(
		set,
		"minorConsentInterventionScope",
	),
	minorConsentDiagnosisOrIndication: "",
	setMinorConsentDiagnosisOrIndication: createSetter(
		set,
		"minorConsentDiagnosisOrIndication",
	),
	minorConsentRisks:
		"боль, отек, кровоточивость или временный дискомфорт\nаллергическая реакция на препараты или материалы\nнеобходимость повторного визита или изменения плана лечения",
	setMinorConsentRisks: createSetter(set, "minorConsentRisks"),
	minorConsentAlternatives:
		"отложить вмешательство и наблюдать состояние\nвыбрать альтернативный метод лечения при наличии показаний\nполучить второе мнение\nотказаться от вмешательства с фиксацией рисков",
	setMinorConsentAlternatives: createSetter(set, "minorConsentAlternatives"),
	minorConsentDoctorFullName: "",
	setMinorConsentDoctorFullName: createSetter(
		set,
		"minorConsentDoctorFullName",
	),
	minorConsentSignedAt: "",
	setMinorConsentSignedAt: createSetter(set, "minorConsentSignedAt"),
	minorConsentIdentityVerified: false,
	setMinorConsentIdentityVerified: createSetter(
		set,
		"minorConsentIdentityVerified",
	),
	minorConsentAuthorityVerified: false,
	setMinorConsentAuthorityVerified: createSetter(
		set,
		"minorConsentAuthorityVerified",
	),
	minorConsentExplained: false,
	setMinorConsentExplained: createSetter(set, "minorConsentExplained"),
	minorConsentStored: false,
	setMinorConsentStored: createSetter(set, "minorConsentStored"),
	minorConsentAgeExplanation: false,
	setMinorConsentAgeExplanation: createSetter(
		set,
		"minorConsentAgeExplanation",
	),
	recordExtractPeriodStart: "",
	setRecordExtractPeriodStart: createSetter(set, "recordExtractPeriodStart"),
	recordExtractPeriodEnd: "",
	setRecordExtractPeriodEnd: createSetter(set, "recordExtractPeriodEnd"),
	recordExtractSourceVisitIds: "",
	setRecordExtractSourceVisitIds: createSetter(
		set,
		"recordExtractSourceVisitIds",
	),
	recordExtractComplaintAndAnamnesis: "",
	setRecordExtractComplaintAndAnamnesis: createSetter(
		set,
		"recordExtractComplaintAndAnamnesis",
	),
	recordExtractObjectiveStatus: "",
	setRecordExtractObjectiveStatus: createSetter(
		set,
		"recordExtractObjectiveStatus",
	),
	recordExtractDiagnosis: "",
	setRecordExtractDiagnosis: createSetter(set, "recordExtractDiagnosis"),
	recordExtractTreatmentProvided: "",
	setRecordExtractTreatmentProvided: createSetter(
		set,
		"recordExtractTreatmentProvided",
	),
	recordExtractRecommendations: "",
	setRecordExtractRecommendations: createSetter(
		set,
		"recordExtractRecommendations",
	),
	recordExtractDoctorFullName: "",
	setRecordExtractDoctorFullName: createSetter(
		set,
		"recordExtractDoctorFullName",
	),
	recordExtractRecipientFullName: "",
	setRecordExtractRecipientFullName: createSetter(
		set,
		"recordExtractRecipientFullName",
	),
	recordExtractRecipientAuthority: "пациент лично",
	setRecordExtractRecipientAuthority: createSetter(
		set,
		"recordExtractRecipientAuthority",
	),
	recordExtractIssuedAt: "",
	setRecordExtractIssuedAt: createSetter(set, "recordExtractIssuedAt"),
	recordExtractPreparedFromSignedRecords: false,
	setRecordExtractPreparedFromSignedRecords: createSetter(
		set,
		"recordExtractPreparedFromSignedRecords",
	),
	recordExtractThirdPartyDataChecked: false,
	setRecordExtractThirdPartyDataChecked: createSetter(
		set,
		"recordExtractThirdPartyDataChecked",
	),
	copyRequestDocumentTypes:
		"Выписка из медицинской карты\nКопия снимков или КТ-архив",
	setCopyRequestDocumentTypes: createSetter(set, "copyRequestDocumentTypes"),
	copyRequestPeriodStart: "",
	setCopyRequestPeriodStart: createSetter(set, "copyRequestPeriodStart"),
	copyRequestPeriodEnd: "",
	setCopyRequestPeriodEnd: createSetter(set, "copyRequestPeriodEnd"),
	copyRequestFormat: "pdf",
	setCopyRequestFormat: createSetter(set, "copyRequestFormat"),
	copyRequestRecipientFullName: "",
	setCopyRequestRecipientFullName: createSetter(
		set,
		"copyRequestRecipientFullName",
	),
	copyRequestRecipientIdentityDocument: "",
	setCopyRequestRecipientIdentityDocument: createSetter(
		set,
		"copyRequestRecipientIdentityDocument",
	),
	copyRequestRecipientAuthority: "пациент лично",
	setCopyRequestRecipientAuthority: createSetter(
		set,
		"copyRequestRecipientAuthority",
	),
	copyRequestRepresentativeAuthorityDocument: "",
	setCopyRequestRepresentativeAuthorityDocument: createSetter(
		set,
		"copyRequestRepresentativeAuthorityDocument",
	),
	copyRequestRequestedAt: "",
	setCopyRequestRequestedAt: createSetter(set, "copyRequestRequestedAt"),
	copyRequestContactForDelivery: "",
	setCopyRequestContactForDelivery: createSetter(
		set,
		"copyRequestContactForDelivery",
	),
	copyRequestSpecialInstructions: "",
	setCopyRequestSpecialInstructions: createSetter(
		set,
		"copyRequestSpecialInstructions",
	),
	copyRequestIncludeDicomSourceData: true,
	setCopyRequestIncludeDicomSourceData: createSetter(
		set,
		"copyRequestIncludeDicomSourceData",
	),
	copyRequestIdentityVerified: false,
	setCopyRequestIdentityVerified: createSetter(
		set,
		"copyRequestIdentityVerified",
	),
	copyRequestThirdPartyDataChecked: false,
	setCopyRequestThirdPartyDataChecked: createSetter(
		set,
		"copyRequestThirdPartyDataChecked",
	),
	attendanceStartedAt: "",
	setAttendanceStartedAt: createSetter(set, "attendanceStartedAt"),
	attendanceEndedAt: "",
	setAttendanceEndedAt: createSetter(set, "attendanceEndedAt"),
	attendancePurpose: "для предъявления по месту требования",
	setAttendancePurpose: createSetter(set, "attendancePurpose"),
	attendanceRecipientOrganization: "",
	setAttendanceRecipientOrganization: createSetter(
		set,
		"attendanceRecipientOrganization",
	),
	attendanceIssuedAt: "",
	setAttendanceIssuedAt: createSetter(set, "attendanceIssuedAt"),
	attendanceSignedByFullName: "",
	setAttendanceSignedByFullName: createSetter(
		set,
		"attendanceSignedByFullName",
	),
	attendanceSignedByRole: "врач/администратор",
	setAttendanceSignedByRole: createSetter(set, "attendanceSignedByRole"),
	attendanceDiagnosisDisclosureExcluded: false,
	setAttendanceDiagnosisDisclosureExcluded: createSetter(
		set,
		"attendanceDiagnosisDisclosureExcluded",
	),
	attendanceNotSickLeaveAcknowledged: false,
	setAttendanceNotSickLeaveAcknowledged: createSetter(
		set,
		"attendanceNotSickLeaveAcknowledged",
	),
	releaseRecipientFullName: "",
	setReleaseRecipientFullName: createSetter(set, "releaseRecipientFullName"),
	releaseRecipientIdentityDocument: "",
	setReleaseRecipientIdentityDocument: createSetter(
		set,
		"releaseRecipientIdentityDocument",
	),
	releaseRecipientAuthority: "пациент лично",
	setReleaseRecipientAuthority: createSetter(set, "releaseRecipientAuthority"),
	releaseSourceRequestDocumentId: "",
	setReleaseSourceRequestDocumentId: createSetter(
		set,
		"releaseSourceRequestDocumentId",
	),
	releaseChannel: "paper",
	setReleaseChannel: createSetter(set, "releaseChannel"),
	releaseDocumentTypes:
		"Выписка из медицинской карты\nКопия снимков или КТ-архив",
	setReleaseDocumentTypes: createSetter(set, "releaseDocumentTypes"),
	releasePeriodStart: "",
	setReleasePeriodStart: createSetter(set, "releasePeriodStart"),
	releasePeriodEnd: "",
	setReleasePeriodEnd: createSetter(set, "releasePeriodEnd"),
	releaseDeliveredAt: "",
	setReleaseDeliveredAt: createSetter(set, "releaseDeliveredAt"),
	releaseAccessExpiresAt: "",
	setReleaseAccessExpiresAt: createSetter(set, "releaseAccessExpiresAt"),
	releaseThirdPartyDataChecked: false,
	setReleaseThirdPartyDataChecked: createSetter(
		set,
		"releaseThirdPartyDataChecked",
	),
});
