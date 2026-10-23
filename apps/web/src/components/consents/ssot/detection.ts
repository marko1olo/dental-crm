import type { ConsentTemplateKey } from "../templates/types";
import { STATUTORY_CONSENT_KEY_LABELS, CLINICAL_DOMAIN_KEYWORDS } from "./constants";

export function isConsentCovered(domain: ConsentTemplateKey, signedKeys: Iterable<string>): boolean {
	const set = signedKeys instanceof Set ? signedKeys : new Set(signedKeys);
	return set.has(domain);
}

export function getConsentStatutoryTitle(key: string): string {
	return (STATUTORY_CONSENT_KEY_LABELS as Record<string, string | undefined>)[key] || key;
}

export function detectDomainKeywords(
	corpus: string,
	domain: keyof typeof CLINICAL_DOMAIN_KEYWORDS,
): string[] {
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

	if (!hasInspectionSigned) {
		flags.CONSENT_INSPECTION_1051N = true;
	}

	const detectedAnesthesia = detectDomainKeywords(lower, "anesthesia");
	if (detectedAnesthesia.length > 0 || isBlankAndOpen) {
		flags.CONSENT_ANESTHESIA = true;
	}

	const detectedTherapy = detectDomainKeywords(lower, "therapy");
	if (detectedTherapy.length > 0 || isBlankAndOpen) {
		flags.CONSENT_THERAPY = true;
	}

	const detectedSurgery = detectDomainKeywords(lower, "surgery");
	if (detectedSurgery.length > 0) {
		flags.CONSENT_SURGERY_IMPLANT = true;
	}

	const detectedOrtho = detectDomainKeywords(lower, "orthopedics");
	if (detectedOrtho.length > 0) {
		flags.CONSENT_ORTHOPEDICS = true;
	}

	const detectedOrthoDont = detectDomainKeywords(lower, "orthodontics");
	if (detectedOrthoDont.length > 0) {
		flags.CONSENT_ORTHODONTICS = true;
	}

	const detectedHygiene = detectDomainKeywords(lower, "hygiene");
	if (detectedHygiene.length > 0) {
		flags.CONSENT_HYGIENE_BLEACHING = true;
	}

	return flags;
}
