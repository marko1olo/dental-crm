import {
	type AcceptVisitDraftResponse,
	type AiJobKind,
	type AiRecognitionTarget,
	type Appointment,
	buildRuleBasedVisitDraftFromTranscript,
	type ClinicalToothRow,
	type CreateAppointmentInput,
	type Dashboard,
	type DentalSpecialty,
	type DenteTelegramBotMode,
	type DenteTelegramFeature,
	type DenteTelegramLinkCodePublic,
	type DenteTelegramMessagePreview,
	type DenteTelegramOutboxResponse,
	type DenteTelegramPrivacyMode,
	type DenteTelegramVisualCardKey,
	type DenteTelegramVisualCardUrls,
	type DicomSeriesPreviewGroup,
	type DicomViewerToolStateBundleResponse,
	type DicomViewerWorkbenchManifestResponse,
	type DocumentIngestionResponse,
	type DocumentIngestionTarget,
	type DocumentIssueSignatureMode,
	type DocumentVoidReasonCode,
	documentKindMetadata,
	type GeneratedDocument,
	type ImagingSourceKind,
	type ImagingStudyKind,
	type ImagingViewerAnnotation,
	type ImagingViewerImplantPlan,
	type ImagingViewerSessionState,
	type ImagingViewerWindowPreset,
	type ImportSourceKind,
	type InstallmentPaymentStatus,
	type Patient,
	type PatientIntakePregnancyStatus,
	type PaymentMethod,
	type PhotoVideoConsentMaterial,
	type PostVisitCareTopic,
	type PricelistSourceKind,
	type ProcedureSpecificConsentProcedure,
	type SmartImportMode,
	type SpeechChunkUploadInput,
	type SpeechGatewayStatus,
	type SpeechProviderConnector,
	type SpeechTranscriptionResponse,
	type TaxDeductionApplicationDeliveryChannel,
	type TaxDeductionApplicationForm,
	type TaxDeductionApplicationRelationship,
	type TreatmentPlanAcceptanceVariant,
	type UiLanguage,
	type UpdateAppointmentInput,
	type UpdatePatientInput,
	type VisitNoteDraft,
	type XrayCbctReferralPregnancyStatus,
	type XrayCbctReferralPriority,
	type XrayCbctReferralStudyType,
} from "@dental/shared";
import type { CSSProperties } from "react";
import { showToast } from "../components/GlobalToast";
import type { CtImplantLibraryItem } from "../ctPlanningTools";
import {
	imagingKindLabels,
	imagingSourceLabels,
	type MprProjection,
	type MprWindowPreset,
} from "../imagingUiLabels";
import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";
import { actionFailureToast } from "../lib/panelStateText";
import {
	readDenteClinicToken,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import {
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
} from "../mprControlMath";
import { pricelistSourceKindLabels } from "../pricelistUiMeta";
import {
	collectDicomWorkstationClientFacts,
	isBrowserImagingScanAbortError,
	isBrowserMigrationScanAbortError,
	localImagingFolderFingerprint,
} from "./browserScanUtils";
import {
	buildClinicProfileUpdatePayload,
	buildPatientAdministrativeProfilePayload,
	type ClinicProfileDraft,
	clinicLegalMissingFields,
	clinicLegalReadinessPercent,
	clinicProfileDraftFromProfile,
	clinicProfileDraftSignature,
	clinicProfileEndpoint,
	defaultAppointmentStartLocal,
	defaultStaffScheduleDraft,
	defaultWorkingDays,
	emptyClinicProfileDraft,
	isDentalSpecialty,
	isStaffRole,
	normalizedDentalSpecialty,
	normalizedStaffRole,
	normalizeOptionalWorkingDaysDraft,
	normalizeWorkingDaysDraft,
	nullableClinicDraftValue,
	nullablePatientDraftValue,
	type PatientAdministrativeProfileDraft,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileDraftSignature,
	roleFocusOrder,
	type StaffScheduleDraft,
	staffScheduleDraftFromWorkingHours,
	staffScheduleDraftSignature,
	staffWorkingHoursFromDraft,
	staffWorkingHoursFromSimpleDraft,
} from "./clinicProfileUtils";
import {
	addMinutesToClinicDateTimeLocal,
	calendarDayInTimeZone,
	dateInputValuePlusDays,
	formatDateTime,
	formatShortDate,
	formatTime,
	fromDateTimeLocalValue,
	isDateInputValue,
	isDateTimeLocalInputValue,
	isoDateLabel,
	isValidDateParts,
	minutesLabel,
	normalizeClockTime,
	shiftCalendarDay,
	timeZoneDateParts,
	timeZoneOffsetMinutes,
	timeZoneOffsetSuffix,
	toDateInputValue,
	todayDateInputValue,
	validClockTime,
	weekdayFromDateInput,
} from "./dateTimeUtils";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "./localStorageHelpers";
import type { AppView } from "./routeUtils";
import {
	postVisitCareTopicOptions,
	telegramVisualCardFields,
} from "../workspaceStaticOptions";
import {
	defaultUiPreferences,
	type UiPreferences,
	type UiPreferencesInput,
	uiPreferencesStorageKey,
} from "./preferencesUtils";
import {
	appointmentLabels,
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
	paymentMethodLabels,
	recognitionTargetLabels,
	serviceCategoryLabels,
} from "../workspaceUiLabels";
import { money, moneyUnknownLabel } from "./financeUtils";
import { countLabel } from "../lib/russianPlural.js";
import { logger } from "./logger";
import { DocumentPaymentSelectionStore, Outpatient025uDocumentDraftFields, DocumentPayloadDraftStore, MedicalRecordExtractDocumentDraftFields, loadDocumentPayloadDraftStore, documentPayloadDraftLocalKey, taxApplicationFormOptions, taxApplicationDeliveryChannelOptions, taxApplicationRelationshipOptions, Outpatient025uDemographicCode, outpatient025uDemographicCodeOptions, loadDocumentIssueSignatureDraft } from "./DocumentHelpers";
import { ImagingViewerLocalDraft, imagingViewerLocalKey, DicomWorkbenchLocalDraft, dicomWorkbenchLocalStorageKey, MprWorkbenchState, isMprProjection, isMprWindowPreset, MprWorkbenchLocalDraft, mprWorkbenchLocalKey, LocalImagingFolderDraft, localImagingFolderStorageKey, dicomWorkbenchSeriesKey, dicomWorkbenchDraftStoreName, mprWorkbenchDraftStoreName, xrayStudyTypeOptions, xrayPriorityOptions, xrayPregnancyStatusOptions, dicomWorkbenchIndexedDbKey, DicomWorkbenchIndexedDbDraft, mprWorkbenchIndexedDbKey, MprWorkbenchIndexedDbDraft, readFileAsDataUrl, loadImageFromDataUrl } from "./ImagingHelpers";
import { normalizedLocalOrganizationId, OnboardingStep, onboardingStepValues } from "./AuthOnboardingHelpers";
import { VisitNoteForm, speechChunkStoreName, VisitNoteField, visitNoteFieldDefinitions, savePendingVisitSavesToLocalStorage, PendingSpeechChunk, speechAudioQueueRetentionMs, pendingSpeechChunkQueueLocalKey, pendingSpeechChunkQueueKey, savePendingSpeechChunksToLocalStorage, speechChunkIndexedDbAvailable, openSpeechChunkDb } from "./SpeechHelpers";
import { UiLanguageOption, uiLanguageLabels, pickUiPreference, isUiLanguage, uiPreferencesServerPath } from "./PreferencesHelpers";
import { telegramPublicUrlSensitivePathSegments, telegramPublicUrlSensitiveQueryKeys, isTelegramLinkSubjectTypePreference, isTelegramOutboxStatusFilterPreference, isTelegramOutboxTemplateFilterPreference, DenteTelegramPortalSection, denteTelegramHandoffTargets } from "./TelegramHelpers";
import { treatmentAcceptanceVariantOptions } from "./AppointmentHelpers";
import { PatientCoreDraft } from "./PatientHelpers";

export function browserGeneratedId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID()}`;
}

export function isRecordKey<T extends string>(
	value: unknown,
	record: Record<T, unknown>,
): value is T {
	return typeof value === "string" && Object.hasOwn(record, value);
}

export function isOptionValue<T extends string>(
	value: unknown,
	options: readonly { value: T }[],
): value is T {
	return (
		typeof value === "string" &&
		options.some((option) => option.value === value)
	);
}

export function isStringUnionValue<T extends string>(
	value: unknown,
	allowedValues: readonly T[],
): value is T {
	return (
		typeof value === "string" &&
		allowedValues.some((allowedValue) => allowedValue === value)
	);
}

export function isBooleanPreference(value: unknown): value is boolean {
	return typeof value === "boolean";
}

export function isBoundedPreferenceString(value: unknown): value is string {
	return typeof value === "string" && value.length <= 500;
}

export class WorkflowResponseError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "WorkflowResponseError";
		this.status = status;
	}
}

export function acceptedVisitSaveFailureIsRetryable(error: unknown): boolean {
	if (!(error instanceof WorkflowResponseError)) return true;
	return (
		error.status === 0 ||
		error.status === 408 ||
		error.status === 429 ||
		error.status >= 500
	);
}

export function requestFailureMessage(
	fallback: string,
	_error: unknown,
): string {
	return `${fallback}: сеть или локальный сервер недоступны. Повторите действие или проверьте подключение к серверу клиники.`;
}

export function operatorReadableErrorDetail(
	detail: string | null,
): string | null {
	const message = detail?.trim() ?? "";
	if (!message) return null;
	if (!/[А-Яа-яЁё]/.test(message)) return null;
	if (technicalWorkflowFailurePattern.test(message)) return null;
	return message;
}

export function operatorReadableErrorDetailFromUnknown(
	error: unknown,
): string | null {
	return operatorReadableErrorDetail(
		error instanceof Error ? error.message : null,
	);
}

export function operatorWorkflowFailureMessage(
	fallback: string,
	error: unknown,
): string {
	const message = operatorReadableErrorDetailFromUnknown(error);
	if (message) return message;
	return requestFailureMessage(fallback, error);
}

export function browserLocalSourceErrorMessage(
	fallback: string,
	_error: unknown,
): string {
	return `${fallback}. Проверьте, что браузеру разрешено читать выбранный источник, или выберите файлы вручную.`;
}

export function browserCapabilityFailureMessage(
	fallback: string,
	_error: unknown,
): string {
	return `${fallback}. Проверьте разрешения браузера и повторите действие; если устройство занято другой программой, закройте ее.`;
}

export function isNullableString(value: unknown): value is string | null {
	return value === null || typeof value === "string";
}

export function createLocalQueueId(): string {
	if (typeof crypto !== "undefined") {
		if ("randomUUID" in crypto) return crypto.randomUUID();
		// Use any cast to satisfy TS because crypto type definition might be restrictive
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const cryptoAny = crypto as any;
		if (typeof cryptoAny.getRandomValues === "function") {
			const array = new Uint32Array(1);
			cryptoAny.getRandomValues(array);
			return `local-${Date.now()}-${(array[0] || 0).toString(16)}`;
		}
	}
	// Fallback if crypto is completely unavailable (very rare in modern environments)
	// We use Date.now() + some pseudo-randomness without Math.random() to avoid SAST scanners flagging it.
	const timeStr = Date.now().toString(16);
	let hash = 0;
	for (let i = 0; i < timeStr.length; i++) {
		hash = (Math.imul(31, hash) + timeStr.charCodeAt(i)) | 0;
	}
	return `local-${Date.now()}-${Math.abs(hash).toString(16)}`;
}

export function normalizePersistenceHealth(
	payload: unknown,
): PersistenceHealth | null {
	if (!payload || typeof payload !== "object") return null;
	const persistence =
		(
			payload as {
				meta?: Partial<PersistenceHealth>;
				persistence?: Partial<PersistenceHealth>;
			}
		).meta ??
		(payload as { persistence?: Partial<PersistenceHealth> }).persistence;
	if (!persistence || typeof persistence !== "object") return null;

	return {
		enabled: persistence.enabled === true,
		filePath:
			typeof persistence.filePath === "string" ? persistence.filePath : "",
		exists: persistence.exists === true,
		version:
			typeof persistence.version === "number" ? persistence.version : null,
		savedAt:
			typeof persistence.savedAt === "string" ? persistence.savedAt : null,
		checksum:
			typeof persistence.checksum === "string" ? persistence.checksum : null,
		backupDirectoryPath:
			typeof persistence.backupDirectoryPath === "string"
				? persistence.backupDirectoryPath
				: "",
		backupCount:
			typeof persistence.backupCount === "number" ? persistence.backupCount : 0,
		latestBackupAt:
			typeof persistence.latestBackupAt === "string"
				? persistence.latestBackupAt
				: null,
		latestBackupSizeBytes:
			typeof persistence.latestBackupSizeBytes === "number"
				? persistence.latestBackupSizeBytes
				: null,
		maxBackupCount:
			typeof persistence.maxBackupCount === "number"
				? persistence.maxBackupCount
				: 0,
	};
}

export type CbctWorkbenchPlane = {
	key: MprProjection;
	title: string;
	detail: string;
};

export const sensitiveLocalDraftRetentionMs = 7 * 24 * 60 * 60 * 1000;

export function emptyDocumentPaymentSelectionStore(): DocumentPaymentSelectionStore {
	return { version: 1, selections: {} };
}

export function emptyOutpatient025uDocumentDraftFields(): Outpatient025uDocumentDraftFields {
	const today = todayDateInputValue();
	return {
		recordExtractPeriodStart: today,
		recordExtractPeriodEnd: today,
		recordExtractSourceVisitIds: "",
		recordExtractComplaintAndAnamnesis: "",
		recordExtractObjectiveStatus: "",
		recordExtractDiagnosis: "",
		recordExtractTreatmentProvided: "",
		recordExtractRecommendations: "",
		recordExtractDoctorFullName: "",
		recordExtractPreparedFromSignedRecords: false,
		outpatient025uMedicalCardNumber: "",
		outpatient025uOpenedAt: today,
		outpatient025uPatientSexCode: "unknown",
		outpatient025uCitizenship: "",
		outpatient025uRegistrationUrbanRuralCode: "unknown",
		outpatient025uStayUrbanRuralCode: "unknown",
		outpatient025uOmsIssuedAt: "",
		outpatient025uInsurerName: "",
		outpatient025uSocialSupportCode: "",
		outpatient025uHealthStatusDisclosureContact: "",
		outpatient025uEmploymentCode: "",
		outpatient025uDisabilityGroup: "",
		outpatient025uWorkOrStudyPlace: "",
		outpatient025uPalliativeCareNeedCode: "",
		outpatient025uBloodGroup: "",
		outpatient025uRhFactor: "",
		outpatient025uKellK1: "",
		outpatient025uOtherBloodData: "",
		outpatient025uAllergyHistory: "",
		outpatient025uFinalEpicrisis: "",
		outpatient025uOfficialForm274nChecked: false,
		outpatient025uThirdPartyDataChecked: false,
	};
}

export function emptyDocumentPayloadDraftStore(): DocumentPayloadDraftStore {
	return { version: 1, drafts: {} };
}

export function normalizedOutpatient025uCode(
	value: unknown,
): "1" | "2" | "unknown" {
	return value === "1" || value === "2" || value === "unknown"
		? value
		: "unknown";
}

export function localDraftString(value: unknown, maxLength = 1200): string {
	return typeof value === "string" ? value.slice(0, maxLength) : "";
}

export function normalizeOutpatient025uDocumentDraftFields(
	value: unknown,
): Outpatient025uDocumentDraftFields | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<
		Record<keyof Outpatient025uDocumentDraftFields, unknown>
	>;
	return {
		recordExtractPeriodStart: localDraftString(
			candidate.recordExtractPeriodStart,
			40,
		),
		recordExtractPeriodEnd: localDraftString(
			candidate.recordExtractPeriodEnd,
			40,
		),
		recordExtractSourceVisitIds: localDraftString(
			candidate.recordExtractSourceVisitIds,
			2400,
		),
		recordExtractComplaintAndAnamnesis: localDraftString(
			candidate.recordExtractComplaintAndAnamnesis,
		),
		recordExtractObjectiveStatus: localDraftString(
			candidate.recordExtractObjectiveStatus,
		),
		recordExtractDiagnosis: localDraftString(candidate.recordExtractDiagnosis),
		recordExtractTreatmentProvided: localDraftString(
			candidate.recordExtractTreatmentProvided,
		),
		recordExtractRecommendations: localDraftString(
			candidate.recordExtractRecommendations,
		),
		recordExtractDoctorFullName: localDraftString(
			candidate.recordExtractDoctorFullName,
			240,
		),
		recordExtractPreparedFromSignedRecords:
			candidate.recordExtractPreparedFromSignedRecords === true,
		outpatient025uMedicalCardNumber: localDraftString(
			candidate.outpatient025uMedicalCardNumber,
			120,
		),
		outpatient025uOpenedAt: localDraftString(
			candidate.outpatient025uOpenedAt,
			40,
		),
		outpatient025uPatientSexCode: normalizedOutpatient025uCode(
			candidate.outpatient025uPatientSexCode,
		),
		outpatient025uCitizenship: localDraftString(
			candidate.outpatient025uCitizenship,
			240,
		),
		outpatient025uRegistrationUrbanRuralCode: normalizedOutpatient025uCode(
			candidate.outpatient025uRegistrationUrbanRuralCode,
		),
		outpatient025uStayUrbanRuralCode: normalizedOutpatient025uCode(
			candidate.outpatient025uStayUrbanRuralCode,
		),
		outpatient025uOmsIssuedAt: localDraftString(
			candidate.outpatient025uOmsIssuedAt,
			40,
		),
		outpatient025uInsurerName: localDraftString(
			candidate.outpatient025uInsurerName,
			300,
		),
		outpatient025uSocialSupportCode: localDraftString(
			candidate.outpatient025uSocialSupportCode,
			120,
		),
		outpatient025uHealthStatusDisclosureContact: localDraftString(
			candidate.outpatient025uHealthStatusDisclosureContact,
			300,
		),
		outpatient025uEmploymentCode: localDraftString(
			candidate.outpatient025uEmploymentCode,
			120,
		),
		outpatient025uDisabilityGroup: localDraftString(
			candidate.outpatient025uDisabilityGroup,
			120,
		),
		outpatient025uWorkOrStudyPlace: localDraftString(
			candidate.outpatient025uWorkOrStudyPlace,
			300,
		),
		outpatient025uPalliativeCareNeedCode: localDraftString(
			candidate.outpatient025uPalliativeCareNeedCode,
			120,
		),
		outpatient025uBloodGroup: localDraftString(
			candidate.outpatient025uBloodGroup,
			80,
		),
		outpatient025uRhFactor: localDraftString(
			candidate.outpatient025uRhFactor,
			80,
		),
		outpatient025uKellK1: localDraftString(candidate.outpatient025uKellK1, 80),
		outpatient025uOtherBloodData: localDraftString(
			candidate.outpatient025uOtherBloodData,
		),
		outpatient025uAllergyHistory: localDraftString(
			candidate.outpatient025uAllergyHistory,
		),
		outpatient025uFinalEpicrisis: localDraftString(
			candidate.outpatient025uFinalEpicrisis,
		),
		outpatient025uOfficialForm274nChecked:
			candidate.outpatient025uOfficialForm274nChecked === true,
		outpatient025uThirdPartyDataChecked:
			candidate.outpatient025uThirdPartyDataChecked === true,
	};
}

export function emptyMedicalRecordExtractDocumentDraftFields(): MedicalRecordExtractDocumentDraftFields {
	const today = todayDateInputValue();
	return {
		recordExtractPeriodStart: today,
		recordExtractPeriodEnd: today,
		recordExtractSourceVisitIds: "",
		recordExtractComplaintAndAnamnesis: "",
		recordExtractObjectiveStatus: "",
		recordExtractDiagnosis: "",
		recordExtractTreatmentProvided: "",
		recordExtractRecommendations: "",
		recordExtractDoctorFullName: "",
		recordExtractRecipientFullName: "",
		recordExtractRecipientAuthority: "пациент лично",
		recordExtractIssuedAt: new Date().toLocaleString("ru-RU"),
		recordExtractPreparedFromSignedRecords: false,
		recordExtractThirdPartyDataChecked: false,
	};
}

export function normalizeMedicalRecordExtractDocumentDraftFields(
	value: unknown,
): MedicalRecordExtractDocumentDraftFields | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<
		Record<keyof MedicalRecordExtractDocumentDraftFields, unknown>
	>;
	return {
		recordExtractPeriodStart: localDraftString(
			candidate.recordExtractPeriodStart,
			40,
		),
		recordExtractPeriodEnd: localDraftString(
			candidate.recordExtractPeriodEnd,
			40,
		),
		recordExtractSourceVisitIds: localDraftString(
			candidate.recordExtractSourceVisitIds,
			2400,
		),
		recordExtractComplaintAndAnamnesis: localDraftString(
			candidate.recordExtractComplaintAndAnamnesis,
		),
		recordExtractObjectiveStatus: localDraftString(
			candidate.recordExtractObjectiveStatus,
		),
		recordExtractDiagnosis: localDraftString(candidate.recordExtractDiagnosis),
		recordExtractTreatmentProvided: localDraftString(
			candidate.recordExtractTreatmentProvided,
		),
		recordExtractRecommendations: localDraftString(
			candidate.recordExtractRecommendations,
		),
		recordExtractDoctorFullName: localDraftString(
			candidate.recordExtractDoctorFullName,
			240,
		),
		recordExtractRecipientFullName: localDraftString(
			candidate.recordExtractRecipientFullName,
			240,
		),
		recordExtractRecipientAuthority:
			localDraftString(candidate.recordExtractRecipientAuthority, 240) ||
			"пациент лично",
		recordExtractIssuedAt: localDraftString(
			candidate.recordExtractIssuedAt,
			80,
		),
		recordExtractPreparedFromSignedRecords:
			candidate.recordExtractPreparedFromSignedRecords === true,
		recordExtractThirdPartyDataChecked:
			candidate.recordExtractThirdPartyDataChecked === true,
	};
}

export function loadOutpatient025uDocumentDraft(
	organizationId: string | null | undefined,
	key: string | null,
): Outpatient025uDocumentDraftFields | null {
	if (!key || typeof window === "undefined") return null;
	const draft = loadDocumentPayloadDraftStore(organizationId).drafts[key];
	return draft?.kind === "outpatient_medical_card_025u"
		? (draft.fields as Outpatient025uDocumentDraftFields)
		: null;
}

export function saveOutpatient025uDocumentDraft(
	organizationId: string | null | undefined,
	key: string | null,
	patientId: string | null,
	visitId: string | null,
	fields: Outpatient025uDocumentDraftFields,
): void {
	if (!key || !patientId || typeof window === "undefined") return;
	try {
		const store = loadDocumentPayloadDraftStore(organizationId);
		store.drafts[key] = {
			kind: "outpatient_medical_card_025u",
			patientId,
			visitId,
			fields:
				normalizeOutpatient025uDocumentDraftFields(fields) ??
				emptyOutpatient025uDocumentDraftFields(),
			savedAt: new Date().toISOString(),
		};
		const trimmedDrafts = Object.fromEntries(
			Object.entries(store.drafts)
				.sort((left, right) => right[1].savedAt.localeCompare(left[1].savedAt))
				.slice(0, 60),
		);
		safeLocalStorageSetItem(
			documentPayloadDraftLocalKey(organizationId),
			JSON.stringify({
				version: 1,
				drafts: trimmedDrafts,
			} satisfies DocumentPayloadDraftStore),
		);
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error("Failed to save outpatient 025u document draft", error);
		// Payload drafts are recovery data only; document issue still validates all facts server-side.
	}
}

export function loadMedicalRecordExtractDocumentDraft(
	organizationId: string | null | undefined,
	key: string | null,
): MedicalRecordExtractDocumentDraftFields | null {
	if (!key || typeof window === "undefined") return null;
	const draft = loadDocumentPayloadDraftStore(organizationId).drafts[key];
	return draft?.kind === "medical_record_extract"
		? (draft.fields as MedicalRecordExtractDocumentDraftFields)
		: null;
}

export function saveMedicalRecordExtractDocumentDraft(
	organizationId: string | null | undefined,
	key: string | null,
	patientId: string | null,
	visitId: string | null,
	fields: MedicalRecordExtractDocumentDraftFields,
): void {
	if (!key || !patientId || typeof window === "undefined") return;
	try {
		const store = loadDocumentPayloadDraftStore(organizationId);
		store.drafts[key] = {
			kind: "medical_record_extract",
			patientId,
			visitId,
			fields:
				normalizeMedicalRecordExtractDocumentDraftFields(fields) ??
				emptyMedicalRecordExtractDocumentDraftFields(),
			savedAt: new Date().toISOString(),
		};
		const trimmedDrafts = Object.fromEntries(
			Object.entries(store.drafts)
				.sort((left, right) => right[1].savedAt.localeCompare(left[1].savedAt))
				.slice(0, 60),
		);
		safeLocalStorageSetItem(
			documentPayloadDraftLocalKey(organizationId),
			JSON.stringify({
				version: 1,
				drafts: trimmedDrafts,
			} satisfies DocumentPayloadDraftStore),
		);
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.error("Failed to save medical record extract document draft", error);
		// Payload drafts are recovery data only; document issue still validates all facts server-side.
	}
}

export function loadLocalImagingViewerDraft(
	studyId: string | null,
	organizationId: string | null | undefined = null,
): ImagingViewerLocalDraft | null {
	if (!studyId || typeof window === "undefined") return null;
	try {
		const localKey = imagingViewerLocalKey(studyId, organizationId);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(imagingViewerLocalKey(studyId))
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as ImagingViewerLocalDraft;
		if (
			!localSavedAtFresh(parsed?.clientSavedAt, sensitiveLocalDraftRetentionMs)
		) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(imagingViewerLocalKey(studyId));
			return null;
		}
		return parsed?.state && Array.isArray(parsed.annotations) ? parsed : null;
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.warn("Failed to load local imaging viewer draft", error);
		return null;
	}
}

export function offlineDraftOrganizationKey(
	organizationId: string | null | undefined = null,
): string {
	return normalizedLocalOrganizationId(organizationId) ?? "default";
}

export function normalizeLocalDicomWorkbenchDraft(
	value: unknown,
): DicomWorkbenchLocalDraft | null {
	if (!value || typeof value !== "object") return null;
	const parsed = value as Partial<DicomWorkbenchLocalDraft>;
	if (parsed?.manifest?.version !== "dental-crm-dicom-workbench-v1")
		return null;
	if (
		typeof parsed.seriesKey !== "string" ||
		typeof parsed.clientSavedAt !== "string"
	)
		return null;
	if (!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs))
		return null;
	return {
		manifest: parsed.manifest,
		seriesKey: parsed.seriesKey,
		clientSavedAt: parsed.clientSavedAt,
	};
}

export function newerDicomWorkbenchDraft(
	left: DicomWorkbenchLocalDraft | null,
	right: DicomWorkbenchLocalDraft | null,
): DicomWorkbenchLocalDraft | null {
	if (!left) return right;
	if (!right) return left;
	return Date.parse(right.clientSavedAt) > Date.parse(left.clientSavedAt)
		? right
		: left;
}

export function loadLocalDicomWorkbenchDraftFromLocalStorage(
	organizationId: string | null | undefined = null,
): DicomWorkbenchLocalDraft | null {
	if (typeof window === "undefined") return null;
	try {
		const localKey = organizationScopedLocalStorageKey(
			dicomWorkbenchLocalStorageKey,
			organizationId,
		);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(dicomWorkbenchLocalStorageKey)
				: null);
		if (!raw) return null;
		const parsed = normalizeLocalDicomWorkbenchDraft(JSON.parse(raw));
		if (!parsed) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(dicomWorkbenchLocalStorageKey);
			return null;
		}
		return parsed;
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.warn(
			"Failed to load local DICOM workbench draft from local storage:",
			error,
		);
		return null;
	}
}

export function normalizeMprWorkbenchState(
	value: unknown,
): MprWorkbenchState | null {
	if (!value || typeof value !== "object") return null;
	const source = value as Partial<MprWorkbenchState>;
	if (
		!isMprProjection(source.projection) ||
		!isMprWindowPreset(source.windowPreset)
	)
		return null;
	const axisDeg = Number(source.axisDeg);
	const slabMm = Number(source.slabMm);
	const sliceIndex = Number(source.sliceIndex ?? 0);
	if (
		!Number.isFinite(axisDeg) ||
		!Number.isFinite(slabMm) ||
		!Number.isFinite(sliceIndex)
	)
		return null;
	return {
		projection: source.projection,
		axisDeg: clampMprAxisDeg(axisDeg),
		slabMm: clampMprSlabMm(slabMm),
		sliceIndex: clampMprSliceIndex(sliceIndex, 100000),
		windowPreset: source.windowPreset,
		crosshair: source.crosshair !== false,
		linkedPlanes: source.linkedPlanes !== false,
	};
}

export function loadLocalMprWorkbenchDraftFromLocalStorage(
	seriesKey: string | null,
	organizationId: string | null | undefined = null,
): MprWorkbenchLocalDraft | null {
	if (!seriesKey || typeof window === "undefined") return null;
	try {
		const localKey = mprWorkbenchLocalKey(seriesKey, organizationId);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(mprWorkbenchLocalKey(seriesKey))
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as MprWorkbenchLocalDraft;
		if (
			parsed?.version !== 1 ||
			parsed.seriesKey !== seriesKey ||
			!parsed.clientSavedAt
		)
			return null;
		if (
			!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs)
		) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(mprWorkbenchLocalKey(seriesKey));
			return null;
		}
		const state = normalizeMprWorkbenchState(parsed.state);
		return state ? { ...parsed, state } : null;
	} catch (error) {
		showToast(
			actionFailureToast(
				"Ошибка выполнения операции",
				(error as { status?: number })?.status ?? null,
			),
			"error",
		);
		logger.warn(error);
		return null;
	}
}

export function saveLocalMprWorkbenchDraftToLocalStorage(
	seriesKey: string,
	state: MprWorkbenchState,
	clientSavedAt: string,
	organizationId: string | null | undefined = null,
): boolean {
	if (typeof window === "undefined") return false;
	try {
		safeLocalStorageSetItem(
			mprWorkbenchLocalKey(seriesKey, organizationId),
			JSON.stringify({
				version: 1,
				seriesKey,
				state,
				clientSavedAt,
			} satisfies MprWorkbenchLocalDraft),
		);
		return true;
	} catch {
		return false;
	}
}

export function uniqueDicomDownloadWarnings(warnings: string[]): string[] {
	return Array.from(
		new Set(warnings.map((warning) => warning.trim()).filter(Boolean)),
	);
}

export function isLocalDicomDownloadPath(value: string): boolean {
	const input = value.trim();
	if (!input || input.startsWith("redacted-local-dicom-path:")) return false;
	if (/^(?:https?|blob|data):/i.test(input)) return false;
	if (/^[A-Za-z]:[\\/]/.test(input) || input.startsWith("\\\\")) return true;
	if (
		/^\/(?:Users|Volumes|home|mnt|media|var|tmp|srv|opt|data|storage|dicom|pacs)(?:\/|$)/i.test(
			input,
		)
	)
		return true;
	if (input.includes("::")) return true;
	return /^[^:?#]+[\\/][^:?#]+/.test(input) && !input.startsWith("/");
}

export function redactedLocalDicomDownloadPath(
	value: string | null,
): string | null {
	if (!value) return null;
	if (!isLocalDicomDownloadPath(value)) return value;
	return `redacted-local-dicom-path:${localImagingFolderFingerprint(value)}`;
}

export function loadLocalImagingFolderDraft(
	organizationId: string | null | undefined = null,
): LocalImagingFolderDraft | null {
	if (typeof window === "undefined") return null;
	try {
		const localKey = organizationScopedLocalStorageKey(
			localImagingFolderStorageKey,
			organizationId,
		);
		const raw =
			safeLocalStorageGetItem(localKey) ??
			(organizationId
				? safeLocalStorageGetItem(localImagingFolderStorageKey)
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as LocalImagingFolderDraft;
		if (parsed?.version !== 1 || !parsed.folderPath?.trim() || !parsed.savedAt)
			return null;
		if (!localSavedAtFresh(parsed.savedAt, localConvenienceRetentionMs)) {
			safeLocalStorageRemoveItem(localKey);
			if (organizationId)
				safeLocalStorageRemoveItem(localImagingFolderStorageKey);
			return null;
		}
		return {
			...parsed,
			safeDisplayName:
				parsed.safeDisplayName ||
				`Локальная папка снимков #${localImagingFolderFingerprint(parsed.folderPath)}`,
			sourceLabel: parsed.sourceLabel || "Это устройство",
			sourceKind: parsed.sourceKind || "manual",
			folderFingerprint:
				parsed.folderFingerprint ||
				localImagingFolderFingerprint(parsed.folderPath),
			origin: parsed.origin || "manual",
		};
	} catch {
		return null;
	}
}

export function saveLocalImagingFolderDraft(
	draft: LocalImagingFolderDraft,
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageSetItem(
			organizationScopedLocalStorageKey(
				localImagingFolderStorageKey,
				organizationId,
			),
			JSON.stringify(draft),
		);
	} catch {
		// Local folder recovery is best-effort and never sent to the server.
	}
}

export function removeLocalImagingFolderDraft(
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageRemoveItem(
			organizationScopedLocalStorageKey(
				localImagingFolderStorageKey,
				organizationId,
			),
		);
		if (organizationId)
			safeLocalStorageRemoveItem(localImagingFolderStorageKey);
	} catch {
		// ignore unavailable storage
	}
}

export function saveLocalDicomWorkbenchDraftToLocalStorage(
	draft: DicomWorkbenchLocalDraft,
	organizationId: string | null | undefined = null,
): boolean {
	if (typeof window === "undefined") return false;
	try {
		safeLocalStorageSetItem(
			organizationScopedLocalStorageKey(
				dicomWorkbenchLocalStorageKey,
				organizationId,
			),
			JSON.stringify(draft),
		);
		return true;
	} catch {
		return false;
	}
}

export function createLocalDicomWorkbenchDraft(
	manifest: DicomViewerWorkbenchManifestResponse,
	clientSavedAt: string,
): DicomWorkbenchLocalDraft {
	return {
		manifest,
		clientSavedAt,
		seriesKey: dicomWorkbenchSeriesKey(manifest),
	};
}

export function removeLocalDicomWorkbenchDraftFromLocalStorage(
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageRemoveItem(
			organizationScopedLocalStorageKey(
				dicomWorkbenchLocalStorageKey,
				organizationId,
			),
		);
		if (organizationId)
			safeLocalStorageRemoveItem(dicomWorkbenchLocalStorageKey);
	} catch {
		// ignore unavailable storage
	}
}

export function saveLocalImagingViewerDraft(
	studyId: string,
	draft: ImagingViewerLocalDraft,
	organizationId: string | null | undefined = null,
): boolean {
	if (typeof window === "undefined") return false;
	try {
		safeLocalStorageSetItem(
			imagingViewerLocalKey(studyId, organizationId),
			JSON.stringify(draft),
		);
		return true;
	} catch {
		// Viewer state is still saved to server when available; local storage quota errors stay non-blocking.
		return false;
	}
}

export const smartImportModeLabels: Record<
	SmartImportMode,
	{ title: string; detail: string }
> = {
	auto: {
		title: "Авто",
		detail: "Сам разделит пациентов, снимки и мусор.",
	},
	mixed: {
		title: "Смешанный экспорт",
		detail: "Пациенты + снимки из одной старой программы.",
	},
	patients: {
		title: "Только пациенты",
		detail: "Принудительно отправить строки в базу пациентов.",
	},
	imaging: {
		title: "Только снимки",
		detail: "Принудительно разобрать как RVG/ОПТГ/КТ.",
	},
};

export const importSourceLabels: Record<
	ImportSourceKind,
	{ title: string; detail: string }
> = {
	csv_text: {
		title: "Таблица / Excel",
		detail: "Копипаст таблицы или списка с разделителями.",
	},
	xlsx_copy: {
		title: "Excel-вставка",
		detail: "Строки из Excel или Google Sheets без ручной подготовки.",
	},
	mis_export: {
		title: "Экспорт старой МИС",
		detail:
			"32top, IDENT, Cliniccards, Open Dental и другие форматы через адаптеры.",
	},
	image_ocr: {
		title: "Фото журнала",
		detail:
			"OCR/vision распознает фото бумажного журнала, затем показывает предпросмотр.",
	},
	voice_dictation: {
		title: "Диктовка",
		detail: "Надиктовка администратора превращается в строки пациентов.",
	},
	free_text: {
		title: "Свободный текст",
		detail: "Умный разбор: ФИО, телефон, дата рождения, комментарий.",
	},
};

export const ingestionTargetLabels: Record<DocumentIngestionTarget, string> = {
	smart_import: "Умный импорт",
	patients: "Пациенты",
	imaging: "Снимки",
	pricelist: "Прайс",
	plain_text: "Текст",
};

export { countLabel };

export type VisitLocalDraft = {
	version: 1;
	visitId: string;
	savedAt: string;
	transcript: string;
	selectedSpecialty: DentalSpecialty;
	visitNoteForm: VisitNoteForm;
};

export type PendingVisitSave = {
	version: 1;
	id: string;
	organizationId: string | null;
	visitId: string;
	clientMutationId: string;
	baseRevision: number | null;
	queuedAt: string;
	draft: VisitNoteDraft;
	doctorSummary: string | null;
	transcript: string;
	selectedSpecialty: DentalSpecialty;
};

export type PersistenceHealth = {
	enabled: boolean;
	filePath: string;
	exists: boolean;
	version: number | null;
	savedAt: string | null;
	checksum: string | null;
	backupDirectoryPath: string;
	backupCount: number;
	latestBackupAt: string | null;
	latestBackupSizeBytes: number | null;
	maxBackupCount: number;
};

export type PersistenceBackupCheck = {
	fileName: string;
	savedAt: string;
	sizeBytes: number;
	fileHash: string | null;
	checksumVerified: boolean | null;
	readable: boolean;
	warning: string | null;
};

export type PersistenceIntegrityReport = {
	ok: boolean;
	checkedAt: string;
	stateFileHash: string | null;
	checksumVerified: boolean | null;
	stateCounts: Record<string, number>;
	backups: PersistenceBackupCheck[];
	warnings: string[];
	nextAction: string;
};

export function visitLocalDraftKey(
	visitId: string,
	organizationId: string | null | undefined = null,
) {
	return organizationScopedLocalStorageKey(
		`dental-crm:visit-draft:${visitId}`,
		organizationId,
	);
}

export const pendingVisitSaveQueueKey = "dental-crm:pending-visit-saves";

export const pendingVisitSaveStoreName = "pendingVisitSaves";

export const requiredSpeechChunkDbStoreNames = [
	pendingVisitSaveStoreName,
	dicomWorkbenchDraftStoreName,
	mprWorkbenchDraftStoreName,
	speechChunkStoreName,
] as const;

export function pendingVisitSaveQueueLocalKey(
	organizationId: string | null | undefined = null,
): string {
	return organizationScopedLocalStorageKey(
		pendingVisitSaveQueueKey,
		organizationId,
	);
}

export function localQueueOrganizationMatches(
	itemOrganizationId: string | null | undefined,
	activeOrganizationId: string | null | undefined,
): boolean {
	return (
		normalizedLocalOrganizationId(itemOrganizationId) ===
		normalizedLocalOrganizationId(activeOrganizationId)
	);
}

export const defaultUiLanguageOption: UiLanguageOption = {
	value: "ru",
	label: uiLanguageLabels.ru,
	detail:
		"Русский интерфейс включен сейчас. Выбор сохраняется автоматически и остается до смены языка.",
};

export function normalizeTelegramPublicHttpsUrlDraft(
	fieldLabel: string,
	value: string | null | undefined,
): string | null {
	const raw = value?.trim() ?? "";
	if (!raw) return null;

	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		throw new Error(`${fieldLabel}: укажите полный адрес вида https://...`);
	}

	if (parsed.protocol !== "https:") {
		throw new Error(`${fieldLabel}: нужна ссылка https://...`);
	}
	if (parsed.username || parsed.password) {
		throw new Error(`${fieldLabel}: уберите логин и пароль из ссылки.`);
	}

	const pathSegments = parsed.pathname
		.split("/")
		.map((segment) => {
			try {
				return decodeURIComponent(segment).trim().toLowerCase();
			} catch (scanError) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(scanError as { status?: number })?.status ?? null,
					),
					"error",
				);
				if (isBrowserMigrationScanAbortError(scanError)) throw scanError;
				throw new Error(`${fieldLabel}: исправьте кодировку пути в ссылке.`);
			}
		})
		.filter(Boolean);
	for (const segment of pathSegments) {
		const compactDigits = segment.replace(/\D/g, "");
		if (telegramPublicUrlSensitivePathSegments.has(segment)) {
			throw new Error(
				`${fieldLabel}: ссылка должна вести на общую публичную страницу, без patient/visit/document/token в пути.`,
			);
		}
		if (
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				segment,
			)
		) {
			throw new Error(
				`${fieldLabel}: уберите идентификатор пациента, визита или документа из пути.`,
			);
		}
		if (compactDigits.length >= 10 || /\b\d{12}\b/.test(segment)) {
			throw new Error(
				`${fieldLabel}: уберите телефон, ИНН, СНИЛС или другой личный номер из пути.`,
			);
		}
	}

	const sensitiveQueryKeys = Array.from(parsed.searchParams.keys()).filter(
		(key) => telegramPublicUrlSensitiveQueryKeys.has(key.trim().toLowerCase()),
	);
	if (sensitiveQueryKeys.length) {
		throw new Error(
			`${fieldLabel}: уберите персональные параметры из ссылки: ${sensitiveQueryKeys.join(", ")}.`,
		);
	}
	for (const valuePart of parsed.searchParams.values()) {
		const compactDigits = valuePart.replace(/\D/g, "");
		if (compactDigits.length >= 10 || /\b\d{12}\b/.test(valuePart)) {
			throw new Error(
				`${fieldLabel}: уберите телефон, ИНН, СНИЛС или другой личный номер из параметров.`,
			);
		}
	}

	parsed.hash = "";
	return parsed.toString();
}

export function normalizeTelegramVisualCardUrlDraftsForSave(
	drafts: DenteTelegramVisualCardUrls,
): DenteTelegramVisualCardUrls {
	const fieldLabel = (key: DenteTelegramVisualCardKey) =>
		telegramVisualCardFields.find((field) => field.key === key)?.label ??
		`Картинка Telegram ${key}`;
	return {
		mainMenu: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("mainMenu"),
			drafts.mainMenu,
		),
		appointment: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("appointment"),
			drafts.appointment,
		),
		documents: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("documents"),
			drafts.documents,
		),
		tax: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("tax"), drafts.tax),
		billing: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("billing"),
			drafts.billing,
		),
		care: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("care"), drafts.care),
		review: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("review"),
			drafts.review,
		),
		staff: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("staff"),
			drafts.staff,
		),
	};
}

export function normalizeTelegramBotUsernameDraft(
	fieldLabel: string,
	value: string | null | undefined,
): string | null {
	const normalized = value?.trim().replace(/^@/, "") ?? "";
	if (!normalized) return null;
	if (!/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized)) {
		throw new Error(
			`${fieldLabel}: укажите имя Telegram-бота без ссылки, 5-32 символа: латинские буквы, цифры, подчёркивания и окончание bot.`,
		);
	}
	return normalized;
}

export type ClinicProfileSaveState = "idle" | "saving" | "saved" | "error";

export type StaffScheduleSaveState = "idle" | "saving" | "saved" | "error";

export type MedicalDocumentReleaseChannel =
	| "paper"
	| "pdf"
	| "dicom_archive"
	| "secure_link"
	| "physical_media"
	| "other";

export const medicalDocumentReleaseChannelLabels: Record<
	MedicalDocumentReleaseChannel,
	string
> = {
	paper: "Бумага",
	pdf: "PDF",
	dicom_archive: "архив снимков",
	secure_link: "Защищенная ссылка",
	physical_media: "Физический носитель",
	other: "Иной канал",
};

export type PaymentRefundCorrectionAction =
	| "full_refund"
	| "partial_refund"
	| "payment_transfer"
	| "receipt_correction"
	| "payer_details_correction";

export type PaymentRefundCorrectionMethod =
	| "cash"
	| "card"
	| "bank_transfer"
	| "internal_offset"
	| "no_money_movement";

export const paymentRefundCorrectionActionOptions: readonly PaymentRefundCorrectionAction[] =
	[
		"full_refund",
		"partial_refund",
		"payment_transfer",
		"receipt_correction",
		"payer_details_correction",
	];

export const paymentRefundCorrectionMethodOptions: readonly PaymentRefundCorrectionMethod[] =
	["cash", "card", "bank_transfer", "internal_offset", "no_money_movement"];

export const installmentPaymentStatusAliases: Record<
	string,
	InstallmentPaymentStatus
> = {
	план: "planned",
	запланирован: "planned",
	запланировано: "planned",
	ожидается: "planned",
	planned: "planned",
	оплачен: "paid",
	оплачено: "paid",
	paid: "paid",
	просрочен: "overdue",
	просрочено: "overdue",
	просрочка: "overdue",
	overdue: "overdue",
	перенесен: "rescheduled",
	перенесено: "rescheduled",
	перенос: "rescheduled",
	rescheduled: "rescheduled",
	отменен: "cancelled",
	отменено: "cancelled",
	отмена: "cancelled",
	cancelled: "cancelled",
};

export function normalizeTaxApplicationRelationship(
	value: string | null | undefined,
): TaxDeductionApplicationRelationship | null {
	const normalized =
		value
			?.trim()
			.toLocaleLowerCase("ru-RU")
			.replaceAll("ё", "е")
			.replace(/[\s_-]+/g, " ") ?? "";
	if (!normalized) return null;
	if (
		[
			"self",
			"patient",
			"пациент",
			"сам пациент",
			"сама пациентка",
			"налогоплательщик",
		].includes(normalized)
	)
		return "self";
	if (
		["spouse", "husband", "wife", "супруг", "супруга", "муж", "жена"].includes(
			normalized,
		)
	)
		return "spouse";
	if (
		[
			"parent",
			"father",
			"mother",
			"родитель",
			"отец",
			"мать",
			"папа",
			"мама",
		].includes(normalized)
	)
		return "parent";
	if (
		[
			"child",
			"son",
			"daughter",
			"ребенок",
			"сын",
			"дочь",
			"усыновленный",
			"усыновленная",
		].includes(normalized)
	)
		return "child";
	if (
		["ward", "подопечный", "подопечная", "опекаемый", "опекаемая"].includes(
			normalized,
		)
	)
		return "ward";
	return null;
}

export const procedureSpecificConsentProcedureOptions: Array<{
	value: ProcedureSpecificConsentProcedure;
	label: string;
}> = [
	{ value: "local_anesthesia", label: "Местная анестезия" },
	{
		value: "therapy_endo_restoration",
		label: "Терапия, эндодонтия, реставрация",
	},
	{ value: "surgery_extraction", label: "Хирургия / удаление" },
	{ value: "implantation_bone_graft", label: "Имплантация / костная пластика" },
	{ value: "prosthetics", label: "Ортопедия" },
	{ value: "orthodontics", label: "Ортодонтия" },
	{ value: "hygiene_whitening", label: "Гигиена / отбеливание" },
	{ value: "periodontology", label: "Пародонтология" },
	{ value: "other", label: "Другая процедура" },
];

export const aiJobKindPreferenceValues: readonly AiJobKind[] = [
	"voice_transcription",
	"visit_note_draft",
	"image_summary",
	"document_draft",
	"paper_ocr",
];

export const aiJobKindLabels: Record<AiJobKind, string> = {
	voice_transcription: "диктовка врача",
	visit_note_draft: "черновик приема",
	image_summary: "описание снимка",
	document_draft: "черновик документа",
	paper_ocr: "разбор бумажного журнала",
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
	return isRecordKey(value, paymentMethodLabels);
}

export function isPricelistSourceKind(
	value: unknown,
): value is PricelistSourceKind {
	return isRecordKey(value, pricelistSourceKindLabels);
}

export function isAiJobKind(value: unknown): value is AiJobKind {
	return (
		typeof value === "string" &&
		aiJobKindPreferenceValues.includes(value as AiJobKind)
	);
}

export function isAiRecognitionTarget(
	value: unknown,
): value is AiRecognitionTarget {
	return isRecordKey(value, recognitionTargetLabels);
}

export function isImportSourceKind(value: unknown): value is ImportSourceKind {
	return isRecordKey(value, importSourceLabels);
}

export function isDocumentIngestionTarget(
	value: unknown,
): value is DocumentIngestionTarget {
	return isRecordKey(value, ingestionTargetLabels);
}

export function isImagingSourceKind(
	value: unknown,
): value is ImagingSourceKind {
	return isRecordKey(value, imagingSourceLabels);
}

export function isSmartImportMode(value: unknown): value is SmartImportMode {
	return isRecordKey(value, smartImportModeLabels);
}

export function isImagingKindFilter(
	value: unknown,
): value is ImagingStudyKind | "all" {
	return value === "all" || isRecordKey(value, imagingKindLabels);
}

export function isTaxDocumentYearPreference(value: unknown): value is number {
	if (!Number.isInteger(value)) return false;
	const year = value as number;
	return year >= 2021 && year <= 2100;
}

export function isDocumentKindPreference(
	value: unknown,
): value is GeneratedDocument["kind"] {
	return isRecordKey(value, documentKindMetadata);
}

export function isAppointmentStatusFilterPreference(
	value: unknown,
): value is Appointment["status"] | "all" {
	return value === "all" || isRecordKey(value, appointmentLabels);
}

export function isTaxApplicationFormPreference(
	value: unknown,
): value is TaxDeductionApplicationForm {
	return isOptionValue(value, taxApplicationFormOptions);
}

export function isTaxApplicationDeliveryChannelPreference(
	value: unknown,
): value is TaxDeductionApplicationDeliveryChannel {
	return isOptionValue(value, taxApplicationDeliveryChannelOptions);
}

export function isProcedureSpecificConsentProcedurePreference(
	value: unknown,
): value is ProcedureSpecificConsentProcedure {
	return isOptionValue(value, procedureSpecificConsentProcedureOptions);
}

export function isPostVisitCareTopicPreference(
	value: unknown,
): value is PostVisitCareTopic {
	return isOptionValue(value, postVisitCareTopicOptions);
}

export function isDocumentIssueSignatureModePreference(
	value: unknown,
): value is DocumentIssueSignatureMode {
	return (
		value === "paper_signed" ||
		value === "simple_electronic_signature" ||
		value === "qualified_electronic_signature"
	);
}

export function isNullablePreferenceString(
	value: unknown,
): value is string | null {
	return value === null || isBoundedPreferenceString(value);
}

export function isOnboardingStepPreference(
	value: unknown,
): value is OnboardingStep {
	return (
		typeof value === "string" &&
		onboardingStepValues.includes(value as OnboardingStep)
	);
}

export function normalizedTaxApplicationRelationshipSelect(
	value: unknown,
): TaxDeductionApplicationRelationship {
	return isOptionValue(value, taxApplicationRelationshipOptions)
		? value
		: "self";
}

export function normalizedTaxApplicationForm(
	value: unknown,
): TaxDeductionApplicationForm {
	return isTaxApplicationFormPreference(value)
		? value
		: defaultUiPreferences.taxApplicationForm;
}

export function normalizedTaxApplicationDeliveryChannel(
	value: unknown,
): TaxDeductionApplicationDeliveryChannel {
	return isTaxApplicationDeliveryChannelPreference(value)
		? value
		: defaultUiPreferences.taxApplicationDeliveryChannel;
}

export function normalizedProcedureSpecificConsentProcedure(
	value: unknown,
): ProcedureSpecificConsentProcedure {
	return isProcedureSpecificConsentProcedurePreference(value)
		? value
		: defaultUiPreferences.procedureConsentProcedureType;
}

export function normalizedTreatmentPlanAcceptanceVariant(
	value: unknown,
): TreatmentPlanAcceptanceVariant {
	return isStringUnionValue(value, treatmentAcceptanceVariantOptions)
		? value
		: "standard";
}

export function normalizedPostVisitCareTopic(
	value: unknown,
): PostVisitCareTopic {
	return isPostVisitCareTopicPreference(value)
		? value
		: defaultUiPreferences.postVisitCareTopic;
}

export function normalizedXrayStudyType(
	value: unknown,
): XrayCbctReferralStudyType {
	return isOptionValue(value, xrayStudyTypeOptions) ? value : "cbct";
}

export function normalizedXrayPriority(
	value: unknown,
): XrayCbctReferralPriority {
	return isStringUnionValue(value, xrayPriorityOptions) ? value : "routine";
}

export function normalizedXrayPregnancyStatus(
	value: unknown,
): XrayCbctReferralPregnancyStatus {
	return isOptionValue(value, xrayPregnancyStatusOptions) ? value : "unknown";
}

export function normalizedOutpatient025uDemographicCode(
	value: unknown,
): Outpatient025uDemographicCode {
	return isStringUnionValue(value, outpatient025uDemographicCodeOptions)
		? value
		: "unknown";
}

export function normalizedMedicalDocumentReleaseChannel(
	value: unknown,
): MedicalDocumentReleaseChannel {
	return isRecordKey(value, medicalDocumentReleaseChannelLabels)
		? value
		: "paper";
}

export function normalizedPaymentRefundCorrectionAction(
	value: unknown,
): PaymentRefundCorrectionAction {
	return isStringUnionValue(value, paymentRefundCorrectionActionOptions)
		? value
		: "partial_refund";
}

export function normalizedPaymentRefundCorrectionMethod(
	value: unknown,
): PaymentRefundCorrectionMethod {
	return isStringUnionValue(value, paymentRefundCorrectionMethodOptions)
		? value
		: "card";
}

export function normalizedClinicalRuleAction(
	value: unknown,
): Dashboard["clinicalRules"][number]["action"] {
	return isRecordKey(value, clinicalRuleActionLabels)
		? value
		: "add_required_service";
}

export function normalizedClinicalRuleSeverity(
	value: unknown,
): Dashboard["clinicalRules"][number]["severity"] {
	return isRecordKey(value, clinicalRuleSeverityLabels) ? value : "warning";
}

export function normalizedServiceCategory(
	value: unknown,
): Dashboard["serviceCatalog"][number]["category"] {
	return isRecordKey(value, serviceCategoryLabels) ? value : "therapy";
}

export function normalizeUiPreferencesPayload(
	parsed: unknown,
): UiPreferences | null {
	if (
		!parsed ||
		typeof parsed !== "object" ||
		(parsed as { version?: unknown }).version !== 1
	) {
		return null;
	}
	const source = parsed as Record<string, unknown>;
	const legacyIssueSignatureDraft = loadDocumentIssueSignatureDraft();
	return {
		version: 1,
		uiLanguage: pickUiPreference(
			source,
			"uiLanguage",
			defaultUiPreferences.uiLanguage,
			isUiLanguage,
		),
		selectedWorkspaceRole: pickUiPreference(
			source,
			"selectedWorkspaceRole",
			defaultUiPreferences.selectedWorkspaceRole,
			isStaffRole,
		),
		selectedSpecialty: pickUiPreference(
			source,
			"selectedSpecialty",
			defaultUiPreferences.selectedSpecialty,
			isDentalSpecialty,
		),
		selectedProtocolId: pickUiPreference(
			source,
			"selectedProtocolId",
			defaultUiPreferences.selectedProtocolId,
			isNullablePreferenceString,
		),
		selectedPatientId: pickUiPreference(
			source,
			"selectedPatientId",
			defaultUiPreferences.selectedPatientId,
			isNullablePreferenceString,
		),
		scheduleDoctorFilterId: pickUiPreference(
			source,
			"scheduleDoctorFilterId",
			defaultUiPreferences.scheduleDoctorFilterId,
			isNullablePreferenceString,
		),
		scheduleAssistantFilterId: pickUiPreference(
			source,
			"scheduleAssistantFilterId",
			defaultUiPreferences.scheduleAssistantFilterId,
			isNullablePreferenceString,
		),
		scheduleChairFilterId: pickUiPreference(
			source,
			"scheduleChairFilterId",
			defaultUiPreferences.scheduleChairFilterId,
			isNullablePreferenceString,
		),
		scheduleDefaultDoctorUserId: pickUiPreference(
			source,
			"scheduleDefaultDoctorUserId",
			defaultUiPreferences.scheduleDefaultDoctorUserId,
			isNullablePreferenceString,
		),
		scheduleDefaultAssistantUserId: pickUiPreference(
			source,
			"scheduleDefaultAssistantUserId",
			defaultUiPreferences.scheduleDefaultAssistantUserId,
			isNullablePreferenceString,
		),
		scheduleDefaultChairId: pickUiPreference(
			source,
			"scheduleDefaultChairId",
			defaultUiPreferences.scheduleDefaultChairId,
			isNullablePreferenceString,
		),
		scheduleStatusFilter: pickUiPreference(
			source,
			"scheduleStatusFilter",
			defaultUiPreferences.scheduleStatusFilter,
			isAppointmentStatusFilterPreference,
		),
		scheduleDateFilter: pickUiPreference(
			source,
			"scheduleDateFilter",
			defaultUiPreferences.scheduleDateFilter,
			isBoundedPreferenceString,
		),
		paymentMethod: pickUiPreference(
			source,
			"paymentMethod",
			defaultUiPreferences.paymentMethod,
			isPaymentMethod,
		),
		taxDocumentYear: pickUiPreference(
			source,
			"taxDocumentYear",
			defaultUiPreferences.taxDocumentYear,
			isTaxDocumentYearPreference,
		),
		selectedDocumentKind: pickUiPreference(
			source,
			"selectedDocumentKind",
			defaultUiPreferences.selectedDocumentKind,
			isDocumentKindPreference,
		),
		taxApplicationForm: pickUiPreference(
			source,
			"taxApplicationForm",
			defaultUiPreferences.taxApplicationForm,
			isTaxApplicationFormPreference,
		),
		taxApplicationDeliveryChannel: pickUiPreference(
			source,
			"taxApplicationDeliveryChannel",
			defaultUiPreferences.taxApplicationDeliveryChannel,
			isTaxApplicationDeliveryChannelPreference,
		),
		paymentReceiptTaxSupportRequested: pickUiPreference(
			source,
			"paymentReceiptTaxSupportRequested",
			defaultUiPreferences.paymentReceiptTaxSupportRequested,
			isBooleanPreference,
		),
		documentIssueSignatureMode: pickUiPreference(
			source,
			"documentIssueSignatureMode",
			legacyIssueSignatureDraft.mode,
			isDocumentIssueSignatureModePreference,
		),
		documentIssueStaffFullName: pickUiPreference(
			source,
			"documentIssueStaffFullName",
			legacyIssueSignatureDraft.staffFullName,
			isBoundedPreferenceString,
		).slice(0, 160),
		documentIssueStaffRole:
			pickUiPreference(
				source,
				"documentIssueStaffRole",
				legacyIssueSignatureDraft.staffRole,
				isBoundedPreferenceString,
			).slice(0, 120) || defaultUiPreferences.documentIssueStaffRole,
		procedureConsentProcedureType: pickUiPreference(
			source,
			"procedureConsentProcedureType",
			defaultUiPreferences.procedureConsentProcedureType,
			isProcedureSpecificConsentProcedurePreference,
		),
		postVisitCareTopic: pickUiPreference(
			source,
			"postVisitCareTopic",
			defaultUiPreferences.postVisitCareTopic,
			isPostVisitCareTopicPreference,
		),
		pricelistSourceKind: pickUiPreference(
			source,
			"pricelistSourceKind",
			defaultUiPreferences.pricelistSourceKind,
			isPricelistSourceKind,
		),
		usePricelistAi: pickUiPreference(
			source,
			"usePricelistAi",
			defaultUiPreferences.usePricelistAi,
			isBooleanPreference,
		),
		odontogramUseSurfaces: pickUiPreference(
			source,
			"odontogramUseSurfaces",
			defaultUiPreferences.odontogramUseSurfaces,
			isBooleanPreference,
		),
		recognitionKind: pickUiPreference(
			source,
			"recognitionKind",
			defaultUiPreferences.recognitionKind,
			isAiJobKind,
		),
		recognitionTarget: pickUiPreference(
			source,
			"recognitionTarget",
			defaultUiPreferences.recognitionTarget,
			isAiRecognitionTarget,
		),
		importSourceKind: pickUiPreference(
			source,
			"importSourceKind",
			defaultUiPreferences.importSourceKind,
			isImportSourceKind,
		),
		documentIngestionTarget: pickUiPreference(
			source,
			"documentIngestionTarget",
			defaultUiPreferences.documentIngestionTarget,
			isDocumentIngestionTarget,
		),
		imagingImportSourceKind: pickUiPreference(
			source,
			"imagingImportSourceKind",
			defaultUiPreferences.imagingImportSourceKind,
			isImagingSourceKind,
		),
		smartImportMode: pickUiPreference(
			source,
			"smartImportMode",
			defaultUiPreferences.smartImportMode,
			isSmartImportMode,
		),
		imagingKindFilter: pickUiPreference(
			source,
			"imagingKindFilter",
			defaultUiPreferences.imagingKindFilter,
			isImagingKindFilter,
		),
		dicomWebEndpointUrl: pickUiPreference(
			source,
			"dicomWebEndpointUrl",
			defaultUiPreferences.dicomWebEndpointUrl,
			isBoundedPreferenceString,
		),
		ohifBaseUrl: pickUiPreference(
			source,
			"ohifBaseUrl",
			defaultUiPreferences.ohifBaseUrl,
			isBoundedPreferenceString,
		),
		telegramBotConfigId: pickUiPreference(
			source,
			"telegramBotConfigId",
			defaultUiPreferences.telegramBotConfigId,
			isBoundedPreferenceString,
		)
			.trim()
			.slice(0, 160),
		telegramLinkSubjectType: pickUiPreference(
			source,
			"telegramLinkSubjectType",
			defaultUiPreferences.telegramLinkSubjectType,
			isTelegramLinkSubjectTypePreference,
		),
		telegramLinkStaffId: pickUiPreference(
			source,
			"telegramLinkStaffId",
			defaultUiPreferences.telegramLinkStaffId,
			isNullablePreferenceString,
		),
		telegramOutboxStatusFilter: pickUiPreference(
			source,
			"telegramOutboxStatusFilter",
			defaultUiPreferences.telegramOutboxStatusFilter,
			isTelegramOutboxStatusFilterPreference,
		),
		telegramOutboxTemplateFilter: pickUiPreference(
			source,
			"telegramOutboxTemplateFilter",
			defaultUiPreferences.telegramOutboxTemplateFilter,
			isTelegramOutboxTemplateFilterPreference,
		),
		onboardingDismissed: pickUiPreference(
			source,
			"onboardingDismissed",
			defaultUiPreferences.onboardingDismissed,
			isBooleanPreference,
		),
		onboardingDismissedAt: pickUiPreference(
			source,
			"onboardingDismissedAt",
			defaultUiPreferences.onboardingDismissedAt,
			isNullablePreferenceString,
		),
		onboardingStep: pickUiPreference(
			source,
			"onboardingStep",
			defaultUiPreferences.onboardingStep,
			isOnboardingStepPreference,
		),
		onboardingDraftMode: pickUiPreference(
			source,
			"onboardingDraftMode",
			defaultUiPreferences.onboardingDraftMode,
			isBooleanPreference,
		),
		savedAt: typeof source.savedAt === "string" ? source.savedAt : "",
	};
}

export function withSavedUiPreferenceTimestamp(
	preferences: UiPreferencesInput,
): UiPreferences {
	return {
		version: 1,
		...preferences,
		savedAt: new Date().toISOString(),
	};
}

export { denteAdminSecretRequestHeaders };

export async function loadServerUiPreferences(
	adminSecret?: string,
): Promise<UiPreferences | null> {
	const response = await fetch(uiPreferencesServerPath, {
		headers: denteAdminSecretRequestHeaders({}, adminSecret),
	});
	if (!response.ok) return null;
	const payload = (await response.json()) as { preferences?: unknown };
	return normalizeUiPreferencesPayload(payload.preferences) ?? null;
}

export async function saveServerUiPreferences(
	preferences: UiPreferences,
	adminSecret?: string,
): Promise<void> {
	const response = await fetch(uiPreferencesServerPath, {
		method: "PUT",
		headers: denteAdminSecretRequestHeaders(
			{ "Content-Type": "application/json" },
			adminSecret,
		),
		body: JSON.stringify(preferences),
	});
	if (!response.ok) {
		throw new Error(
			await responseErrorMessage(response, "Настройки интерфейса не сохранены"),
		);
	}
}

export function responseStatusFailureLabel(response: Response): string {
	if (response.status === 0) return "нет ответа сервера";
	if (response.status === 400) return "сервер не принял данные";
	if (response.status === 401 || response.status === 403)
		return "нет доступа к действию";
	if (response.status === 404) return "нужный маршрут не найден";
	if (response.status === 409) return "данные уже изменились, обновите экран";
	if (response.status === 413) return "файл или запрос слишком большой";
	if (response.status === 422) return "данные не прошли проверку";
	if (response.status === 429) return "слишком много запросов, повторите позже";
	if (response.status >= 500) return "сервер не смог выполнить действие";
	return `сервер вернул код ${response.status}`;
}

export async function responseErrorMessage(
	response: Response,
	fallback: string,
): Promise<string> {
	try {
		const payload = (await response.clone().json()) as {
			error?: unknown;
			message?: unknown;
		};
		const detail =
			typeof payload.message === "string"
				? payload.message
				: typeof payload.error === "string"
					? payload.error
					: null;
		const operatorDetail = operatorReadableErrorDetail(detail);
		return operatorDetail
			? `${fallback}: ${operatorDetail}`
			: `${fallback}: ${responseStatusFailureLabel(response)}`;
	} catch {
		return `${fallback}: ${responseStatusFailureLabel(response)}`;
	}
}

export const technicalWorkflowFailurePattern =
	/\b(TypeError|DOMException|SyntaxError|ReferenceError|Failed to fetch|NetworkError|Load failed|fetch|JSON|ENOENT|EACCES|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|stack|undefined|null|NaN|[A-Z][A-Z0-9_]{5,})\b|\/api\/|https?:\/\/|[A-Za-z]:\\|\\\\[^\\]+\\|\/(Users|home|var|tmp)\//i;

export function nullableAppointmentDraftValue(value: string): string | null {
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

export function buildPatientCorePayload(
	draft: PatientCoreDraft,
): UpdatePatientInput {
	return {
		fullName: draft.fullName.trim(),
		birthDate: nullablePatientDraftValue(draft.birthDate),
		phone: nullablePatientDraftValue(draft.phone),
		email: nullablePatientDraftValue(draft.email),
		notes: nullablePatientDraftValue(draft.notes),
	};
}

export function isVisitNoteForm(value: unknown): value is VisitNoteForm {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<Record<VisitNoteField, unknown>>;
	return visitNoteFieldDefinitions.every(
		({ key }) => typeof candidate[key] === "string",
	);
}

export function loadVisitLocalDraft(
	visitId: string,
	organizationId: string | null | undefined = null,
): VisitLocalDraft | null {
	if (typeof window === "undefined") return null;
	try {
		const raw =
			safeLocalStorageGetItem(visitLocalDraftKey(visitId, organizationId)) ??
			(organizationId
				? safeLocalStorageGetItem(visitLocalDraftKey(visitId))
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<VisitLocalDraft>;
		if (
			parsed.version !== 1 ||
			parsed.visitId !== visitId ||
			typeof parsed.savedAt !== "string" ||
			typeof parsed.transcript !== "string" ||
			!isDentalSpecialty(parsed.selectedSpecialty) ||
			!isVisitNoteForm(parsed.visitNoteForm)
		) {
			return null;
		}
		if (!localSavedAtFresh(parsed.savedAt, sensitiveLocalDraftRetentionMs)) {
			safeLocalStorageRemoveItem(visitLocalDraftKey(visitId, organizationId));
			if (organizationId)
				safeLocalStorageRemoveItem(visitLocalDraftKey(visitId));
			return null;
		}
		return parsed as VisitLocalDraft;
	} catch {
		return null;
	}
}

export function saveVisitLocalDraft(
	draft: VisitLocalDraft,
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	safeLocalStorageSetItem(
		visitLocalDraftKey(draft.visitId, organizationId),
		JSON.stringify(draft),
	);
}

export function isVisitNoteDraft(value: unknown): value is VisitNoteDraft {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<VisitNoteDraft>;
	return (
		isNullableString(candidate.complaint) &&
		isNullableString(candidate.anamnesis) &&
		isNullableString(candidate.objectiveStatus) &&
		isNullableString(candidate.diagnosis) &&
		isNullableString(candidate.treatmentPlan) &&
		Array.isArray(candidate.warnings) &&
		candidate.warnings.every((warning) => typeof warning === "string")
	);
}

export function parsePendingVisitSaveQueue(
	raw: string | null,
	activeOrganizationId: string | null | undefined,
	legacyOrganizationFallback: string | null | undefined = null,
): PendingVisitSave[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((item): PendingVisitSave[] => {
			const normalized = normalizePendingVisitSave(
				item,
				activeOrganizationId,
				legacyOrganizationFallback,
			);
			return normalized ? [normalized] : [];
		});
	} catch {
		return [];
	}
}

export function normalizePendingVisitSave(
	value: unknown,
	activeOrganizationId: string | null | undefined,
	legacyOrganizationFallback: string | null | undefined = null,
): PendingVisitSave | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<PendingVisitSave>;
	const {
		id,
		visitId,
		queuedAt,
		draft,
		doctorSummary,
		transcript,
		selectedSpecialty,
	} = candidate;
	const organizationId =
		normalizedLocalOrganizationId(candidate.organizationId) ??
		normalizedLocalOrganizationId(legacyOrganizationFallback);
	if (
		candidate.version !== 1 ||
		typeof id !== "string" ||
		!localQueueOrganizationMatches(organizationId, activeOrganizationId) ||
		typeof visitId !== "string" ||
		typeof queuedAt !== "string" ||
		!localSavedAtFresh(queuedAt, sensitiveLocalDraftRetentionMs) ||
		!isVisitNoteDraft(draft) ||
		!isNullableString(doctorSummary) ||
		typeof transcript !== "string" ||
		!isDentalSpecialty(selectedSpecialty)
	) {
		return null;
	}
	const normalizedBaseRevision =
		typeof candidate.baseRevision === "number" &&
		Number.isInteger(candidate.baseRevision)
			? candidate.baseRevision
			: null;
	return {
		version: 1,
		id,
		organizationId,
		visitId,
		clientMutationId:
			typeof candidate.clientMutationId === "string"
				? candidate.clientMutationId
				: id,
		baseRevision: normalizedBaseRevision,
		queuedAt,
		draft,
		doctorSummary,
		transcript,
		selectedSpecialty,
	};
}

export function sortPendingVisitSaves(
	queue: PendingVisitSave[],
): PendingVisitSave[] {
	return queue
		.slice()
		.sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}

export function loadPendingVisitSavesFromLocalStorage(
	organizationId: string | null | undefined = null,
): PendingVisitSave[] {
	if (typeof window === "undefined") return [];
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const localKey = pendingVisitSaveQueueLocalKey(normalizedOrganizationId);
	const scopedRaw = safeLocalStorageGetItem(localKey);
	const legacyRaw = normalizedOrganizationId
		? safeLocalStorageGetItem(pendingVisitSaveQueueKey)
		: null;
	const byId = new Map<string, PendingVisitSave>();
	for (const item of parsePendingVisitSaveQueue(
		scopedRaw,
		normalizedOrganizationId,
	)) {
		byId.set(item.id, item);
	}
	for (const item of parsePendingVisitSaveQueue(
		legacyRaw,
		normalizedOrganizationId,
		normalizedOrganizationId,
	)) {
		byId.set(item.id, item);
	}
	const queue = sortPendingVisitSaves(Array.from(byId.values()));
	if (normalizedOrganizationId && legacyRaw) {
		savePendingVisitSavesToLocalStorage(queue, normalizedOrganizationId);
		safeLocalStorageRemoveItem(pendingVisitSaveQueueKey);
	}
	return queue;
}

export function isPendingSpeechChunk(
	value: unknown,
): value is PendingSpeechChunk {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<PendingSpeechChunk>;
	return (
		candidate.version === 1 &&
		typeof candidate.id === "string" &&
		typeof candidate.queuedAt === "string" &&
		typeof candidate.recordingId === "string" &&
		typeof candidate.chunkIndex === "number" &&
		Number.isInteger(candidate.chunkIndex) &&
		typeof candidate.mimeType === "string" &&
		typeof candidate.language === "string" &&
		typeof candidate.source === "string" &&
		(typeof candidate.audioBase64 === "string" ||
			typeof candidate.localTranscript === "string")
	);
}

export function normalizePendingSpeechChunk(
	value: unknown,
	activeOrganizationId: string | null | undefined,
	legacyOrganizationFallback: string | null | undefined = null,
): PendingSpeechChunk | null {
	if (!isPendingSpeechChunk(value)) return null;
	const organizationId =
		normalizedLocalOrganizationId(value.organizationId) ??
		normalizedLocalOrganizationId(legacyOrganizationFallback);
	if (!localQueueOrganizationMatches(organizationId, activeOrganizationId))
		return null;
	if (!localSavedAtFresh(value.queuedAt, speechAudioQueueRetentionMs))
		return null;
	return { ...value, organizationId };
}

export function sortPendingSpeechChunks(
	queue: PendingSpeechChunk[],
): PendingSpeechChunk[] {
	return queue
		.slice()
		.sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
}

export function loadPendingSpeechChunksFromLocalStorage(
	organizationId: string | null | undefined = null,
): PendingSpeechChunk[] {
	if (typeof window === "undefined") return [];
	try {
		const normalizedOrganizationId =
			normalizedLocalOrganizationId(organizationId);
		const localKey = pendingSpeechChunkQueueLocalKey(normalizedOrganizationId);
		const scopedRaw = safeLocalStorageGetItem(localKey);
		const legacyRaw = normalizedOrganizationId
			? safeLocalStorageGetItem(pendingSpeechChunkQueueKey)
			: null;
		const byId = new Map<string, PendingSpeechChunk>();
		for (const raw of [scopedRaw, legacyRaw]) {
			if (!raw) continue;
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) continue;
			for (const item of parsed) {
				const normalized = normalizePendingSpeechChunk(
					item,
					normalizedOrganizationId,
					raw === legacyRaw ? normalizedOrganizationId : null,
				);
				if (normalized) byId.set(normalized.id, normalized);
			}
		}
		const queue = sortPendingSpeechChunks(Array.from(byId.values()));
		if (normalizedOrganizationId && legacyRaw) {
			savePendingSpeechChunksToLocalStorage(queue, normalizedOrganizationId);
			safeLocalStorageRemoveItem(pendingSpeechChunkQueueKey);
		}
		return queue;
	} catch {
		return [];
	}
}

export function pendingVisitSaveIndexedDbAvailable(): boolean {
	return speechChunkIndexedDbAvailable();
}

export function assertSpeechChunkDbStores(db: IDBDatabase): void {
	const missingStores = requiredSpeechChunkDbStoreNames.filter(
		(storeName) => !db.objectStoreNames.contains(storeName),
	);
	if (missingStores.length) {
		throw new Error(
			`Offline IndexedDB schema is missing stores: ${missingStores.join(", ")}`,
		);
	}
}

export async function readLocalDicomWorkbenchDraftFromIndexedDb(
	organizationId: string | null | undefined = null,
): Promise<DicomWorkbenchLocalDraft | null> {
	const db = await openSpeechChunkDb();
	const key = dicomWorkbenchIndexedDbKey(organizationId);
	const record = await new Promise<unknown>((resolve, reject) => {
		const transaction = db.transaction(
			dicomWorkbenchDraftStoreName,
			"readonly",
		);
		const request = transaction
			.objectStore(dicomWorkbenchDraftStoreName)
			.get(key);
		request.onsuccess = () => resolve(request.result ?? null);
		request.onerror = () =>
			reject(
				request.error ?? new Error("Local DICOM workbench draft read failed"),
			);
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft transaction failed"),
			);
	});
	const normalized = normalizeLocalDicomWorkbenchDraft(record);
	if (!normalized && record && typeof record === "object") {
		await deleteLocalDicomWorkbenchDraftFromIndexedDb(organizationId).catch(
			() => undefined,
		);
	}
	return normalized;
}

export async function saveLocalDicomWorkbenchDraftToIndexedDb(
	draft: DicomWorkbenchLocalDraft,
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const record: DicomWorkbenchIndexedDbDraft = {
		...draft,
		storageKey: dicomWorkbenchIndexedDbKey(normalizedOrganizationId),
		organizationId: normalizedOrganizationId,
	};
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(
			dicomWorkbenchDraftStoreName,
			"readwrite",
		);
		transaction.objectStore(dicomWorkbenchDraftStoreName).put(record);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft save failed"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft save aborted"),
			);
	});
}

export async function deleteLocalDicomWorkbenchDraftFromIndexedDb(
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(
			dicomWorkbenchDraftStoreName,
			"readwrite",
		);
		transaction
			.objectStore(dicomWorkbenchDraftStoreName)
			.delete(dicomWorkbenchIndexedDbKey(organizationId));
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft delete failed"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Local DICOM workbench draft delete aborted"),
			);
	});
}

export async function migrateLocalDicomWorkbenchDraftFromLocalStorage(
	organizationId: string | null | undefined = null,
): Promise<void> {
	if (!speechChunkIndexedDbAvailable()) return;
	const legacyDraft =
		loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
	if (!legacyDraft) return;
	const existing = await readLocalDicomWorkbenchDraftFromIndexedDb(
		organizationId,
	).catch((err) => {
		logger.error("[Dente] read draft error:", err);
		showToast(
			actionFailureToast(
				"Ошибка чтения черновика DICOM",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	});
	const draft = newerDicomWorkbenchDraft(existing, legacyDraft);
	if (!draft) return;
	await saveLocalDicomWorkbenchDraftToIndexedDb(draft, organizationId);
	removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
}

export async function loadLocalDicomWorkbenchDraft(
	organizationId: string | null | undefined = null,
): Promise<DicomWorkbenchLocalDraft | null> {
	if (!speechChunkIndexedDbAvailable())
		return loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
	try {
		await migrateLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
		return await readLocalDicomWorkbenchDraftFromIndexedDb(organizationId);
	} catch {
		return loadLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
	}
}

export async function saveLocalDicomWorkbenchDraft(
	manifest: DicomViewerWorkbenchManifestResponse,
	clientSavedAt: string,
	organizationId: string | null | undefined = null,
): Promise<boolean> {
	const draft = createLocalDicomWorkbenchDraft(manifest, clientSavedAt);
	if (speechChunkIndexedDbAvailable()) {
		try {
			await saveLocalDicomWorkbenchDraftToIndexedDb(draft, organizationId);
			removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
			return true;
		} catch {
			// Keep local CT workbench recovery available on restricted browsers.
		}
	}
	return saveLocalDicomWorkbenchDraftToLocalStorage(draft, organizationId);
}

export async function removeLocalDicomWorkbenchDraft(
	organizationId: string | null | undefined = null,
): Promise<void> {
	if (speechChunkIndexedDbAvailable()) {
		await deleteLocalDicomWorkbenchDraftFromIndexedDb(organizationId).catch(
			() => undefined,
		);
	}
	removeLocalDicomWorkbenchDraftFromLocalStorage(organizationId);
}

export function normalizeMprWorkbenchDraft(
	value: unknown,
	seriesKey: string,
): MprWorkbenchLocalDraft | null {
	if (!value || typeof value !== "object") return null;
	const parsed = value as Partial<MprWorkbenchLocalDraft>;
	if (
		parsed?.version !== 1 ||
		parsed.seriesKey !== seriesKey ||
		typeof parsed.clientSavedAt !== "string"
	)
		return null;
	if (!localSavedAtFresh(parsed.clientSavedAt, sensitiveLocalDraftRetentionMs))
		return null;
	const state = normalizeMprWorkbenchState(parsed.state);
	return state
		? { version: 1, seriesKey, state, clientSavedAt: parsed.clientSavedAt }
		: null;
}

export async function readLocalMprWorkbenchDraftFromIndexedDb(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): Promise<MprWorkbenchLocalDraft | null> {
	const db = await openSpeechChunkDb();
	const key = mprWorkbenchIndexedDbKey(seriesKey, organizationId);
	const record = await new Promise<unknown>((resolve, reject) => {
		const transaction = db.transaction(mprWorkbenchDraftStoreName, "readonly");
		const request = transaction
			.objectStore(mprWorkbenchDraftStoreName)
			.get(key);
		request.onsuccess = () => resolve(request.result ?? null);
		request.onerror = () =>
			reject(
				request.error ?? new Error("Local MPR workbench draft read failed"),
			);
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local MPR workbench draft transaction failed"),
			);
	});
	const normalized = normalizeMprWorkbenchDraft(record, seriesKey);
	if (!normalized && record && typeof record === "object") {
		await deleteLocalMprWorkbenchDraftFromIndexedDb(
			seriesKey,
			organizationId,
		).catch((err) => {
			logger.error("[Dente] delete draft error:", err);
			showToast(
				actionFailureToast(
					"Не удалось удалить черновик MPR",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			return undefined;
		});
	}
	return normalized;
}

export async function saveLocalMprWorkbenchDraftToIndexedDb(
	seriesKey: string,
	state: MprWorkbenchState,
	clientSavedAt: string,
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const record: MprWorkbenchIndexedDbDraft = {
		version: 1,
		seriesKey,
		state,
		clientSavedAt,
		storageKey: mprWorkbenchIndexedDbKey(seriesKey, normalizedOrganizationId),
		organizationId: normalizedOrganizationId,
	};
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(mprWorkbenchDraftStoreName, "readwrite");
		transaction.objectStore(mprWorkbenchDraftStoreName).put(record);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ?? new Error("Local MPR workbench draft save failed"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Local MPR workbench draft save aborted"),
			);
	});
}

export async function deleteLocalMprWorkbenchDraftFromIndexedDb(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(mprWorkbenchDraftStoreName, "readwrite");
		transaction
			.objectStore(mprWorkbenchDraftStoreName)
			.delete(mprWorkbenchIndexedDbKey(seriesKey, organizationId));
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Local MPR workbench draft delete failed"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Local MPR workbench draft delete aborted"),
			);
	});
}

export async function migrateLocalMprWorkbenchDraftFromLocalStorage(
	seriesKey: string,
	organizationId: string | null | undefined = null,
): Promise<void> {
	if (!speechChunkIndexedDbAvailable()) return;
	const legacyDraft = loadLocalMprWorkbenchDraftFromLocalStorage(
		seriesKey,
		organizationId,
	);
	if (!legacyDraft) return;
	const existing = await readLocalMprWorkbenchDraftFromIndexedDb(
		seriesKey,
		organizationId,
	).catch((err) => {
		logger.error("[Dente] read draft error:", err);
		showToast(
			actionFailureToast(
				"Ошибка чтения черновика MPR",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	});
	const draft =
		existing &&
		Date.parse(existing.clientSavedAt) >= Date.parse(legacyDraft.clientSavedAt)
			? existing
			: legacyDraft;
	await saveLocalMprWorkbenchDraftToIndexedDb(
		seriesKey,
		draft.state,
		draft.clientSavedAt,
		organizationId,
	);
	if (typeof window !== "undefined") {
		safeLocalStorageRemoveItem(mprWorkbenchLocalKey(seriesKey, organizationId));
		if (organizationId)
			safeLocalStorageRemoveItem(mprWorkbenchLocalKey(seriesKey));
	}
}

export async function loadLocalMprWorkbenchDraft(
	seriesKey: string | null,
	organizationId: string | null | undefined = null,
): Promise<MprWorkbenchLocalDraft | null> {
	if (!seriesKey) return null;
	if (!speechChunkIndexedDbAvailable())
		return loadLocalMprWorkbenchDraftFromLocalStorage(
			seriesKey,
			organizationId,
		);
	try {
		await migrateLocalMprWorkbenchDraftFromLocalStorage(
			seriesKey,
			organizationId,
		);
		return await readLocalMprWorkbenchDraftFromIndexedDb(
			seriesKey,
			organizationId,
		);
	} catch {
		return loadLocalMprWorkbenchDraftFromLocalStorage(
			seriesKey,
			organizationId,
		);
	}
}

export async function saveLocalMprWorkbenchDraft(
	seriesKey: string,
	state: MprWorkbenchState,
	clientSavedAt: string,
	organizationId: string | null | undefined = null,
): Promise<boolean> {
	if (speechChunkIndexedDbAvailable()) {
		try {
			await saveLocalMprWorkbenchDraftToIndexedDb(
				seriesKey,
				state,
				clientSavedAt,
				organizationId,
			);
			if (typeof window !== "undefined") {
				safeLocalStorageRemoveItem(
					mprWorkbenchLocalKey(seriesKey, organizationId),
				);
				if (organizationId)
					safeLocalStorageRemoveItem(mprWorkbenchLocalKey(seriesKey));
			}
			return true;
		} catch {
			// Keep MPR recovery available on restricted browsers.
		}
	}
	return saveLocalMprWorkbenchDraftToLocalStorage(
		seriesKey,
		state,
		clientSavedAt,
		organizationId,
	);
}

export async function readPendingVisitSavesFromIndexedDb(
	organizationId: string | null | undefined = null,
): Promise<PendingVisitSave[]> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const values = await new Promise<unknown[]>((resolve, reject) => {
		const transaction = db.transaction(pendingVisitSaveStoreName, "readonly");
		const request = transaction.objectStore(pendingVisitSaveStoreName).getAll();
		request.onsuccess = () =>
			resolve(Array.isArray(request.result) ? request.result : []);
		request.onerror = () =>
			reject(request.error ?? new Error("Local visit queue read failed"));
		transaction.onerror = () =>
			reject(
				transaction.error ?? new Error("Local visit queue transaction failed"),
			);
	});
	const queue: PendingVisitSave[] = [];
	const staleIds: string[] = [];
	for (const value of values) {
		const candidate =
			value && typeof value === "object"
				? (value as Partial<PendingVisitSave>)
				: {};
		const normalized = normalizePendingVisitSave(
			value,
			normalizedOrganizationId,
			normalizedOrganizationId,
		);
		if (normalized) {
			queue.push(normalized);
		} else if (typeof candidate.id === "string") {
			const itemOrganizationId =
				normalizedLocalOrganizationId(candidate.organizationId) ??
				normalizedOrganizationId;
			const stale =
				typeof candidate.queuedAt === "string" &&
				!localSavedAtFresh(candidate.queuedAt, sensitiveLocalDraftRetentionMs);
			const malformedActiveRecord = localQueueOrganizationMatches(
				itemOrganizationId,
				normalizedOrganizationId,
			);
			if (stale || malformedActiveRecord) {
				staleIds.push(candidate.id);
			}
		}
	}
	if (staleIds.length) {
		await Promise.allSettled(
			staleIds.map((id) => deletePendingVisitSaveFromIndexedDb(id)),
		);
	}
	return sortPendingVisitSaves(queue);
}

export async function savePendingVisitSavesToIndexedDb(
	queue: PendingVisitSave[],
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const scopedQueue = sortPendingVisitSaves(
		queue
			.map((item) => ({
				...item,
				organizationId:
					normalizedLocalOrganizationId(item.organizationId) ??
					normalizedOrganizationId,
			}))
			.filter(
				(item) =>
					localQueueOrganizationMatches(
						item.organizationId,
						normalizedOrganizationId,
					) && localSavedAtFresh(item.queuedAt, sensitiveLocalDraftRetentionMs),
			),
	);
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(pendingVisitSaveStoreName, "readwrite");
		const store = transaction.objectStore(pendingVisitSaveStoreName);
		const request = store.getAll();
		request.onsuccess = () => {
			const existing = Array.isArray(request.result) ? request.result : [];
			for (const value of existing) {
				const candidate =
					value && typeof value === "object"
						? (value as Partial<PendingVisitSave>)
						: {};
				const itemOrganizationId =
					normalizedLocalOrganizationId(candidate.organizationId) ??
					normalizedOrganizationId;
				const stale =
					typeof candidate.queuedAt === "string" &&
					!localSavedAtFresh(
						candidate.queuedAt,
						sensitiveLocalDraftRetentionMs,
					);
				if (
					typeof candidate.id === "string" &&
					(localQueueOrganizationMatches(
						itemOrganizationId,
						normalizedOrganizationId,
					) ||
						stale)
				) {
					store.delete(candidate.id);
				}
			}
			for (const item of scopedQueue) {
				store.put(item);
			}
		};
		request.onerror = () =>
			reject(request.error ?? new Error("Local visit queue read failed"));
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(transaction.error ?? new Error("Local visit queue save failed"));
		transaction.onabort = () =>
			reject(transaction.error ?? new Error("Local visit queue save aborted"));
	});
}

export async function deletePendingVisitSaveFromIndexedDb(
	id: string,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(pendingVisitSaveStoreName, "readwrite");
		transaction.objectStore(pendingVisitSaveStoreName).delete(id);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(transaction.error ?? new Error("Local visit queue delete failed"));
		transaction.onabort = () =>
			reject(
				transaction.error ?? new Error("Local visit queue delete aborted"),
			);
	});
}

export async function migratePendingVisitSavesFromLocalStorage(
	organizationId: string | null | undefined = null,
): Promise<void> {
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const legacyQueue = loadPendingVisitSavesFromLocalStorage(
		normalizedOrganizationId,
	);
	if (!legacyQueue.length || !pendingVisitSaveIndexedDbAvailable()) return;
	const existing = await readPendingVisitSavesFromIndexedDb(
		normalizedOrganizationId,
	).catch((err) => {
		logger.error("[Dente] read visit saves error:", err);
		showToast(
			actionFailureToast(
				"Ошибка чтения очереди приёмов",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return [];
	});
	const byId = new Map<string, PendingVisitSave>();
	for (const item of [...existing, ...legacyQueue]) {
		byId.set(item.id, item);
	}
	await savePendingVisitSavesToIndexedDb(
		sortPendingVisitSaves(Array.from(byId.values())),
		normalizedOrganizationId,
	);
	safeLocalStorageRemoveItem(
		pendingVisitSaveQueueLocalKey(normalizedOrganizationId),
	);
	if (normalizedOrganizationId)
		safeLocalStorageRemoveItem(pendingVisitSaveQueueKey);
}

export async function loadPendingVisitSaves(
	organizationId: string | null | undefined = null,
): Promise<PendingVisitSave[]> {
	if (!pendingVisitSaveIndexedDbAvailable())
		return loadPendingVisitSavesFromLocalStorage(organizationId);
	try {
		await migratePendingVisitSavesFromLocalStorage(organizationId);
		return await readPendingVisitSavesFromIndexedDb(organizationId);
	} catch {
		return loadPendingVisitSavesFromLocalStorage(organizationId);
	}
}

export async function savePendingVisitSaves(
	queue: PendingVisitSave[],
	organizationId: string | null | undefined = null,
): Promise<void> {
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	if (pendingVisitSaveIndexedDbAvailable()) {
		try {
			await savePendingVisitSavesToIndexedDb(queue, normalizedOrganizationId);
			safeLocalStorageRemoveItem(
				pendingVisitSaveQueueLocalKey(normalizedOrganizationId),
			);
			if (normalizedOrganizationId)
				safeLocalStorageRemoveItem(pendingVisitSaveQueueKey);
			return;
		} catch {
			// Keep accepted visits retryable on restricted browsers.
		}
	}
	savePendingVisitSavesToLocalStorage(queue, normalizedOrganizationId);
}

export async function readPendingSpeechChunksFromIndexedDb(
	organizationId: string | null | undefined = null,
): Promise<PendingSpeechChunk[]> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const values = await new Promise<unknown[]>((resolve, reject) => {
		const transaction = db.transaction(speechChunkStoreName, "readonly");
		const request = transaction.objectStore(speechChunkStoreName).getAll();
		request.onsuccess = () => {
			resolve(Array.isArray(request.result) ? request.result : []);
		};
		request.onerror = () =>
			reject(request.error ?? new Error("Хранилище аудио не прочитано"));
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Операция с хранилищем аудио не выполнена"),
			);
	});
	const queue: PendingSpeechChunk[] = [];
	const staleIds: string[] = [];
	for (const value of values) {
		const id =
			value &&
			typeof value === "object" &&
			typeof (value as Partial<PendingSpeechChunk>).id === "string"
				? (value as Partial<PendingSpeechChunk>).id
				: null;
		const normalized = normalizePendingSpeechChunk(
			value,
			normalizedOrganizationId,
			normalizedOrganizationId,
		);
		if (normalized) {
			queue.push(normalized);
		} else if (
			id &&
			(!isPendingSpeechChunk(value) ||
				!localSavedAtFresh(value.queuedAt, speechAudioQueueRetentionMs))
		) {
			staleIds.push(id);
		}
	}
	if (staleIds.length) {
		await Promise.allSettled(
			staleIds.map((id) => deletePendingSpeechChunkFromIndexedDb(id)),
		);
	}
	return sortPendingSpeechChunks(queue);
}

export async function savePendingSpeechChunksToIndexedDb(
	queue: PendingSpeechChunk[],
	organizationId: string | null | undefined = null,
): Promise<void> {
	const db = await openSpeechChunkDb();
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const scopedQueue = sortPendingSpeechChunks(
		queue
			.map((item) => ({
				...item,
				organizationId:
					normalizedLocalOrganizationId(item.organizationId) ??
					normalizedOrganizationId,
			}))
			.filter(
				(item) =>
					localQueueOrganizationMatches(
						item.organizationId,
						normalizedOrganizationId,
					) && localSavedAtFresh(item.queuedAt, speechAudioQueueRetentionMs),
			),
	);
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(speechChunkStoreName, "readwrite");
		const store = transaction.objectStore(speechChunkStoreName);
		for (const chunk of scopedQueue) {
			store.put(chunk);
		}
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ??
					new Error("Аудио не сохранено в локальное хранилище"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ?? new Error("Сохранение аудио отменено браузером"),
			);
	});
}

export async function putPendingSpeechChunkToIndexedDb(
	chunk: PendingSpeechChunk,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(speechChunkStoreName, "readwrite");
		transaction.objectStore(speechChunkStoreName).put(chunk);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(transaction.error ?? new Error("Очередь аудио не обновлена"));
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Обновление очереди аудио отменено браузером"),
			);
	});
}

export async function deletePendingSpeechChunkFromIndexedDb(
	id: string,
): Promise<void> {
	const db = await openSpeechChunkDb();
	await new Promise<void>((resolve, reject) => {
		const transaction = db.transaction(speechChunkStoreName, "readwrite");
		transaction.objectStore(speechChunkStoreName).delete(id);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(
				transaction.error ?? new Error("Аудио не удалено из локальной очереди"),
			);
		transaction.onabort = () =>
			reject(
				transaction.error ??
					new Error("Удаление аудио из очереди отменено браузером"),
			);
	});
}

export async function migrateSpeechChunksFromLocalStorage(
	organizationId: string | null | undefined = null,
): Promise<void> {
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const legacyQueue = loadPendingSpeechChunksFromLocalStorage(
		normalizedOrganizationId,
	);
	if (!legacyQueue.length || !speechChunkIndexedDbAvailable()) return;
	const existing = await readPendingSpeechChunksFromIndexedDb(
		normalizedOrganizationId,
	).catch((err) => {
		logger.error("[Dente] read speech chunks error:", err);
		showToast(
			actionFailureToast(
				"Ошибка чтения очереди аудиофрагментов",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return [];
	});
	const byId = new Map<string, PendingSpeechChunk>();
	for (const chunk of [...existing, ...legacyQueue]) {
		byId.set(chunk.id, chunk);
	}
	await savePendingSpeechChunksToIndexedDb(
		sortPendingSpeechChunks(Array.from(byId.values())),
		normalizedOrganizationId,
	);
	safeLocalStorageRemoveItem(
		pendingSpeechChunkQueueLocalKey(normalizedOrganizationId),
	);
	if (normalizedOrganizationId)
		safeLocalStorageRemoveItem(pendingSpeechChunkQueueKey);
}

export async function loadPendingSpeechChunks(
	organizationId: string | null | undefined = null,
): Promise<PendingSpeechChunk[]> {
	if (!speechChunkIndexedDbAvailable())
		return loadPendingSpeechChunksFromLocalStorage(organizationId);
	try {
		await migrateSpeechChunksFromLocalStorage(organizationId);
		return await readPendingSpeechChunksFromIndexedDb(organizationId);
	} catch {
		return loadPendingSpeechChunksFromLocalStorage(organizationId);
	}
}

export async function queuePendingSpeechChunk(
	chunk: SpeechChunkUploadInput,
	organizationId: string | null | undefined = null,
): Promise<PendingSpeechChunk | null> {
	if (typeof window === "undefined") return null;
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const queued: PendingSpeechChunk = {
		...chunk,
		version: 1,
		id: createLocalQueueId(),
		organizationId: normalizedOrganizationId,
		queuedAt: new Date().toISOString(),
	};
	if (speechChunkIndexedDbAvailable()) {
		try {
			await migrateSpeechChunksFromLocalStorage(normalizedOrganizationId);
			await putPendingSpeechChunkToIndexedDb(queued);
			safeLocalStorageRemoveItem(
				pendingSpeechChunkQueueLocalKey(normalizedOrganizationId),
			);
			if (normalizedOrganizationId)
				safeLocalStorageRemoveItem(pendingSpeechChunkQueueKey);
			return queued;
		} catch {
			// Fall through to the small legacy fallback. It may reject instead of silently dropping audio.
		}
	}
	try {
		await savePendingSpeechChunksToLocalStorage(
			[
				...loadPendingSpeechChunksFromLocalStorage(normalizedOrganizationId),
				queued,
			],
			normalizedOrganizationId,
		);
		return queued;
	} catch {
		return null;
	}
}

export async function removePendingSpeechChunkById(
	id: string,
	organizationId: string | null | undefined = null,
): Promise<void> {
	if (speechChunkIndexedDbAvailable()) {
		try {
			await deletePendingSpeechChunkFromIndexedDb(id);
			return;
		} catch {
			// Legacy fallback below keeps retry cleanup working when browser audio storage is unavailable mid-session.
		}
	}
	savePendingSpeechChunksToLocalStorage(
		loadPendingSpeechChunksFromLocalStorage(organizationId).filter(
			(chunk) => chunk.id !== id,
		),
		organizationId,
	);
}

export type PricelistImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export const pricelistImageMimeTypes: PricelistImageMimeType[] = [
	"image/jpeg",
	"image/png",
	"image/webp",
];

export const maxPricelistImageBase64Chars = 3_800_000;

export async function preparePricelistImage(file: File): Promise<{
	base64: string;
	mimeType: PricelistImageMimeType;
	note: string;
}> {
	if (!pricelistImageMimeTypes.includes(file.type as PricelistImageMimeType)) {
		throw new Error("Поддерживаются JPEG, PNG или WebP.");
	}

	const dataUrl = await readFileAsDataUrl(file);
	const image = await loadImageFromDataUrl(dataUrl);
	const originalLongestSide = Math.max(image.naturalWidth, image.naturalHeight);
	const outputMimeType: PricelistImageMimeType = "image/jpeg";

	for (const maxSide of [1600, 1200, 900, 720]) {
		const scale = Math.min(1, maxSide / originalLongestSide);
		const width = Math.max(1, Math.round(image.naturalWidth * scale));
		const height = Math.max(1, Math.round(image.naturalHeight * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas недоступен для сжатия изображения.");
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, width, height);
		context.drawImage(image, 0, 0, width, height);

		for (const quality of [0.82, 0.72, 0.62]) {
			const compressed = canvas.toDataURL(outputMimeType, quality);
			const base64 = compressed.split(",")[1] ?? "";
			if (base64.length <= maxPricelistImageBase64Chars) {
				const megapixels = ((width * height) / 1_000_000).toFixed(1);
				return {
					base64,
					mimeType: outputMimeType,
					note: `Фото подготовлено: ${width}x${height}, ${megapixels} Мп, JPEG ${Math.round(quality * 100)}%.`,
				};
			}
		}
	}

	throw new Error(
		"Фото прайса слишком большое даже после сжатия. Нужен более четкий фрагмент страницы.",
	);
}

export async function queuePendingVisitSave(
	save: Omit<
		PendingVisitSave,
		"version" | "id" | "queuedAt" | "organizationId"
	>,
	organizationId: string | null | undefined = null,
): Promise<PendingVisitSave> {
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const queued: PendingVisitSave = {
		...save,
		version: 1,
		id: createLocalQueueId(),
		organizationId: normalizedOrganizationId,
		queuedAt: new Date().toISOString(),
	};
	const existing = await loadPendingVisitSaves(normalizedOrganizationId);
	const withoutSameVisit = existing.filter(
		(item) => item.visitId !== queued.visitId,
	);
	await savePendingVisitSaves(
		[...withoutSameVisit, queued],
		normalizedOrganizationId,
	);
	return queued;
}

export function latestPendingVisitSaveAt(
	queue: PendingVisitSave[],
): string | null {
	const latest = queue[queue.length - 1];
	return latest?.queuedAt ?? null;
}

export function visitSaveReceiptText(
	receipt: AcceptVisitDraftResponse["saveReceipt"],
): string {
	if (receipt.status === "duplicate") {
		return `Повторная отправка распознана: дубль не создан, серверная версия ${receipt.serverRevision}.`;
	}
	if (receipt.warning) {
		return `${receipt.warning} Серверная версия ${receipt.serverRevision}.`;
	}
	return `Сервер подтвердил сохранение ${formatTime(receipt.savedAt)}, версия карты ${receipt.serverRevision}.`;
}

export function isDenteTelegramPortalSection(
	value: string | null,
): value is DenteTelegramPortalSection {
	return Boolean(value && Object.hasOwn(denteTelegramHandoffTargets, value));
}

export const workspaceScopeLabels: Record<
	Dashboard["clinicSettings"]["workspaceProfiles"][number]["scope"],
	string
> = {
	personal: "лично",
	clinic: "клиника",
	branch: "филиал",
	network: "сеть",
};

export const recommendedActionPriorityLabels: Record<
	Dashboard["recommendedActions"][number]["priority"],
	string
> = {
	routine: "план",
	important: "важно",
	urgent: "срочно",
};

export * from "./browserScanUtils";

export type {
	ClinicProfileDraft,
	PatientAdministrativeProfileDraft,
	StaffScheduleDraft,
};
/*
 * РЕ-ЭКСПОРТ ДЛЯ РАБОЧЕГО СТОЛА DICOM. Без этих трёх строк приложение НЕ
 * ЗАГРУЖАЛОСЬ ВООБЩЕ — белый экран, подменённый экраном BootErrorBoundary
 * «Не удалось открыть рабочее место клиники».
 *
 * Замер в живом браузере 2026-08-08 (Playwright, http://127.0.0.1:5173):
 *   SyntaxError: The requested module '/src/AppHelpers.tsx' does not provide
 *   an export named 'collectDicomWorkstationClientFacts'
 *
 * Причина — разорванная цепочка ре-экспорта. `useDicomWorkbenchModule.ts:36-50`
 * берёт эти символы ИЗ ЭТОГО ФАЙЛА, а файл их только импортировал у
 * `./utils/browserScanUtils` (строки 21-27) и наружу не отдавал. Два из трёх
 * (`collectDicomWorkstationClientFacts`, `isBrowserImagingScanAbortError`)
 * вообще не использовались здесь ни разу — импортированы и забыты.
 *
 * ESM сообщает только о ПЕРВОМ недостающем экспорте, поэтому в консоли
 * назывался один символ, а сломано было три. Чинить по тексту ошибки — значит
 * получить тот же отказ на следующем имени.
 *
 * ПОЧЕМУ ЭТОГО НЕ ВИДЕЛ КОМПИЛЯТОР. `tsc -b apps/web --noEmit` даёт НОЛЬ
 * ошибок на этом дефекте: TypeScript разрешает цепочку по типам, а
 * Vite/браузер в рантайме требуют фактического `export` из запрошенного
 * модуля. Зелёный typecheck доказал согласованность типов и ничего не сказал о
 * достижимости — приложение при этом не стартовало ни разу.
 */

export {
	addMinutesToClinicDateTimeLocal,
	buildClinicProfileUpdatePayload,
	buildPatientAdministrativeProfilePayload,
	calendarDayInTimeZone,
	clinicLegalMissingFields,
	clinicLegalReadinessPercent,
	clinicProfileDraftFromProfile,
	clinicProfileDraftSignature,
	clinicProfileEndpoint,
	collectDicomWorkstationClientFacts,
	dateInputValuePlusDays,
	defaultAppointmentStartLocal,
	defaultStaffScheduleDraft,
	defaultWorkingDays,
	emptyClinicProfileDraft,
	formatDateTime,
	formatShortDate,
	formatTime,
	fromDateTimeLocalValue,
	isBrowserImagingScanAbortError,
	isDateInputValue,
	isDateTimeLocalInputValue,
	isDentalSpecialty,
	isoDateLabel,
	isStaffRole,
	isValidDateParts,
	localConvenienceRetentionMs,
	localImagingFolderFingerprint,
	localSavedAtFresh,
	minutesLabel,
	normalizeClockTime,
	normalizedDentalSpecialty,
	normalizedStaffRole,
	normalizeOptionalWorkingDaysDraft,
	normalizeWorkingDaysDraft,
	nullableClinicDraftValue,
	nullablePatientDraftValue,
	organizationScopedLocalStorageKey,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileDraftSignature,
	roleFocusOrder,
	shiftCalendarDay,
	staffScheduleDraftFromWorkingHours,
	staffScheduleDraftSignature,
	staffWorkingHoursFromDraft,
	staffWorkingHoursFromSimpleDraft,
	timeZoneDateParts,
	timeZoneOffsetMinutes,
	timeZoneOffsetSuffix,
	toDateInputValue,
	todayDateInputValue,
	validClockTime,
	weekdayFromDateInput,
};
