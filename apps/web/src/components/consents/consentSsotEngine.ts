/**
 * consentSsotEngine.ts
 *
 * Единый источник правды (SSOT) для информированных добровольных согласий (ИДС)
 */

export {
	STATUTORY_CONSENT_KEY_LABELS,
	CLINICAL_DOMAIN_KEYWORDS,
} from "./ssot/constants";

export type {
	ConsentScopeMismatchItem,
	ConsentScopeMismatchParams,
	ConsentScopeMismatchResult,
} from "./ssot/types";

export {
	isConsentCovered,
	getConsentStatutoryTitle,
	detectDomainKeywords,
	detectRequiredVisitConsents,
} from "./ssot/detection";

export {
	detectConsentScopeMismatch,
} from "./ssot/mismatch";
