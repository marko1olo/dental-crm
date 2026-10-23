export type {
	SignedConsentPayload,
	PatientConsentSummaryParams,
} from "./summary/types";

export { STATUTORY_CONSENT_KEY_LABELS } from "./consentSsotEngine.js";

export {
	sanitizeConsentFieldValue,
	cleanPrintableConsentText,
	sanitizeConsentContext,
} from "./summary/sanitizer";

export {
	type ConsentScopeMismatchParams,
	type ConsentScopeMismatchItem,
	type ConsentScopeMismatchResult,
	detectConsentScopeMismatch,
} from "./consentSsotEngine.js";

export {
	buildAddendumConsentSummary,
	buildPatientConsentSummary,
} from "./summary/summaryBuilder";
