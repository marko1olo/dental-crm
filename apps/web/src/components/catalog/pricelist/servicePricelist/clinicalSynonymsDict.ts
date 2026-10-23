/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Clinical Synonyms Dictionary Aggregator & Search Expansion Helpers
 */

import { CLINICAL_SYNONYMS_THERAPY_SURGERY } from "./clinicalSynonymsTherapySurgery";
import { CLINICAL_SYNONYMS_IMPLANTS_OTHER } from "./clinicalSynonymsImplantsOther";

export * from "./clinicalSynonymsTherapySurgery";
export * from "./clinicalSynonymsImplantsOther";

/**
 * Clinical synonyms dictionary connecting common colloquial/clinical terms
 * with statutory categories, tags and prefixes.
 *
 * Mandate 8e: "Врач и администратор не обязаны зубрить 10-значные коды Минздрава".
 */
export const CLINICAL_SYNONYM_DICT: Record<string, readonly string[]> = {
	...CLINICAL_SYNONYMS_THERAPY_SURGERY,
	...CLINICAL_SYNONYMS_IMPLANTS_OTHER,
};

export function normalizeSearchText(text: string): string {
	return text
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^a-zа-я0-9.]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Returns expanded clinical synonyms including Russian grammatical inflections and stems.
 */
export function getClinicalSynonyms(token: string): readonly string[] {
	const norm = normalizeSearchText(token);
	if (!norm || norm.length === 0) return [];

	const direct = CLINICAL_SYNONYM_DICT[norm];
	if (direct) return direct;

	const synonyms: string[] = [];
	for (const [key, list] of Object.entries(CLINICAL_SYNONYM_DICT)) {
		const minLen = Math.min(norm.length, key.length);
		const stemLen = Math.max(3, Math.min(4, minLen));
		if (norm.slice(0, stemLen) === key.slice(0, stemLen)) {
			synonyms.push(...list);
		}
	}

	return synonyms.length > 0 ? Array.from(new Set(synonyms)) : [];
}
