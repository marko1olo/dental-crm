/**
 * Canonical barrel export for all decomposed AppHelpers domain modules.
 */

export * from "./types.js";
export * from "./uiFormatters.js";
export * from "./clinicProfileHelpers.js";
export * from "./financialHelpers.js";
export * from "../helpers/telegramHelpers.js";
export * from "./documentHelpers.js";
export * from "./imagingHelpers.js";
export * from "./speechHelpers.js";
export * from "./appointmentHelpers.js";
export * from "./preferenceHelpers.js";
export * from "./persistenceHelpers.js";
export * from "../utils/browserScanUtils.js";

// Explicit re-exports to resolve TS2308 ambiguities between domain modules
export type {
	DocumentIssueSignatureDraft,
	DocumentPayloadDraftEntry,
	DocumentPayloadDraftStore,
	MedicalDocumentReleaseChannel,
	MedicalRecordExtractDocumentDraftFields,
	SettingsTabGroup,
} from "./types.js";

export {
	browserGeneratedId,
	sensitiveLocalDraftRetentionMs,
	loadImageFromDataUrl,
	readFileAsDataUrl,
	blobToBase64,
} from "./uiFormatters.js";

export {
	onboardingStorageKey,
	aiJobKindPreferenceValues,
	aiJobKindLabels,
	isAiJobKind,
	isAiRecognitionTarget,
} from "./preferenceHelpers.js";

export {
	visitSaveReceiptText,
	visitLocalDraftKey,
	loadVisitLocalDraft,
	saveVisitLocalDraft,
	buildOfflineVisitDraftFromTranscript,
} from "./appointmentHelpers.js";

export {
	normalizedLocalOrganizationId,
	localDraftString,
	offlineDraftOrganizationKey,
	localQueueOrganizationMatches,
	createLocalQueueId,
	localImagingFolderStorageKey,
	pendingVisitSaveQueueKey,
} from "./persistenceHelpers.js";

export {
	collectDicomWorkstationClientFacts,
	isBrowserImagingScanAbortError,
	localImagingFolderFingerprint,
} from "../utils/browserScanUtils.js";

export {
	imagingViewerLocalStoragePrefix,
	dicomWorkbenchDraftStoreName,
	mprWorkbenchDraftStoreName,
} from "./imagingHelpers.js";
export {
	cleanPhoneDigits,
	formatRussianPhone,
	formatPhoneDisplay,
	formatRubles,
	formatDateRu,
	formatDateTimeRu,
	formatRussianDate,
	formatRussianDateGost,
	formatRussianDateTime,
	formatBirthDate,
	formatSnils,
	formatRussianPassport,
	formatRussianInn,
	formatOmsPolicy,
	isValidRussianPhone,
	isValidRussianPassport,
	isValidSnils,
	isValidRussianInn,
	isValidRussianOmsPolicy,
	maskRussianPhone,
	maskRussianPassport,
	maskRussianSnils,
	maskRussianOmsPolicy,
	sanitizePatientName,
	sanitizeCyrillicText,
} from "../utils/formatters.js";
