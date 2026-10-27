/**
 * DENTE CRM — Clinical Search Engine
 * Authority: Mandate 8b (<= 120 lines), Mandate 8e/8n
 */

import { CLINICAL_GUIDES } from "./helpArticlesData";
import { CLINICAL_SYNONYM_MAP } from "./helpSynonymsData";
import type { ClinicalGuideMeta, ClinicalGuideTab } from "./helpTypes";

export function normalizeSearchTerm(term: string): string {
	return term
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^a-zа-я0-9\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Searches clinical guides using direct matching, synonym expansion, and morphological roots.
 */
export function searchClinicalGuides(query: string): ClinicalGuideMeta[] {
	const rawClean = query.trim();
	if (!rawClean) return [...CLINICAL_GUIDES];

	const normalizedQuery = normalizeSearchTerm(rawClean);
	if (!normalizedQuery) return [...CLINICAL_GUIDES];

	const queryWords = normalizedQuery.split(" ").filter((w) => w.length > 0);

	const synonymMatchedIds = new Set<ClinicalGuideTab>();
	for (const word of queryWords) {
		const matched = CLINICAL_SYNONYM_MAP[word];
		if (matched) {
			for (const id of matched) {
				synonymMatchedIds.add(id);
			}
		}
	}

	return CLINICAL_GUIDES.filter((guide) => {
		if (synonymMatchedIds.has(guide.id)) {
			return true;
		}

		const normTitle = normalizeSearchTerm(guide.title);
		const normShortTitle = normalizeSearchTerm(guide.shortTitle);
		const normDesc = normalizeSearchTerm(guide.description);
		const normBadge = normalizeSearchTerm(guide.badge);

		if (
			normTitle.includes(normalizedQuery) ||
			normShortTitle.includes(normalizedQuery) ||
			normDesc.includes(normalizedQuery) ||
			normBadge.includes(normalizedQuery)
		) {
			return true;
		}

		const normKeywords = guide.keywords.map(normalizeSearchTerm);
		if (normKeywords.some((k) => k.includes(normalizedQuery) || normalizedQuery.includes(k))) {
			return true;
		}

		if (
			guide.hotkeys &&
			guide.hotkeys.some((h) => normalizeSearchTerm(h).includes(normalizedQuery))
		) {
			return true;
		}

		return queryWords.some((qWord) => {
			if (qWord.length < 3) return false;
			const qStem = qWord.slice(0, Math.min(qWord.length, 5));

			return normKeywords.some((k) => {
				const kStem = k.slice(0, Math.min(k.length, 5));
				return k.startsWith(qStem) || qWord.startsWith(kStem) || k.includes(qWord);
			});
		});
	});
}
