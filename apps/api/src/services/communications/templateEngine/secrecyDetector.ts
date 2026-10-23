import { CLINICAL_SECRECY_PATTERNS } from "./clinicalSecrecyPatterns.js";

export interface SecrecyDetectionResult {
	hasLeak: boolean;
	hasCriticalLeak: boolean;
	criticalTerms: string[];
	detectedTerms: string[];
	reasons: string[];
}

export function detectMedicalSecrecyLeaks(
	text: string,
	options?: { criticalOnly?: boolean },
): SecrecyDetectionResult {
	const detectedTerms: string[] = [];
	const criticalTerms: string[] = [];
	const reasons: string[] = [];

	for (const rule of CLINICAL_SECRECY_PATTERNS) {
		if (options?.criticalOnly && !rule.isCritical) continue;
		const matches = text.match(rule.pattern);
		if (matches && matches.length > 0) {
			for (const match of matches) {
				if (!detectedTerms.includes(match)) {
					detectedTerms.push(match);
					reasons.push(`${rule.description} («${match}»)`);
				}
				if (rule.isCritical && !criticalTerms.includes(match)) {
					criticalTerms.push(match);
				}
			}
		}
	}

	return {
		hasLeak: detectedTerms.length > 0,
		hasCriticalLeak: criticalTerms.length > 0,
		criticalTerms,
		detectedTerms,
		reasons,
	};
}

export function sanitizeMedicalSecrecy(text: string): {
	sanitizedText: string;
	strippedTerms: string[];
} {
	let result = text;
	const strippedTerms: string[] = [];

	for (const rule of CLINICAL_SECRECY_PATTERNS) {
		result = result.replace(rule.pattern, (match) => {
			strippedTerms.push(match);
			return "[информация защищена 152-ФЗ]";
		});
	}

	return {
		sanitizedText: result,
		strippedTerms,
	};
}
