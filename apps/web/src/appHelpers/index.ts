/**
 * Canonical barrel export for all decomposed AppHelpers domain modules.
 */

export * from "./types.js";
export * from "./uiFormatters.js";
export * from "./clinicProfileHelpers.js";
export * from "./financialHelpers.js";
export * from "./telephonyHelpers.js";
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
} from "./types.js";

export {
	sensitiveLocalDraftRetentionMs,
	loadImageFromDataUrl,
	readFileAsDataUrl,
} from "./uiFormatters.js";

export {
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
