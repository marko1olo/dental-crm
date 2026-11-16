/**
 * consentSsotEngine.ts — Re-export facade for backwards compatibility across visit/consents.
 */

import {
	STATUTORY_CONSENT_KEY_LABELS,
	detectConsentScopeMismatch,
	type ConsentScopeMismatchParams,
	type ConsentScopeMismatchResult,
} from "./consentSummaryHelper";

export {
	STATUTORY_CONSENT_KEY_LABELS,
	detectConsentScopeMismatch,
	type ConsentScopeMismatchParams,
	type ConsentScopeMismatchResult,
};

export const CLINICAL_DOMAIN_KEYWORDS: Record<string, readonly string[]> = {
	anesthesia: ["анестез", "замороз", "карпул", "артикаин", "мепивакаин", "скандонест", "убистезин"],
	surgery: ["удал", "экстракц", "хирург", "имплант", "синус", "лунк", "резекц", "дистоп", "ретинир"],
	orthopedics: ["коронк", "протез", "слепок", "винир", "ортопед", "вкладк", "мост", "абатмент"],
	orthodontics: ["брекет", "элайнер", "ортодонт", "исправление прикуса", "ретейнер"],
	therapy: ["кариес", "пульпит", "периодонтит", "пломб", "реставрац", "эндо", "депульп", "канал"],
	hygiene: ["гигиен", "чистк", "air-flow", "airflow", "айрфло", "ультразвук", "отбеливан"],
};

export function isConsentCovered(domain: string, signedKeys: Iterable<string>): boolean {
	const set = signedKeys instanceof Set ? signedKeys : new Set(signedKeys);
	return set.has(domain);
}

export function getConsentStatutoryTitle(key: string): string {
	return STATUTORY_CONSENT_KEY_LABELS[key] || key;
}

export function detectDomainKeywords(corpus: string, domain: string): string[] {
	if (!corpus) return [];
	const lower = corpus.toLowerCase();
	const keywords = CLINICAL_DOMAIN_KEYWORDS[domain] || [];
	return keywords.filter((kw) => lower.includes(kw));
}

export function detectRequiredVisitConsents(params: {
	textContext: string;
	signedConsentKeys?: Iterable<string>;
	isVisitClosed?: boolean;
	hasInspectionSigned?: boolean;
}): Record<string, boolean> {
	const { textContext, isVisitClosed = false, hasInspectionSigned = false } = params;
	const lower = textContext.toLowerCase();
	const isBlankAndOpen = !lower.trim() && !isVisitClosed;
	const flags: Record<string, boolean> = {};
	if (!hasInspectionSigned) flags.CONSENT_INSPECTION_1051N = true;
	if (detectDomainKeywords(lower, "anesthesia").length > 0 || isBlankAndOpen) flags.CONSENT_ANESTHESIA = true;
	if (detectDomainKeywords(lower, "therapy").length > 0 || isBlankAndOpen) flags.CONSENT_THERAPY = true;
	if (detectDomainKeywords(lower, "surgery").length > 0) flags.CONSENT_SURGERY_IMPLANT = true;
	if (detectDomainKeywords(lower, "orthopedics").length > 0) flags.CONSENT_ORTHOPEDICS = true;
	if (detectDomainKeywords(lower, "orthodontics").length > 0) flags.CONSENT_ORTHODONTICS = true;
	if (detectDomainKeywords(lower, "hygiene").length > 0) flags.CONSENT_HYGIENE_BLEACHING = true;
	return flags;
}


